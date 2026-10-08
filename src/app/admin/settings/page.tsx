import React from 'react';

export default function SettingsPage() {
  return (
    <div className="mt-3 grid h-full grid-cols-1 gap-5">
      <h4 className="text-2xl font-bold text-navy-700 dark:text-white">
        Platform Settings
      </h4>

      <div className="rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
        <h5 className="mb-4 text-lg font-bold text-navy-700 dark:text-white">Global Configurations</h5>
        
        <div className="mb-6 flex flex-col gap-2">
          <label className="text-sm font-bold text-navy-700 dark:text-white">Platform Name</label>
          <input type="text" defaultValue="GETWEBCRM Platform" className="rounded-xl border border-gray-200 p-3 outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white" />
        </div>

        <div className="mb-6 flex flex-col gap-2">
          <label className="text-sm font-bold text-navy-700 dark:text-white">Support Email</label>
          <input type="email" defaultValue="support@getwebcrm.com" className="rounded-xl border border-gray-200 p-3 outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white" />
        </div>

        <button className="rounded-xl bg-brand-500 px-5 py-3 font-medium text-white hover:bg-brand-600">
          Save Changes
        </button>
      </div>
    </div>
  );
}
