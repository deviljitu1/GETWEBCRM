import type { InputHTMLAttributes, ReactNode } from 'react';
export const cardClass = 'rounded-[20px] bg-white p-5 shadow-xl dark:bg-navy-800';
export const inputClass = 'w-full rounded-lg border border-gray-200 bg-transparent p-3 text-navy-700 outline-none dark:border-navy-600 dark:text-white';
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex flex-col gap-2 text-sm font-medium">{label}<input {...props} className={inputClass} /></label>;
}
export function Select({ label, name, children, defaultValue = '' }: { label: string; name: string; children: ReactNode; defaultValue?: string }) {
  return <label className="flex flex-col gap-2 text-sm font-medium">{label}<select name={name} defaultValue={defaultValue} className={inputClass}>{children}</select></label>;
}
