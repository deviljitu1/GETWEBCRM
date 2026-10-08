'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import routes from 'routes';
import adminRoutes from 'adminRoutes';
import Sidebar from 'components/sidebar';
import Navbar from 'components/navbar';
import Footer from 'components/footer/Footer';
import { getActiveNavbar, getActiveRoute } from 'utils/navigation';

export default function WorkspaceShell({ children, scope }: { children: ReactNode; scope: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { document.documentElement.dir = 'ltr'; }, []);
  if (pathname === `/${scope}/login`) return <div className="min-h-screen bg-white dark:bg-navy-900">{children}</div>;
  const links = scope === 'admin' ? adminRoutes : routes.map(route => ({ ...route, layout: `/${scope}` }));
  return <div className="flex min-h-screen w-full bg-background-100 dark:bg-background-900">
    <Sidebar routes={links} open={open} setOpen={setOpen} scope={scope} />
    <div className="min-w-0 w-full font-dm"><main className="mx-2.5 min-w-0 md:pr-2 xl:ml-[323px]">
      <Navbar navigationOpen={open} onOpenSidenav={() => setOpen(!open)} brandText={getActiveRoute(links, pathname)} secondary={getActiveNavbar(links, pathname)} />
      <div className="mx-auto min-h-screen p-2 pt-4 text-navy-700 dark:text-white">{children}</div>
      <div className="p-3"><Footer /></div>
    </main></div>
  </div>;
}
