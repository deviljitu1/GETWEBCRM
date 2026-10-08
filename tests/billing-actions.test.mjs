import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import { text, uuid } from '../src/utils/crm/validation.ts';

const organizationId = '11111111-1111-4111-8111-111111111111';
const planId = '22222222-2222-4222-8222-222222222222';
const localPlan = { is_active: true, razorpay_plan_id: 'plan_Test123', price_monthly: 2500, currency_code: 'INR' };
const providerPlan = { period: 'monthly', interval: 1, item: { amount: 250000, currency: 'INR' } };

async function actions({ existing = null, remotePlan = providerPlan, denied = false } = {}) {
  const calls = [], saved = [];
  const supabase = { from(table) {
    const result = table === 'organizations' ? { id: organizationId } : table === 'billing_contracts' ? existing : localPlan;
    const query = { select() { return query; }, eq() { return query; }, single: async () => ({ data: result, error: null }), maybeSingle: async () => ({ data: result, error: null }) };
    return query;
  } };
  const dependencies = {
    'next/cache': { revalidatePath() {} },
    'utils/crm/access': { requirePlatformAdmin: async () => { if (denied) throw new Error('Unauthorized'); return { supabase, user: { id: 'admin' } }; } },
    'utils/supabase/admin': { createAdminClient: () => ({ rpc: async (name, args) => { saved.push({ name, args }); return { error: null }; } }) },
    'utils/crm/rate-limit': { rateLimit: async () => {} },
    'utils/crm/validation': { text, uuid },
    'utils/billing/razorpay': {
      billingMode: () => 'test', syncSubscription: async () => {}, subscriptionData: x => x,
      razorpay: async (path, body) => { calls.push({ path, body }); return path.startsWith('plans/') ? remotePlan : { id: 'sub_Test123', plan_id: 'plan_Test123', short_url: 'https://rzp.io/rzp/example', status: 'created', paid_count: 0, total_count: 12 }; },
    },
  };
  const source = await readFile(new URL('../src/app/admin/billing/actions.ts', import.meta.url), 'utf8');
  const module = new SourceTextModule(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  await module.link(specifier => {
    const exports = dependencies[specifier];
    return new SyntheticModule(Object.keys(exports), function() { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); });
  });
  await module.evaluate();
  return { action: module.namespace.createCheckoutSubscription, calls, saved };
}
function form(cycles = '12') {
  const result = new FormData();
  result.set('organization_id', organizationId); result.set('plan_id', planId); result.set('billing_cycles', cycles);
  return result;
}
test('checkout creation requires platform authorization', async () => {
  const { action, calls } = await actions({ denied: true });
  await assert.rejects(action({}, form()), /Unauthorized/); assert.equal(calls.length, 0);
});
test('existing checkout and invalid billing cycles never create another provider subscription', async () => {
  for (const fixture of [{ existing: { provider_id: 'sub_Existing' } }, {}]) {
    const { action, calls } = await actions(fixture);
    assert.ok((await action({}, form(fixture.existing ? '12' : '0'))).error); assert.equal(calls.length, 0);
  }
});
test('a price mismatch prevents customer checkout creation', async () => {
  const { action, calls, saved } = await actions({ remotePlan: { ...providerPlan, item: { amount: 1, currency: 'INR' } } });
  assert.match((await action({}, form())).error, /match the CRM monthly price/);
  assert.equal(calls.length, 1); assert.equal(saved.length, 0);
});
test('checkout is attached to the authorized selection without granting paid access', async () => {
  const { action, calls, saved } = await actions();
  assert.ok((await action({}, form())).message);
  assert.equal(calls[1].path, 'subscriptions'); assert.equal(calls[1].body.plan_id, localPlan.razorpay_plan_id);
  assert.equal(saved[0].name, 'attach_billing_contract'); assert.equal(saved[0].args.org_id, organizationId);
  assert.equal(saved[0].args.provider_mode, 'test'); assert.equal(saved[0].args.paid_end, null);
});
