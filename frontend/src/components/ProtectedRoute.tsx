import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { FunctionComponent } from '@/common/types';

// Route guard: renders child routes only when a session token exists,
// otherwise redirects to /login. Use as a layout route:
//   <Route element={<ProtectedRoute />}>…protected routes…</Route>
export const ProtectedRoute = (): FunctionComponent => {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};
