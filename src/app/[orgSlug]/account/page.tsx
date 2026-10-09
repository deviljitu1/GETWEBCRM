import { requireOrg, checkQuery } from 'utils/crm/access';
import AccountProfile from 'components/crm/AccountProfile';

export default async function Account({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { supabase, user } = await requireOrg(orgSlug);
  const profile = await supabase.from('profiles').select('full_name,phone').eq('id', user.id).single();
  checkQuery(profile.error);
  return <AccountProfile email={user.email || ''} name={profile.data.full_name} phone={profile.data.phone} />;
}
