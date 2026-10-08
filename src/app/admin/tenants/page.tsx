import React from 'react';
import { MdAdd } from 'react-icons/md';

export default function TenantsPage() {
  return (
    <div className="mt-3 grid h-full grid-cols-1 gap-5">
      <div className="flex w-full items-center justify-between">
        <h4 className="text-2xl font-bold text-navy-700 dark:text-white">
          Manage Tenants
        </h4>
        <button className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200">
          <MdAdd className="h-5 w-5" />
          Create New Tenant
        </button>
      </div>

      <div className="rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-700">
                <th className="pb-3 text-start text-sm font-bold tracking-wide text-gray-600">ORGANIZATION NAME</th>
                <th className="pb-3 text-start text-sm font-bold tracking-wide text-gray-600">SLUG</th>
                <th className="pb-3 text-start text-sm font-bold tracking-wide text-gray-600">PLAN</th>
                <th className="pb-3 text-start text-sm font-bold tracking-wide text-gray-600">STATUS</th>
                <th className="pb-3 text-start text-sm font-bold tracking-wide text-gray-600">ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700">
                <td className="py-4 text-sm font-bold text-navy-700 dark:text-white">GrahSiddhi</td>
                <td className="py-4 text-sm text-gray-600 dark:text-white">/grahsiddhi</td>
                <td className="py-4 text-sm font-medium text-brand-500">Pro Plan</td>
                <td className="py-4 text-sm font-medium text-green-500">Active</td>
                <td className="py-4">
                  <a href="/grahsiddhi/dashboard" className="text-sm font-bold text-brand-500 hover:text-brand-600">View Workspace</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
