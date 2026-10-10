'use client';
import { Children, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MdDragIndicator, MdArrowUpward, MdArrowDownward, MdRestartAlt } from 'react-icons/md';

export default function ReorderableCards({ children, labels, storageKey }: { children: ReactNode; labels: string[]; storageKey: string }) {
  const cards = Children.toArray(children);
  const [order, setOrder] = useState(labels.map((_, index) => index));
  const [announcement, setAnnouncement] = useState('');
  const dragged = useRef<number | null>(null);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(stored) && stored.length === labels.length && new Set(stored).size === labels.length && stored.every(value => Number.isInteger(value) && value >= 0 && value < labels.length)) {
        queueMicrotask(() => setOrder(stored));
      }
    } catch { /* Use the default layout when browser storage is unavailable. */ }
  }, [storageKey, labels.length]);
  function save(next: number[]) {
    setOrder(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Reordering still works without storage. */ }
  }
  function move(id: number, target: number) {
    const next = order.filter(value => value !== id);
    next.splice(target, 0, id);
    save(next);
    setAnnouncement(`${labels[id]} moved to position ${target + 1}.`);
  }
  return <section aria-label="Arrange dashboard cards">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"><p>Drag a card’s handle to rearrange, or use its arrows. Layout is saved in this browser.</p><button type="button" onClick={() => { save(labels.map((_, index) => index)); setAnnouncement('Default layout restored.'); }} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"><MdRestartAlt/>Reset layout</button></div>
    <p className="sr-only" role="status">{announcement}</p>
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {order.map((id, position) => <div key={id} className="relative min-w-0 [&>section]:h-full [&_h2]:pr-24" onDragOver={event => { if (dragged.current !== null) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (dragged.current !== null) move(dragged.current, position); dragged.current = null; }}>
        <div className="absolute right-3 top-3 z-10 flex h-auto! items-center rounded-lg bg-white/95 text-gray-500 dark:bg-navy-800 dark:text-gray-300">
          <button type="button" draggable aria-label={`Drag ${labels[id]} to rearrange`} title="Drag to rearrange" onDragStart={event => { dragged.current = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(id)); }} onDragEnd={() => { dragged.current = null; }} className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg hover:bg-brand-50"><MdDragIndicator/></button>
          <button type="button" disabled={position === 0} aria-label={`Move ${labels[id]} earlier`} onClick={() => move(id, position - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-brand-50 disabled:opacity-30"><MdArrowUpward/></button>
          <button type="button" disabled={position === order.length - 1} aria-label={`Move ${labels[id]} later`} onClick={() => move(id, position + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-brand-50 disabled:opacity-30"><MdArrowDownward/></button>
        </div>
        {cards[id]}
      </div>)}
    </div>
  </section>;
}
