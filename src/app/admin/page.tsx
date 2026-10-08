import React from 'react';
import Widget from 'components/widget/Widget';
import { MdBusiness, MdAttachMoney, MdPersonAdd } from 'react-icons/md';

export default function PlatformAdminDashboard() {
  return (
    <div className="mt-3 grid h-full grid-cols-1 gap-5 xl:grid-cols-2 2xl:grid-cols-3">
      <div className="col-span-1 h-fit w-full xl:col-span-2 2xl:col-span-3">
        {/* Header */}
        <div className="mb-4 mt-5 flex flex-col justify-between px-4 md:flex-row md:items-center">
          <h4 className="ml-1 text-2xl font-bold text-navy-700 dark:text-white">
            Platform Overview
          </h4>
        </div>

        {/* Widgets */}
        <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-3">
          <Widget
            icon={<MdBusiness className="h-7 w-7" />}
            title={'Active Tenants (Organizations)'}
            subtitle={'12'}
          />
          <Widget
            icon={<MdAttachMoney className="h-6 w-6" />}
            title={'Monthly Recurring Revenue (MRR)'}
            subtitle={'$4,250'}
          />
          <Widget
            icon={<MdPersonAdd className="h-7 w-7" />}
            title={'New Signups This Month'}
            subtitle={'3'}
          />
        </div>

        {/* Main Content Area */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Recent Tenants Table Placeholder */}
          <div className="rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">
              Recent Organizations
            </h4>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
                <span className="font-bold text-navy-700 dark:text-white">GrahSiddhi</span>
                <span className="text-green-500">Active - Pro Plan</span>
              </div>
              <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
                <span className="font-bold text-navy-700 dark:text-white">Skyline Builders</span>
                <span className="text-green-500">Active - Basic Plan</span>
              </div>
              <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
                <span className="font-bold text-navy-700 dark:text-white">Apex Real Estate</span>
                <span className="text-orange-500">Trial Ending Soon</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">
              Quick Actions
            </h4>
            <div className="mt-4 flex flex-col gap-4">
              <a href="/admin/tenants" className="linear block w-full rounded-xl bg-brand-500 py-3 text-center text-base font-medium text-white transition duration-200 hover:bg-brand-600 active:bg-brand-700 dark:bg-brand-400 dark:text-white dark:hover:bg-brand-300 dark:active:bg-brand-200">
                + Create New Tenant
              </a>
              <a href="/admin/billing" className="linear block w-full rounded-xl bg-gray-100 py-3 text-center text-base font-medium text-navy-700 transition duration-200 hover:bg-gray-200 active:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:active:bg-white/30">
                Manage SaaS Plans
              </a>
              <a href="/admin/settings" className="linear block w-full rounded-xl bg-gray-100 py-3 text-center text-base font-medium text-navy-700 transition duration-200 hover:bg-gray-200 active:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:active:bg-white/30">
                View Global Configurations
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
