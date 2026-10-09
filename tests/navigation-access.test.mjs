import test from 'node:test';
import assert from 'node:assert/strict';
import { canSeeWorkspaceRoute, canReadLeads } from '../src/utils/crm/navigation-access.ts';

test('navigation exposes only the capabilities granted to each role', () => {
  const paths = ['dashboard','leads','inventory','sites','billing','settings','account'];
  const cases = [
    [[], ['dashboard','account']],
    [['leads.read.assigned'], ['dashboard','leads','account']],
    [['inventory.read','sites.read'], ['dashboard','inventory','sites','account']],
    [['sites.read','sites.manage'], ['dashboard','sites','account']],
    [['leads.read.all','inventory.read','sites.read','settings.manage'], paths],
  ];
  for (const [grants, expected] of cases) {
    const permissions = new Set(grants);
    assert.deepEqual(paths.filter(path => canSeeWorkspaceRoute(path,permissions)),expected);
    assert.equal(canReadLeads(permissions),expected.includes('leads'));
    assert.equal(canSeeWorkspaceRoute('unknown',permissions),false);
  }
});
