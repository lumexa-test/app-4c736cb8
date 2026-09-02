import { Request, Response } from 'express';
import VideoJob from '../models/videoJob';
import Settings from '../models/settings';
import Message from '../models/message';
import User from '../models/user';
import { resolveDisplayName } from '../lib/displayName';

const VALID_MODES = new Set(['text', 'image']);

/**
 * Google Veo is "planned for a future version" (per the PRD) — there is no
 * real generation backend to call. This simulates the queued -> rendering ->
 * completed|failed lifecycle with atomic conditional updates so concurrent
 * reads/deletes can never observe (or create) an inconsistent transition.
 */
function simulateGeneration(jobId: number, tenantId: string): void {
  setTimeout(async () => {
    await VideoJob.transition(jobId, 'queued', { status: 'rendering' });
    setTimeout(async () => {
      const succeeded = Math.random() < 0.85;
      const job = await VideoJob.getById(jobId);
      if (!job) return; // deleted mid-flight
      if (succeeded) {
        const count = await VideoJob.transition(jobId, 'rendering', {
          status: 'completed',
          videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        });
        if (count > 0) {
          const settings = await Settings.getOrCreate(tenantId);
          if (settings.slackConnected && settings.slackChannel) {
            await Message.create({
              tenantId,
              authorId: 0,
              authorDisplayName: 'Slack Bot',
              isBot: true,
              body: `🎬 ${job.creatorDisplayName}'s video "${job.title}" just finished rendering — posted to ${settings.slackChannel}.`,
            });
          }
        }
      } else {
        await VideoJob.transition(jobId, 'rendering', {
          status: 'failed',
          errorMessage: 'Generation failed. Please try again.',
        });
      }
    }, 5000);
  }, 2000);
}

async function list(req: Request, res: Response): Promise<any> {
  try {
    const mine = req.query['mine'] === 'true';
    const jobs = await VideoJob.listByTenant(req.user!.tenantId, mine ? req.user!.id : undefined);
    return res.json(jobs);
  } catch (error) {
    console.error('Error listing video jobs:', error);
    return res.status(500).json({ message: 'Failed to load videos' });
  }
}

async function get(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params['id']);
    const job = await VideoJob.getById(id);
    if (!job || job.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Video not found' });
    }
    return res.json(job);
  } catch (error) {
    console.error('Error fetching video job:', error);
    return res.status(500).json({ message: 'Failed to load video' });
  }
}

async function create(req: Request, res: Response): Promise<any> {
  try {
    const { title, prompt, mode, sourceImageUrl } = req.body;

    if (!title || typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
      return res.status(400).json({ message: 'Title is required (max 120 characters)' });
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10 || prompt.trim().length > 500) {
      return res.status(400).json({ message: 'Prompt must be between 10 and 500 characters' });
    }
    if (!VALID_MODES.has(mode)) {
      return res.status(400).json({ message: 'Mode must be "text" or "image"' });
    }
    if (mode === 'image' && (!sourceImageUrl || typeof sourceImageUrl !== 'string')) {
      return res.status(400).json({ message: 'An uploaded image is required for image-to-video' });
    }

    const configured = await Settings.isVeoConfigured(req.user!.tenantId);
    if (!configured) {
      return res.status(503).json({ message: 'Google Veo is not configured.' });
    }

    const user = await User.getUserById(req.user!.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const job = await VideoJob.create({
      tenantId: req.user!.tenantId,
      creatorId: req.user!.id,
      creatorDisplayName: resolveDisplayName(user),
      title: title.trim(),
      prompt: prompt.trim(),
      mode,
      sourceImageUrl: mode === 'image' ? sourceImageUrl : null,
    });

    simulateGeneration(job.id, job.tenantId);
    return res.status(201).json(job);
  } catch (error) {
    console.error('Error creating video job:', error);
    return res.status(500).json({ message: 'Failed to start video generation' });
  }
}

// Retries never mutate the original (failed) job — they create a brand new one.
async function retry(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params['id']);
    const original = await VideoJob.getById(id);
    if (!original || original.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Video not found' });
    }
    if (original.creatorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'You can only retry your own videos' });
    }

    const configured = await Settings.isVeoConfigured(req.user!.tenantId);
    if (!configured) {
      return res.status(503).json({ message: 'Google Veo is not configured.' });
    }

    const job = await VideoJob.create({
      tenantId: original.tenantId,
      creatorId: original.creatorId,
      creatorDisplayName: original.creatorDisplayName,
      title: original.title,
      prompt: original.prompt,
      mode: original.mode,
      sourceImageUrl: original.sourceImageUrl,
    });
    simulateGeneration(job.id, job.tenantId);
    return res.status(201).json(job);
  } catch (error) {
    console.error('Error retrying video job:', error);
    return res.status(500).json({ message: 'Failed to retry video generation' });
  }
}

async function remove(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params['id']);
    const job = await VideoJob.getById(id);
    if (!job || job.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Video not found' });
    }
    if (job.creatorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own videos' });
    }
    await VideoJob.remove(id);
    return res.json({ message: 'Video deleted' });
  } catch (error) {
    console.error('Error deleting video job:', error);
    return res.status(500).json({ message: 'Failed to delete video' });
  }
}

async function download(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params['id']);
    const job = await VideoJob.getById(id);
    if (!job || job.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Video not found' });
    }
    if (job.status !== 'completed' || !job.videoUrl) {
      return res.status(409).json({ message: 'This video is not ready yet.' });
    }
    return res.json({ url: job.videoUrl });
  } catch (error) {
    console.error('Error downloading video job:', error);
    return res.status(500).json({ message: 'Failed to download video' });
  }
}

export default { list, get, create, retry, remove, download };
