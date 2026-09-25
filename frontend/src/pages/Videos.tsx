import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Film, Plus, Trash2, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingRows } from '@/components/common/states';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
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

export const Videos = (): FunctionComponent => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<VideoJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VideoJob | null>(null);

  const load = useCallback(() => {
    setError(null);
    // Admins oversee every user's jobs in the tenant; members see only their own.
    apiClient
      .get<VideoJob[]>(user?.isAdmin ? '/api/video-jobs' : '/api/video-jobs?mine=true')
      .then(setJobs)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load your videos'));
  }, [user?.isAdmin]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/api/video-jobs/${deleteTarget.id}`);
      toast.success(`Deleted "${deleteTarget.title}"`);
      setJobs((prev) => prev?.filter((j) => j.id !== deleteTarget.id) ?? null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to delete video');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="My Videos"
          description="Every clip you've generated, with live status."
          actions={
            <Button asChild>
              <Link to="/studio">
                <Plus className="size-4" /> New video
              </Link>
            </Button>
          }
        />

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !jobs ? (
          <LoadingRows rows={4} />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No videos yet"
            description="Generate your first clip from a prompt or an image."
            icon={<Film />}
            action={
              <Button asChild>
                <Link to="/studio">Open Video Studio</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => {
              const meta = STATUS_META[job.status];
              const Icon = meta.icon;
              return (
                <Card key={job.id} className="shadow-card lift">
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={meta.className}>
                        <Icon className={job.status === 'rendering' ? 'size-3 animate-spin' : 'size-3'} />
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{job.mode === 'text' ? 'Text' : 'Image'}</span>
                    </div>
                    <Link to={`/videos/${job.id}`} className="block">
                      <h3 className="line-clamp-2 font-semibold text-foreground hover:text-primary">{job.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{job.prompt}</p>
                    </Link>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">{job.creatorDisplayName} · {new Date(job.createdAt).toLocaleDateString()}</span>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(job)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this video?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
};
