// INTEGRATION KIT — Google Veo (AI video generation with synchronized audio).
//
// Staged verbatim when the project owner supplies GEMINI_API_KEY.
//
// ─── WHY THIS FILE LOOKS DIFFERENT FROM EVERY OTHER KIT ────────────────────
//
// Every other kit in this platform wraps a request/response API. Veo does not:
// generation is a LONG-RUNNING OPERATION that takes minutes. So this file owns
// a job lifecycle instead of a single call:
//
//   POST /api/video/generate  → submit, persist a VeoVideoJob row, return id
//   GET  /api/video/jobs/:id  → ask Veo how it's going; on the FIRST completion,
//                               download the bytes, park them in the project's
//                               own storage, flip the row to 'ready'
//   GET  /api/video/jobs      → this user's recent generations
//
// THERE IS NO BACKGROUND WORKER, ON PURPOSE. A generated app has no scheduler
// infrastructure, and an in-process setInterval dies with the container —
// stranding every in-flight job and losing money already spent. Driving the
// poll from the CLIENT means a restart costs nothing: the next poll picks up
// exactly where the last one left off, because all the state lives in Postgres
// and in Veo's own operation.
//
// ─── WHY WE COPY THE BYTES ─────────────────────────────────────────────────
//
// Veo deletes the generated file after ~48 hours. Storing Google's URI would
// give the app a link that dies within the week. On completion we download once
// and push the bytes through the platform's upload proxy (the same one
// /api/uploads uses), then store OUR url. `videoUrl` is always ours.
//
// ─── WHY THE COST GUARDS ARE NOT OPTIONAL ──────────────────────────────────
//
// Veo has no free tier and bills per SECOND of output. One 8-second clip on the
// standard model costs the app owner real money — more than a thousand chat
// completions. Hence: a per-user daily cap enforced server-side, a hard ceiling
// on duration, and a default of the fast model at 720p. A client cannot raise
// any of these; it can only ask for less.
import { Request, Response, Router } from 'express';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { prisma } from '../../lib/prisma';
import middleware from '../../middleware';
import config from '../../../config';

// ─── tuning ────────────────────────────────────────────────────────────────

/**
 * Fast, not standard. The quality gap is modest; the price gap is ~4x
 * ($0.10/sec vs $0.40/sec at 720p). An app that genuinely needs the standard
 * model can pass model: 'standard' per request.
 */
const MODELS = {
  fast: 'veo-3.1-fast-generate-preview',
  standard: 'veo-3.1-generate-preview',
} as const;
type ModelTier = keyof typeof MODELS;

/** Veo accepts 4, 6 or 8 seconds. Anything else is rejected upstream. */
const ALLOWED_DURATIONS = [4, 6, 8] as const;
const DEFAULT_DURATION = 8;

/** 1080p is permitted; 4K is not — it triples the cost and blows the upload cap. */
const ALLOWED_RESOLUTIONS = ['720p', '1080p'] as const;
const DEFAULT_RESOLUTION = '720p';

const ALLOWED_ASPECTS = ['16:9', '9:16'] as const;
const DEFAULT_ASPECT = '16:9';

/**
 * Per-user, per-day generation cap.
 *
 * A blunt instrument, and deliberately so: without it a single user clicking a
 * button forty times costs the owner more than their monthly plan. Raise it by
 * setting VIDEO_DAILY_LIMIT_PER_USER if the app's economics support it.
 */
const DAILY_LIMIT_PER_USER = Number(process.env.VIDEO_DAILY_LIMIT_PER_USER ?? 5);

/** Prompt ceiling — long enough for scene + dialogue direction, short enough to bound cost. */
const MAX_PROMPT_CHARS = 1500;

// ─── plumbing ──────────────────────────────────────────────────────────────

function apiKey(): string {
  return (process.env.GEMINI_API_KEY ?? '').trim();
}

/** True once the owner has supplied GEMINI_API_KEY. Check before calling startVideoGeneration. */
export function isGoogleAIConfigured(): boolean {
  return Boolean(apiKey());
}

/**
 * Construct LAZILY, inside the handler — never at module top level. A missing
 * key must not crash boot; the router still mounts and its routes answer 503,
 * so adding the key later and redeploying activates the feature with no code
 * change.
 */
function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: apiKey() });
}

