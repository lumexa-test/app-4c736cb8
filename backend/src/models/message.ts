import { prisma } from '../lib/prisma';

async function create(data: { tenantId: string; authorId: number; authorDisplayName: string; body: string; isBot?: boolean }) {
  return prisma.message.create({ data });
}

/** Most recent `limit` messages, returned oldest-first (chat reads top-to-bottom). */
async function listByTenant(tenantId: string, limit = 100) {
  const rows = await prisma.message.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.reverse();
}

async function getById(id: number) {
  return prisma.message.findUnique({ where: { id } });
}

async function deleteById(id: number) {
  return prisma.message.delete({ where: { id } });
}

export default { create, listByTenant, getById, deleteById };
