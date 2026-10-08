import { createHmac, timingSafeEqual } from 'node:crypto';
export function validWebhookSignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function checkoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'rzp.io' || url.username || url.password || url.port) throw new Error('Invalid checkout URL');
  return url.toString();
}
