import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Dashboard } from '@/pages/Dashboard';
import { Studio } from '@/pages/Studio';
import { Videos } from '@/pages/Videos';
import { VideoDetail } from '@/pages/VideoDetail';
import { Workspace } from '@/pages/Workspace';
import { Messages } from '@/pages/Messages';
import { Settings } from '@/pages/Settings';
import { AdminRoute } from '@/components/AdminRoute';
import type { FunctionComponent } from '@/common/types';

// Declarative route table — all pages are registered here.
// EVERY page renders inside <AppLayout> (the shared navbar + footer shell) —
// register new routes under it so the whole app keeps ONE consistent chrome.
// Never give an individual page its own <header>/<nav>/<footer>.
// No devtools overlays: this tree is what end users see in the live preview.
const App = (): FunctionComponent => {
	return (
		<>
			<Routes>
				<Route element={<AppLayout />}>
					{/* Public routes */}
					<Route path="/" element={<Landing />} />
					<Route path="/login" element={<Login />} />
					<Route path="/signup" element={<Signup />} />
					{/* ── DOMAIN ROUTES GO HERE (public) ── */}

					{/* Protected routes — redirect to /login when unauthenticated */}
					<Route element={<ProtectedRoute />}>
						<Route path="/dashboard" element={<Dashboard />} />
						{/* ── DOMAIN ROUTES GO HERE (protected) ── */}
						<Route path="/studio" element={<Studio />} />
						<Route path="/videos" element={<Videos />} />
						<Route path="/videos/:id" element={<VideoDetail />} />
						<Route path="/workspace" element={<Workspace />} />
						<Route path="/messages" element={<Messages />} />
						<Route element={<AdminRoute />}>
							<Route path="/settings" element={<Settings />} />
						</Route>
					</Route>

					{/* Unknown paths fall back to the landing page */}
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
			<Toaster richColors position="top-center" />
		</>
	);
};

export default App;
