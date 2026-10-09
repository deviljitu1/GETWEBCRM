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
import { canReadLeads, canSeeWorkspaceRoute } from 'utils/crm/navigation-access';

export default function WorkspaceShell({ children, scope }: { children: ReactNode; scope: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [access, setAccess] = useState<{ scope: string; permissions: Set<string> } | null>(null);
  const userPerms = access?.scope === scope ? access.permissions : new Set<string>();
  useEffect(() => {
    document.documentElement.dir = 'ltr';
    if (scope === 'admin' || pathname === '/' + scope + '/login') return;
    let cancelled = false;
    const loadRole = async () => {
      const permissions = new Set<string>();
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;
        const { data: org } = await supabase.from('organizations').select('id').eq('slug', scope).eq('status', 'active').maybeSingle();
        if (!org) return;
        const { data: member } = await supabase.from('organization_members').select('role_id').eq('organization_id', org.id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
        if (member) {
          const { data: perms, error: grantError } = await supabase.from('role_permissions').select('permission_key').eq('role_id', member.role_id);
          if (!grantError) perms?.forEach(p => permissions.add(p.permission_key));
        } else {
          const support = await supabase.rpc('has_support_access', { target_org_id: org.id });
          if (!support.error && support.data === true) ['leads.read.all', 'inventory.read', 'sites.read'].forEach(p => permissions.add(p));
        }
      } finally {
        if (!cancelled) setAccess({ scope, permissions });
      }
    };
    void loadRole().catch(() => {});
    return () => { cancelled = true; };
  }, [scope, pathname]);

  if (pathname === `/${scope}/login`) return <div className="min-h-screen bg-white dark:bg-navy-900">{children}</div>;
  
  const baseLinks = scope === 'admin' ? adminRoutes : routes.map(route => ({ ...route, layout: `/${scope}` }));
  const links = scope === 'admin' ? baseLinks : baseLinks.filter(route => canSeeWorkspaceRoute(route.path, userPerms));
  return <div className="flex h-screen w-full overflow-hidden bg-background-100 dark:bg-background-900">
    <Sidebar routes={links} open={open} setOpen={setOpen} collapsed={collapsed} setCollapsed={setCollapsed} scope={scope} />
    <div className="min-w-0 w-full font-dm h-full overflow-y-auto"><main className={`mx-2.5 min-w-0 md:pr-2 transition-all duration-300 ${collapsed ? 'xl:ml-[115px]' : 'xl:ml-[323px]'}`}>
      <Navbar navigationOpen={open} onOpenSidenav={() => setOpen(!open)} brandText={getActiveRoute(links, pathname)} secondary={getActiveNavbar(links, pathname)} showSettings={scope === 'admin' || userPerms.has('settings.manage')} showLeadSearch={scope !== 'admin' && canReadLeads(userPerms)} />
      <div className="mx-auto min-h-[calc(100vh-150px)] p-2 pt-10 text-navy-700 dark:text-white">{children}</div>
      <div className="p-3"><Footer /></div>
    </main></div>
  </div>;
}
