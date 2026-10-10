'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { MdCloudUpload, MdClose, MdDescription } from 'react-icons/md';
import type { InputHTMLAttributes } from 'react';

export default function AttachmentUpload({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const previewUrls = useRef<string[]>([]);
  const id = useId();
  useEffect(() => () => previewUrls.current.forEach(url => { if (url) URL.revokeObjectURL(url); }), []);
  function displayFiles(next: File[]) {
    previewUrls.current.forEach(url => { if (url) URL.revokeObjectURL(url); });
    previewUrls.current = next.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    setPreviews(previewUrls.current); setFiles(next);
  }
  useEffect(() => {
    const form = input.current?.form;
    const reset = () => displayFiles([]);
    form?.addEventListener('reset', reset);
    return () => form?.removeEventListener('reset', reset);
  }, []);
  function setSelection(next: File[]) {
    if (!input.current) return;
    const transfer = new DataTransfer(); next.forEach(file => transfer.items.add(file));
    input.current.files = transfer.files;
    displayFiles(next);
  }
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium text-navy-700 dark:text-gray-200">{label}{props.required && <span className="ml-1 text-brand-500" aria-hidden="true">*</span>}</label>
    <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-center focus-within:border-brand-500 dark:border-navy-500 dark:bg-navy-900" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!props.disabled) setSelection(Array.from(event.dataTransfer.files).slice(0, props.multiple ? undefined : 1)); }}>
      <MdCloudUpload aria-hidden="true" className="mx-auto mb-2 text-3xl text-cyan-600"/><p className="text-sm text-gray-700 dark:text-gray-300">Drop a file here or click to browse</p>
      <input {...props} id={id} ref={input} type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={event => { displayFiles(Array.from(event.target.files || [])); props.onChange?.(event); }}/>
    </div>
    {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 p-2 dark:border-navy-600">
      {previews[index] ? <Image src={previews[index]} alt={`Preview of ${file.name}`} width={48} height={48} unoptimized className="h-12 w-12 rounded-lg object-cover"/> : <MdDescription aria-hidden="true" className="shrink-0 text-2xl text-cyan-600"/>}
      <span className="min-w-0 flex-1 break-all text-xs text-gray-700 dark:text-gray-300">{file.name} · {Math.ceil(file.size / 1024)} KB</span>
      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelection(files.filter((_, i) => i !== index))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><MdClose aria-hidden="true"/></button>
    </div>)}
  </div>;
}
