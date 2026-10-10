'use client';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import Form from 'next/form';
import Link from 'next/link';
import { MdFilterList, MdClose } from 'react-icons/md';

export default function FilterPopover({ action, activeCount, children }: { action: string; activeCount: number; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const id = useId();
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !ref.current?.contains(event.target)) ref.current?.removeAttribute('open'); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && ref.current?.open) { ref.current.removeAttribute('open'); ref.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);
  return <div className="mb-5 flex justify-end">
    <div className="relative w-64 max-w-full">
      <details ref={ref} className="group">
        <summary aria-controls={id} className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-navy-500 dark:bg-navy-900 dark:text-white [&::-webkit-details-marker]:hidden ${activeCount ? 'pr-24' : ''}`}><MdFilterList aria-hidden="true" className="text-xl"/>Filters{activeCount > 0 && <span className="rounded-full bg-brand-500 px-2 text-xs text-white">{activeCount}</span>}</summary>
        <Form id={id} action={action} onSubmit={() => ref.current?.removeAttribute('open')} className="absolute right-0 top-full z-30 mt-2 flex max-h-[70dvh] w-full flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-navy-600 dark:bg-navy-800">
          {children}
          <button type="submit" className="min-h-11 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">Apply filters</button>
        </Form>
      </details>
      {activeCount > 0 && <Link href={action} aria-label="Clear all filters" className="absolute right-2 top-2 inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-600 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-white"><MdClose aria-hidden="true"/>Clear</Link>}
    </div>
  </div>;
}
