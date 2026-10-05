import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, MessageSquare, MapPin } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import type { FunctionComponent } from '@/common/types';

interface SlackAccountView {
  configured: boolean;
  connected: boolean;
  teamName: string | null;
  channelName: string | null;
}

export const Settings = (): FunctionComponent => {
  const [slack, setSlack] = useState<SlackAccountView | null>(null);

  const load = useCallback(() => {
    apiClient
      .get<SlackAccountView>('/api/slack/account')
      .then(setSlack)
      .catch(() => setSlack({ configured: false, connected: false, teamName: null, channelName: null }));
  }, []);

  useEffect(load, [load]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Settings" description="Admin configuration for this workspace." />

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="size-5" /> Slack connection</CardTitle>
            <CardDescription>Connect your Slack workspace via OAuth to enable messaging, then pick the alert channel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!slack ? (
              <Badge variant="secondary">Checking Slack status…</Badge>
            ) : !slack.configured ? (
              <Badge className="bg-destructive/10 text-destructive">Slack is not configured.</Badge>
            ) : slack.connected ? (
              <div className="space-y-1">
                <Badge className="bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-3" /> Connected{slack.teamName ? ` — ${slack.teamName}` : ''}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {slack.channelName ? `Alert channel: ${slack.channelName}` : 'No alert channel selected.'}
                </p>
              </div>
            ) : (
              <Badge className="bg-destructive/10 text-destructive">Slack workspace not connected.</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="size-5" /> Location &amp; weather</CardTitle>
            <CardDescription>Live location and weather are shown in the top navigation on every authenticated page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Location is resolved from your browser and weather refreshes every 10 minutes in the top bar.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
