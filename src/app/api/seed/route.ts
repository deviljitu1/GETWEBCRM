import { NextResponse } from 'next/server';
import { supabaseAdmin } from 'utils/supabase/admin';

export async function GET() {
  try {
    // 1. Create Organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'GrahSiddhi Construction',
        slug: 'grahsiddhi',
        status: 'active'
      })
      .select('id')
      .single();

    if (orgError) {
      // If it already exists, just fetch it
      if (orgError.code === '23505') { // Unique violation
        var { data: existingOrg } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('slug', 'grahsiddhi')
          .single();
        if (!existingOrg) return NextResponse.json({ error: 'Org fetch failed' }, { status: 500 });
        var orgId = existingOrg.id;
      } else {
        return NextResponse.json({ error: orgError.message }, { status: 500 });
      }
    } else {
      var orgId = org.id;
    }

    // 2. Create Lead Stages
    const stages = [
      { organization_id: orgId, key: 'new', name: 'New', sort_order: 1 },
      { organization_id: orgId, key: 'contacted', name: 'Contacted', sort_order: 2 },
      { organization_id: orgId, key: 'qualified', name: 'Qualified', sort_order: 3 },
      { organization_id: orgId, key: 'site_visit', name: 'Site Visit', sort_order: 4 },
      { organization_id: orgId, key: 'negotiation', name: 'Negotiation', sort_order: 5 }
    ];
    await supabaseAdmin.from('lead_stages').upsert(stages, { onConflict: 'organization_id,key' });

    // Fetch the inserted stages to get their IDs
    const { data: insertedStages } = await supabaseAdmin.from('lead_stages').select('id, key').eq('organization_id', orgId);
    
    // 3. Create Lead Sources
    const sources = [
      { organization_id: orgId, key: 'website', name: 'Website' },
      { organization_id: orgId, key: 'referral', name: 'Referral' },
      { organization_id: orgId, key: 'instagram', name: 'Instagram' }
    ];
    await supabaseAdmin.from('lead_sources').upsert(sources, { onConflict: 'organization_id,key' });
    const { data: insertedSources } = await supabaseAdmin.from('lead_sources').select('id, key').eq('organization_id', orgId);

    // 4. Insert Dummy Leads
    const getStageId = (k: string) => insertedStages?.find(s => s.key === k)?.id;
    const getSourceId = (k: string) => insertedSources?.find(s => s.key === k)?.id;

    const leads = [
      { organization_id: orgId, full_name: 'Priya Sharma', phone_normalized: '+919876543210', stage_id: getStageId('qualified'), source_id: getSourceId('website'), property_interest: 'GrahSiddhi Heights' },
      { organization_id: orgId, full_name: 'Rohan Mehta', phone_normalized: '+919988722110', stage_id: getStageId('site_visit'), source_id: getSourceId('referral'), property_interest: 'Green Avenue' },
      { organization_id: orgId, full_name: 'Anjali Verma', phone_normalized: '+919811155667', stage_id: getStageId('negotiation'), source_id: getSourceId('instagram'), property_interest: 'GrahSiddhi Heights' }
    ];
    
    const { error: leadsError } = await supabaseAdmin.from('leads').insert(leads);
    if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

    return NextResponse.json({ message: 'Seed successful! You can now check your database.' });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
