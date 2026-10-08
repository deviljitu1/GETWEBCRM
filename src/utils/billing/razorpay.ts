import 'server-only';
import { createAdminClient } from 'utils/supabase/admin';
import { checkoutUrl } from './signature';

export type ProviderSubscription = {
  id: string;
  plan_id: string;
  status: string;
  short_url: string | null;
  paid_count: number;
  current_end: number | null;
  total_count: number;
};
export function billingConfiguration() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const missing = [
    !keyId && 'API key ID',
    !process.env.RAZORPAY_KEY_SECRET && 'API key secret',
    !process.env.RAZORPAY_WEBHOOK_SECRET && 'webhook secret',
  ].filter(Boolean) as string[];
  const mode = keyId.startsWith('rzp_test_')
    ? 'test'
    : keyId.startsWith('rzp_live_')
    ? 'live'
    : null;
  const problem =
    keyId && !mode
      ? 'The Razorpay key ID is invalid.'
      : mode === 'live' && process.env.RAZORPAY_LIVE_ENABLED !== 'true'
      ? 'Live payments are disabled in the deployment.'
      : null;
  return {
    configured: missing.length === 0 && !problem,
    missing,
    mode,
    problem,
  };
}
export function billingConfigured() {
  return billingConfiguration().configured;
}
export function billingMode() {
  const config = billingConfiguration();
  if (config.configured && config.mode) return config.mode;
  throw new Error(
    config.problem ||
      `Razorpay setup is incomplete: ${config.missing.join(', ')}`,
  );
}
export async function razorpay<T>(path: string, body?: object): Promise<T> {
  billingMode();
  if (!billingConfigured())
    throw new Error(
      'Razorpay is not configured. Contact the platform administrator.',
    );
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
      ).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401)
    throw new Error(
      'Razorpay rejected the API key and secret. Update the matching credentials in your hosting settings.',
    );
  if (!response.ok)
    throw new Error(
      'Razorpay could not complete this request. Check the plan and try again.',
    );
  return response.json();
}
export function subscriptionData(value: ProviderSubscription) {
  if (
    !/^sub_[A-Za-z0-9]+$/.test(value.id) ||
    !/^plan_[A-Za-z0-9]+$/.test(value.plan_id) ||
    ![
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'cancelled',
      'completed',
      'expired',
      'paused',
    ].includes(value.status) ||
    !Number.isInteger(value.paid_count) ||
    value.paid_count < 0 ||
    !Number.isInteger(value.total_count) ||
    value.total_count < 1 ||
    (value.current_end !== null &&
      (!Number.isSafeInteger(value.current_end) ||
        value.current_end < 0 ||
        value.current_end > 253402300799))
  )
    throw new Error('Invalid Razorpay subscription');
  return {
    ...value,
    short_url: value.short_url ? checkoutUrl(value.short_url) : null,
    paid_end: value.current_end
      ? new Date(value.current_end * 1000).toISOString()
      : null,
  };
}
export async function syncSubscription(id: string, eventKey?: string) {
  if (!/^sub_[A-Za-z0-9]+$/.test(id)) throw new Error('Invalid subscription');
  const admin = createAdminClient();
  if (eventKey) {
    const receipt = await admin
      .from('billing_events')
      .select('event_id')
      .eq('event_id', eventKey)
      .maybeSingle();
    if (receipt.error) throw new Error('Billing unavailable');
    if (receipt.data) return;
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const revision = await admin.rpc('begin_billing_sync', {
      provider_sub: id,
    });
    if (revision.error) throw new Error('Billing unavailable');
    if (revision.data === null) return;
    const current = subscriptionData(
      await razorpay<ProviderSubscription>(`subscriptions/${id}`),
    );
    if (current.id !== id) throw new Error('Subscription mismatch');
    const saved = await admin.rpc('finish_billing_sync', {
      provider_sub: id,
      revision: revision.data,
      provider_status: current.status,
      paid: current.paid_count,
      paid_end: current.paid_end,
      event_key: eventKey || null,
    });
    if (saved.error) throw new Error('Billing unavailable');
    if (saved.data === true) return;
  }
  throw new Error('Billing is being updated. Please retry.');
}
