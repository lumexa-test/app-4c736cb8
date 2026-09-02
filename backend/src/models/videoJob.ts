import { prisma } from '../lib/prisma';

async function create(data: {
  tenantId: string;
  creatorId: number;
  creatorDisplayName: string;
  title: string;
  prompt: string;
  mode: string;
  sourceImageUrl?: string | null;
}) {
  return prisma.videoJob.create({ data });
}

async function listByTenant(tenantId: string, creatorId?: number) {
  return prisma.videoJob.findMany({
    where: { tenantId, ...(creatorId ? { creatorId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id: number) {
  return prisma.videoJob.findUnique({ where: { id } });
}

async function remove(id: number) {
  return prisma.videoJob.delete({ where: { id } });
}

/** Atomic conditional transition — only succeeds if the job is still in `from`. Returns affected count. */
async function transition(
  id: number,
  from: string,
  data: { status: string; videoUrl?: string | null; errorMessage?: string | null },
) {
  const result = await prisma.videoJob.updateMany({ where: { id, status: from }, data });
  return result.count;
}

export default { create, listByTenant, getById, remove, transition };
