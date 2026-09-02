import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Clock, CheckCircle2, MessageSquare, Plus, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/states';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { VideoJob, VideoJobStatus } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

const STATUS_CLASS: Record<VideoJobStatus, string> = {
  queued: 'bg-muted text-muted-foreground',
  rendering: 'bg-primary/10 text-primary',
  completed: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-destructive/10 text-destructive',
};

export const Dashboard = (): FunctionComponent => {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<VideoJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<VideoJob[]>('/api/video-jobs?mine=true')
      .then(setJobs)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load your videos'));
  }, []);

  const firstName = user?.displayName?.split(' ')[0] ?? user?.email.split('@')[0] ?? 'there';
  const completed = jobs?.filter((j) => j.status === 'completed').length ?? 0;
  const inProgress = jobs?.filter((j) => j.status === 'queued' || j.status === 'rendering').length ?? 0;
  const total = jobs?.length ?? 0;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          description="Prompt a video, drop it in the workspace, and keep the conversation going."
          actions={
            <Button asChild>
              <Link to="/studio"><Plus className="size-4" /> New video</Link>
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Film className="size-5" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{total}</p>
                <p className="text-sm text-muted-foreground">Your videos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="size-5" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><Clock className="size-5" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inProgress}</p>
                <p className="text-sm text-muted-foreground">In progress</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Recent videos</h2>
              <Link to="/videos" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {error ? (
              <ErrorState message={error} />
            ) : !jobs ? (
              <LoadingState label="Loading videos…" />
            ) : jobs.length === 0 ? (
              <EmptyState
                title="No videos yet"
                description="Generate your first clip from a prompt or an image."
                icon={<Film />}
                action={<Button asChild size="sm"><Link to="/studio">Open Video Studio</Link></Button>}
              />
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 5).map((job) => (
                  <Link key={job.id} to={`/videos/${job.id}`} className="block">
                    <Card className="lift">
                      <CardContent className="flex items-center justify-between gap-3 py-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{job.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge className={STATUS_CLASS[job.status]}>{job.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Quick links</h2>
            <Card>
              <CardContent className="space-y-3 pt-6">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/workspace"><MessageSquare className="size-4" /> Open Workspace feed</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/messages"><MessageSquare className="size-4" /> Direct Messages</Link>
                </Button>
                {user?.isAdmin && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/settings"><Clock className="size-4" /> Workspace settings</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
