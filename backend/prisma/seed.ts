/**
 * Seed script — runs after every `prisma db push` / `prisma migrate deploy`
 * to guarantee a single admin user exists. Idempotent (upsert keyed on
 * email), safe to run on every deploy.
 *
 * Email defaults to `admin@<APP_SLUG>.app` when APP_SLUG env var is set
 * (build pipeline injects this); otherwise falls back to `admin@app.local`.
 * Password is plain `admin123` (hashed at rest with bcrypt). Override
 * either via env var when needed.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function deriveEmail(): string {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL;
  const slug = (process.env.APP_SLUG ?? 'app')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';
  return `admin@${slug}.app`;
}

async function main() {
  const email = deriveEmail();
  const plainPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const password = await bcrypt.hash(plainPassword, 10);
  const tenantId = process.env.ADMIN_TENANT_ID ?? 'default';

  const admin = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: { email, password, tenantId, isAdmin: true },
  });

  console.log(`[seed] Admin user ready: ${admin.email} (id=${admin.id})`);

  await seedDomainData(tenantId, admin.id);
}

// ── Domain demo data (idempotent, runs every container start) ─────────────
// Realistic workspace content so the landing/browse/dashboard screens never
// look empty on first load. Keyed on unique fields so re-running is a no-op.
async function seedDomainData(tenantId: string, adminId: number): Promise<void> {
  const memberSeed: { email: string; displayName: string }[] = [
    { email: `sarah.chen@${tenantId === 'default' ? 'vidslack' : tenantId}.demo`, displayName: 'Sarah Chen' },
    { email: `marcus.oyelaran@${tenantId === 'default' ? 'vidslack' : tenantId}.demo`, displayName: 'Marcus Oyelaran' },
    { email: `priya.nair@${tenantId === 'default' ? 'vidslack' : tenantId}.demo`, displayName: 'Priya Nair' },
    { email: `diego.fuentes@${tenantId === 'default' ? 'vidslack' : tenantId}.demo`, displayName: 'Diego Fuentes' },
    { email: `lena.kowalski@${tenantId === 'default' ? 'vidslack' : tenantId}.demo`, displayName: 'Lena Kowalski' },
  ];
  const memberPassword = await bcrypt.hash('demo1234', 10);
  const members = [];
  for (const m of memberSeed) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { displayName: m.displayName },
      create: { email: m.email, password: memberPassword, tenantId, displayName: m.displayName },
    });
    members.push(user);
  }
  const [sarah, marcus, priya, diego, lena] = members;

  // Tenant settings — Slack connected with an alert channel, Veo key
  // configured, so the demo tenant is immediately past the "cost gate".
  await prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      slackConnected: true,
      slackChannel: '#launches',
      veoApiKey: 'demo-veo-key-12345',
    },
  });

  // Video jobs — a realistic spread of statuses across several creators.
  const videoJobsSeed = [
    { creator: sarah, title: 'Spring launch teaser', prompt: 'A pastel product bottle rotating slowly on a marble podium, soft studio light, 8s loop.', mode: 'text', status: 'completed', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { creator: marcus, title: 'Onboarding walkthrough clip', prompt: 'A friendly animated arrow guiding a cursor through a dashboard, clean UI, upbeat pace.', mode: 'text', status: 'completed', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { creator: priya, title: 'Weekend sale vertical ad', prompt: 'Bright bold sale graphics animating in over a gradient background, vertical 9:16 format.', mode: 'text', status: 'rendering', videoUrl: null },
    { creator: diego, title: 'Team photo motion', prompt: 'Gentle parallax zoom over a team photo, warm color grade, subtle particle overlay.', mode: 'image', status: 'completed', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    { creator: lena, title: 'New feature announcement', prompt: 'A sleek dark UI mockup animating open with a glowing highlight on the new button.', mode: 'text', status: 'failed', videoUrl: null },
    { creator: sarah, title: 'Customer testimonial intro', prompt: 'A calm portrait slowly coming into focus with a soft light flare, cinematic.', mode: 'image', status: 'queued', videoUrl: null },
    { creator: marcus, title: 'Conference recap sizzle', prompt: 'Fast cuts of a stage, crowd, and confetti with bold sans-serif title cards.', mode: 'text', status: 'completed', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
  ];
  for (const v of videoJobsSeed) {
    const existing = await prisma.videoJob.findFirst({ where: { tenantId, title: v.title, creatorId: v.creator.id } });
    if (!existing) {
      await prisma.videoJob.create({
        data: {
          tenantId,
          creatorId: v.creator.id,
          creatorDisplayName: v.creator.displayName ?? v.creator.email.split('@')[0],
          title: v.title,
          prompt: v.prompt,
          mode: v.mode,
          status: v.status,
          videoUrl: v.videoUrl,
          errorMessage: v.status === 'failed' ? 'Generation failed. Please try again.' : null,
          sourceImageUrl: v.mode === 'image' ? '/uploads/label-logo-277e1cf0.png' : null,
        },
      });
    }
  }

  // Workspace feed — a short realistic conversation plus one bot alert.
  const messagesSeed = [
    { author: sarah, body: 'Just kicked off the spring launch render — should be ready in a few minutes.', isBot: false },
    { author: marcus, body: 'Nice, can you post it to #launches when it is done?', isBot: false },
    { author: null, body: '🎬 Sarah Chen\'s video "Spring launch teaser" just finished rendering — posted to #launches.', isBot: true },
    { author: priya, body: 'Working on the weekend sale vertical ad now, will share a draft shortly.', isBot: false },
    { author: diego, body: 'The team photo motion clip turned out great, adding it to the deck.', isBot: false },
    { author: lena, body: 'Feature announcement render failed on my end — retrying now.', isBot: false },
  ];
  for (const m of messagesSeed) {
    const authorId = m.author ? m.author.id : 0;
    const authorDisplayName = m.author ? (m.author.displayName ?? m.author.email.split('@')[0]) : 'Slack Bot';
    const existing = await prisma.message.findFirst({ where: { tenantId, authorId, body: m.body } });
    if (!existing) {
      await prisma.message.create({ data: { tenantId, authorId, authorDisplayName, body: m.body, isBot: m.isBot } });
    }
  }

  // A couple of direct-message threads between members.
  const dmSeed: { from: typeof sarah; to: typeof sarah; body: string }[] = [
    { from: marcus, to: priya, body: 'Hey, do you have the brand colors for the sale ad handy?' },
    { from: priya, to: marcus, body: 'Yep — sending the palette over in #launches shortly.' },
    { from: diego, to: sarah, body: 'Loved the spring teaser, mind if I reuse the prompt for a variant?' },
  ];
  for (const dm of dmSeed) {
    const existing = await prisma.directMessage.findFirst({
      where: { tenantId, senderId: dm.from.id, recipientId: dm.to.id, body: dm.body },
    });
    if (!existing) {
      await prisma.directMessage.create({
        data: {
          tenantId,
          senderId: dm.from.id,
          senderDisplayName: dm.from.displayName ?? dm.from.email.split('@')[0],
          recipientId: dm.to.id,
          recipientDisplayName: dm.to.displayName ?? dm.to.email.split('@')[0],
          body: dm.body,
        },
      });
    }
  }

  console.log(`[seed] Domain demo data ready for tenant "${tenantId}" (admin id=${adminId}).`);
}

main()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
