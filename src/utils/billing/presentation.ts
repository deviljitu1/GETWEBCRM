export type SubscriptionRecord = {
  status: string;
  mode: string;
  paid_until: string | null;
  paid_count: number;
};

export function subscriptionSummary(
  record: SubscriptionRecord | null,
  now = Date.now(),
) {
  const paidThrough = record?.paid_until ? Date.parse(record.paid_until) : 0;
  const hasPaidPeriod = !!record && record.paid_count > 0 && paidThrough > now;
  let label = 'Not subscribed';
  let tone = 'neutral';
  if (record) {
    if (record.status === 'cancelled' && hasPaidPeriod) label = 'Ending soon';
    else if (['cancelled', 'completed', 'expired'].includes(record.status))
      label = record.status === 'cancelled' ? 'Cancelled' : 'Expired';
    else if (['pending', 'halted', 'paused'].includes(record.status))
      label = record.status === 'paused' ? 'Paused' : 'Payment overdue';
    else if (record.status === 'active' && hasPaidPeriod) {
      label = 'Active';
      tone = 'good';
    } else if (record.status === 'active' && record.paid_count > 0)
      label = 'Renewal pending';
    else
      label =
        record.status === 'created'
          ? 'Checkout pending'
          : 'Awaiting first payment';
    if (tone !== 'good' && !['Cancelled', 'Expired'].includes(label))
      tone = 'attention';
    if (record.mode === 'test') {
      label = `Test · ${label}`;
      tone = 'neutral';
    }
  }
  const dateLabel = !paidThrough
    ? 'First billing date'
    : paidThrough <= now
    ? 'Last paid period ended'
    : record?.status === 'cancelled'
    ? 'Access expires'
    : 'Current period ends';
  return {
    label,
    tone,
    canRestart: !!record && ['cancelled', 'completed', 'expired'].includes(record.status) && paidThrough <= now,
    dateLabel,
    date: paidThrough
      ? new Intl.DateTimeFormat('en-IN', {
          dateStyle: 'medium',
          timeZone: 'Asia/Kolkata',
        }).format(paidThrough)
      : 'After your first payment',
  };
}

export function monthlyPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}
