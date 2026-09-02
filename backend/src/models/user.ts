import { prisma } from '../lib/prisma';

async function createUser(data: { email: string; password: string; tenantId: string; displayName?: string; isAdmin?: boolean }) {
  return prisma.user.create({ data });
}

/** Used at signup time to decide whether a new user is the first member of their tenant. */
async function countByTenant(tenantId: string) {
  return prisma.user.count({ where: { tenantId } });
}

async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

async function updatePassword(id: number, password: string) {
  return prisma.user.update({ where: { id }, data: { password } });
}

/** Tenant-scoped list of users (password never selected) — workspace members for messaging. */
async function listByTenant(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, displayName: true, tenantId: true, isAdmin: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function deleteById(id: number) {
  return prisma.user.delete({ where: { id } });
}

export default { createUser, getUserByEmail, getUserById, updatePassword, listByTenant, countByTenant, deleteById };
