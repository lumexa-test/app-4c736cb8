import { Link, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { PageContainer } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import type { FunctionComponent } from '@/common/types';

// Route guard for admin-only pages (e.g. Settings). Sits INSIDE
// ProtectedRoute, so a missing token already bounced to /login — this only
// needs to guard against a signed-in, non-admin member. Per the PRD, a
// non-admin reaching an admin page gets a 403 page with a link back to
// /workspace (not a silent redirect).
export const AdminRoute = (): FunctionComponent => {
  const user = useAuthStore((state) => state.user);
  if (!user?.isAdmin) {
    return (
      <PageContainer>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
          <ShieldAlert className="size-10 text-destructive" />
          <div className="space-y-1">
            <h1 className="font-display text-2xl text-foreground">You don't have access</h1>
            <p className="text-sm text-muted-foreground">
              This page is available to workspace admins only.
            </p>
          </div>
          <Button asChild>
            <Link to="/workspace">Back to workspace</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }
  return <Outlet />;
};
