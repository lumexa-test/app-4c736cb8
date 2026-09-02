// INTEGRATION KIT — Slack, per-END-USER OAuth 2.0.
//
// Each signed-in user OF THE GENERATED APP connects their OWN Slack workspace,
// picks their OWN channel, and the app posts AS THEM. There is no app-owned bot
// and no owner-level channel: the owner supplies only the OAuth client
// credentials, exactly as with the X kit.
//
// WHAT THE OWNER STILL DOES BY HAND: registers this app's redirect URL in the
// Slack app dashboard. There is no platform-hosted proxy — the callback is the
// app's own `${APP_PUBLIC_URL}/api/slack/oauth/callback`, and the platform's
// integration panel prints the exact URL for the project.
//
// WHY NO TOKEN REFRESH (unlike the X kit): Slack user tokens do not expire
// unless the workspace has opted into token rotation. There is therefore no
// refresh_token to rotate and no expiry to pre-empt — a revoked grant surfaces
// as `invalid_auth`/`token_revoked` on the next call, which is what sets
// needsReauth. Do not add a refresh loop; there is nothing to refresh.
//
// No SDK dependency: every call here is one form-encoded or JSON POST, so
// global fetch is enough and the app gains no package to install or audit.
import { Request, Response, Router } from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import middleware from '../../middleware';

const AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const API = 'https://slack.com/api';
// USER scopes, not bot scopes: the app acts as the person who connected.
//   chat:write    — post as them
//   channels:read — list public channels so they can choose one
//   groups:read   — list private channels they are already in
//   users:read    — list people so they can pick a DM recipient
//   im:write      — open the DM conversation before posting to it
//
// BACKWARD COMPATIBILITY: connections authorized BEFORE the DM scopes were added
// hold a token without `users:read`/`im:write`. Slack does not retroactively
// grant scopes, so those calls answer `missing_scope`. Every DM path below
// degrades to "channels still work, DMs need a reconnect" rather than erroring —
// see MISSING_SCOPE handling. Never treat missing_scope as a dead grant: the
// token is perfectly valid for everything it was granted.
const USER_SCOPES = 'chat:write,channels:read,groups:read,users:read,im:write';
const STATE_TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 10_000;
// Slack truncates well before this, but a runaway body should never be sent.
const MAX_TEXT_LENGTH = 3000;
// chat.scheduleMessage refuses anything more than 120 days out.
const MAX_SCHEDULE_DAYS = 120;

function clientId(): string {
  return (process.env.SLACK_CLIENT_ID ?? '').trim();
}

function clientSecret(): string {
  return (process.env.SLACK_CLIENT_SECRET ?? '').trim();
}

function isConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

function notConfigured(res: Response) {
  return res.status(503).json({
    error: 'integration_not_configured',
    integration: 'Slack',
    message: 'Slack is not configured for this app yet.',
  });
}

/**
 * The app's public root.
 *
 * APP_PUBLIC_URL is already the full public root in every environment — do NOT
 * append APP_BASE_PATH. In ALB path mode APP_PUBLIC_URL is already
 * `http://<alb>/app-<id8>`, so appending would yield `/app-<id8>/app-<id8>/...`.
 * APP_BASE_PATH exists for the request-strip middleware, never for outbound URLs.
 */
