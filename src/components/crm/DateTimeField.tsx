'use client';
import { useEffect, useRef, useState } from 'react';
import { inputClass } from './Fields';
export default function DateTimeField({ name, label, defaultValue, required = false }: {
  name: string; label: string; defaultValue?: string; required?: boolean;
}) {
  const initial = defaultValue && Number.isFinite(new Date(defaultValue).getTime()) ? new Date(new Date(defaultValue).getTime() + 330 * 60 * 1000).toISOString().slice(0,16) : '';
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const form = input.current?.form; const reset = () => setValue(initial); form?.addEventListener('reset', reset); return () => form?.removeEventListener('reset', reset); }, [initial]);
  return <label className="min-w-0 flex flex-col gap-2 text-sm font-medium">{label} (India time)
    <input ref={input} type="datetime-local" required={required} value={value} onChange={event => setValue(event.target.value)} className={inputClass} />
    <input type="hidden" name={name} value={value && Number.isFinite(new Date(`${value}+05:30`).getTime()) ? new Date(`${value}+05:30`).toISOString() : ''} />
  </label>;
}
