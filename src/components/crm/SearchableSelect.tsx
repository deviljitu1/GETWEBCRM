'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { inputClass } from './Fields';

export default function SearchableSelect({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: { value: string; label: string; disabled?: boolean }[] }) {
  const [query, setQuery] = useState('');
  const [value, setValue] = useState(defaultValue || options[0]?.value || '');
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => { const form = select.current?.form; const reset = () => { setQuery(''); setValue(defaultValue || options[0]?.value || ''); }; form?.addEventListener('reset', reset); return () => form?.removeEventListener('reset', reset); }, [defaultValue, options]);
  const matches = options.filter(option => option.value === value || option.value === '' || option.label.toLowerCase().includes(query.toLowerCase()));
  return <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-navy-700 dark:text-gray-200">
    <label htmlFor={id}>{label}</label>
    <input type="search" aria-label={`Search ${label.toLowerCase()} options`} placeholder={`Search ${label.toLowerCase()}...`} className={inputClass} value={query} onChange={event => setQuery(event.target.value)}/>
    <select ref={select} id={id} name={name} className={inputClass} value={value} onChange={event => setValue(event.target.value)}>{matches.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select>
    {query && !options.some(option => option.label.toLowerCase().includes(query.toLowerCase())) && <p role="status" className="text-xs text-gray-700 dark:text-gray-300">No matches. Your current selection is retained.</p>}
  </div>;
}
