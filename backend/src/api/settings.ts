import { Request, Response } from 'express';
import { isGoogleAIConfigured } from '../custom/integrations/googleai';

async function get(_req: Request, res: Response): Promise<any> {
  try {
    return res.json({ veoApiKeyConfigured: isGoogleAIConfigured() });
  } catch (error) {
    console.error('Error loading settings:', error);
    return res.status(500).json({ message: 'Failed to load settings' });
  }
}

export default { get };
