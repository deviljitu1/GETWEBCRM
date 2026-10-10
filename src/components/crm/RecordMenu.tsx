import { MdMoreHoriz } from 'react-icons/md';
import type { ReactNode } from 'react';
export default function RecordMenu({ label, children }: { label: string; children: ReactNode }) {
  return <details className="relative"><summary aria-label={`Actions for ${label}`} title={`Actions for ${label}`} className="inline-flex min-h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-navy-600 dark:hover:bg-navy-700 [&::-webkit-details-marker]:hidden"><MdMoreHoriz aria-hidden="true" className="text-xl"/></summary><div className="mt-2 flex min-w-[180px] flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm dark:border-navy-600 dark:bg-navy-800">{children}</div></details>;
}
