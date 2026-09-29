import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { requireUser, handle } from '@/lib/auth';
export const GET = () => handle(async () => {
  await requireUser();
  const state = randomBytes(16).toString('hex');
  (await cookies()).set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: `${process.env.APP_URL}/api/oauth/youtube/callback`, response_type: 'code',
    access_type: 'offline', prompt: 'consent', state, scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly' });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
});