function appOrigin(req: Request): string {
  const configured = (process.env.APP_PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
}

function callbackUrl(req: Request): string {
  return `${appOrigin(req)}/api/slack/oauth/callback`;
}

/** Same-origin paths only — an attacker-supplied returnTo must not leave the app. */
function safeReturnTo(raw: unknown): string | null {
  if (typeof raw === 'string' && /^\/(?![/\\])/.test(raw)) return raw;
  return null;
}

/** Slack renders `&`, `<` and `>` as markup unless they are escaped. */
function escape(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function slackForm(path: string, form: Record<string, string>): Promise<any> {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8' },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.json().catch(() => null);
}

async function slackJson(path: string, token: string, body: unknown): Promise<any> {
  const res = await fetch(`${API}/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.json().catch(() => null);
}

async function slackGet(path: string, token: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/${path}?${qs}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.json().catch(() => null);
}

/**
 * Slack error codes that mean THIS USER's grant is dead and only re-consent
 * fixes it. Everything else — rate limits, 5xx, channel problems — must NEVER
 * set needsReauth, or one upstream blip disconnects every user at once.
 */
const DEAD_GRANT = new Set(['invalid_auth', 'token_revoked', 'account_inactive', 'token_expired']);

async function markNeedsReauth(userId: number): Promise<void> {
  await prisma.slackConnection
    .update({ where: { userId }, data: { needsReauth: true, accessToken: null } })
    .catch(() => undefined);
}

/**
 * Resolve a Slack USER id to the 1:1 conversation id to post into.
 *
 * Slack will not accept a user id as a `channel` for chat.postMessage; the DM
 * has to be opened first. The pair's conversation id is stable, so callers may
 * cache it (setChannel does), but an ad-hoc send resolves it per request — one
 * extra call, and it keeps "message anyone" from requiring a saved destination.
 */
async function openDmChannel(
  token: string,
  slackUserId: string,
): Promise<{ channelId?: string; error?: string }> {
  const opened = await slackJson('conversations.open', token, { users: slackUserId });
  if (opened?.ok && opened?.channel?.id) return { channelId: String(opened.channel.id) };
  return { error: opened?.error ?? 'unknown' };
}

// ── OAuth ───────────────────────────────────────────────────────────────────

// POST /api/slack/oauth/start
async function oauthStart(req: Request, res: Response): Promise<any> {
  if (!isConfigured()) return notConfigured(res);
  const userId = req.user!.id;
  const state = randomBytes(32).toString('base64url');
  const redirectUri = callbackUrl(req);

  await prisma.slackOAuthState.create({
    data: {
      state,
      userId,
      redirectUri,
      returnTo: safeReturnTo((req.body as any)?.returnTo),
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    },
  });

  const url =
    `${AUTHORIZE_URL}?` +
    new URLSearchParams({
      client_id: clientId(),
      // user_scope, NOT scope: this app acts as the person, not as a bot.
      user_scope: USER_SCOPES,
      redirect_uri: redirectUri,
      state,
    }).toString();

  return res.json({ url });
}

// GET /api/slack/oauth/callback — Slack's browser redirect. Never call directly.
async function oauthCallback(req: Request, res: Response): Promise<any> {
  const land = (params: Record<string, string>, returnTo?: string | null) => {
    const base = returnTo || '/slack/connected';
    const sep = base.includes('?') ? '&' : '?';
    return res.redirect(`${appOrigin(req)}${base}${sep}${new URLSearchParams(params)}`);
  };

  const state = String((req.query as any)?.state ?? '');
  if (!state) return land({ slack_connect: 'error', slack_error: 'state' });

  // Single-use: delete before validating anything else, so a replayed callback
  // finds nothing.
  const pending = await prisma.slackOAuthState
    .delete({ where: { state } })
    .catch(() => null);
  if (!pending) return land({ slack_connect: 'error', slack_error: 'state' });
  if (pending.expiresAt.getTime() < Date.now()) {
    return land({ slack_connect: 'error', slack_error: 'expired' }, pending.returnTo);
  }
  // The user pressed Cancel on Slack's consent screen.
  if ((req.query as any)?.error) {
    return land({ slack_connect: 'denied' }, pending.returnTo);
  }

  const code = String((req.query as any)?.code ?? '');
  if (!code) return land({ slack_connect: 'error', slack_error: 'code' }, pending.returnTo);
  if (!isConfigured()) {
    return land({ slack_connect: 'error', slack_error: 'not_configured' }, pending.returnTo);
  }

  try {
    const body = await slackForm('oauth.v2.access', {
      client_id: clientId(),
      client_secret: clientSecret(),
      code,
      // Replayed byte-for-byte from what was sent at authorize time.
      redirect_uri: pending.redirectUri,
    });

    // The USER token lives on authed_user, not at the top level — the top-level
    // access_token is the BOT token, which this kit deliberately does not use.
    const userToken = body?.authed_user?.access_token;
    const slackUserId = body?.authed_user?.id;
    if (!body?.ok || !userToken || !slackUserId) {
      return land({ slack_connect: 'error', slack_error: 'exchange' }, pending.returnTo);
    }

    const shared = {
      slackUserId: String(slackUserId),
      teamId: String(body?.team?.id ?? ''),
      teamName: String(body?.team?.name ?? ''),
      accessToken: String(userToken),
      scope: String(body?.authed_user?.scope ?? ''),
      needsReauth: false,
    };
    await prisma.slackConnection.upsert({
      where: { userId: pending.userId },
      create: { userId: pending.userId, ...shared },
      update: shared,
    });

    return land(
      { slack_connect: 'ok', slack_team: shared.teamName },
      pending.returnTo,
    );
  } catch {
    return land({ slack_connect: 'error', slack_error: 'server_error' }, pending.returnTo);
  }
}

// GET /api/slack/account
async function getAccount(req: Request, res: Response): Promise<any> {
  const conn = await prisma.slackConnection.findUnique({ where: { userId: req.user!.id } });
  return res.json({
    configured: isConfigured(),
    connected: Boolean(conn?.accessToken) && !conn?.needsReauth,
    needsReauth: Boolean(conn?.needsReauth),
    teamName: conn?.teamName ?? null,
    channelId: conn?.channelId ?? null,
    channelName: conn?.channelName ?? null,
    connectedAt: conn?.createdAt ?? null,
  });
}

// DELETE /api/slack/account
async function disconnect(req: Request, res: Response): Promise<any> {
  const conn = await prisma.slackConnection.findUnique({ where: { userId: req.user!.id } });
  if (conn?.accessToken) {
    // Best-effort revoke; a failure here must not block the local delete.
    await slackGet('auth.revoke', conn.accessToken, {}).catch(() => undefined);
  }
  await prisma.slackConnection.delete({ where: { userId: req.user!.id } }).catch(() => undefined);
  return res.json({ connected: false });
}

// ── Channels ────────────────────────────────────────────────────────────────

// GET /api/slack/channels — what this user can post to, for the picker.
async function listChannels(req: Request, res: Response): Promise<any> {
  if (!isConfigured()) return notConfigured(res);
  const conn = await prisma.slackConnection.findUnique({ where: { userId: req.user!.id } });
  if (!conn?.accessToken || conn.needsReauth) {
    return res.status(409).json({
      error: conn?.needsReauth ? 'slack_reconnect_required' : 'slack_connect_required',
      message: 'Connect your Slack account first.',
    });
  }

  const body = await slackGet('conversations.list', conn.accessToken, {
    types: 'public_channel,private_channel',
    exclude_archived: 'true',
    limit: '200',
  });

  if (!body?.ok) {
    if (DEAD_GRANT.has(body?.error)) {
      await markNeedsReauth(req.user!.id);
      return res.status(409).json({
        error: 'slack_reconnect_required',
        message: 'Your Slack connection expired. Reconnect to continue.',
      });
    }
    return res.status(502).json({
      error: 'slack_upstream_error',
      message: 'Could not load your Slack channels.',
      detail: body?.error ?? 'unknown',
    });
  }

  const channels = (body.channels ?? [])
    .map((c: any) => ({ id: String(c.id), name: String(c.name), isPrivate: Boolean(c.is_private) }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  // DM targets. Best-effort ON PURPOSE: a connection made before the DM scopes
  // existed answers `missing_scope` here, and that must not break the channel
  // list it can still serve. `dmAvailable:false` tells the UI to offer a
  // reconnect instead of pretending nobody exists.
  let users: { id: string; name: string; realName: string; isSelf: boolean }[] = [];
  let dmAvailable = true;
  const people = await slackGet('users.list', conn.accessToken, { limit: '200' });
  if (people?.ok) {
    // NOTE: the connected user is deliberately KEPT in this list. Excluding
    // them looks tidy and is wrong twice over: messaging yourself is the most
    // common personal use of an alert channel, and in a solo or small workspace
    // dropping yourself empties the list entirely — which renders as "this app
    // does not support DMs" rather than "there is nobody else here". Seen for
    // real on a one-person workspace with every scope correctly granted.
    users = (people.members ?? [])
      .filter((u: any) => !u.deleted && !u.is_bot && u.id !== 'USLACKBOT')
      .map((u: any) => ({
        id: String(u.id),
        name: String(u.name ?? ''),
        realName: String(u.profile?.real_name ?? u.real_name ?? u.name ?? ''),
        isSelf: String(u.id) === conn.slackUserId,
      }))
      // Self first — it is the most likely pick for a personal alert feed.
      .sort((a: any, b: any) =>
        a.isSelf === b.isSelf ? a.realName.localeCompare(b.realName) : a.isSelf ? -1 : 1,
      );
  } else {
    dmAvailable = false;
    if (people?.error && people.error !== 'missing_scope') {
      console.warn(`[slack] users.list failed for user ${req.user!.id}: ${people.error}`);
    }
  }

  return res.json({ channels, users, dmAvailable });
}

// PUT /api/slack/channel — remember where THIS user wants their alerts.
async function setChannel(req: Request, res: Response): Promise<any> {
  const conn = await prisma.slackConnection.findUnique({ where: { userId: req.user!.id } });
  if (!conn?.accessToken) {
    return res.status(409).json({
      error: 'slack_connect_required',
      message: 'Connect your Slack account first.',
    });
  }
  let channelId = String((req.body as any)?.channelId ?? '').trim();
  let channelName = String((req.body as any)?.channelName ?? '').trim();
  const dmUserId = String((req.body as any)?.userId ?? '').trim();

  // A DM target arrives as a Slack USER id. Resolve it to the conversation id
  // ONCE, here, and store that — so notifySlackForUser stays exactly as it was:
  // it posts to a channel id and neither knows nor cares that this one is a DM.
  // The pair's conversation id is stable, so this does not need redoing per send.
  if (!channelId && dmUserId) {
    const opened = await openDmChannel(conn.accessToken, dmUserId);
    if (!opened.channelId) {
      const err = opened.error ?? 'unknown';
      if (err === 'missing_scope') {
        return res.status(409).json({
          error: 'slack_reconnect_required',
          message:
            'Direct messages need permissions your Slack connection does not have yet. ' +
            'Disconnect and connect again to enable them.',
        });
      }
      return res.status(502).json({
        error: 'slack_upstream_error',
        message: 'Could not open that direct message.',
        detail: err,
      });
    }
    channelId = opened.channelId;
    // Displayed with a leading @ so the UI can tell a DM from a channel without
    // a second stored field (and without a schema change).
    if (!channelName.startsWith('@')) channelName = `@${channelName || dmUserId}`;
  }

  if (!channelId) {
    return res.status(400).json({ message: 'channelId or userId is required' });
  }

  const updated = await prisma.slackConnection.update({
    where: { userId: req.user!.id },
    data: { channelId, channelName: channelName || null },
  });
  return res.json({ channelId: updated.channelId, channelName: updated.channelName });
}

// ── Posting ─────────────────────────────────────────────────────────────────

export interface SlackField {
  label: string;
  value: string;
}

export interface SlackMessageInput {
  /** One line a human can act on. Required. */
  text: string;
  title?: string;
  fields?: SlackField[];
  link?: { label: string; url: string };
  /** Overrides the user's saved channel. */
  channelId?: string;
  /** Unix seconds. When set, Slack schedules instead of posting now. */
  postAt?: number;
}

export interface SlackSendResult {
  sent: boolean;
  scheduled?: boolean;
  ts?: string;
  scheduledMessageId?: string;
  reason?:
    | 'not_configured'
    | 'not_connected'
    | 'needs_reauth'
    | 'no_channel'
    | 'invalid_input'
    | 'upstream_error';
  detail?: string;
}

function buildBlocks(input: SlackMessageInput): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  if (input.title) {
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: input.title.slice(0, 150), emoji: true },
    });
  }
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: escape(input.text).slice(0, MAX_TEXT_LENGTH) },
  });
  const fields = (input.fields ?? []).filter((f) => f?.label && f?.value);
  if (fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: fields.slice(0, 10).map((f) => ({
        type: 'mrkdwn',
        text: `*${escape(f.label)}*\n${escape(f.value)}`.slice(0, 2000),
      })),
    });
  }
  if (input.link?.url) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${input.link.url}|${escape(input.link.label || 'Open in app')}>`,
      },
    });
  }
  return blocks;
}

