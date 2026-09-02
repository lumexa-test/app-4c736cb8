import { Request, Response } from 'express';
import User from '../models/user';

// List all users in the actor's tenant. Mounted behind jwtCheck + requireAdmin.
async function listUsers(req: Request, res: Response): Promise<any> {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const users = await User.listByTenant(req.user.tenantId);
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default { listUsers };
