'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { MdCloudUpload, MdInfoOutline } from 'react-icons/md';

export default function CsvUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const helpId = useId();
  function validate(files: FileList | null) {
    const file = files?.[0];
    const message = files && files.length > 1 ? 'Choose one CSV file at a time.' : file && !file.name.toLowerCase().endsWith('.csv') ? 'Choose a CSV file.' : file && file.size > 1024 * 1024 ? 'The CSV file must be 1 MB or smaller.' : '';
    input.current?.setCustomValidity(message);
    setError(message);
    setFilename(file?.name || '');
    return !message;
  }
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => { setFilename(''); setError(''); input.current?.setCustomValidity(''); };
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  return <>
    <div id={helpId} className="flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-navy-700 dark:bg-navy-900 dark:text-gray-200"><MdInfoOutline aria-hidden="true" className="mt-0.5 shrink-0 text-lg text-blue-500"/><div><p className="font-semibold">CSV headers: full_name, phone, email, property_interest, city</p><p className="mt-1">Only full_name is required. Maximum 500 leads / 1 MB. Duplicate records reject the entire import.</p></div></div>
    <div className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-gray-50 px-4 py-8 text-center focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-navy-500 dark:bg-navy-900" onDragOver={event => event.preventDefault()} onDrop={event => {
      event.preventDefault();
      if (input.current) { input.current.files = event.dataTransfer.files; validate(event.dataTransfer.files); }
    }}>
      <MdCloudUpload aria-hidden="true" className="text-4xl text-brand-500"/>
      <p className="text-sm font-semibold text-navy-700 dark:text-white">Drag and drop CSV here</p>
      <span className="text-xs text-gray-700 dark:text-gray-300">or</span>
      <span className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 dark:bg-navy-800 dark:text-white">Choose CSV file</span>
      <input ref={input} type="file" name="file" accept=".csv,text/csv" required aria-label="Choose CSV file" aria-describedby={helpId} aria-invalid={Boolean(error)} onChange={event => validate(event.target.files)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/>
      <p className="max-w-full break-all text-xs text-gray-700 dark:text-gray-300" role="status">{filename || 'CSV format only (max 1 MB, 500 leads)'}</p>
    </div>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </>;
}
