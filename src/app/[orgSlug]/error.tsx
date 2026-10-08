'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="rounded-xl bg-white p-8 dark:bg-navy-800"><h2 className="text-xl font-bold">We could not load this workspace</h2><p className="my-4">Please try again. If the issue continues, contact your administrator.</p><button onClick={reset} className="rounded-lg bg-brand-500 p-3 text-white">Try again</button></div>;
}
