import { Request, Response } from 'express';
import Message from '../models/message';
import User from '../models/user';
import { resolveDisplayName } from '../lib/displayName';

async function list(req: Request, res: Response): Promise<any> {
  try {
    const messages = await Message.listByTenant(req.user!.tenantId);
    return res.json(messages);
  } catch (error) {
    console.error('Error listing messages:', error);
    return res.status(500).json({ message: 'Failed to load workspace messages' });
  }
}

async function create(req: Request, res: Response): Promise<any> {
  try {
    const { body } = req.body;
    if (!body || typeof body !== 'string' || !body.trim() || body.trim().length > 4000) {
      return res.status(400).json({ message: 'Message must be between 1 and 4000 characters' });
    }
    const user = await User.getUserById(req.user!.id);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const message = await Message.create({
      tenantId: req.user!.tenantId,
      authorId: user.id,
      authorDisplayName: resolveDisplayName(user),
      body: body.trim(),
    });
    return res.status(201).json(message);
  } catch (error) {
    console.error('Error posting message:', error);
    return res.status(500).json({ message: 'Failed to post message' });
  }
}

// Author (or an admin) can delete their own message — e.g. to retract a
// mistaken post. Cross-tenant ids are treated as not-found so tenant
// boundaries never leak through a 403 vs 404 distinction.
async function remove(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params.id);
    const message = await Message.getById(id);
    if (!message || message.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (message.authorId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    await Message.deleteById(id);
    return res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
}

export default { list, create, remove };
