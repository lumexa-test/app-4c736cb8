// INTEGRATION KIT — Slack: send a message to anyone, right now.
//
// The ad-hoc counterpart to SlackChannelPicker. The picker sets where a user's
// AUTOMATIC alerts go; this sends one message, on demand, to any destination
// they choose — a person, a public channel, or a private group — WITHOUT
// touching that saved alert destination.
//
// Staged verbatim and placed by the agent. Renders NOTHING until the user has
// connected Slack, so it is safe to mount unconditionally.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useSlackConnection, type SlackChannel, type SlackRecipient } from './SlackConnectButton';

export interface SlackComposerProps {
  className?: string;
  label?: string;
  /** Prefills the message box — e.g. a summary of the record being shared. */
  defaultText?: string;
  placeholder?: string;
  onSent?: (info: { scheduled: boolean }) => void;
}

/** `channel:C123` / `dm:U123` — one <select> holding two kinds of destination. */
type Target = { kind: 'channel'; id: string } | { kind: 'dm'; id: string };
function encode(t: Target): string {
  return `${t.kind}:${t.id}`;
}
function decode(raw: string): Target | null {
  const [kind, id] = raw.split(':');
  if ((kind === 'channel' || kind === 'dm') && id) return { kind, id };
  return null;
}

export function SlackComposer({
  className,
  label = 'Send a Slack message',
  defaultText = '',
  placeholder = 'Write your message…',
  onSent,
}: SlackComposerProps) {
  const conn = useSlackConnection();
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [people, setPeople] = useState<SlackRecipient[]>([]);
  const [target, setTarget] = useState('');
  const [text, setText] = useState(defaultText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    if (!conn.connected) return;
    apiClient
      .get<{ channels: SlackChannel[]; users?: SlackRecipient[] }>('/api/slack/channels')
      .then((res) => {
        setChannels(res.channels ?? []);
        setPeople(res.users ?? []);
      })
      .catch(() => setError('Could not load your Slack destinations.'));
  }, [conn.connected]);

  useEffect(load, [load]);

  if (conn.loading || !conn.configured || !conn.connected) return null;

  const send = async (): Promise<void> => {
    const t = decode(target);
    if (!t || !text.trim()) return;
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      // A person goes as `userId` — the server opens the DM. A channel or
      // private group goes as `channelId`. Never resolve a DM client-side.
      const body =
        t.kind === 'dm'
          ? { userId: t.id, text: text.trim() }
          : { channelId: t.id, text: text.trim() };
      const res = await apiClient.post<{ sent: boolean; scheduled: boolean }>(
        '/api/slack/messages',
        body,
      );
      setSent(true);
      setText('');
      onSent?.({ scheduled: Boolean(res.scheduled) });
    } catch (err) {
      setError(messageForSendError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">{label}</label>

      <select
        className="mb-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={target}
        onChange={(e) => {
          setTarget(e.target.value);
          setSent(false);
        }}
      >
        <option value="">Choose who to send to…</option>
        {people.length > 0 && (
          <optgroup label="People">
            {people.map((u) => (
              <option key={u.id} value={encode({ kind: 'dm', id: u.id })}>
                @{u.name || u.realName}
                {u.isSelf ? ' (you)' : ''}
              </option>
            ))}
          </optgroup>
        )}
        {channels.length > 0 && (
          <optgroup label="Channels & groups">
            {channels.map((c) => (
              <option key={c.id} value={encode({ kind: 'channel', id: c.id })}>
                {c.isPrivate ? '🔒 ' : '# '}
                {c.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <textarea
        className="mb-2 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setSent(false);
        }}
      />

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={send} disabled={busy || !target || !text.trim()}>
          {busy ? 'Sending…' : 'Send to Slack'}
        </Button>
        {sent && <span className="text-xs text-muted-foreground">Sent.</span>}
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** The kit's documented failure codes, in words a user can act on. */
function messageForSendError(err: unknown): string {
  if (err instanceof ApiError) {
    const code = (err.body as { error?: string } | undefined)?.error;
    if (code === 'slack_connect_required') return 'Connect your Slack account first.';
    if (code === 'slack_reconnect_required')
      return 'Your Slack connection expired — reconnect and try again.';
    if (code === 'slack_channel_required') return 'Choose who to send to first.';
    if (err.status === 503) return 'Slack is not configured for this app yet.';
    if (err.status === 502)
      return 'Slack would not accept the message. If it is a private channel, make sure you are a member.';
  }
  return 'Could not send that message. Try again.';
}

export default SlackComposer;
