import { createHash } from 'node:crypto';
import { validWebhookSignature } from 'utils/billing/signature';
import { syncSubscription } from 'utils/billing/razorpay';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response('Billing unavailable', { status: 503 });
  if (Number(request.headers.get('content-length')) > 65536) return new Response('Payload too large', { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 65536) return new Response('Payload too large', { status: 413 });
  if (!validWebhookSignature(raw, request.headers.get('x-razorpay-signature'), secret)) return new Response('Invalid signature', { status: 401 });
  let event;
  try { event = JSON.parse(raw); } catch { return new Response('Invalid payload', { status: 400 }); }
  if (typeof event.event !== 'string' || !event.event.startsWith('subscription.')) return Response.json({ received: true });
  const id = event.payload?.subscription?.entity?.id;
  if (typeof id !== 'string' || !/^sub_[A-Za-z0-9]+$/.test(id)) return new Response('Invalid subscription', { status: 400 });
  try {
    // Fetch current provider state so late webhook delivery cannot restore an old status.
    await syncSubscription(id, createHash('sha256').update(raw).digest('hex'));
    return Response.json({ received: true });
  } catch {
    console.error(JSON.stringify({ event: 'razorpay_webhook_failed' }));
    return new Response('Retry billing update', { status: 503 });
  }
}
