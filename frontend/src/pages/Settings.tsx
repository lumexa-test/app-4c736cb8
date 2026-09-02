import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState, LoadingState } from '@/components/common/states';
import { apiClient, ApiError } from '@/lib/apiClient';
import type { TenantSettingsView } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

export const Settings = (): FunctionComponent => {
  const [settings, setSettings] = useState<TenantSettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiClient
      .get<TenantSettingsView>('/api/settings')
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load settings'));
  }, []);

  useEffect(load, [load]);

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    try {
      setSettings(await apiClient.put<TenantSettingsView>('/api/settings/veo-key', { apiKey: apiKey.trim() }));
      setApiKey('');
      toast.success('Google Veo API key saved — generation is now enabled');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to save API key');
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async () => {
    setBusy(true);
    try {
      setSettings(await apiClient.delete<TenantSettingsView>('/api/settings/veo-key'));
      toast.success('API key removed — generation is now disabled');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to remove API key');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <PageContainer><ErrorState message={error} onRetry={load} /></PageContainer>;
  if (!settings) return <PageContainer><LoadingState label="Loading settings…" /></PageContainer>;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Admin configuration for video generation." />

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="size-5" /> Google Veo</CardTitle>
            <CardDescription>Video generation is blocked workspace-wide until an API key is configured here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.veoApiKeyConfigured ? (
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="size-3" /> Configured</Badge>
                <Button variant="outline" size="sm" onClick={clearKey} disabled={busy}>Remove key</Button>
              </div>
            ) : (
              <>
                <Badge className="bg-destructive/10 text-destructive">Not configured — generation is blocked</Badge>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="password"
                    placeholder="Paste a Google Veo API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="sm:max-w-sm"
                  />
                  <Button onClick={saveKey} disabled={busy || apiKey.trim().length < 8}>Save key</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
