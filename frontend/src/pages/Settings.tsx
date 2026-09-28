import { useEffect, useState, useCallback } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorState, LoadingState } from '@/components/common/states';
import { apiClient, ApiError } from '@/lib/apiClient';
import type { TenantSettingsView } from '@/types/domain';
import type { FunctionComponent } from '@/common/types';

export const Settings = (): FunctionComponent => {
  const [settings, setSettings] = useState<TenantSettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiClient
      .get<TenantSettingsView>('/api/settings')
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load settings'));
  }, []);

  useEffect(load, [load]);

  if (error) return <PageContainer><ErrorState message={error} onRetry={load} /></PageContainer>;
  if (!settings) return <PageContainer><LoadingState label="Loading settings…" /></PageContainer>;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Admin configuration for this workspace." />

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="size-5" /> Google Veo</CardTitle>
            <CardDescription>Video generation is configured via the platform environment — set GEMINI_API_KEY in the platform dashboard to enable it.</CardDescription>
          </CardHeader>
          <CardContent>
            {settings.veoApiKeyConfigured ? (
              <Badge className="bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-3" /> Active
              </Badge>
            ) : (
              <Badge className="bg-destructive/10 text-destructive">Not active — GEMINI_API_KEY not set</Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
