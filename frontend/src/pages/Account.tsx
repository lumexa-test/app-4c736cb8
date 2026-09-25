import { UserCircle } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InitialsAvatar } from '@/components/common/InitialsAvatar';
import { useAuthStore } from '@/store/authStore';
import type { FunctionComponent } from '@/common/types';

// Personal account page. Slack connection and the alert-channel picker live on
// the Admin-only /settings page (PRD §3/§6/§8 make Slack configuration
// Admin-only), so they are intentionally NOT rendered here.
export const Account = (): FunctionComponent => {
  const { user } = useAuthStore();
  const displayName = user?.displayName ?? user?.email ?? 'You';

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader title="Account" description="Your profile in this workspace." />
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="size-5" /> Profile
            </CardTitle>
            <CardDescription>How you appear to the rest of the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <InitialsAvatar name={displayName} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{displayName}</p>
                {user?.email && <p className="truncate text-sm text-muted-foreground">{user.email}</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Slack connection and the video-completion alert channel are managed by a workspace admin in Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};
