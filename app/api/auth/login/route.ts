import { z } from 'zod';
import { db } from '@/lib/db';
import { checkPw, startSession, handle } from '@/lib/auth';
const B = z.object({ email: z.string().email(), password: z.string() });
export const POST = (req: Request) => handle(async () => {
  const b = B.safeParse(await req.json());
  const u = b.success ? await db.user.findUnique({ where: { email: b.data.email } }) : null;
  if (!b.success || !u || !(await checkPw(b.data.password, u.passwordHash))) return Response.json({ error: 'Wrong email or password' }, { status: 401 });
  await startSession(u.id);
  return Response.json({ id: u.id, name: u.name });
});
