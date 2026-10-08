import Link from 'next/link';
export default function NotFound() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Page unavailable</h1><p className="my-4">This record does not exist or your account does not have access.</p><Link className="text-brand-500" href="/">Return home</Link></div>;
}