function notConfigured(res: Response) {
  return res.status(503).json({
    error: 'integration_not_configured',
    integration: 'Google Veo',
    message: 'Google Veo is not configured.',
  });
}

/**
 * Map a provider failure to a user-safe response.
 *
 * The billing case gets its OWN status and code rather than folding into
 * "not configured". They look identical from the outside — nothing generates —
 * but the fix is opposite: not-configured means the owner must paste a key,
 * billing means the key is correct and Google needs billing enabled on it.
 * Collapsing them sends the owner round a loop re-pasting a key that was right.
 */
function providerError(res: Response, err: unknown) {
  const e = err as { status?: number; message?: string };
  const msg = String(e?.message ?? '');
  console.error(`[veo] request failed (${e?.status ?? '?'}):`, msg);

  if (e?.status === 401 || e?.status === 403) {
    // 403 with a billing hint is the "key is fine, billing is off" case.
    if (/billing|quota project|not enabled|permission/i.test(msg)) {
      return res.status(402).json({
        error: 'video_billing_required',
        message:
          'Video generation is not enabled on this Google account. Enable billing for the Gemini API to generate videos.',
      });
    }
    return notConfigured(res);
  }
  if (e?.status === 429) {
    return res.status(429).json({
      error: 'video_rate_limited',
      message: 'Too many video requests right now — please try again shortly.',
    });
  }
  if (e?.status === 400) {
    return res.status(422).json({
      error: 'video_rejected',
      message: 'That prompt was rejected. Try describing the scene differently.',
    });
  }
  return res.status(502).json({
    error: 'video_upstream_error',
    message: 'The video service is unavailable right now.',
  });
}

/** Midnight-to-now window for the daily cap. */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the finished clip's bytes out of the SDK.
 *
 * THIS IS FIDDLIER THAN IT LOOKS, so do not "simplify" it. `ai.files.download()`
 * returns Promise<void> and REQUIRES a `downloadPath` — it writes to disk and
 * hands back nothing. Treating its return value as the bytes yields `undefined`
 * and silently stores a 0-byte video.
 *
 * Two transports, in preference order:
 *   1. `videoBytes` — base64 inline on the operation response. No I/O at all.
 *   2. `uri` + downloadPath — the SDK writes the file, we read it back and
 *      delete it. Runs in the container's own tmpdir, which is writable and
 *      ephemeral; the unlink is best-effort because a leaked temp file is much
 *      cheaper than failing a clip the owner already paid for.
 */
async function readVideoBytes(video: any): Promise<Buffer | null> {
  if (typeof video?.videoBytes === 'string' && video.videoBytes.length > 0) {
    return Buffer.from(video.videoBytes, 'base64');
  }
  if (!video?.uri) return null;

  const tmpPath = join(tmpdir(), `veo-${randomUUID()}.mp4`);
  try {
    await client().files.download({ file: video, downloadPath: tmpPath });
    const bytes = await readFile(tmpPath);
    return bytes.length > 0 ? bytes : null;
  } catch (err) {
    console.error('[veo] could not download the finished clip:', (err as Error).message);
    return null;
  } finally {
    await unlink(tmpPath).catch(() => undefined);
  }
}

/**
 * Park the finished clip in the project's own storage.
 *
 * Returns null when storage is unconfigured — the caller then keeps the row in
 * 'ready' with the provider URL, which still plays for ~48h. A degraded result
 * beats throwing away a clip the owner has already paid for.
 */
async function persistVideo(bytes: Buffer, jobId: string): Promise<string | null> {
  if (!config.mediaProxyUrl || !config.mediaUploadToken || !config.projectId) {
    console.warn('[veo] upload proxy not configured — keeping the provider URL (expires in ~48h)');
    return null;
  }
  try {
    const resp = await fetch(
      `${config.mediaProxyUrl}/v1/projects/${config.projectId}/uploads?folder=video`,
      {
        method: 'POST',
        headers: {
          'x-media-upload-token': config.mediaUploadToken,
          'content-type': 'application/octet-stream',
          'x-content-type': 'video/mp4',
          'x-filename': `${jobId}.mp4`,
        },
        body: new Uint8Array(bytes),
      },
    );
    const data: any = await resp.json().catch(() => null);
    if (!resp.ok) {
      console.error('[veo] upload proxy rejected the clip:', data?.error ?? resp.status);
      return null;
    }
    return String(data?.url ?? '') || null;
  } catch (err) {
    console.error('[veo] upload proxy unreachable:', (err as Error).message);
    return null;
  }
}

