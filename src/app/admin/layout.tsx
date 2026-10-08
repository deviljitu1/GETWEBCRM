import type { ReactNode } from 'react';
import WorkspaceShell from 'components/crm/WorkspaceShell';
export default function Layout({ children }: { children: ReactNode }) {
  return <WorkspaceShell scope="admin">{children}</WorkspaceShell>;
}
