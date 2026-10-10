'use client';
import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { MdAdd, MdClose } from 'react-icons/md';

export default function FormDialog({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-navy-500 dark:bg-navy-800 dark:text-white"><MdAdd aria-hidden="true" className="text-xl"/>{title}</button>
    <dialog ref={dialog} aria-labelledby={headingId} aria-describedby={description ? descriptionId : undefined} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-0 text-navy-700 shadow-xl backdrop:bg-navy-900/60 dark:border-navy-600 dark:bg-navy-800 dark:text-white">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white p-5 sm:p-6 dark:border-navy-600 dark:bg-navy-800">
        <div><h2 id={headingId} className="text-xl font-bold">{title}</h2>{description && <p id={descriptionId} className="mt-2 text-sm text-gray-700 dark:text-gray-300">{description}</p>}</div>
        <button type="button" aria-label={`Close ${title}`} onClick={() => dialog.current?.close()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-navy-500 dark:hover:bg-navy-700"><MdClose aria-hidden="true" className="text-xl"/></button>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  </>;
}
