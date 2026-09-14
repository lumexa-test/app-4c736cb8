import { prisma } from '../lib/prisma';

async function create(data: {
  tenantId: string;
  creatorId: number;
  creatorDisplayName: string;
  title: string;
  prompt: string;
  mode: string;
  sourceImageUrl?: string | null;
  veoJobId?: string | null;
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

/**
 * Sync the app's VideoJob status from the kit's VeoVideoJob.
 * Returns the updated VideoJob if status changed, null otherwise.
 */
async function syncVeoStatus(id: number, veoJobId: string, currentStatus: string) {
  const veoJob = await prisma.veoVideoJob.findUnique({ where: { id: veoJobId } });
  if (!veoJob) return null;
  if (veoJob.status === 'ready' && currentStatus !== 'completed') {
    return prisma.videoJob.update({ where: { id }, data: { status: 'completed' } });
  }
  if (veoJob.status === 'failed' && currentStatus !== 'failed') {
    return prisma.videoJob.update({
      where: { id },
      data: { status: 'failed', errorMessage: veoJob.errorMessage ?? 'Generation failed.' },
    });
  }
  if (veoJob.status === 'pending' && currentStatus === 'queued') {
    return prisma.videoJob.update({ where: { id }, data: { status: 'rendering' } });
  }
  return null;
}

export default { create, listByTenant, getById, remove, transition, syncVeoStatus };
