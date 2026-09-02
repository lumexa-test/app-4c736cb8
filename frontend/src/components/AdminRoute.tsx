import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { FunctionComponent } from '@/common/types';

// Route guard for admin-only pages (e.g. Settings). Sits INSIDE
// ProtectedRoute, so a missing token already bounced to /login — this only
// needs to guard against a signed-in, non-admin member.
export const AdminRoute = (): FunctionComponent => {
  const user = useAuthStore((state) => state.user);
  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};
