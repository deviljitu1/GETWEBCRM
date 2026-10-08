import React from 'react';

export default function BillingPage() {
  return (
    <div className="mt-3 grid h-full grid-cols-1 gap-5">
      <h4 className="text-2xl font-bold text-navy-700 dark:text-white">
        SaaS Plans & Billing
      </h4>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Basic Plan */}
        <div className="flex flex-col items-center rounded-[20px] bg-white p-8 shadow-xl dark:bg-navy-800">
          <h5 className="text-xl font-bold text-navy-700 dark:text-white">Basic</h5>
          <p className="mt-2 text-3xl font-bold text-brand-500">₹2,999<span className="text-sm text-gray-600">/mo</span></p>
          <ul className="mt-5 flex flex-col gap-3 text-center text-gray-600 dark:text-gray-400">
            <li>Up to 5 Users</li>
            <li>Basic CRM Features</li>
            <li>Email Support</li>
          </ul>
          <button className="mt-8 w-full rounded-xl bg-gray-100 py-3 font-medium text-navy-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white">
            Edit Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="flex flex-col items-center rounded-[20px] bg-brand-50 p-8 shadow-xl border-2 border-brand-500 dark:bg-navy-900">
          <div className="mb-2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">MOST POPULAR</div>
          <h5 className="text-xl font-bold text-navy-700 dark:text-white">Pro</h5>
          <p className="mt-2 text-3xl font-bold text-brand-500">₹9,999<span className="text-sm text-gray-600">/mo</span></p>
          <ul className="mt-5 flex flex-col gap-3 text-center text-gray-600 dark:text-gray-400">
            <li>Unlimited Users</li>
            <li>Advanced Workflows</li>
            <li>Priority Support</li>
          </ul>
          <button className="mt-8 w-full rounded-xl bg-brand-500 py-3 font-medium text-white hover:bg-brand-600">
            Edit Plan
          </button>
        </div>
        
        {/* Enterprise */}
        <div className="flex flex-col items-center rounded-[20px] bg-white p-8 shadow-xl dark:bg-navy-800">
          <h5 className="text-xl font-bold text-navy-700 dark:text-white">Enterprise</h5>
          <p className="mt-2 text-3xl font-bold text-brand-500">Custom</p>
          <ul className="mt-5 flex flex-col gap-3 text-center text-gray-600 dark:text-gray-400">
            <li>White-labeling</li>
            <li>Dedicated Database</li>
            <li>24/7 Phone Support</li>
          </ul>
          <button className="mt-8 w-full rounded-xl bg-gray-100 py-3 font-medium text-navy-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white">
            Edit Plan
          </button>
        </div>
      </div>
    </div>
  );
}
