import { Request, Response } from 'express';
import Settings from '../models/settings';

// Mock Slack channel catalogue — real Slack OAuth + channel listing is
// "planned for a future version" per the PRD; this is enough to exercise the
// admin flow (connect -> pick channel) and the video-completion alert gate.
const MOCK_CHANNELS = ['#general', '#launches', '#video-requests', '#marketing'];

function toClientShape(settings: { slackConnected: boolean; slackChannel: string | null; veoApiKey: string | null }) {
  return {
    slackConnected: settings.slackConnected,
    slackChannel: settings.slackChannel,
    veoApiKeyConfigured: !!settings.veoApiKey?.trim(),
    availableChannels: MOCK_CHANNELS,
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

async function connectSlack(req: Request, res: Response): Promise<any> {
  try {
    const settings = await Settings.update(req.user!.tenantId, { slackConnected: true });
    return res.json(toClientShape(settings));
  } catch (error) {
    console.error('Error connecting Slack:', error);
    return res.status(500).json({ message: 'Failed to connect Slack' });
  }
}

async function disconnectSlack(req: Request, res: Response): Promise<any> {
  try {
    const settings = await Settings.update(req.user!.tenantId, { slackConnected: false, slackChannel: null });
    return res.json(toClientShape(settings));
  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    return res.status(500).json({ message: 'Failed to disconnect Slack' });
  }
}

async function setChannel(req: Request, res: Response): Promise<any> {
  try {
    const { channel } = req.body;
    if (!channel || typeof channel !== 'string' || !MOCK_CHANNELS.includes(channel)) {
      return res.status(400).json({ message: 'Choose a valid alert channel' });
    }
    const current = await Settings.getOrCreate(req.user!.tenantId);
    if (!current.slackConnected) {
      return res.status(400).json({ message: 'Connect Slack before choosing an alert channel' });
    }
    const settings = await Settings.update(req.user!.tenantId, { slackChannel: channel });
    return res.json(toClientShape(settings));
  } catch (error) {
    console.error('Error setting Slack channel:', error);
    return res.status(500).json({ message: 'Failed to set alert channel' });
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

export default { get, connectSlack, disconnectSlack, setChannel, setVeoKey, clearVeoKey };