// ─── routes ────────────────────────────────────────────────────────────────

// POST /api/video/generate
// { prompt, imageUrl?, durationSecs?, resolution?, aspectRatio?, model? }
async function generate(req: Request, res: Response): Promise<any> {
  if (!apiKey()) return notConfigured(res);

  const body = (req.body ?? {}) as Record<string, unknown>;
  const prompt = String(body.prompt ?? '').trim();
  if (!prompt) return res.status(400).json({ message: 'prompt is required' });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ message: `prompt must be ${MAX_PROMPT_CHARS} characters or fewer` });
  }

  const userId = req.user!.id;

  // Cost guard. Checked BEFORE submitting, because once Veo accepts the
  // operation the money is committed whether or not anyone watches the result.
  const usedToday = await prisma.veoVideoJob.count({
    where: { userId, createdAt: { gte: startOfToday() } },
  });
  if (usedToday >= DAILY_LIMIT_PER_USER) {
    return res.status(429).json({
      error: 'video_daily_limit',
      message: `You've reached today's limit of ${DAILY_LIMIT_PER_USER} videos. Try again tomorrow.`,
    });
  }

  const durationSecs = ALLOWED_DURATIONS.includes(Number(body.durationSecs) as any)
    ? Number(body.durationSecs)
    : DEFAULT_DURATION;
  const resolution = ALLOWED_RESOLUTIONS.includes(String(body.resolution) as any)
    ? String(body.resolution)
    : DEFAULT_RESOLUTION;
  const aspectRatio = ALLOWED_ASPECTS.includes(String(body.aspectRatio) as any)
    ? String(body.aspectRatio)
    : DEFAULT_ASPECT;
  const tier: ModelTier = String(body.model) === 'standard' ? 'standard' : 'fast';

  // Image-to-video: animate a still the app already owns. The URL must be
  // fetchable by this server; we inline the bytes rather than handing Veo a URL
  // it may not be able to reach.
  let imagePart: { imageBytes: string; mimeType: string } | undefined;
  const imageUrl = String(body.imageUrl ?? '').trim();
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`status ${imgRes.status}`);
      const mimeType = imgRes.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
      const buf = Buffer.from(await imgRes.arrayBuffer());
      imagePart = { imageBytes: buf.toString('base64'), mimeType };
    } catch (err) {
      return res.status(400).json({
        message: 'Could not read the source image for this video.',
      });
    }
  }

  try {
    const operation = await client().models.generateVideos({
      model: MODELS[tier],
      prompt,
      ...(imagePart ? { image: imagePart } : {}),
      config: { durationSeconds: durationSecs, resolution, aspectRatio },
    });

    const job = await prisma.veoVideoJob.create({
      data: {
        userId,
        prompt,
        operationId: operation.name ?? null,
        status: 'pending',
        durationSecs,
        resolution,
        aspectRatio,
        model: MODELS[tier],
      },
    });

    // 202: accepted, not done. The client polls /jobs/:id from here.
    return res.status(202).json({
      id: job.id,
      status: 'pending',
      estimatedSeconds: 120,
    });
  } catch (err) {
    return providerError(res, err);
  }
}

/**
 * GET /api/video/jobs/:id — status, and the place completion actually happens.
 *
 * Idempotent by design: a row already 'ready' or 'failed' short-circuits, so
 * two browser tabs polling the same job cannot download or upload twice.
 */
