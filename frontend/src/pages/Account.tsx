import { MessageCircle } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlackConnectButton } from '@/components/integrations/SlackConnectButton';
import { SlackChannelPicker } from '@/components/integrations/SlackChannelPicker';
import type { FunctionComponent } from '@/common/types';

export const Account = (): FunctionComponent => {
  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Account" description="Manage your personal integrations and notification preferences." />
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5" /> Slack
            </CardTitle>
            <CardDescription>
              Connect your Slack workspace to receive video completion alerts in your chosen channel or DM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SlackConnectButton returnTo="/account" />
            <SlackChannelPicker />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
