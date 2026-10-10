'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';

export default function FormDialog({ title, description, children, icon, iconOnly = false, drawer = false, triggerLabel, tone = 'brand' }: { title: string; description?: string; children: ReactNode; icon?: ReactNode; iconOnly?: boolean; drawer?: boolean; triggerLabel?: string; tone?: 'brand' | 'green' | 'orange' | 'cyan' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const [message, setMessage] = useState('');
  const colors = { brand:'border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100', green:'border-green-200 bg-green-50 text-green-700 hover:bg-green-100', orange:'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100', cyan:'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100' }[tone];
  useEffect(() => {
    const element = dialog.current;
    const saved = (event: Event) => { const detail = (event as CustomEvent<{ message: string; repeat: boolean }>).detail; setMessage(detail.message); if (!detail.repeat) element?.close(); };
    element?.addEventListener('crm:saved', saved);
    return () => element?.removeEventListener('crm:saved', saved);
  }, []);
  return <>
    <button type="button" aria-label={title} title={iconOnly ? title : undefined} onClick={() => dialog.current?.showModal()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-navy-500 dark:bg-navy-800 dark:text-white ${colors} ${iconOnly ? 'w-11 shrink-0' : 'px-5'}`}><span aria-hidden="true" className="text-xl">{icon || <MdAdd/>}</span>{!iconOnly && (triggerLabel || title)}</button>
    {message && <span role="status" className="text-xs text-green-700 dark:text-green-300">{message}</span>}
    <dialog ref={dialog} aria-labelledby={headingId} aria-describedby={description ? descriptionId : undefined} className={`overflow-y-auto border border-gray-200 bg-white p-0 text-navy-700 shadow-xl backdrop:bg-navy-900/60 dark:border-navy-600 dark:bg-navy-800 dark:text-white ${drawer ? 'my-0 ml-auto mr-0 h-dvh max-h-dvh w-full max-w-lg rounded-l-3xl' : 'm-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl rounded-3xl'}`}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white p-5 sm:p-6 dark:border-navy-600 dark:bg-navy-800">
        <div><h2 id={headingId} className="text-xl font-bold">{title}</h2>{description && <p id={descriptionId} className="mt-2 text-sm text-gray-700 dark:text-gray-300">{description}</p>}</div>
        <button type="button" aria-label={`Close ${title}`} onClick={() => dialog.current?.close()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-navy-500 dark:hover:bg-navy-700"><MdClose aria-hidden="true" className="text-xl"/></button>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  </>;
}
