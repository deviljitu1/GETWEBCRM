import type { ReactNode } from 'react';
import WorkspaceShell from 'components/crm/WorkspaceShell';
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <WorkspaceShell scope={orgSlug}>{children}</WorkspaceShell>;
}
