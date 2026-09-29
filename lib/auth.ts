import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET!);
export const hashPw = (p: string) => bcrypt.hash(p, 12);
export const checkPw = bcrypt.compare;
export async function startSession(userId: string) {
  const t = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(key());
  (await cookies()).set('sf', t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });
}
export async function requireUser(): Promise<string> {
  const t = (await cookies()).get('sf')?.value;
  try { if (t) return (await jwtVerify(t, key())).payload.sub as string; } catch {}
  throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
export const handle = async (fn: () => Promise<Response>) => {
  try { return await fn(); } catch (e) {
    if (e instanceof Response) return e;
    console.error(e); return Response.json({ error: 'Server error' }, { status: 500 });
  }
};