/**
 * Post (or schedule) a Slack message AS the given app user, to the channel that
 * user chose.
 *
 * NEVER THROWS. A Slack notification is a background side-effect: a user who has
 * not connected, a revoked grant, or an upstream failure must all skip silently
 * with a server-side log and must never fail the request that triggered it. So
 * call it directly inside an order/booking/status handler with no try/catch and
 * without checking the result before responding.
 */
export async function notifySlackForUser(
  userId: number,
  input: SlackMessageInput,
): Promise<SlackSendResult> {
  if (!isConfigured()) {
    console.warn('[slack] skipped: not configured');
    return { sent: false, reason: 'not_configured' };
  }
  if (!input?.text?.trim()) {
    return { sent: false, reason: 'invalid_input', detail: 'text is required' };
  }

  const conn = await prisma.slackConnection.findUnique({ where: { userId } }).catch(() => null);
  if (!conn?.accessToken) return { sent: false, reason: 'not_connected' };
  if (conn.needsReauth) return { sent: false, reason: 'needs_reauth' };

  const channel = (input.channelId ?? conn.channelId ?? '').trim();
  if (!channel) return { sent: false, reason: 'no_channel' };

  const payload: Record<string, unknown> = {
    channel,
    // Doubles as the notification/fallback string for clients that cannot
    // render blocks — Slack warns when it is omitted.
    text: input.text.slice(0, MAX_TEXT_LENGTH),
    blocks: buildBlocks(input),
  };

  try {
    let body: any;
    if (input.postAt && input.postAt > Math.floor(Date.now() / 1000)) {
      const maxAt = Math.floor(Date.now() / 1000) + MAX_SCHEDULE_DAYS * 86400;
      if (input.postAt > maxAt) {
        return { sent: false, reason: 'invalid_input', detail: 'postAt is more than 120 days out' };
      }
      body = await slackJson('chat.scheduleMessage', conn.accessToken, {
        ...payload,
        post_at: input.postAt,
      });
      if (body?.ok) {
        return { sent: true, scheduled: true, scheduledMessageId: String(body.scheduled_message_id) };
      }
    } else {
      body = await slackJson('chat.postMessage', conn.accessToken, payload);
      if (body?.ok) return { sent: true, ts: String(body.ts) };
    }

    const detail = body?.error ?? 'unknown';
    if (DEAD_GRANT.has(detail)) {
      await markNeedsReauth(userId);
      return { sent: false, reason: 'needs_reauth', detail };
    }
    // Never log the token. The error code names the real problem, which is
    // usually the user not being a member of the channel they picked.
    console.error(`[slack] send failed for user ${userId}: ${detail}`);
    return { sent: false, reason: 'upstream_error', detail };
  } catch (err) {
    console.error('[slack] send error:', (err as Error).message);
    return { sent: false, reason: 'upstream_error', detail: (err as Error).message };
  }
}

