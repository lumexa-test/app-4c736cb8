import { useEffect, useState } from 'react';
import { MapPin, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type State = 'loading' | 'denied' | 'not-configured' | 'ready';

const REFRESH_MS = 10 * 60 * 1000;

/**
 * Top-nav location + weather module. Google Maps (reverse geocoding) and
 * OpenWeather are both "planned for a future version" per the PRD — there is
 * no key to call. This still exercises the real browser Geolocation
 * permission flow (so the permission-denied state is genuine) and then
 * surfaces an honest "not configured" fallback rather than showing fake
 * weather data, refreshing the permission check every 10 minutes.
 */
export function LocationWeather({ className }: { className?: string }): React.ReactElement {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const check = () => {
      if (!('geolocation' in navigator)) {
        setState('not-configured');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => setState('not-configured'), // permission granted, but no weather/geocoding API key is configured yet
        (err) => setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'not-configured'),
        { timeout: 8000 },
      );
    };
    check();
    const interval = setInterval(check, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium text-muted-foreground', className)}>
      {state === 'loading' && (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Locating…
        </>
      )}
      {state === 'denied' && (
        <>
          <MapPin className="size-3.5" /> Location access denied
        </>
      )}
      {state === 'not-configured' && (
        <>
          <CloudOff className="size-3.5" /> Weather not configured
        </>
      )}
      {state === 'ready' && (
        <>
          <MapPin className="size-3.5" /> —
        </>
      )}
    </div>
  );
}
