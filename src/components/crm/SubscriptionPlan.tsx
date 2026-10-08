import type { ReactNode } from 'react';
import { MdCheckCircle, MdOutlinePayments } from 'react-icons/md';
import { monthlyPrice } from 'utils/billing/presentation';

export function SubscriptionBadge({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        tone === 'good'
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
          : tone === 'attention'
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
          : 'bg-gray-100 text-gray-700 dark:bg-navy-700 dark:text-gray-200'
      }`}
    >
      {label}
    </span>
  );
}

export default function SubscriptionPlan({
  name,
  price,
  currency,
  children,
}: {
  name: string;
  price: number;
  currency: string;
  children?: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[20px] bg-white shadow-xl dark:bg-navy-800">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white sm:p-8">
        <div className="mb-5 flex items-center gap-2 text-sm font-medium">
          <MdOutlinePayments className="text-xl" /> Monthly subscription
        </div>
        <h2 className="text-2xl font-bold">{name}</h2>
        <p className="mt-4 flex flex-wrap items-baseline gap-2">
          <span className="text-4xl font-bold">
            {monthlyPrice(price, currency)}
          </span>
          <span className="text-sm text-white/90">/ month</span>
        </p>
        <p className="mt-3 text-sm text-white/90">
          One plan for your entire workspace.
        </p>
      </div>
      <div className="p-6 sm:p-8">
        <p className="mb-4 text-sm font-semibold text-navy-700 dark:text-white">
          Included in your subscription
        </p>
        <ul className="grid gap-3 text-sm text-gray-700 dark:text-gray-200">
          {[
            'Lead management',
            'Property inventory',
            'Team collaboration',
            'Workspace dashboard',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <MdCheckCircle className="shrink-0 text-lg text-brand-500" />
              {feature}
            </li>
          ))}
        </ul>
        {children && (
          <div className="mt-6 border-t border-gray-200 pt-6 dark:border-navy-600">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
