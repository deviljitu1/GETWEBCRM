'use client';
import type { ReactNode } from 'react';
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import 'styles/App.css';
import 'styles/Contact.css';
import 'styles/MiniCalendar.css';
import 'styles/index.css';

export default function AppWrappers({ children }: { children: ReactNode }) { 
  return (
    <>
      <ProgressBar
        height="4px"
        color="#4318FF"
        options={{ showSpinner: false }}
        shallowRouting
      />
      {children}
    </>
  );
}