/** Map a send result onto the HTTP contract the frontend components already handle. */
function sendResultToHttp(res: Response, result: SlackSendResult): any {
  if (result.sent) {
    return res.json({
      sent: true,
      scheduled: Boolean(result.scheduled),
      ts: result.ts ?? null,
      scheduledMessageId: result.scheduledMessageId ?? null,
    });
  }
  switch (result.reason) {
    case 'not_configured':
      return notConfigured(res);
    case 'not_connected':
      return res.status(409).json({
        error: 'slack_connect_required',
        message: 'Connect your Slack account first.',
      });
    case 'needs_reauth':
      return res.status(409).json({
        error: 'slack_reconnect_required',
        message: 'Your Slack connection expired. Reconnect to continue.',
      });
    case 'no_channel':
      return res.status(409).json({
        error: 'slack_channel_required',
        message: 'Choose a Slack channel first.',
      });
    case 'invalid_input':
      return res.status(400).json({ message: result.detail ?? 'Invalid message' });
    default:
      return res.status(502).json({
        error: 'slack_upstream_error',
        message: 'Slack could not accept the message.',
        detail: result.detail ?? 'unknown',
      });
  }
}

// POST /api/slack/messages — manual / composed send, and scheduling.
//
// Takes EITHER `channelId` (a public channel, private group, or an already-open
// DM) OR `userId` (a person). Passing a person resolves their 1:1 conversation
// here, so "message anyone" needs no saved destination and does not disturb the
// one the user picked for their alerts. With neither, it falls back to that
// saved destination — which is what the notification path uses.
async function sendMessage(req: Request, res: Response): Promise<any> {
  const b = (req.body ?? {}) as any;
  let channelId = b.channelId ? String(b.channelId) : undefined;
  const dmUserId = b.userId ? String(b.userId) : undefined;

  if (!channelId && dmUserId) {
    const conn = await prisma.slackConnection.findUnique({ where: { userId: req.user!.id } });
    if (!conn?.accessToken) {
      return res.status(409).json({
        error: 'slack_connect_required',
        message: 'Connect your Slack account first.',
      });
    }
    const opened = await openDmChannel(conn.accessToken, dmUserId);
    if (!opened.channelId) {
      if (opened.error === 'missing_scope') {
        return res.status(409).json({
          error: 'slack_reconnect_required',
          message:
            'Direct messages need permissions your Slack connection does not have yet. ' +
            'Disconnect and connect again to enable them.',
        });
      }
      return res.status(502).json({
        error: 'slack_upstream_error',
        message: 'Could not open that direct message.',
        detail: opened.error ?? 'unknown',
      });
    }
    channelId = opened.channelId;
  }

  const result = await notifySlackForUser(req.user!.id, {
    text: String(b.text ?? ''),
    title: b.title ? String(b.title) : undefined,
    fields: Array.isArray(b.fields) ? b.fields : undefined,
    link: b.link,
    channelId,
    postAt: b.postAt ? Number(b.postAt) : undefined,
  });
  return sendResultToHttp(res, result);
}

const router = Router();
router.post('/oauth/start', middleware.jwtCheck, oauthStart);
router.get('/oauth/callback', oauthCallback); // public — Slack's browser redirect
router.get('/account', middleware.jwtCheck, getAccount);
router.delete('/account', middleware.jwtCheck, disconnect);
router.get('/channels', middleware.jwtCheck, listChannels);
router.put('/channel', middleware.jwtCheck, setChannel);
router.post('/messages', middleware.jwtCheck, sendMessage);

export default router;
