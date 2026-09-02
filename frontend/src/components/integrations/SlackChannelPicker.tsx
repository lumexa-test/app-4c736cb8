// INTEGRATION KIT — Slack: where THIS user wants their alerts delivered.
//
// Staged verbatim and placed next to <SlackConnectButton /> by the agent.
// Renders nothing until the user has actually connected, so it is always safe
// to mount unconditionally beside the connect control.
//
// WHY A PICKER AND NOT A TEXT FIELD: Slack needs a channel ID (`C0123ABCD`),
// but people know channels by name. Asking for the id by hand is the single
// most common setup failure. This lists what the user can actually post to and
// stores the id behind the name.
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useSlackConnection, type SlackChannel, type SlackRecipient } from './SlackConnectButton';

// Re-exported so callers can import either component's types from either file.
export type { SlackChannel, SlackRecipient } from './SlackConnectButton';

/**
 * What the user picked. A channel is chosen by its own id; a DM is chosen by
 * the PERSON's id and the server resolves it to a conversation — which is why
 * these are two different fields rather than one.
 */
type Selection = { kind: 'channel'; id: string } | { kind: 'dm'; id: string };

/** `channel:C123` / `dm:U123` — one <select> holding two kinds of thing. */
function encode(sel: Selection): string {
  return `${sel.kind}:${sel.id}`;
}
function decode(raw: string): Selection | null {
  const [kind, id] = raw.split(':');
  if ((kind === 'channel' || kind === 'dm') && id) return { kind, id };
  return null;
}

export interface SlackChannelPickerProps {
  className?: string;
  label?: string;
  onSaved?: (channel: SlackChannel) => void;
}

export function SlackChannelPicker({
  className,
  label = 'Send my alerts to',
  onSaved,
}: SlackChannelPickerProps) {
  const conn = useSlackConnection();
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [people, setPeople] = useState<SlackRecipient[]>([]);
  // False when this connection predates the DM scopes — the token simply was
  // never granted them, so the only fix is a reconnect.
  const [dmAvailable, setDmAvailable] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    if (!conn.connected) return;
    setError(null);
    apiClient
      .get<{ channels: SlackChannel[]; users?: SlackRecipient[]; dmAvailable?: boolean }>(
        '/api/slack/channels',
      )
      .then((res) => {
        setChannels(res.channels ?? []);
        setPeople(res.users ?? []);
        setDmAvailable(res.dmAvailable !== false);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError && err.status === 409
            ? 'Reconnect your Slack account to choose a destination.'
            : 'Could not load your Slack channels.',
        );
      });
  }, [conn.connected]);

  useEffect(load, [load]);
  // A saved DM is stored as its conversation id, so it matches the channel
  // branch here; the @-prefixed name is what tells the user it is a DM.
  useEffect(
    () => setSelected(conn.channelId ? encode({ kind: 'channel', id: conn.channelId }) : ''),
    [conn.channelId],
  );

  if (conn.loading || !conn.configured || !conn.connected) return null;

  const save = async (): Promise<void> => {
    const sel = decode(selected);
    if (!sel) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (sel.kind === 'dm') {
        const person = people.find((u) => u.id === sel.id);
        if (!person) return;
        // Send the PERSON's id — the server opens the conversation and stores
        // the resolved id, so the send path never has to know it is a DM.
        await apiClient.put('/api/slack/channel', {
          userId: person.id,
          channelName: person.name || person.realName,
        });
      } else {
        const channel = channels.find((c) => c.id === sel.id);
        if (!channel) return;
        await apiClient.put('/api/slack/channel', {
          channelId: channel.id,
          channelName: channel.name,
        });
      }
      setSaved(true);
      conn.refresh();
      const channel = channels.find((c) => c.id === sel.id);
      if (channel) onSaved?.(channel);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'Reconnect your Slack account to send direct messages.'
          : 'Could not save that destination. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <select
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setSaved(false);
          }}
        >
          <option value="">Choose a destination…</option>
          {channels.length > 0 && (
            <optgroup label="Channels">
              {channels.map((c) => (
                <option key={c.id} value={encode({ kind: 'channel', id: c.id })}>
                  {c.isPrivate ? '🔒 ' : '# '}
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {people.length > 0 && (
            <optgroup label="Direct messages">
              {people.map((u) => (
                <option key={u.id} value={encode({ kind: 'dm', id: u.id })}>
                  @{u.name || u.realName}
                  {u.isSelf ? ' (you)' : ''}
                  {!u.isSelf && u.realName && u.name && u.realName !== u.name
                    ? ` — ${u.realName}`
                    : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <Button
          size="sm"
          onClick={save}
          disabled={
            busy || !selected || selected === encode({ kind: 'channel', id: conn.channelId ?? '' })
          }
        >
          Save
        </Button>
      </div>
      {conn.channelName && !saved && (
        <p className="mt-1 text-xs text-muted-foreground">
          Currently sending to {conn.channelName.startsWith('@') ? conn.channelName : `#${conn.channelName}`}
        </p>
      )}
      {!dmAvailable && (
        <p className="mt-1 text-xs text-muted-foreground">
          Direct messages need permissions this connection does not have yet — disconnect and
          connect again to enable them.
        </p>
      )}
      {saved && <p className="mt-1 text-xs text-muted-foreground">Saved.</p>}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      {channels.length === 0 && people.length === 0 && !error && (
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing to send to yet. You can only post to channels you have joined in Slack.
        </p>
      )}
    </div>
  );
}

export default SlackChannelPicker;
