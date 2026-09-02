import { prisma } from '../lib/prisma';

async function getOrCreate(tenantId: string) {
  const existing = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return prisma.tenantSettings.create({ data: { tenantId } });
}

async function isVeoConfigured(tenantId: string): Promise<boolean> {
  const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  return !!settings?.veoApiKey?.trim();
}

async function update(
  tenantId: string,
  data: { slackConnected?: boolean; slackChannel?: string | null; veoApiKey?: string | null },
) {
  await getOrCreate(tenantId);
  return prisma.tenantSettings.update({ where: { tenantId }, data });
}

export default { getOrCreate, isVeoConfigured, update };
