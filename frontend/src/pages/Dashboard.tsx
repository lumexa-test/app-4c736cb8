import { Link } from 'react-router-dom';
import { Clock, MessageSquare } from 'lucide-react';
import { PageContainer } from '@/components/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import type { FunctionComponent } from '@/common/types';

export const Dashboard = (): FunctionComponent => {
  const { user } = useAuthStore();
  const firstName = user?.displayName?.split(' ')[0] ?? user?.email.split('@')[0] ?? 'there';

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          description="Catch up on your workspace feed and messages."
        />

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
    </PageContainer>
  );
};
