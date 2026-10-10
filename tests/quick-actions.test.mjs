import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as validation from '../src/utils/crm/validation.ts';

const orgId = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';
const stageId = '33333333-3333-4333-8333-333333333333';
async function load({ permissions = ['leads.update.assigned'], denied = false, stageMissing = false, unavailable = false } = {}) {
  const calls = [];
  const supabase = { from(table) {
    const data = table === 'lead_stages' ? (stageMissing ? null : { id: stageId }) : unavailable ? null : { id: recordId };
    const query = { select(...args) { calls.push([table, 'select', ...args]); return query; }, update(changes) { calls.push([table, 'update', changes]); return query; }, eq(...args) { calls.push([table, 'eq', ...args]); return query; }, in(...args) { calls.push([table, 'in', ...args]); return query; }, or(...args) { calls.push([table, 'or', ...args]); return query; }, maybeSingle: async () => ({ data, error: null }), then(resolve) { return Promise.resolve({ data: data ? [data] : [], error: null }).then(resolve); } };
    return query;
  } };
  const dependencies = {
    'utils/supabase/admin': { createAdminClient() { throw Error('Service client must not be used'); } },
    'next/cache': { revalidatePath() {} },
    'utils/crm/access': { requireWriteOrg: async (slug, permission) => { assert.equal(slug, 'tenant'); if (denied) throw Error('Subscription required'); if (permission && !permissions.includes(permission)) throw Error('Forbidden'); return { supabase, org: { id: orgId, slug }, user: { id: 'member' }, permissions: new Set(permissions) }; } },
    'utils/crm/rate-limit': { rateLimit: async () => {} },
    'utils/crm/validation': validation,
  };
  const source = await readFile(new URL('../src/app/[orgSlug]/actions.ts', import.meta.url), 'utf8');
  const mod = new SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  await mod.link(name => { const values = dependencies[name]; assert.ok(values, name); return new SyntheticModule(Object.keys(values), function() { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }); }); await mod.evaluate();
  return { api: mod.namespace, calls };
}
function form(fields) { const data = new FormData(); for (const [name, value] of Object.entries(fields)) data.set(name, value); return data; }
test('quick and bulk actions preserve paid workspace checks', async () => {
  const { api, calls } = await load({ denied: true });
  await assert.rejects(api.quickLeadUpdate('tenant', recordId, {}, form({kind:'stage',stage_id:stageId})), /Subscription required/);
  await assert.rejects(api.bulkLeadStage('tenant', {}, form({ids:recordId,stage_id:stageId})), /Subscription required/);
  assert.equal(calls.length, 0);
});
test('viewer cannot make quick or bulk updates', async () => {
  const { api, calls } = await load({ permissions: [] });
  assert.ok((await api.quickLeadUpdate('tenant', recordId, {}, form({kind:'stage',stage_id:stageId}))).error);
  assert.ok((await api.bulkLeadStage('tenant', {}, form({ids:recordId,stage_id:stageId}))).error);
  assert.ok(!calls.some(call => call[1] === 'update'));
});
test('assigned-only updates retain organization and ownership filters', async () => {
  for (const bulk of [false,true]) {
    const { api, calls } = await load();
    const data = form({kind:'stage',stage_id:stageId,ids:recordId});
    const result = bulk ? await api.bulkLeadStage('tenant', {}, data) : await api.quickLeadUpdate('tenant', recordId, {}, data);
    assert.ok(result.message);
    assert.ok(calls.some(call => call[0] === 'leads' && call[1] === 'eq' && call[2] === 'organization_id' && call[3] === orgId));
    assert.ok(calls.some(call => call[0] === 'leads' && call[1] === 'eq' && call[2] === 'assigned_to' && call[3] === 'member'));
  }
});
test('stages outside the workspace and invalid bulk sizes fail before mutation', async () => {
  const { api, calls } = await load({ stageMissing: true });
  assert.ok((await api.quickLeadUpdate('tenant',recordId,{},form({kind:'stage',stage_id:stageId}))).error);
  assert.ok((await api.bulkLeadStage('tenant',{},form({ids:recordId,stage_id:stageId}))).error);
  assert.ok((await api.bulkLeadStage('tenant',{},form({stage_id:stageId}))).error);
  assert.ok(!calls.some(call => call[1] === 'update'));
});
test('property edit uses inventory permission and scoped user client', async () => {
  const denied = await load(); await assert.rejects(denied.api.editProperty('tenant',recordId,{},new FormData()),/Forbidden/);
  const { api, calls } = await load({permissions:['inventory.manage']});
  assert.ok((await api.editProperty('tenant',recordId,{},form({project_name:'Site',unit_number:'A-1',configuration:'2 BHK',price:'1000'}))).message);
  assert.ok(calls.some(call=>call[0]==='property_units' && call[1]==='eq' && call[2]==='organization_id' && call[3]===orgId));
});
test('missing records and malformed follow-up timestamps fail closed', async () => {
  const { api } = await load({unavailable:true});
  assert.ok((await api.quickLeadUpdate('tenant',recordId,{},form({kind:'followup',next_followup_at:'2026-10-10T12:00:00Z'}))).error);
  assert.ok((await api.quickLeadUpdate('tenant',recordId,{},form({kind:'followup',next_followup_at:'bad-date'}))).error);
});
test('bulk property updates require current statuses and preserve concurrency guards', async () => {
  const { api, calls } = await load({ permissions: ['inventory.manage'] });
  assert.ok((await api.bulkPropertyStatus('tenant',{},form({ids:recordId,status:'sold'}))).error);
  assert.ok(!calls.some(call=>call[1]==='update'));
  assert.ok((await api.bulkPropertyStatus('tenant',{},form({ids:recordId,status:'sold',previous:`${recordId}:available`}))).message);
  assert.ok(calls.some(call=>call[0]==='property_units' && call[1]==='eq' && call[2]==='organization_id' && call[3]===orgId));
  assert.ok(calls.some(call=>call[0]==='property_units' && call[1]==='or' && call[2]===`and(id.eq.${recordId},status.eq.available)`));
});
test('bulk requests cannot exceed the current page limit', async () => {
  const { api, calls } = await load();
  const data = form({stage_id:stageId});
  for (let index=0;index<26;index++) data.append('ids',`${String(index).padStart(8,'0')}-2222-4222-8222-222222222222`);
  assert.ok((await api.bulkLeadStage('tenant',{},data)).error);
  assert.ok(!calls.some(call=>call[1]==='update'));
});
