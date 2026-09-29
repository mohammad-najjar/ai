import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser, handle } from '@/lib/auth';
import { publishTargets } from '@/lib/publish';
const B = z.object({ caption: z.string().max(2200), mediaUrls: z.array(z.string().url()).default([]), accountIds: z.array(z.string()).min(1),
  settings: z.record(z.unknown()).default({}), mode: z.enum(['now', 'schedule', 'draft']), scheduledAt: z.string().datetime().optional(), timezone: z.string().optional() });
export const GET = () => handle(async () => {
  const userId = await requireUser();
  return Response.json(await db.post.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { targets: { include: { account: { select: { platform: true, username: true } } } } } }));
});
export const POST = (req: Request) => handle(async () => {
  const userId = await requireUser();
  const b = B.safeParse(await req.json());
  if (!b.success) return Response.json({ error: 'Invalid input', details: b.error.flatten() }, { status: 400 });
  const d = b.data;
  if (d.mode === 'schedule' && !d.scheduledAt) return Response.json({ error: 'scheduledAt required' }, { status: 400 });
  const own = await db.socialAccount.findMany({ where: { id: { in: d.accountIds }, userId } });
  if (own.length !== d.accountIds.length) return Response.json({ error: 'Unknown account' }, { status: 403 });
  const post = await db.post.create({ data: { userId, caption: d.caption, mediaUrls: d.mediaUrls, timezone: d.timezone,
    scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null, status: d.mode === 'draft' ? 'draft' : d.mode === 'schedule' ? 'scheduled' : 'publishing',
    targets: { create: d.accountIds.map((accountId) => ({ accountId, settings: d.settings as object })) } } });
  if (d.mode === 'now') await publishTargets(post.id); // scheduled posts need the phase-2 worker
  return Response.json(await db.post.findUnique({ where: { id: post.id }, include: { targets: true } }));
});
