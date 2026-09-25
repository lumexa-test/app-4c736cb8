import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollToHash } from '@/components/ScrollToHash';
import { useAuthStore } from '@/store/authStore';
import { LocationWeather } from '@/components/common/LocationWeather';
import { APP_NAME } from '@/brand';
import type { FunctionComponent } from '@/common/types';

const LOGO_SRC = '/uploads/label-logo-277e1cf0.png';

/**
 * AppLayout — the ONE shared shell every page renders inside (registered as a
 * layout route in App.tsx). Converted from the approved landing design's own
 * nav/footer chrome. Do NOT build pages with their own <header>/<nav>/
 * <footer>; add nav links at the marker below and the whole app stays
 * consistent. Full-bleed pages (the landing) own their section backgrounds;
 * regular pages wrap content in <PageContainer>.
 */
export const AppLayout = (): FunctionComponent => {
	const { user, logout } = useAuthStore();
	const navigate = useNavigate();
	const [mobileOpen, setMobileOpen] = useState(false);

	const handleLogout = (): void => {
		logout();
		setMobileOpen(false);
		navigate('/');
	};

	const navLinkClass = 'text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground';
	const navLinkClassActive = ({ isActive }: { isActive: boolean }): string =>
		isActive ? 'text-xs font-semibold uppercase tracking-[0.14em] text-primary' : navLinkClass;

	return (
		<div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
			{/* Makes in-page anchor nav (href="#section" / <Link to="/#section">)
			    actually scroll, and resets scroll on page change. Keep it mounted. */}
			<ScrollToHash />
			<header data-sec="nav" className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<nav className="mx-auto flex w-full max-w-[1240px] items-center gap-4 px-6 py-4 sm:px-10">
					<Link data-edit-id="nav:a:0" to="/" className="flex min-w-0 shrink-0 items-center gap-3">
						<img src={LOGO_SRC} alt={APP_NAME} className="h-8 w-auto object-contain" />
						<span data-edit-id="nav:span:2" className="truncate text-base font-semibold tracking-tight text-foreground">
							{APP_NAME}
						</span>
					</Link>

					{/* THE NAVBAR SWAPS WITH AUTH STATE — like every real app.
					    A signed-out visitor sees ONLY the marketing links; a signed-in
					    user sees ONLY the app's screens. The two sets NEVER render at
					    the same time. */}

					{/* ── SIGNED-OUT bucket: marketing / landing navigation ── */}
					{!user && (
						<div className="mx-auto hidden items-center gap-8 md:flex">
							{/* ── PUBLIC NAV LINKS (SIGNED-OUT) GO HERE ── */}
							<a data-edit-id="nav:a:3" href="/#how" className={navLinkClass}>
								How it works
							</a>
							<a data-edit-id="nav:a:4" href="/#text2video" className={navLinkClass}>
								Features
							</a>
							<a data-edit-id="nav:a:6" href="/#faq" className={navLinkClass}>
								FAQ
							</a>
						</div>
					)}

					{/* ── SIGNED-IN bucket: the app's real screens ── */}
					{user && (
						<div className="mx-auto hidden items-center gap-6 md:flex">
							{/* ── APP NAV LINKS (SIGNED-IN) GO HERE ── */}
							<NavLink to="/dashboard" className={navLinkClassActive}>
								Dashboard
							</NavLink>
							<NavLink to="/studio" className={navLinkClassActive}>
								Studio
							</NavLink>
							<NavLink to="/videos" className={navLinkClassActive}>
								My Videos
							</NavLink>
							<NavLink to="/workspace" className={navLinkClassActive}>
								Workspace
							</NavLink>
							<NavLink to="/messages" className={navLinkClassActive}>
								Messages
							</NavLink>
							<NavLink to="/account" className={navLinkClassActive}>
								Account
							</NavLink>
							{user.isAdmin && (
								<NavLink to="/settings" className={navLinkClassActive}>
									Settings
								</NavLink>
							)}
						</div>
					)}

					<div className="hidden shrink-0 items-center gap-3 md:flex">
						{user ? (
							<>
								<LocationWeather className="mr-1 hidden lg:flex" />
								<span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{user.displayName ?? user.email}</span>
								<Button variant="outline" size="sm" className="text-xs font-semibold uppercase tracking-[0.08em]" onClick={handleLogout}>
									Sign out
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" size="sm" className="text-xs font-semibold uppercase tracking-[0.08em]" asChild>
									<Link to="/login">Log in</Link>
								</Button>
								<Button size="sm" className="text-xs font-semibold uppercase tracking-[0.08em]" asChild>
									<Link to="/signup">Sign up</Link>
								</Button>
							</>
						)}
					</div>

					{/* Mobile hamburger — collapses the same two buckets into a drawer */}
					<button
						type="button"
						aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={mobileOpen}
						className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground md:hidden"
						onClick={() => setMobileOpen((open) => !open)}
					>
						{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
					</button>
				</nav>

				{mobileOpen && (
					<div className="border-t border-border bg-background px-6 py-6 md:hidden">
						<div className="flex flex-col gap-5">
							{!user ? (
								<>
									<a href="/#how" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										How it works
									</a>
									<a href="/#text2video" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										Features
									</a>
									<a href="/#faq" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										FAQ
									</a>
									<div className="flex flex-col gap-3 pt-2">
										<Button variant="outline" className="w-full justify-center text-xs font-semibold uppercase tracking-[0.08em]" asChild>
											<Link to="/login" onClick={() => setMobileOpen(false)}>
												Log in
											</Link>
										</Button>
										<Button className="w-full justify-center text-xs font-semibold uppercase tracking-[0.08em]" asChild>
											<Link to="/signup" onClick={() => setMobileOpen(false)}>
												Sign up
											</Link>
										</Button>
									</div>
								</>
							) : (
								<>
									<NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										Dashboard
									</NavLink>
									<NavLink to="/studio" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										Studio
									</NavLink>
									<NavLink to="/videos" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										My Videos
									</NavLink>
									<NavLink to="/workspace" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										Workspace
									</NavLink>
									<NavLink to="/messages" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										Messages
									</NavLink>
									<NavLink to="/account" className={navLinkClass} onClick={() => setMobileOpen(false)}>
										Account
									</NavLink>
									{user.isAdmin && (
										<NavLink to="/settings" className={navLinkClass} onClick={() => setMobileOpen(false)}>
											Settings
										</NavLink>
									)}
									<LocationWeather />
									<span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{user.displayName ?? user.email}</span>
									<Button variant="outline" className="w-full justify-center text-xs font-semibold uppercase tracking-[0.08em]" onClick={handleLogout}>
										Sign out
									</Button>
								</>
							)}
						</div>
					</div>
				)}
			</header>

			<main className="flex-1 overflow-x-hidden">
				<Outlet />
			</main>

			<footer data-sec="footer" className="border-t border-border bg-card text-card-foreground">
				<div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-6 px-6 py-8 sm:px-10 md:flex-row md:justify-between">
					<Link data-edit-id="footer:a:0" to="/" className="flex items-center gap-3">
						<img src={LOGO_SRC} alt={APP_NAME} className="h-7 w-auto object-contain" />
						<span data-edit-id="footer:span:2" className="text-sm font-semibold tracking-tight">
							{APP_NAME}
						</span>
					</Link>
					<nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
						<a data-edit-id="footer:a:3" href="/#how" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
							How it works
						</a>
						<a data-edit-id="footer:a:4" href="/#text2video" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
							Features
						</a>
						<a data-edit-id="footer:a:5" href="/#pricing" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
							Pricing
						</a>
						<a data-edit-id="footer:a:6" href="/#faq" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
							FAQ
						</a>
						<a data-edit-id="footer:a:7" href="/#contact" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
							Contact
						</a>
					</nav>
					<p data-edit-id="footer:p:8" className="text-xs tracking-[0.04em] text-muted-foreground">
						© {new Date().getFullYear()} {APP_NAME}. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
};

/** Standard content column for non-landing pages. */
export const PageContainer = ({ children }: { children: ReactNode }): FunctionComponent => (
	<div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
);
