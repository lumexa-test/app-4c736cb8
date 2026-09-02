import { Request, Response } from 'express';
import Settings from '../models/settings';

function toClientShape(settings: { veoApiKey: string | null }) {
  return {
    veoApiKeyConfigured: !!settings.veoApiKey?.trim(),
  };
}

async function get(req: Request, res: Response): Promise<any> {
  try {
    const settings = await Settings.getOrCreate(req.user!.tenantId);
    return res.json(toClientShape(settings));
  } catch (error) {
    console.error('Error loading settings:', error);
    return res.status(500).json({ message: 'Failed to load settings' });
  }
}

async function setVeoKey(req: Request, res: Response): Promise<any> {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
      return res.status(400).json({ message: 'API key must be at least 8 characters' });
    }
    const settings = await Settings.update(req.user!.tenantId, { veoApiKey: apiKey.trim() });
    return res.json(toClientShape(settings));
  } catch (error) {
    console.error('Error setting Veo API key:', error);
    return res.status(500).json({ message: 'Failed to save API key' });
  }
}

async function clearVeoKey(req: Request, res: Response): Promise<any> {
  try {
    const settings = await Settings.update(req.user!.tenantId, { veoApiKey: null });
    return res.json(toClientShape(settings));
  } catch (error) {
    console.error('Error clearing Veo API key:', error);
    return res.status(500).json({ message: 'Failed to clear API key' });
  }
}

export default { get, setVeoKey, clearVeoKey };
