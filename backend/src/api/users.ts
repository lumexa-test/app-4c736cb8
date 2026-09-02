import { Request, Response } from 'express';
import User from '../models/user';
import { resolveDisplayName } from '../lib/displayName';

// Workspace member directory — used by Workspace (who's online-ish) and the
// Direct Messages recipient picker. Tenant-scoped, no passwords.
async function list(req: Request, res: Response): Promise<any> {
  try {
    const users = await User.listByTenant(req.user!.tenantId);
    const shaped = users.map((u) => ({
      id: u.id,
      displayName: resolveDisplayName(u),
      isAdmin: u.isAdmin,
    }));
    return res.json(shaped);
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ message: 'Failed to load workspace members' });
  }
}

// Self-service account deletion (or an admin removing a member of their own
// tenant). No dedicated "team management" UI is built on this — it's the
// same personal "delete my account" capability most apps expose.
async function remove(req: Request, res: Response): Promise<any> {
  try {
    const id = Number(req.params.id);
    const target = await User.getUserById(id);
    if (!target || target.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (target.id !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ message: 'You can only remove your own account' });
    }
    await User.deleteById(id);
    return res.json({ message: 'User removed' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Failed to remove user' });
  }
}

export default { list, remove };
