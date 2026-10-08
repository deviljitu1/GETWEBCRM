import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { HiX } from 'react-icons/hi';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Links from './components/Links';

import SidebarCard from 'components/sidebar/components/SidebarCard';
import { IRoute } from 'types/navigation';

function SidebarHorizon({ routes, open, setOpen, collapsed, setCollapsed, scope }: {
  routes: IRoute[]; open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; collapsed?: boolean; setCollapsed?: Dispatch<SetStateAction<boolean>>; scope: string;
}) {
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const media = window.matchMedia('(min-width: 1280px)');
    const close = () => setOpen(false);
    media.addEventListener('change', close);
    return () => { media.removeEventListener('change', close); document.body.style.overflow = previousOverflow; previous?.focus(); };
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
      className={`fixed left-0 top-0 z-50 flex h-dvh max-w-[90vw] flex-col bg-white pb-6 shadow-2xl transition-all duration-300 dark:bg-navy-800 dark:text-white xl:visible xl:z-30 ${
        collapsed ? 'w-[80px]' : 'w-[288px]'
      } ${
        open ? 'visible translate-x-0' : 'invisible -translate-x-full xl:translate-x-0'
      }`}
    >
      <button type="button" aria-label="Close navigation"
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center xl:hidden"
        onClick={() => setOpen(false)}
      >
        <HiX />
      </button>

      {setCollapsed && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white shadow-md xl:flex hover:bg-brand-600 transition-colors z-50"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      )}

      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <div className={`mx-[auto] mt-[50px] flex items-center justify-center`}>
          <div className="ml-1 mt-1 h-2.5 font-poppins text-[26px] font-bold uppercase text-navy-700 dark:text-white">
            {collapsed ? 'GW' : <>GETWEB<span className="font-medium text-[#C9A24A]">CRM</span></>}
          </div>
        </div>
        <div className="mb-7 mt-[58px] h-px shrink-0 bg-gray-300 dark:bg-white/30" />
        {/* Nav item */}

        <ul className="mb-auto pt-1">
          <Links routes={routes} collapsed={collapsed} />
        </ul>

        {/* Free Horizon Card */}
        {scope === 'admin' && !collapsed && <div className="mt-8 flex justify-center">
          <SidebarCard />
        </div>}
      </div>

      {/* Nav item end */}
    </aside>
  </>;
}

export default SidebarHorizon;
