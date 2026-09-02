// INTEGRATION KIT — Slack: the account-linking control.
//
// Staged verbatim, then PLACED by the agent on whatever page this app already
// uses for a signed-in user's own settings (see the kit's `instruction`).
// Nothing about Slack exists in the app before this.
//
// Owns the entire OAuth handoff. Never build a second connect link, and never
// link to slack.com yourself — the authorize URL is minted server-side because
// it carries a single-use state tied to this user.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/apiClient';

export interface SlackConnectionState {
  connected: boolean;
  /** Set when the grant died at Slack — the user must re-authorize. */
  needsReauth: boolean;
  teamName: string | null;
  /** The channel THIS user chose. Null until they pick one. */
  channelId: string | null;
  channelName: string | null;
  /** False when the app OWNER has not supplied Slack keys — hide the control. */
  configured: boolean;
  loading: boolean;
}

/** A channel or private group this user can post to. */
export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

/** A person in the workspace, selectable as a direct-message target. */
export interface SlackRecipient {
  id: string;
  name: string;
  realName: string;
  /** True for the connected user themselves — rendered as "(you)". */
  isSelf?: boolean;
}

export interface SlackConnectButtonProps {
  className?: string;
  connectLabel?: string;
  /** App-relative path to land on after authorizing. Defaults to this page. */
  returnTo?: string;
  onChange?: (state: SlackConnectionState) => void;
}

const INITIAL: SlackConnectionState = {
  connected: false,
  needsReauth: false,
  teamName: null,
  channelId: null,
  channelName: null,
  configured: true,
  loading: true,
};

/** Reads the current user's Slack connection. Safe to call from several places. */
export function useSlackConnection(): SlackConnectionState & { refresh: () => void } {
  const [state, setState] = useState<SlackConnectionState>(INITIAL);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    apiClient
      .get<Omit<SlackConnectionState, 'loading'>>('/api/slack/account')
      .then((res) => setState({ ...res, loading: false }))
      .catch(() => setState({ ...INITIAL, loading: false }));
  }, []);

  useEffect(refresh, [refresh]);
  return { ...state, refresh };
}

export function SlackConnectButton({
  className,
  connectLabel = 'Connect Slack',
  returnTo,
  onChange,
}: SlackConnectButtonProps) {
  const state = useSlackConnection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  useEffect(() => {
    if (!state.loading) onChange?.(state);
    // onChange is intentionally not a dep — callers pass inline closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loading, state.connected, state.needsReauth, state.teamName, state.channelId]);

  // The browser comes back from slack.com with ?slack_connect=... on whichever
  // page it started from. Read it once, then strip it so a reload doesn't
  // replay it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('slack_connect');
    if (!outcome) return;
    if (outcome === 'ok') setJustConnected(params.get('slack_team'));
    else setError(messageForConnectError(outcome, params.get('slack_error')));
    params.delete('slack_connect');
    params.delete('slack_team');
    params.delete('slack_error');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    state.refresh();
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ url: string }>('/api/slack/oauth/start', {
        returnTo: returnTo ?? `${window.location.pathname}${window.location.search}`,
      });
      window.location.href = res.url;
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiError && err.status === 503
          ? 'Slack is not configured for this app yet.'
          : 'Could not start the Slack connection. Try again.',
      );
    }
  };

  const disconnect = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.delete('/api/slack/account');
      setJustConnected(null);
      state.refresh();
    } catch {
      setError('Could not disconnect. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Owner hasn't supplied keys — render nothing rather than a dead button.
  if (!state.loading && !state.configured) return null;

  const team = state.teamName ?? justConnected;

  return (
    <div className={className}>
      {state.connected && team ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Connected to {team}</span>
          <Button variant="outline" size="sm" onClick={disconnect} disabled={busy}>
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button onClick={connect} disabled={busy || state.loading}>
            {state.needsReauth ? 'Reconnect Slack' : connectLabel}
          </Button>
          {state.needsReauth && (
            <span className="text-sm text-muted-foreground">
              Your Slack connection expired.
            </span>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function messageForConnectError(outcome: string, code: string | null): string {
  if (outcome === 'denied') return 'You cancelled the Slack authorization.';
  switch (code) {
    case 'state':
    case 'expired':
      return 'That connection link expired. Try connecting again.';
    case 'exchange':
      return 'Slack did not return your account details. Try again.';
    case 'not_configured':
      return 'Slack is not configured for this app yet.';
    default:
      return 'Could not connect your Slack account. Try again.';
  }
}

export default SlackConnectButton;
