'use client';
import { useState } from 'react';
import ActionForm, { Submit, type FormAction } from './ActionForm';
import { Select } from './Fields';
import { MdChecklist } from 'react-icons/md';

export default function BulkRecordActions({ action, records, options, field, subject }: { action: FormAction; records: { id: string; name: string; previous?: string }[]; options: { id: string; name: string }[]; field: string; subject: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <details className="mb-4 rounded-xl border border-gray-200 p-3 dark:border-navy-600"><summary className="cursor-pointer text-sm font-semibold"><MdChecklist aria-hidden="true" className="mr-2 inline text-xl text-cyan-600"/>Update multiple {subject} · this page</summary><ActionForm action={action} className="mt-4">
    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selected.length === records.length && records.length > 0} onChange={event => setSelected(event.target.checked ? records.map(record => record.id) : [])}/>Select all {records.length} editable {subject}</label>
    <div className="grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2">{records.map(record => <label key={record.id} className="flex min-h-11 items-center gap-2 rounded-lg bg-gray-50 px-3 text-sm dark:bg-navy-900"><input type="checkbox" name="ids" value={record.id} checked={selected.includes(record.id)} onChange={event => setSelected(current => event.target.checked ? [...current, record.id] : current.filter(id => id !== record.id))}/>{record.name}{record.previous && selected.includes(record.id) && <input type="hidden" name="previous" value={`${record.id}:${record.previous}`}/>}</label>)}</div>
    <Select label={`New ${field === 'stage_id' ? 'stage' : 'status'}`} name={field}>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</Select>
    <Submit disabled={!selected.length}>Update {selected.length} selected {subject}</Submit>
  </ActionForm></details>;
}
