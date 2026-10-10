import { requireOrg } from 'utils/crm/access';
import NavigationSnapshot from './NavigationSnapshot';

export default async function WorkspaceNavigation({ orgSlug }: { orgSlug: string }) {
  const { user, permissions } = await requireOrg(orgSlug);
  return <NavigationSnapshot scope={orgSlug} userId={user.id} permissions={[...permissions]} />;
}
