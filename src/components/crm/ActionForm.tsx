'use client';
import { useActionState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md';
export type ActionState = { error?: string; message?: string };
export type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>;
export function Submit({ children, disabled = false, variant = 'primary', repeat = false }: { children: ReactNode; disabled?: boolean; variant?: 'primary' | 'secondary'; repeat?: boolean }) {
  const { pending } = useFormStatus();
  const colors = variant === 'primary' ? 'border-brand-500 bg-brand-500 text-white shadow-sm hover:border-brand-600 hover:bg-brand-600' : 'border-gray-300 bg-white text-navy-700 hover:bg-gray-100 dark:border-navy-500 dark:bg-navy-800 dark:text-white dark:hover:bg-navy-700';
  return <button type="submit" name="_intent" value={repeat ? 'repeat' : 'save'} aria-busy={pending} disabled={pending || disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50 ${colors}`}>{pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"/>}{pending ? 'Please wait…' : children}</button>;
}
export default function ActionForm({ action, children, reset = false, repeatable = false, className = '', confirmWhen }: {
  action: FormAction; children: ReactNode; reset?: boolean; repeatable?: boolean; className?: string; confirmWhen?: { field: string; value: string; message: string };
}) {
  const submitted = useRef<FormData | null>(null);
  const [state, formAction] = useActionState(async (previous: ActionState, data: FormData) => {
    submitted.current = data;
    return action(previous, data);
  }, {});
  const ref = useRef<HTMLFormElement>(null);
  const repeat = useRef(false);
  useEffect(() => {
    if (!state.error || !submitted.current || !ref.current) return;
    for (const element of Array.from(ref.current.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || !element.name) continue;
      if (element instanceof HTMLInputElement && ['file', 'hidden', 'submit', 'password'].includes(element.type)) continue;
      const values = submitted.current.getAll(element.name);
      if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) element.checked = values.includes(element.value);
      else if (typeof values[0] === 'string') element.value = values[0];
    }
  }, [state]);
  useEffect(() => { if (reset && state.message) { ref.current?.reset(); ref.current?.dispatchEvent(new CustomEvent('crm:saved', { bubbles: true, detail: { message: state.message, repeat: repeat.current } })); } }, [reset, state]);
  return <form ref={ref} action={formAction} onSubmit={event => { if (confirmWhen && new FormData(event.currentTarget).get(confirmWhen.field) === confirmWhen.value && !window.confirm(confirmWhen.message)) { event.preventDefault(); return; } repeat.current = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'repeat'; }} className={`min-w-0 flex flex-col gap-4 ${className}`}>
    {state.error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500 dark:bg-navy-900 dark:text-red-300"><MdErrorOutline aria-hidden="true" className="mt-0.5 shrink-0 text-lg"/>{state.error}</p>}
    {state.message && <p role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-500 dark:bg-navy-900 dark:text-green-300"><MdCheckCircle aria-hidden="true" className="mt-0.5 shrink-0 text-lg"/>{state.message}</p>}
    {children}
    {reset && repeatable && <Submit variant="secondary" repeat>Save & add another</Submit>}
  </form>;
}
