import { MdApartment, MdEventAvailable, MdPeopleOutline, MdSearchOff, MdInfoOutline } from 'react-icons/md';
import type { ReactNode } from 'react';

export default function EmptyState({ title, description, kind = 'records', children }: { title: string; description?: string; kind?: 'records' | 'search' | 'people' | 'calendar' | 'unavailable'; children?: ReactNode }) {
  const Icon = { records: MdApartment, search: MdSearchOff, people: MdPeopleOutline, calendar: MdEventAvailable, unavailable: MdInfoOutline }[kind];
  const color = { records: 'bg-brand-50 text-brand-500', search: 'bg-orange-50 text-orange-600', people: 'bg-cyan-50 text-cyan-600', calendar: 'bg-green-50 text-green-600', unavailable: 'bg-amber-50 text-amber-700' }[kind];
  return <div className="flex flex-col items-center rounded-2xl px-4 py-8 text-center"><span className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${color}`}><Icon aria-hidden="true" className="text-3xl"/></span><h3 className="text-lg font-semibold text-navy-700 dark:text-white">{title}</h3>{description && <p className="mt-2 max-w-md text-sm text-gray-700 dark:text-gray-300">{description}</p>}{children && <div className="mt-4">{children}</div>}</div>;
}
