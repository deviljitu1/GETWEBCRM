import { MdHistory } from 'react-icons/md';
import { requirePlatformAdmin, checkQuery } from 'utils/crm/access';
import FormDialog from './FormDialog';
import EmptyState from './EmptyState';

function workspaceName(relation: unknown) {
  const organization = (Array.isArray(relation) ? relation[0] : relation) as { name?: string } | null;
  return organization?.name || 'Platform';
}

export default async function AdminHistory() {
  const { supabase } = await requirePlatformAdmin();
  const history = await supabase.from('audit_logs').select('id,entity_type,action,changed_fields,created_at,organizations(name)').order('created_at', { ascending: false }).limit(50);
  checkQuery(history.error);
  return <div className="flex justify-end"><FormDialog title="Recent audit history" triggerLabel="View history" icon={<MdHistory/>} description="The latest 50 recorded changes across workspaces. Audit records are retained for accountability and support.">
    <div className="divide-y divide-gray-100 dark:divide-navy-700">
      {history.data.map(entry => <article key={entry.id} className="py-3 text-sm">
        <p className="font-semibold text-navy-700 dark:text-white">{workspaceName(entry.organizations)} · {entry.entity_type.replaceAll('_', ' ')} · {entry.action.toLowerCase()}</p>
        {entry.changed_fields.length > 0 && <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Changed: {entry.changed_fields.map(field => field.replaceAll('_', ' ')).join(', ')}</p>}
        <time dateTime={entry.created_at} className="mt-1 block text-xs text-gray-500">{new Date(entry.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</time>
      </article>)}
      {!history.data.length && <EmptyState title="No history yet" description="Recorded changes will appear here."/>}
    </div>
  </FormDialog></div>;
}
