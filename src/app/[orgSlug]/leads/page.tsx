import { MdAdd, MdFileUpload, MdSearch, MdTune } from 'react-icons/md';
import Link from 'next/link';
import { supabaseAdmin } from 'utils/supabase/admin';

// Revalidate this page dynamically or set a revalidate time (optional)
export const dynamic = 'force-dynamic';

export default async function LeadsPage({ params }: { params: { orgSlug: string } }) {
  // 1. Resolve orgSlug first (App Router async params requirement)
  const { orgSlug } = await Promise.resolve(params);

  // 2. Fetch the Organization ID based on slug
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single();

  if (!org) {
    return <div className="p-8 text-center text-red-500">Organization not found</div>;
  }

  // 3. Fetch leads with their related stage and source
  const { data: leads } = await supabaseAdmin
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
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });

  const rows = leads || [];

  const chip: Record<string, string> = { 
    new: 'bg-slate-100 text-slate-700', 
    contacted: 'bg-sky-50 text-sky-700', 
    qualified: 'bg-violet-50 text-violet-700', 
    site_visit: 'bg-amber-50 text-amber-700', 
    negotiation: 'bg-orange-50 text-orange-700',
    booked: 'bg-green-50 text-green-700',
    lost: 'bg-red-50 text-red-700'
  };

  return (
    <div className="pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h4 className="text-2xl font-bold text-navy-700 dark:text-white">Leads</h4>
          <p className="mt-1 text-sm text-gray-500">Manage, qualify, and keep every enquiry moving.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-[#1F2F3A]">
            <MdFileUpload /> Import CSV
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#1F2F3A] px-4 py-2.5 text-sm font-bold text-white">
            <MdAdd /> Add lead
          </button>
        </div>
      </div>
      
      <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 text-gray-400">
            <MdSearch className="text-lg"/>
            <input placeholder="Search by name, phone, or project" className="h-10 w-full bg-transparent text-sm text-[#222] outline-none" />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-600">
            <MdTune /> Filters
          </button>
          <select className="rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
            <option>All stages</option>
            <option>New</option>
            <option>Qualified</option>
          </select>
        </div>
        
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-3 py-3 font-semibold">Lead</th>
                <th className="px-3 py-3 font-semibold">Source</th>
                <th className="px-3 py-3 font-semibold">Interest</th>
                <th className="px-3 py-3 font-semibold">Owner</th>
                <th className="px-3 py-3 font-semibold">Stage</th>
                <th className="px-3 py-3 font-semibold">Next follow-up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead: any) => {
                const stageName = lead.lead_stages?.name || 'Unknown';
                const stageKey = lead.lead_stages?.key || 'new';
                const sourceName = lead.lead_sources?.name || 'Unknown';
                
                return (
                  <tr key={lead.id} className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#F5F2EB]/50">
                    <td className="px-3 py-4">
                      <Link href={`/${orgSlug}/leads/${lead.id}`} className="font-semibold text-[#1F2F3A] hover:text-blue-600 hover:underline">
                        {lead.full_name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">{lead.phone_normalized}</p>
                    </td>
                    <td className="px-3 py-4 text-gray-600">{sourceName}</td>
                    <td className="px-3 py-4 text-gray-600">{lead.property_interest || '-'}</td>
                    <td className={`px-3 py-4 ${!lead.assigned_to ? 'font-medium text-amber-600' : 'text-gray-600'}`}>
                      {lead.assigned_to ? 'Assigned' : 'Unassigned'}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip[stageKey] || 'bg-gray-100'}`}>
                        {stageName}
                      </span>
                    </td>
                    <td className={`px-3 py-4 ${!lead.next_followup_at ? 'font-medium text-red-600' : 'text-gray-600'}`}>
                      {lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleString() : 'No follow-up'}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No leads found in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {rows.length} leads</span>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-1.5 opacity-50" disabled>Previous</button>
            <button className="rounded border px-3 py-1.5 opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
