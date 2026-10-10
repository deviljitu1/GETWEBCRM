import Link from 'next/link';
import { MdClose } from 'react-icons/md';
export default function FilterChips({ base, filters }: { base: string; filters: { key: string; label: string; value: string }[] }) {
  const active = filters.filter(filter => filter.value);
  if (!active.length) return null;
  return <div aria-label="Active filters" className="mb-4 flex flex-wrap gap-2">{active.map(filter => {
    const params = new URLSearchParams(active.filter(other => other.key !== filter.key).map(other => [other.key, other.value]));
    return <Link key={filter.key} href={`${base}${params.size ? `?${params}` : ''}`} aria-label={`Remove ${filter.label} filter`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-50 px-3 text-xs font-semibold text-brand-600">{filter.label}<MdClose aria-hidden="true"/></Link>;
  })}<Link href={base} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-500 underline underline-offset-4">Remove all</Link></div>;
}
