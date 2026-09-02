import { prisma } from '../lib/prisma';

async function create(data: {
  tenantId: string;
  senderId: number;
  senderDisplayName: string;
  recipientId: number;
  recipientDisplayName: string;
  body: string;
}) {
  return prisma.directMessage.create({ data });
}

/** The full conversation between two members, oldest-first. */
async function conversation(tenantId: string, userA: number, userB: number) {
  const rows = await prisma.directMessage.findMany({
    where: {
      tenantId,
      OR: [
        { senderId: userA, recipientId: userB },
        { senderId: userB, recipientId: userA },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows;
}

/** Distinct set of user ids the given user has exchanged DMs with (for a conversation list). */
async function conversationPartnerIds(tenantId: string, userId: number): Promise<number[]> {
  const rows = await prisma.directMessage.findMany({
    where: { tenantId, OR: [{ senderId: userId }, { recipientId: userId }] },
    select: { senderId: true, recipientId: true },
  });
  const ids = new Set<number>();
  for (const r of rows) {
    ids.add(r.senderId === userId ? r.recipientId : r.senderId);
  }
  return Array.from(ids);
}

async function getById(id: number) {
  return prisma.directMessage.findUnique({ where: { id } });
}

async function deleteById(id: number) {
  return prisma.directMessage.delete({ where: { id } });
}

export default { create, conversation, conversationPartnerIds, getById, deleteById };
