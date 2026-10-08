'use client';
import React from 'react';
import Widget from 'components/widget/Widget';
import { MdTrendingUp, MdGroup, MdHouse, MdCheckCircle } from 'react-icons/md';
import LineChart from 'components/charts/LineChart';
import PieChart from 'components/charts/PieChart';
import { lineChartOptionsTotalSpent, pieChartOptions } from 'variables/charts';

const leadSourcesData = [45, 30, 25]; // Website, Referrals, Social
const revenueForecastData = [
  {
    name: 'Expected',
    data: [120, 150, 180, 170, 210, 250],
    color: '#4318FF',
  },
  {
    name: 'Closed',
    data: [80, 100, 90, 120, 150, 200],
    color: '#6AD2FF',
  },
];

export default function Dashboard() {
  return (
    <div className="mt-3 grid h-full grid-cols-1 gap-5">
      <div className="mb-4 mt-5 flex flex-col justify-between px-4 md:flex-row md:items-center">
        <div>
          <h4 className="text-2xl font-bold text-navy-700 dark:text-white">
            Workspace Overview
          </h4>
          <p className="mt-1 text-sm text-gray-500">Welcome back! Here is your snapshot for today.</p>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Widget
          icon={<MdGroup className="h-7 w-7" />}
          title={'Total Active Leads'}
          subtitle={'142'}
        />
        <Widget
          icon={<MdHouse className="h-6 w-6" />}
          title={'Site Visits This Week'}
          subtitle={'24'}
        />
        <Widget
          icon={<MdCheckCircle className="h-7 w-7" />}
          title={'Units Sold This Month'}
          subtitle={'5'}
        />
        <Widget
          icon={<MdTrendingUp className="h-7 w-7" />}
          title={'Expected Revenue'}
          subtitle={'₹1.2Cr'}
        />
      </div>

      {/* Charts Row */}
      <div className="mt-2 grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Revenue Line Chart */}
        <div className="col-span-1 md:col-span-2 rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">Revenue Forecast</h4>
            <select className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-600 outline-none dark:border-navy-600 dark:bg-navy-900 dark:text-white">
              <option>Last 6 Months</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <LineChart chartOptions={lineChartOptionsTotalSpent} chartData={revenueForecastData} />
          </div>
        </div>

        {/* Lead Sources Pie Chart */}
        <div className="col-span-1 rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
          <h4 className="text-xl font-bold text-navy-700 dark:text-white mb-6">Lead Sources</h4>
          <div className="flex h-[200px] w-full items-center justify-center">
            <PieChart chartOptions={pieChartOptions} chartData={leadSourcesData} />
          </div>
          <div className="mt-4 flex flex-col gap-2 px-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-[#4318FF]" /> <span className="text-gray-600 dark:text-gray-400">Website</span></div>
              <span className="font-bold text-navy-700 dark:text-white">45%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-[#6AD2FF]" /> <span className="text-gray-600 dark:text-gray-400">Referrals</span></div>
              <span className="font-bold text-navy-700 dark:text-white">30%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-[#EFF4FB]" /> <span className="text-gray-600 dark:text-gray-400">Social</span></div>
              <span className="font-bold text-navy-700 dark:text-white">25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-2 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Hot Leads Placeholder */}
        <div className="rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Hot Leads Needing Attention
          </h4>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex justify-between rounded-xl bg-orange-50 p-3 dark:bg-navy-900 border-l-4 border-orange-500">
              <div className="flex flex-col">
                <span className="font-bold text-navy-700 dark:text-white">Priya Sharma</span>
                <span className="text-xs text-gray-500">Missed Call - 2 hours ago</span>
              </div>
              <button className="text-sm font-bold text-brand-500 hover:text-brand-600">View</button>
            </div>
            <div className="flex justify-between rounded-xl bg-orange-50 p-3 dark:bg-navy-900 border-l-4 border-orange-500">
              <div className="flex flex-col">
                <span className="font-bold text-navy-700 dark:text-white">Anjali Verma</span>
                <span className="text-xs text-gray-500">Requested Pricing Details</span>
              </div>
              <button className="text-sm font-bold text-brand-500 hover:text-brand-600">View</button>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800">
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Upcoming Site Visits
          </h4>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
              <div className="flex flex-col">
                <span className="font-bold text-navy-700 dark:text-white">Rohan Mehta</span>
                <span className="text-xs text-gray-500">Green Avenue - 3BHK</span>
              </div>
              <span className="text-sm font-medium text-brand-500">Today, 12:00 PM</span>
            </div>
            <div className="flex justify-between rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
              <div className="flex flex-col">
                <span className="font-bold text-navy-700 dark:text-white">Kunal Kapoor</span>
                <span className="text-xs text-gray-500">GrahSiddhi Heights - 2BHK</span>
              </div>
              <span className="text-sm font-medium text-brand-500">Tomorrow, 10:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
