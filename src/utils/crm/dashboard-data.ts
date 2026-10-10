import type { SupabaseClient } from '@supabase/supabase-js';

export async function loadDashboardData(supabase: SupabaseClient, orgId: string, userId: string, showLeads: boolean) {
  const requests = [
    supabase.rpc('workspace_summary', { org_id: orgId }),
    showLeads ? supabase.from('leads').select('id,full_name,next_followup_at')
      .eq('organization_id', orgId).not('next_followup_at', 'is', null)
      .order('next_followup_at').limit(10) : Promise.resolve({ data: [], error: null }),
    showLeads ? supabase.from('site_visits').select('id,lead_id,scheduled_at,status,leads(full_name)')
      .eq('organization_id', orgId).eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(10)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
  ];
  const results = await Promise.allSettled(requests);
  const [summary, followups, visits, profile] = results.map((result, index) => {
    const response = result.status === 'fulfilled' ? result.value : null;
    if (!response || response.error) {
      console.error('Dashboard section unavailable', { section: ['summary','followups','visits','profile'][index], code: response?.error?.code || 'unavailable' });
      return { data: null, unavailable: true };
    }
    return { data: response.data, unavailable: false };
  });
  return { summary, followups, visits, profile };
}
