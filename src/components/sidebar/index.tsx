import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { HiX } from 'react-icons/hi';
import Links from './components/Links';

import SidebarCard from 'components/sidebar/components/SidebarCard';
import { IRoute } from 'types/navigation';

function SidebarHorizon({ routes, open, setOpen, scope }: {
  routes: IRoute[]; open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; scope: string;
}) {
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    drawer.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const media = window.matchMedia('(min-width: 1280px)');
    const close = () => setOpen(false);
    media.addEventListener('change', close);
    return () => { media.removeEventListener('change', close); previous?.focus(); };
  }, [open, setOpen]);
  return <>
    {open && <button aria-label="Close navigation backdrop" onClick={() => setOpen(false)} className="fixed inset-0 z-[45] bg-black/40 xl:hidden" />}
    <aside ref={drawer} id="workspace-navigation" aria-label="Workspace navigation" role={open ? 'dialog' : undefined} aria-modal={open || undefined}
      onKeyDown={event => {
        if (!open) return;
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
        if (event.key === 'Tab') {
          const controls = drawer.current?.querySelectorAll<HTMLElement>('a[href],button');
          if (!controls?.length) return;
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}
      onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false); }}
      className={`fixed left-0 top-0 z-50 flex h-dvh w-[288px] max-w-[90vw] flex-col overflow-y-auto bg-white pb-6 shadow-2xl transition-transform duration-200 dark:bg-navy-800 dark:text-white xl:visible xl:z-30 ${
        open ? 'visible translate-x-0' : 'invisible -translate-x-full xl:translate-x-0'
      }`}
    >
      <button type="button" aria-label="Close navigation"
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center xl:hidden"
        onClick={() => setOpen(false)}
      >
        <HiX />
      </button>

      <div className={`mx-[56px] mt-[50px] flex items-center`}>
        <div className="ml-1 mt-1 h-2.5 font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
          GETWEB<span className="font-medium text-[#C9A24A]">CRM</span>
        </div>
      </div>
      <div className="mb-7 mt-[58px] h-px bg-gray-300 dark:bg-white/30" />
      {/* Nav item */}

      <ul className="mb-auto pt-1">
        <Links routes={routes} />
      </ul>

      {/* Free Horizon Card */}
      {scope === 'admin' && <div className="flex justify-center">
        <SidebarCard />
      </div>}

      {/* Nav item end */}
    </aside>
  </>;
}

export default SidebarHorizon;
