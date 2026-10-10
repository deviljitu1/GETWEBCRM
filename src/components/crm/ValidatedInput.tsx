'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

export default function ValidatedInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState({ checked: false, error: '', filled: false });
  useEffect(() => {
    const form = ref.current?.form;
    const reset = () => setFeedback({ checked: false, error: '', filled: false });
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  function inspect(input: HTMLInputElement) {
    setFeedback({ checked: true, error: input.validationMessage, filled: Boolean(input.value.trim()) });
  }
  const color = feedback.error ? 'border-red-500! focus:ring-red-500/20!' : feedback.checked && feedback.filled ? 'border-green-500! focus:ring-green-500/20!' : '';
  return <>
    <input {...props} ref={ref} className={`${props.className || ''} ${color}`} aria-invalid={feedback.error ? true : undefined} aria-describedby={feedback.error ? id : props['aria-describedby']} onInvalid={event => { inspect(event.currentTarget); props.onInvalid?.(event); }} onBlur={event => { inspect(event.currentTarget); props.onBlur?.(event); }} onChange={event => { inspect(event.currentTarget); props.onChange?.(event); }}/>
    {feedback.error && <span id={id} className="text-xs text-red-600 dark:text-red-300" role="alert">{feedback.error}</span>}
  </>;
}
