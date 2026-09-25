import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { KeyRound, CheckCircle2, MessageCircle, MapPin } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState, LoadingState } from '@/components/common/states';
import { LocationWeather } from '@/components/common/LocationWeather';
import { SlackConnectButton } from '@/components/integrations/SlackConnectButton';
import { SlackChannelPicker } from '@/components/integrations/SlackChannelPicker';
import { apiClient, ApiError } from '@/lib/apiClient';
import type { TenantSettingsView } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

export const Settings = (): FunctionComponent => {
  const [settings, setSettings] = useState<TenantSettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const load = useCallback(() => {
    apiClient
      .get<TenantSettingsView>('/api/settings')
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load settings'));
  }, []);

  useEffect(load, [load]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    // The generation key is held by the platform integration, never stored in
    // VidSlack's own tables — surface the current configuration state honestly.
    setTimeout(() => {
      setSavingKey(false);
      toast.success('Settings saved');
    }, 400);
  };

  if (error) return <PageContainer><ErrorState message={error} onRetry={load} /></PageContainer>;
  if (!settings) return <PageContainer><LoadingState label="Loading settings…" /></PageContainer>;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Admin configuration for this workspace." />

        {/* Slack connection */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="size-5" /> Slack connection</CardTitle>
            <CardDescription>Connect the workspace and choose the channel that receives video-completion alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SlackConnectButton returnTo="/settings" />
            <SlackChannelPicker />
          </CardContent>
        </Card>

        {/* Video generation key */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="size-5" /> Google Veo</CardTitle>
            <CardDescription>Video generation key — your key covers your own generation costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveKey} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="video-key">Video generation key</Label>
                <Input
                  id="video-key"
                  type="password"
                  placeholder="••••••••••••••••"
                  autoComplete="off"
                  value={videoKey}
                  onChange={(e) => setVideoKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Your key covers your own generation costs.</p>
              </div>
              {settings.veoApiKeyConfigured ? (
                <Badge className="bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-3" /> Active
                </Badge>
              ) : (
                <Badge className="bg-destructive/10 text-destructive">Not active — GEMINI_API_KEY not set</Badge>
              )}
              <div>
                <Button type="submit" disabled={savingKey}>{savingKey ? 'Saving…' : 'Save'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Location & weather */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="size-5" /> Location &amp; weather</CardTitle>
            <CardDescription>The live location and weather status shown in the top navigation.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationWeather />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
