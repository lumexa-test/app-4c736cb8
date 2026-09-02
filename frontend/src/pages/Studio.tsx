import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, ImageIcon, AlertCircle } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MediaImageField } from '@/lib/MediaImageField';
import { apiClient, ApiError } from '@/lib/apiClient';
import type { VideoJob, VideoJobMode } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

// Video Studio — text-to-video and image-to-video. Google Veo is "planned
// for a future version" (per the PRD); the backend gates generation behind
// a per-tenant API key and returns 503 until an admin configures one.
export const Studio = (): FunctionComponent => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<VideoJobMode>('text');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    if (!title.trim() || prompt.trim().length < 10) {
      toast.error('Add a title and a prompt of at least 10 characters.');
      return;
    }
    if (mode === 'image' && !sourceImageUrl) {
      toast.error('Upload a source image for image-to-video.');
      return;
    }
    setSubmitting(true);
    try {
      const job = await apiClient.post<VideoJob>('/api/video-jobs', {
        title: title.trim(),
        prompt: prompt.trim(),
        mode,
        sourceImageUrl: mode === 'image' ? sourceImageUrl : undefined,
      });
      toast.success(`"${job.title}" is generating`, { description: 'This can take up to a few minutes — track progress on the video page.' });
      navigate(`/videos/${job.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setGateError(err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed to start generation');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Video Studio" description="Generate an 8-second clip with audio from a prompt, or animate an uploaded image." />

        {gateError && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{gateError}</p>
              <p className="text-muted-foreground">Ask a workspace admin to add a Google Veo API key in Settings.</p>
            </div>
          </div>
        )}

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as VideoJobMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="gap-2">
                  <Sparkles className="size-4" /> Text to video
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="size-4" /> Image to video
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="Spring launch teaser" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                </div>

                <TabsContent value="text" className="mt-0 space-y-1.5">
                  <Label htmlFor="prompt-text">Prompt</Label>
                  <Textarea
                    id="prompt-text"
                    placeholder="A pastel product bottle rotating slowly on a marble podium, soft studio light, 8s loop."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{prompt.trim().length}/500 characters — minimum 10.</p>
                </TabsContent>

                <TabsContent value="image" className="mt-0 space-y-5">
                  <MediaImageField value={sourceImageUrl} onChange={setSourceImageUrl} label="Source image" />
                  <div className="space-y-1.5">
                    <Label htmlFor="prompt-image">Motion prompt</Label>
                    <Textarea
                      id="prompt-image"
                      placeholder="Gentle parallax zoom, warm color grade, subtle particle overlay."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">{prompt.trim().length}/500 characters — minimum 10.</p>
                  </div>
                </TabsContent>

                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? 'Starting generation…' : 'Generate video'}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
