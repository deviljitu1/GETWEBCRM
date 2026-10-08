import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import ActionForm, { Submit } from 'components/crm/ActionForm';
import { Field, cardClass } from 'components/crm/Fields';
import { savePlatformSettings } from '../actions';
export default async function Settings() {
  const {supabase} = await requirePlatformAdmin();
  const result = await supabase.from('platform_settings').select('name,support_email').eq('id',true).single();
  checkQuery(result.error);
  return <div className="flex flex-col gap-5"><h1 className="text-2xl font-bold">Platform settings</h1><div className={cardClass}><ActionForm action={savePlatformSettings}><Field label="Platform name" name="name" required maxLength={160} defaultValue={result.data.name}/><Field label="Support email" name="support_email" type="email" maxLength={254} defaultValue={result.data.support_email}/><Submit>Save changes</Submit></ActionForm></div></div>;
}
