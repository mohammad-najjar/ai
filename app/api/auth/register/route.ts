import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPw, startSession, handle } from '@/lib/auth';
const B = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) });
export const POST = (req: Request) => handle(async () => {
  const b = B.safeParse(await req.json());
  if (!b.success) return Response.json({ error: 'Invalid input' }, { status: 400 });
  if (await db.user.findUnique({ where: { email: b.data.email } })) return Response.json({ error: 'Email already registered' }, { status: 409 });
  const u = await db.user.create({ data: { name: b.data.name, email: b.data.email, passwordHash: await hashPw(b.data.password) } });
  await startSession(u.id);
  return Response.json({ id: u.id, name: u.name });
});
