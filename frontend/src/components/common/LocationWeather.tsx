import { useCallback, useEffect, useState } from 'react';
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
 *
 * Edge cases per PRD §3: permission denied or unavailable shows
 * "Location unavailable — enable location access" with a Retry control and no
 * weather block; weather key absent shows the not-configured notice.
 */
export function LocationWeather({ className }: { className?: string }): React.ReactElement {
  const [state, setState] = useState<State>('loading');

  const check = useCallback(() => {
    setState('loading');
    if (!('geolocation' in navigator)) {
      setState('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setState('not-configured'), // permission granted, but no weather/geocoding API key is configured yet
      () => setState('denied'), // permission denied or position unavailable → single PRD-pinned message
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, REFRESH_MS);
    return () => clearInterval(interval);
  }, [check]);

  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium text-muted-foreground', className)}>
      {state === 'loading' && (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Locating…
        </>
      )}
      {state === 'denied' && (
        <>
          <MapPin className="size-3.5 shrink-0" />
          <span>Location unavailable — enable location access</span>
          <button
            type="button"
            onClick={check}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Retry
          </button>
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
