import { db } from './db';
import { decrypt } from './crypto';
import { ADAPTERS } from './adapters';
/** Each target is independent: one failure never affects the others. Phase 2: move into a queue worker. */
export async function publishTargets(postId: string) {
  const targets = await db.postTarget.findMany({ where: { postId, status: { in: ['pending', 'failed'] } }, include: { account: true, post: true } });
  await Promise.all(targets.map(async (t) => {
    await db.postTarget.update({ where: { id: t.id }, data: { status: 'uploading', error: null } });
    const attemptNo = (await db.publishAttempt.count({ where: { targetId: t.id } })) + 1;
    try {
      const r = await ADAPTERS[t.account.platform].publish(
        { caption: t.post.caption, mediaUrls: t.post.mediaUrls, settings: t.settings as Record<string, unknown> },
        { externalId: t.account.externalId, accessToken: t.account.accessTokenEnc ? decrypt(t.account.accessTokenEnc) : null });
      await db.postTarget.update({ where: { id: t.id }, data: { status: 'published', externalPostId: r.externalPostId, publishedAt: new Date() } });
      await db.publishAttempt.create({ data: { targetId: t.id, attemptNo, status: 'published' } });
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Unknown error';
      await db.postTarget.update({ where: { id: t.id }, data: { status: 'failed', error } });
      await db.publishAttempt.create({ data: { targetId: t.id, attemptNo, status: 'failed', error } });
    }
  }));
  const all = await db.postTarget.findMany({ where: { postId } });
  const ok = all.filter((t) => t.status === 'published').length;
  await db.post.update({ where: { id: postId }, data: { status: ok === all.length ? 'published' : ok ? 'partial' : 'failed' } });
}
