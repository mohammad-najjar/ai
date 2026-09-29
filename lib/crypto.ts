import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
const k = () => Buffer.from(process.env.TOKEN_KEY!, 'base64'); // must be 32 bytes
export function encrypt(s: string) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', k(), iv);
  const enc = Buffer.concat([c.update(s, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function decrypt(b64: string) {
  const b = Buffer.from(b64, 'base64'), d = createDecipheriv('aes-256-gcm', k(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
