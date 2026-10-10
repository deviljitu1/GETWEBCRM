'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import routes from 'routes';
import adminRoutes from 'adminRoutes';
import Sidebar from 'components/sidebar';
import Navbar from 'components/navbar';
import Footer from 'components/footer/Footer';
import { getActiveNavbar, getActiveRoute } from 'utils/navigation';
import { createClient } from 'utils/supabase/client';
import { NavigationAccessContext, type NavigationAccess } from './NavigationSnapshot';
import { canReadLeads, canSeeWorkspaceRoute } from 'utils/crm/navigation-access';

export default function WorkspaceShell({ children, scope }: { children: ReactNode; scope: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const [access, setAccess] = useState<NavigationAccess | null>(null);
  const userPerms = new Set(access?.scope === scope ? access.permissions : []);
  useEffect(() => {
    document.documentElement.dir = 'ltr';
    const supabase = createClient();
    let currentUser: string | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id;
      if (event === 'INITIAL_SESSION') { currentUser = nextUser; return; }
      if (nextUser !== currentUser || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        currentUser = nextUser;
        setAccess(null);
        // Refresh outside the auth callback; never query Supabase while its auth lock is held.
        queueMicrotask(() => router.refresh());
      }
    });
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh(); };
    document.addEventListener('visibilitychange', refresh);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [scope, router]);

  if (pathname === `/${scope}/login`) return <div className="min-h-screen bg-white dark:bg-navy-900">{children}</div>;
  
  const baseLinks = scope === 'admin' ? adminRoutes : routes.map(route => ({ ...route, layout: `/${scope}` }));
  const links = scope === 'admin' ? baseLinks : baseLinks.filter(route => canSeeWorkspaceRoute(route.path, userPerms));
  return <NavigationAccessContext.Provider value={setAccess}><div className="flex h-screen w-full overflow-hidden bg-background-100 dark:bg-background-900">
    <Sidebar routes={links} open={open} setOpen={setOpen} collapsed={collapsed} setCollapsed={setCollapsed} scope={scope} />
    <div className="min-w-0 w-full font-dm h-full overflow-y-auto"><main className={`mx-2.5 min-w-0 md:pr-2 transition-all duration-300 ${collapsed ? 'xl:ml-[115px]' : 'xl:ml-[323px]'}`}>
      <Navbar navigationOpen={open} onOpenSidenav={() => setOpen(!open)} brandText={getActiveRoute(links, pathname)} secondary={getActiveNavbar(links, pathname)} showSettings={scope === 'admin' || userPerms.has('settings.manage')} showLeadSearch={scope !== 'admin' && canReadLeads(userPerms)} />
      <div className="mx-auto min-h-[calc(100vh-150px)] p-2 pt-10 text-navy-700 dark:text-white">{children}</div>
      <div className="p-3"><Footer /></div>
    </main></div>
  </div></NavigationAccessContext.Provider>;
}
