import type { InputHTMLAttributes, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import SearchableSelect from './SearchableSelect';
import AttachmentUpload from './AttachmentUpload';
export const cardClass = 'min-w-0 break-words rounded-[20px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-navy-600 dark:bg-navy-800 [&_summary]:rounded-lg [&_summary]:py-2 [&_summary]:text-navy-700 [&_summary]:focus-visible:outline [&_summary]:focus-visible:outline-2 [&_summary]:focus-visible:outline-brand-500 dark:[&_summary]:text-white [&_th]:bg-gray-100 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-gray-700 dark:[&_th]:bg-navy-700 dark:[&_th]:text-gray-200 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-gray-100 dark:[&_tbody_tr:hover]:bg-navy-700';
export const inputClass = 'min-h-11 min-w-0 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-navy-700 shadow-sm outline-none transition-colors placeholder:text-gray-500 hover:border-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-navy-500 dark:bg-navy-900 dark:text-white dark:disabled:bg-navy-700';
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  if (props.type === 'file') return <AttachmentUpload label={label} {...props}/>;
  return <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-navy-700 dark:text-gray-200"><span>{label}{props.required && <span aria-hidden="true" className="ml-1 text-brand-500">*</span>}</span><input {...props} className={inputClass} /></label>;
}
export function Select({ label, name, children, defaultValue = '' }: { label: string; name: string; children: ReactNode; defaultValue?: string }) {
  const options = Children.toArray(children).filter(isValidElement).map(child => {
    const props = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
    const text = Children.toArray(props.children).join('');
    return { value: String(props.value ?? text), label: text, disabled: props.disabled };
  });
  if (options.length > 8) return <SearchableSelect label={label} name={name} defaultValue={defaultValue} options={options}/>;
  return <label className="min-w-0 flex flex-col gap-2 text-sm font-medium text-navy-700 dark:text-gray-200">{label}<select name={name} defaultValue={defaultValue} className={inputClass}>{children}</select></label>;
}
