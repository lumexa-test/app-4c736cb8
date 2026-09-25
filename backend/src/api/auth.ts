import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import config from '../../config';
import User from '../models/user';

async function login(req: Request, res: Response): Promise<any> {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, tenantId: user.tenantId, isAdmin: user.isAdmin === true },
      config.jwtSecret,
      { expiresIn: '7d' },
    );

    const { password: _password, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function signup(req: Request, res: Response): Promise<any> {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
    return res.status(400).json({ message: 'Display name is required' });
  }

  try {
    const existingUser = await User.getUserByEmail(email);
    if (existingUser) return res.status(409).json({ message: 'An account with that email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // tenantId: in the MVP generator, override this with the project's tenant identifier.
    // Default: 'default' for single-tenant use. Extend by reading from req.headers['x-tenant-id'].
    const tenantId = (req.headers['x-tenant-id'] as string) ?? 'default';

    // The first person to join a tenant bootstraps it and becomes its admin
    // (there's no invite/team-management UI per the PRD, so this is the only
    // way a brand-new tenant ever gets an admin able to reach Settings).
    const isFirstInTenant = (await User.countByTenant(tenantId)) === 0;

    const user = await User.createUser({
      email,
      password: hashedPassword,
      tenantId,
      displayName: displayName.trim().slice(0, 80),
      isAdmin: isFirstInTenant,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, tenantId: user.tenantId, isAdmin: user.isAdmin === true },
      config.jwtSecret,
      { expiresIn: '7d' },
    );

    const { password: _password, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Error during signup:', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
}

// Change the authenticated user's password. Requires the current password.
// Mounted behind jwtCheck, so req.user.id is the actor.
async function changePassword(req: Request, res: Response): Promise<any> {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.getUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashed);
    return res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Error during change-password:', error);
    return res.status(500).json({ message: 'Password change failed' });
  }
}

export default { login, signup, changePassword };
