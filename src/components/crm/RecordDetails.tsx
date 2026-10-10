import Link from 'next/link';
import FormDialog from './FormDialog';
import { MdVisibility } from 'react-icons/md';
export default function RecordDetails({ title, label, fields, href }: { title: string; label: string; fields: [string,string | number | null | undefined][]; href?: string }) {
  return <FormDialog title={title} triggerLabel={label} icon={<MdVisibility/>} drawer><dl className="grid gap-4 text-sm">{fields.map(([name,value])=><div key={name}><dt className="text-gray-700 dark:text-gray-300">{name}</dt><dd className="mt-1 break-words font-semibold">{value === null || value === undefined || value === '' ? 'Not provided' : value}</dd></div>)}</dl>{href && <Link href={href} className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-500">Open full record →</Link>}</FormDialog>;
}
