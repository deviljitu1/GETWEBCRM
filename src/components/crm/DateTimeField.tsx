'use client';
import { useState } from 'react';
export default function DateTimeField({ name, label, defaultValue, required = false }: {
  name: string; label: string; defaultValue?: string; required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ? defaultValue.slice(0,16) : '');
  return <label className="min-w-0 flex flex-col gap-2 text-sm font-medium">{label} (UTC)
    <input type="datetime-local" required={required} value={value} onChange={event => setValue(event.target.value)} className="min-w-0 w-full rounded-lg border border-gray-200 bg-transparent p-3" />
    <input type="hidden" name={name} value={value && Number.isFinite(new Date(`${value}Z`).getTime()) ? new Date(`${value}Z`).toISOString() : ''} />
  </label>;
}
