import { Request, Response } from 'express';
import VideoJob from '../models/videoJob';
import User from '../models/user';
import { resolveDisplayName } from '../lib/displayName';
import { notifySlackForUser } from '../custom/integrations/slack';
import { isGoogleAIConfigured, startVideoGeneration } from '../custom/integrations/googleai';

const VALID_MODES = new Set(['text', 'image']);

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
    let job = await VideoJob.getById(id);
    if (!job || job.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Sync status from the kit's VeoVideoJob when still in progress
    if (job.veoJobId && (job.status === 'queued' || job.status === 'rendering')) {
      const updated = await VideoJob.syncVeoStatus(job.id, job.veoJobId, job.status);
      if (updated) {
        if (updated.status === 'completed') {
          notifySlackForUser(updated.creatorId, {
            text: `Your video "${updated.title}" has finished rendering and is ready to view.`,
            title: 'Video Ready',
            fields: [
              { label: 'Title', value: updated.title },
              { label: 'Mode', value: updated.mode === 'image' ? 'Image-to-video' : 'Text-to-video' },
              { label: 'Status', value: 'Completed' },
            ],
          });
        }
        job = updated;
      }
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

    if (!isGoogleAIConfigured()) {
      return res.status(503).json({ message: 'Google Veo is not configured.' });
    }

    const genResult = await startVideoGeneration(req.user!.id, prompt.trim(), {
      imageUrl: mode === 'image' ? sourceImageUrl : undefined,
    });
    if (!genResult.ok) {
      return res.status(503).json({ message: genResult.message });
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
      veoJobId: genResult.id,
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error('Error creating video job:', error);
    return res.status(500).json({ message: 'Failed to start video generation' });
  }
}

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

    if (!isGoogleAIConfigured()) {
      return res.status(503).json({ message: 'Google Veo is not configured.' });
    }

    const genResult = await startVideoGeneration(original.creatorId, original.prompt, {
      imageUrl: original.mode === 'image' ? original.sourceImageUrl ?? undefined : undefined,
    });
    if (!genResult.ok) {
      return res.status(503).json({ message: genResult.message });
    }

    const job = await VideoJob.create({
      tenantId: original.tenantId,
      creatorId: original.creatorId,
      creatorDisplayName: original.creatorDisplayName,
      title: original.title,
      prompt: original.prompt,
      mode: original.mode,
      sourceImageUrl: original.sourceImageUrl,
      veoJobId: genResult.id,
    });
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
