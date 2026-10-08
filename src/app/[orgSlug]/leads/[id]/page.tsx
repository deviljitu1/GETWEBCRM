import React from 'react';
import { MdPhone, MdEmail, MdArrowBack } from 'react-icons/md';
import Link from 'next/link';
import { supabaseAdmin } from 'utils/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function LeadDetail({ params }: { params: { id: string, orgSlug: string } }) {
  const { id, orgSlug } = await Promise.resolve(params);

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select(`
      id,
      full_name,
      phone_normalized,
      property_interest,
      next_followup_at,
      assigned_to,
      lead_stages ( name, key ),
      lead_sources ( name )
    `)
    .eq('id', id)
    .single();

  if (!lead) {
    return (
      <div className="mt-3 flex h-full flex-col gap-5 p-8 text-center text-gray-500">
        Lead not found
        <Link href={`/${orgSlug}/leads`} className="mt-4 text-brand-500 hover:underline">
          Go back to Leads
        </Link>
      </div>
    );
  }

  const stageName = (lead.lead_stages as any)?.name || 'Unknown';
  const sourceName = (lead.lead_sources as any)?.name || 'Unknown';
  const initial = lead.full_name ? lead.full_name.charAt(0).toUpperCase() : '?';

  return (
    <div className="mt-3 flex h-full flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link 
          href={`/${orgSlug}/leads`}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm hover:bg-gray-50 dark:bg-navy-800 dark:hover:bg-navy-700"
        >
          <MdArrowBack className="h-6 w-6 text-navy-700 dark:text-white" />
        </Link>
        <h4 className="text-2xl font-bold text-navy-700 dark:text-white">
          Lead Details
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Profile Card */}
        <div className="col-span-1 flex flex-col items-center rounded-[20px] bg-white p-8 shadow-xl dark:bg-navy-800">
          <div className="h-24 w-24 rounded-full bg-brand-500 flex items-center justify-center text-3xl font-bold text-white">
            {initial}
          </div>
          <h5 className="mt-4 text-xl font-bold text-navy-700 dark:text-white">{lead.full_name}</h5>
          <p className="text-sm font-medium text-gray-600">{stageName} Lead</p>

          <div className="mt-6 flex w-full flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
              <MdPhone className="h-5 w-5 text-brand-500" />
              <span className="text-sm font-medium text-navy-700 dark:text-white">{lead.phone_normalized || 'No phone'}</span>
            </div>
            {/* Hardcoding email for now since it's not in the leads schema currently, we'll add it later */}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-navy-900">
              <MdEmail className="h-5 w-5 text-brand-500" />
              <span className="text-sm font-medium text-navy-700 dark:text-white">No email</span>
            </div>
          </div>
        </div>

        {/* Activity & Info Card */}
        <div className="col-span-1 md:col-span-2 flex flex-col rounded-[20px] bg-white p-6 shadow-xl dark:bg-navy-800">
          <h5 className="text-lg font-bold text-navy-700 dark:text-white mb-4">Lead Information</h5>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Source</p>
              <p className="font-medium text-navy-700 dark:text-white">{sourceName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Interested Project</p>
              <p className="font-medium text-navy-700 dark:text-white">{lead.property_interest || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Assigned To</p>
              <p className="font-medium text-navy-700 dark:text-white">{lead.assigned_to ? 'Assigned' : 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Follow-Up</p>
              <p className="font-medium text-brand-500">
                {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleString() : 'No follow-up'}
              </p>
            </div>
          </div>

          <hr className="my-6 border-gray-200 dark:border-navy-700" />

          <h5 className="text-lg font-bold text-navy-700 dark:text-white mb-4">Recent Notes</h5>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-navy-700 text-center text-sm text-gray-500">
              No recent notes for this lead.
            </div>
          </div>

          <div className="mt-auto pt-6 flex gap-3">
            <button className="rounded-xl bg-brand-500 px-5 py-3 text-base font-medium text-white hover:bg-brand-600">
              Add Note
            </button>
            <button className="rounded-xl bg-gray-100 px-5 py-3 text-base font-medium text-navy-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
              Schedule Site Visit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
