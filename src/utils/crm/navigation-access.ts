export function canReadLeads(permissions: ReadonlySet<string>) {
  return permissions.has('leads.read.all') || permissions.has('leads.read.assigned');
}

export function canSeeWorkspaceRoute(path: string, permissions: ReadonlySet<string>) {
  switch (path) {
    case 'dashboard':
    case 'account': return true;
    case 'leads': return canReadLeads(permissions);
    case 'inventory': return permissions.has('inventory.read');
    case 'sites': return permissions.has('sites.read');
    case 'settings':
    case 'billing': return permissions.has('settings.manage');
    default: return false;
  }
}
