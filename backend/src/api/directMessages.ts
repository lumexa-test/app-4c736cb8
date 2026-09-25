import { Request, Response } from 'express';
import DirectMessage from '../models/directMessage';
import User from '../models/user';
import { resolveDisplayName } from '../lib/displayName';

async function conversation(req: Request, res: Response): Promise<any> {
  try {
    const withId = Number(req.query['with']);
    if (!withId || Number.isNaN(withId)) {
      return res.status(400).json({ message: 'A "with" user id is required' });
    }
    const other = await User.getUserById(withId);
    if (!other || other.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Workspace member not found' });
    }
    const messages = await DirectMessage.conversation(req.user!.tenantId, req.user!.id, withId);
    return res.json(messages);
  } catch (error) {
    console.error('Error loading conversation:', error);
    return res.status(500).json({ message: 'Failed to load conversation' });
  }
}

async function partners(req: Request, res: Response): Promise<any> {
  try {
    const ids = await DirectMessage.conversationPartnerIds(req.user!.tenantId, req.user!.id);
    return res.json(ids);
  } catch (error) {
    console.error('Error loading conversation partners:', error);
    return res.status(500).json({ message: 'Failed to load conversations' });
  }
}

async function create(req: Request, res: Response): Promise<any> {
  try {
    const { recipientId, body } = req.body;
    const recipientIdNum = Number(recipientId);
    if (!recipientIdNum || Number.isNaN(recipientIdNum)) {
      return res.status(400).json({ message: 'A recipient is required' });
    }
    if (recipientIdNum === req.user!.id) {
      return res.status(400).json({ message: "You can't message yourself." });
    }
    if (!body || typeof body !== 'string' || !body.trim() || body.trim().length > 4000) {
      return res.status(400).json({ message: 'Message must be between 1 and 4000 characters' });
    }

    const [sender, recipient] = await Promise.all([
      User.getUserById(req.user!.id),
      User.getUserById(recipientIdNum),
    ]);
    if (!sender) return res.status(401).json({ message: 'Unauthorized' });
    if (!recipient || recipient.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Workspace member not found' });
    }

    const message = await DirectMessage.create({
      tenantId: req.user!.tenantId,
      senderId: sender.id,
      senderDisplayName: resolveDisplayName(sender),
      recipientId: recipient.id,
      recipientDisplayName: resolveDisplayName(recipient),
      body: body.trim(),
    });
    return res.status(201).json(message);
  } catch (error) {
    console.error('Error sending direct message:', error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
}

// Sender (or an admin) can delete a direct message they sent.
async function remove(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params.id);
    const dm = await DirectMessage.getById(id);
    if (!dm || dm.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (dm.senderId !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'You can only delete messages you sent' });
    }
    await DirectMessage.deleteById(id);
    return res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting direct message:', error);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
}

export default { conversation, partners, create, remove };
