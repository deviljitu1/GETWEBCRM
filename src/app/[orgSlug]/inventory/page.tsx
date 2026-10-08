'use client';
import React from 'react';
import { MdAdd, MdSearch, MdFilterList } from 'react-icons/md';

export default function Inventory() {
  return (
    <div className="pb-8">
      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Property Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your projects, towers, and individual units.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition">
            <MdAdd /> Add Property
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row mb-6">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 text-gray-400 dark:border-navy-700">
            <MdSearch className="text-lg"/>
            <input placeholder="Search by Project, Unit No, or Client" className="h-10 w-full bg-transparent text-sm text-[#222] dark:text-white outline-none" />
          </label>
          <select className="rounded-lg border border-gray-200 px-3 text-sm text-gray-600 dark:border-navy-700 dark:bg-navy-900 dark:text-white">
            <option>All Projects</option>
            <option>GrahSiddhi Heights</option>
            <option>Green Avenue</option>
          </select>
          <select className="rounded-lg border border-gray-200 px-3 text-sm text-gray-600 dark:border-navy-700 dark:bg-navy-900 dark:text-white">
            <option>All Statuses</option>
            <option>Available</option>
            <option>Blocked</option>
            <option>Sold</option>
          </select>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400 dark:border-navy-700">
              <tr>
                <th className="px-3 py-3 font-semibold">Unit No.</th>
                <th className="px-3 py-3 font-semibold">Project</th>
                <th className="px-3 py-3 font-semibold">Config</th>
                <th className="px-3 py-3 font-semibold">Price</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Client / Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 */}
              <tr className="border-b border-gray-50 dark:border-navy-700 hover:bg-gray-50 dark:hover:bg-navy-700">
                <td className="px-3 py-4 font-bold text-navy-700 dark:text-white">A-101</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">GrahSiddhi Heights</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">3 BHK</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">₹ 1.2 Cr</td>
                <td className="px-3 py-4"><span className="rounded-full bg-green-50 text-green-700 px-2.5 py-1 text-xs font-semibold">Available</span></td>
                <td className="px-3 py-4"><button className="text-sm font-bold text-brand-500">Block Unit</button></td>
              </tr>
              {/* Row 2 */}
              <tr className="border-b border-gray-50 dark:border-navy-700 hover:bg-gray-50 dark:hover:bg-navy-700">
                <td className="px-3 py-4 font-bold text-navy-700 dark:text-white">B-205</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">Green Avenue</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">2 BHK</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">₹ 85 L</td>
                <td className="px-3 py-4"><span className="rounded-full bg-orange-50 text-orange-700 px-2.5 py-1 text-xs font-semibold">Blocked</span></td>
                <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">Rohan Mehta</td>
              </tr>
              {/* Row 3 */}
              <tr className="border-b border-gray-50 dark:border-navy-700 hover:bg-gray-50 dark:hover:bg-navy-700">
                <td className="px-3 py-4 font-bold text-navy-700 dark:text-white">A-304</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">GrahSiddhi Heights</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">3 BHK</td>
                <td className="px-3 py-4 text-gray-600 dark:text-gray-400">₹ 1.25 Cr</td>
                <td className="px-3 py-4"><span className="rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-xs font-semibold">Sold</span></td>
                <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">Ankita Patel</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