async function jobStatus(req: Request, res: Response): Promise<any> {
  const job = await prisma.veoVideoJob.findUnique({ where: { id: String(req.params.id) } });
  if (!job || job.userId !== req.user!.id) {
    return res.status(404).json({ message: 'Video not found' });
  }
  if (job.status !== 'pending') return res.json(serialize(job));
  if (!apiKey()) return notConfigured(res);
  if (!job.operationId) {
    const failed = await fail(job.id, 'This video was never submitted successfully.');
    return res.json(serialize(failed));
  }

  try {
    // MUST be a real GenerateVideosOperation INSTANCE, not a `{ name }` literal.
    // getVideosOperation() fetches the raw status and then calls
    // `operation._fromAPIResponse(...)` on the object you handed it, so a plain
    // object dies with "operation._fromAPIResponse is not a function" — a 502
    // that reads as a provider outage while the provider is perfectly healthy.
    // (An `as any` cast on the argument hides exactly this, which is why the
    // name is assigned onto a constructed instance instead.)
    //
    // Only `name` is persisted, and only `name` needs to be set: that is what
    // lets a poll resume in a DIFFERENT request — or a different container —
    // from the one that submitted the job.
    const pending = new GenerateVideosOperation();
    pending.name = job.operationId;
    const operation = await client().operations.getVideosOperation({ operation: pending });

    if (!operation.done) return res.json(serialize(job));

    if (operation.error) {
      const failed = await fail(job.id, String(operation.error.message ?? 'Generation failed.'));
      return res.json(serialize(failed));
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) {
      const failed = await fail(job.id, 'The video service returned no clip.');
      return res.json(serialize(failed));
    }

    // Download once, then park it in our own storage — Veo drops the file
    // after ~48h, so the provider URI is never the permanent location.
    const bytes = await readVideoBytes(video);
    if (!bytes) {
      const failed = await fail(job.id, 'The finished video could not be retrieved.');
      return res.json(serialize(failed));
    }

    const storedUrl = await persistVideo(bytes, job.id);

    const ready = await prisma.veoVideoJob.update({
      where: { id: job.id },
      data: {
        status: 'ready',
        // Fall back to the provider URI only when our own storage refused it —
        // a clip that plays for 48h beats one the owner paid for and lost.
        videoUrl: storedUrl ?? String((video as any).uri ?? ''),
        errorMessage: storedUrl ? null : 'Stored temporarily — this clip expires in about two days.',
      },
    });
    return res.json(serialize(ready));
  } catch (err) {
    return providerError(res, err);
  }
}

// GET /api/video/jobs — this user's recent generations, newest first.
async function listJobs(req: Request, res: Response): Promise<any> {
  const jobs = await prisma.veoVideoJob.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return res.json({ jobs: jobs.map(serialize) });
}

async function fail(id: string, message: string) {
  return prisma.veoVideoJob.update({
    where: { id },
    data: { status: 'failed', errorMessage: message },
  });
}

/** Never expose operationId — it is provider plumbing, not app data. */
function serialize(job: any) {
  return {
    id: job.id,
    status: job.status,
    prompt: job.prompt,
    videoUrl: job.videoUrl,
    durationSecs: job.durationSecs,
    resolution: job.resolution,
    aspectRatio: job.aspectRatio,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
  };
}

const router = Router();
router.post('/generate', middleware.jwtCheck, generate);
router.get('/jobs', middleware.jwtCheck, listJobs);
router.get('/jobs/:id', middleware.jwtCheck, jobStatus);

export default router;

/**
 * Server-side generation for a PRD-defined automatic flow (a scheduler, a
 * post-publish hook). Returns the job id; the caller stores it and polls, or
 * lets the UI poll. NEVER call this on a request path a user is waiting on.
 *
 * Deliberately bypasses the per-user daily cap — an owner-defined automation is
 * not a user hammering a button — but still refuses without a key.
 */
export async function startVideoGeneration(
  userId: number,
  prompt: string,
  opts?: { imageUrl?: string; durationSecs?: number; aspectRatio?: string },
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!apiKey()) return { ok: false, message: 'Google Veo is not configured.' };
  try {
    const operation = await client().models.generateVideos({
      model: MODELS.fast,
      prompt: prompt.slice(0, MAX_PROMPT_CHARS),
      config: {
        durationSeconds: opts?.durationSecs ?? DEFAULT_DURATION,
        resolution: DEFAULT_RESOLUTION,
        aspectRatio: opts?.aspectRatio ?? DEFAULT_ASPECT,
      },
    });
    const job = await prisma.veoVideoJob.create({
      data: {
        userId,
        prompt,
        operationId: operation.name ?? null,
        status: 'pending',
        durationSecs: opts?.durationSecs ?? DEFAULT_DURATION,
        resolution: DEFAULT_RESOLUTION,
        aspectRatio: opts?.aspectRatio ?? DEFAULT_ASPECT,
        model: MODELS.fast,
      },
    });
    return { ok: true, id: job.id };
  } catch (err) {
    console.error('[veo] server-side generation failed:', (err as Error).message);
    return { ok: false, message: 'Could not start video generation.' };
  }
}
