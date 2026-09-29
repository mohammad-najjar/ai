import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { requireUser, handle } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';
export const GET = (req: Request) => handle(async () => {
  const userId = await requireUser();
  const u = new URL(req.url), code = u.searchParams.get('code');
  if (!code || u.searchParams.get('state') !== (await cookies()).get('oauth_state')?.value) return Response.json({ error: 'Invalid OAuth state' }, { status: 400 });
  const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${process.env.APP_URL}/api/oauth/youtube/callback`, grant_type: 'authorization_code' }) });
  const t = await tr.json();
  if (!tr.ok) return Response.json({ error: 'Token exchange failed' }, { status: 502 });
  const cr = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: { Authorization: `Bearer ${t.access_token}` } });
  const ch = (await cr.json()).items?.[0];
  if (!ch) return Response.json({ error: 'No YouTube channel on this Google account' }, { status: 400 });
  const data = { userId, platform: 'youtube' as const, externalId: ch.id, username: ch.snippet.title, avatarUrl: ch.snippet.thumbnails?.default?.url,
    followers: Number(ch.statistics.subscriberCount ?? 0), postsCount: Number(ch.statistics.videoCount ?? 0), status: 'connected' as const,
    accessTokenEnc: encrypt(t.access_token), refreshTokenEnc: t.refresh_token ? encrypt(t.refresh_token) : undefined,
    tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000), lastSyncedAt: new Date() };
  await db.socialAccount.upsert({ where: { platform_externalId: { platform: 'youtube', externalId: ch.id } }, create: data, update: data });
  await db.activityLog.create({ data: { userId, action: 'account_connected', status: 'success', message: `YouTube channel ${ch.snippet.title} connected` } });
  return Response.redirect(`${process.env.APP_URL}/#accounts`);
});
