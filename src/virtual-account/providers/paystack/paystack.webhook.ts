import { createHmac, timingSafeEqual } from 'crypto';

export function verifyPaystackSignature(payload: string, signature: string | undefined, secret: string) {
  if (!signature || !secret) return false;
  const hash = createHmac('sha512', secret).update(payload).digest('hex');

  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

