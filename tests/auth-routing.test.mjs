import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import { safeNext } from '../src/utils/crm/validation.ts';

async function callback({ admin = false, authError = null, inviteError = null, adminError = null } = {}) {
  const supabase = {
    auth: { exchangeCodeForSession: async () => ({ error: authError }) },
    rpc: async name => name === 'is_platform_admin' ? { data: admin, error: adminError } : { error: inviteError },
  };
  const stubs = {
    'next/server': { NextResponse: { redirect: url => ({ status: 307, location: url.href }) } },
    'utils/supabase/server': { createClient: async () => supabase },
    'utils/crm/validation': { safeNext },
  };
  const source = await readFile(new URL('../src/app/auth/callback/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const routeModule = new SourceTextModule(compiled);
  await routeModule.link(specifier => {
    const stub = stubs[specifier];
    if (!stub) throw new Error(`Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(stub), function () {
      for (const [name, value] of Object.entries(stub)) this.setExport(name, value);
    });
  });
  await routeModule.evaluate();
  return routeModule.namespace.GET;
}

test('verified platform administrators land in admin from shared and client Google logins', async () => {
  const get = await callback({ admin: true });
  for (const next of ['/workspaces', '/tenant-a/dashboard']) {
    const result = await get(new Request(`https://crm.example/auth/callback?code=test&next=${encodeURIComponent(next)}`));
    assert.equal(result.location, 'https://crm.example/admin');
  }
});

test('ordinary users retain their intended workspace destination', async () => {
  const get = await callback();
  const result = await get(new Request('https://crm.example/auth/callback?code=test&next=/workspaces'));
  assert.equal(result.location, 'https://crm.example/workspaces');
});

test('failed exchanges and authorization lookups return to login without granting access', async () => {
  for (const setup of [{ authError: {} }, { inviteError: {} }, { adminError: {} }]) {
    const get = await callback(setup);
    const result = await get(new Request('https://crm.example/auth/callback?code=test&next=/workspaces'));
    assert.equal(result.location, 'https://crm.example/login?error=auth-failed');
  }
});

test('Google callbacks cannot redirect ordinary users to an external origin', async () => {
  const get = await callback();
  const result = await get(new Request('https://crm.example/auth/callback?code=test&next=https://evil.example'));
  assert.equal(result.location, 'https://crm.example/');
});
