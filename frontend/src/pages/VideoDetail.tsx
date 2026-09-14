import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Download, RefreshCw, Trash2, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { InitialsAvatar } from '@/components/common/InitialsAvatar';
import { GeneratedVideo } from '@/components/integrations/GeneratedVideo';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { VideoJob, VideoJobStatus } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

const STATUS_META: Record<VideoJobStatus, { label: string; className: string; icon: typeof Clock }> = {
  queued: { label: 'Queued', className: 'bg-muted text-muted-foreground', icon: Clock },
  rendering: { label: 'Rendering', className: 'bg-primary/10 text-primary', icon: Loader2 },
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive', icon: XCircle },
};

const POLL_MS = 3000;
const TIMEOUT_MS = 15 * 60 * 1000;

export const VideoDetail = (): FunctionComponent => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const load = useCallback(() => {
    apiClient
      .get<VideoJob>(`/api/video-jobs/${id}`)
      .then(setJob)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load video'));
  }, [id]);

  useEffect(() => {
    startedAt.current = Date.now();
    setTimedOut(false);
    load();
  }, [id, load]);

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;
    const interval = setInterval(() => {
      if (Date.now() - startedAt.current > TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      load();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [job, load]);

  const handleDownload = async () => {
    if (!job) return;
    try {
      const { url } = await apiClient.get<{ url: string }>(`/api/video-jobs/${job.id}/download`);
      window.open(url, '_blank');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Download failed');
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    try {
      await apiClient.delete(`/api/video-jobs/${job.id}`);
      toast.success(`Deleted "${job.title}"`);
      navigate('/videos');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to delete video');
    } finally {
      setConfirmDelete(false);
    }
  };

  const handleRetry = async () => {
    if (!job) return;
    setRetrying(true);
    try {
      const newJob = await apiClient.post<VideoJob>(`/api/video-jobs/${job.id}/retry`, {});
      toast.success('Retrying generation');
      navigate(`/videos/${newJob.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  if (error) return <PageContainer><ErrorState message={error} onRetry={load} /></PageContainer>;
  if (!job) return <PageContainer><LoadingState label="Loading video…" /></PageContainer>;

  const meta = STATUS_META[job.status];
  const Icon = meta.icon;
  const canManage = user?.id === job.creatorId || user?.isAdmin;
  const displayStatus: VideoJobStatus | 'timed-out' = timedOut && job.status !== 'completed' && job.status !== 'failed' ? 'timed-out' : job.status;

  return (
    <PageContainer>
      <div className="space-y-6">
        <Link to="/videos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to My Videos
        </Link>

        <PageHeader
          title={job.title}
          description={`${job.mode === 'text' ? 'Text to video' : 'Image to video'} · created ${new Date(job.createdAt).toLocaleString()}`}
          actions={
            canManage ? (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="shadow-card overflow-hidden">
              <CardContent className="p-0">
                {job.veoJobId ? (
                  <GeneratedVideo
                    jobId={job.veoJobId}
                    className="aspect-video w-full"
                    posterUrl={job.sourceImageUrl ?? undefined}
                  />
                ) : job.status === 'completed' && job.videoUrl ? (
                  <video src={job.videoUrl} controls className="aspect-video w-full bg-black" />
                ) : displayStatus === 'timed-out' ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted text-center text-muted-foreground">
                    <XCircle className="size-8" />
                    <p className="font-medium text-foreground">Generation timed out. Please try again.</p>
                  </div>
                ) : job.status === 'failed' ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted text-center text-muted-foreground">
                    <XCircle className="size-8 text-destructive" />
                    <p className="font-medium text-foreground">{job.errorMessage ?? 'Generation failed.'}</p>
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-muted text-center text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="font-medium text-foreground">{job.status === 'queued' ? 'Waiting in queue…' : 'Rendering your clip…'}</p>
                    <p className="text-xs">Checking every few seconds — this page updates automatically.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(job.status === 'failed' || displayStatus === 'timed-out') && canManage && (
              <Button onClick={handleRetry} disabled={retrying} variant="outline">
                <RefreshCw className="size-4" /> {retrying ? 'Starting retry…' : 'Retry generation'}
              </Button>
            )}
            {job.status === 'completed' && !job.veoJobId && (
              <Button onClick={handleDownload}>
                <Download className="size-4" /> Download video
              </Button>
            )}

            <Card>
              <CardContent className="space-y-2 pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prompt</h3>
                <p className="text-foreground">{job.prompt}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Badge className={meta.className}>
                  <Icon className={job.status === 'rendering' ? 'size-3 animate-spin' : 'size-3'} />
                  {timedOut && displayStatus === 'timed-out' ? 'Timed out' : meta.label}
                </Badge>
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={job.creatorDisplayName} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{job.creatorDisplayName}</p>
                    <p className="text-xs text-muted-foreground">Creator</p>
                  </div>
                </div>
                {job.mode === 'image' && job.sourceImageUrl && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source image</p>
                    <div className="aspect-video w-full overflow-hidden rounded-md border">
                      <img src={job.sourceImageUrl} alt="Source" className="h-full w-full object-cover" />
                    </div>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Last updated</p>
                  <p className="text-foreground">{new Date(job.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this video?"
        description={`"${job.title}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
};
