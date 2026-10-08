'use client';
import { useActionState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
export type ActionState = { error?: string; message?: string };
export type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>;
export function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded-xl bg-brand-500 px-5 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-50">{pending ? 'Saving…' : children}</button>;
}
export default function ActionForm({ action, children, reset = false, className = '' }: {
  action: FormAction; children: ReactNode; reset?: boolean; className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (reset && state.message) ref.current?.reset(); }, [reset, state]);
  return <form ref={ref} action={formAction} className={`min-w-0 flex flex-col gap-4 ${className}`}>
    {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    {state.message && <p role="status" className="text-sm text-green-700">{state.message}</p>}
    {children}
  </form>;
}
