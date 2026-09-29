import { db } from '@/lib/db';
import { requireUser, handle } from '@/lib/auth';
// Tokens are never selected, so they can never reach the browser.
export const GET = () => handle(async () => {
  const userId = await requireUser();
  return Response.json(await db.socialAccount.findMany({ where: { userId }, select: { id: true, platform: true, username: true, avatarUrl: true, status: true, followers: true, postsCount: true, lastSyncedAt: true } }));
});
