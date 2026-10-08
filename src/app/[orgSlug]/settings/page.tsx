'use client';
import React from 'react';
import { useParams } from 'next/navigation';

export default function WorkspaceSettings() {
  const params = useParams();
  const orgName = typeof params?.orgSlug === 'string' ? params.orgSlug.toUpperCase() : 'WORKSPACE';

  return (
    <div className="pb-8">
      <div className="mt-5 px-2">
        <h1 className="text-2xl font-bold text-navy-700 dark:text-white">Workspace Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure your organization and team members.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        
        {/* Org Settings */}
        <div className="rounded-[20px] bg-white p-6 shadow-xl dark:bg-navy-800">
          <h4 className="text-xl font-bold text-navy-700 dark:text-white mb-4">Organization Profile</h4>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-navy-700 dark:text-white">Workspace Name</label>
              <input type="text" defaultValue={orgName} className="rounded-xl border border-gray-200 p-3 outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white" />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-navy-700 dark:text-white">Slug (URL)</label>
              <input type="text" disabled defaultValue={params?.orgSlug as string} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-500 outline-none dark:border-navy-600 dark:bg-navy-900" />
            </div>

            <button className="mt-2 rounded-xl bg-brand-500 py-3 font-medium text-white hover:bg-brand-600">
              Save Profile
            </button>
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-[20px] bg-white p-6 shadow-xl dark:bg-navy-800">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">Team Members</h4>
            <button className="text-sm font-bold text-brand-500">+ Invite User</button>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 dark:border-navy-700">
              <div>
                <p className="font-bold text-navy-700 dark:text-white">Adela Parkson</p>
                <p className="text-xs text-gray-500">adela@example.com</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-navy-700 dark:bg-navy-900 dark:text-white">Owner</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 dark:border-navy-700">
              <div>
                <p className="font-bold text-navy-700 dark:text-white">Rahul Sharma</p>
                <p className="text-xs text-gray-500">rahul@example.com</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-navy-700 dark:bg-navy-900 dark:text-white">Sales Exec</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-100 pb-3 dark:border-navy-700">
              <div>
                <p className="font-bold text-navy-700 dark:text-white">Aditi Rao</p>
                <p className="text-xs text-gray-500">aditi@example.com</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-navy-700 dark:bg-navy-900 dark:text-white">Sales Manager</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
