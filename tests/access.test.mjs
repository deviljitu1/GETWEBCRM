import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as validation from '../src/utils/crm/validation.ts';

async function access({user = {id:'member'},org = {id:'org',status:'active'},membership = {role_id:'role'},permissions = ['leads.create'],admin = false,paidAccess = true,queryError = null, rpcError = null, calls = []} = {}) {
  const client = {
    auth:{getUser:async()=>{calls.push('auth');return {data:{user},error:null};}},
    rpc:async name=>{calls.push(name);return {data:name==='billing_access'?paidAccess:admin,error:rpcError};},
    from(table) {
      calls.push(table);
      const result={data:table==='organizations'?org:table==='organization_members'?membership:permissions.map(permission_key=>({permission_key})),error:queryError};
      const query={select:()=>query,eq:()=>query,maybeSingle:async()=>result,then:(resolve)=>Promise.resolve(result).then(resolve)};
      return query;
    },
  };
  const navigation={notFound:()=>{throw new Error('NOT_FOUND');},redirect:url=>{throw new Error(`REDIRECT:${url}`);}};
  const stubs={'server-only':{},react:{cache:fn=>{const requestCache=new Map();return (...args)=>{const key=JSON.stringify(args);if(!requestCache.has(key))requestCache.set(key,fn(...args));return requestCache.get(key);};}},'next/navigation':navigation,'utils/supabase/server':{createClient:async()=>client},'./validation':validation};
  const source=await readFile(new URL('../src/utils/crm/access.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const accessModule=new SourceTextModule(compiled);
  await accessModule.link(specifier=>{
    const stub=stubs[specifier]; if(!stub) throw new Error(`Unexpected dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(stub),function(){for(const [name,value] of Object.entries(stub))this.setExport(name,value);});
  });
  await accessModule.evaluate();
  return accessModule.namespace;
}
test('unauthenticated requests redirect to the workspace login',async()=>{
  const dal=await access({user:null});await assert.rejects(dal.requireOrg('tenant-a'),/REDIRECT:\/tenant-a\/login/);
});

test('temporary-password accounts cannot bypass setup through a workspace URL',async()=>{
  const dal=await access({user:{id:'member',app_metadata:{must_change_password:true}}});
  await assert.rejects(dal.requireOrg('tenant-a'),/REDIRECT:\/auth\/password/);
});

test('support access is read-only and excludes workspace administration',async()=>{
  const dal=await access({membership:null,admin:true});
  const context=await dal.requireOrg('tenant-a','sites.read');
  assert.equal(context.canWrite,false);
  await assert.rejects(dal.requireOrg('tenant-a','settings.manage'),/NOT_FOUND/);
  await assert.rejects(dal.requireWriteOrg('tenant-a','sites.read'),/read-only/);
});
test('tenant access rejects unavailable, suspended and nonmember workspaces',async()=>{
  for(const setup of [{org:null},{org:{id:'org',status:'suspended'}},{membership:null}]) {
    const dal=await access(setup);await assert.rejects(dal.requireOrg('tenant-a'),/NOT_FOUND/);
  }
});
test('a valid membership cannot bypass required permissions',async()=>{
  const dal=await access({permissions:['leads.read.all']});
  await assert.rejects(dal.requireOrg('tenant-a','settings.manage'),/NOT_FOUND/);
});
test('database authorization errors fail closed',async()=>{
  const dal=await access({queryError:{code:'unavailable'}});await assert.rejects(dal.requireOrg('tenant-a'),/Unable to load workspace/);
});
test('authorized members receive only their workspace context',async()=>{
  const dal=await access();const context=await dal.requireOrg('tenant-a','leads.create');
  assert.equal(context.org.id,'org');assert.equal(context.user.id,'member');assert.ok(context.permissions.has('leads.create'));
});
test('platform access requires a verified platform role',async()=>{
  const rejected=await access({admin:false});await assert.rejects(rejected.requirePlatformAdmin(),/NOT_FOUND/);
  const accepted=await access({admin:true});assert.equal((await accepted.requirePlatformAdmin()).user.id,'member');
});
test('unpaid members retain read-only workspace access while writes are rejected',async()=>{
  const dal=await access({paidAccess:false,permissions:['leads.create','settings.manage']});
  const context=await dal.requireOrg('tenant-a','leads.create');
  assert.equal(context.org.id,'org'); assert.equal(context.canWrite,false);
  await assert.rejects(dal.requireWriteOrg('tenant-a','leads.create'),/read-only/);
  assert.equal((await dal.requireOrg('tenant-a','settings.manage')).org.id,'org');
});

test('one request shares base resolution but checks each requested permission',async()=>{
  const calls=[];
  const dal=await access({calls,permissions:['inventory.read']});
  await Promise.all([dal.requireOrg('tenant-a'),dal.requireOrg('tenant-a','inventory.read')]);
  await assert.rejects(dal.requireOrg('tenant-a','settings.manage'),/NOT_FOUND/);
  assert.equal(calls.filter(c=>c==='auth').length,1);
  assert.equal(calls.filter(c=>c==='billing_access').length,1);
  await dal.requireOrg('tenant-b');
  assert.equal(calls.filter(c=>c==='organizations').length,2);
});

test('separate request scopes cannot reuse another users organization or grants',async()=>{
  const first=await access({user:{id:'alice'},org:{id:'org-a',status:'active'},permissions:['settings.manage']});
  const second=await access({user:{id:'bob'},org:{id:'org-b',status:'active'},permissions:['inventory.read']});
  assert.equal((await first.requireOrg('tenant-a')).org.id,'org-a');
  assert.equal((await second.requireOrg('tenant-b')).user.id,'bob');
  await assert.rejects(second.requireOrg('tenant-b','settings.manage'),/NOT_FOUND/);
});

test('billing lookup failures allow verified reads but fail closed for writes',async()=>{
  const dal=await access({rpcError:{code:'unavailable'}});
  const context=await dal.requireOrg('tenant-a');
  assert.equal(context.canWrite,false);
  assert.equal(context.billingVerified,false);
  await assert.rejects(dal.requireWriteOrg('tenant-a','leads.create'),/read-only/);
});
