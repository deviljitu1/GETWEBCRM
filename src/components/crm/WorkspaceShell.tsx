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
import { createClient } from 'utils/supabase/client';

export default function WorkspaceShell({ children, scope }: { children: ReactNode; scope: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    if (scope === 'admin' || pathname === `/${scope}/login`) {
      setLoadingRole(false);
      return;
    }
    const loadRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingRole(false); return; }
      
      const { data: org } = await supabase.from('organizations').select('id').eq('slug', scope).single();
      if (!org) { setLoadingRole(false); return; }

      const { data: member } = await supabase.from('organization_members').select('role_id').eq('organization_id', org.id).eq('user_id', user.id).eq('status', 'active').single();
      if (!member) { setLoadingRole(false); return; }

      const { data: role } = await supabase.from('roles').select('key').eq('id', member.role_id).single();
      
      setIsAdmin(role?.key === 'owner' || role?.key === 'admin');
      setLoadingRole(false);
    };
    loadRole();
  }, [scope, pathname]);

  if (pathname === `/${scope}/login`) return <div className="min-h-screen bg-white dark:bg-navy-900">{children}</div>;
  
  const baseLinks = scope === 'admin' ? adminRoutes : routes.map(route => ({ ...route, layout: `/${scope}` }));
  const links = loadingRole ? baseLinks.filter(r => !r.adminOnly) : baseLinks.filter(r => !r.adminOnly || isAdmin);
  return <div className="flex h-screen w-full overflow-hidden bg-background-100 dark:bg-background-900">
    <Sidebar routes={links} open={open} setOpen={setOpen} collapsed={collapsed} setCollapsed={setCollapsed} scope={scope} />
    <div className="min-w-0 w-full font-dm h-full overflow-y-auto"><main className={`mx-2.5 min-w-0 md:pr-2 transition-all duration-300 ${collapsed ? 'xl:ml-[115px]' : 'xl:ml-[323px]'}`}>
      <Navbar navigationOpen={open} onOpenSidenav={() => setOpen(!open)} brandText={getActiveRoute(links, pathname)} secondary={getActiveNavbar(links, pathname)} />
      <div className="mx-auto min-h-[calc(100vh-150px)] p-2 pt-10 text-navy-700 dark:text-white">{children}</div>
      <div className="p-3"><Footer /></div>
    </main></div>
  </div>;
}
