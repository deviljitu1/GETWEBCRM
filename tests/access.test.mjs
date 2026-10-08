import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as validation from '../src/utils/crm/validation.ts';

async function access({user = {id:'member'},org = {id:'org',status:'active'},membership = {role_id:'role'},permissions = ['leads.create'],admin = false,paidAccess = true,queryError = null} = {}) {
  const client = {
    auth:{getUser:async()=>({data:{user},error:null})},
    rpc:async name=>({data:name==='billing_access'?paidAccess:admin,error:null}),
    from(table) {
      const result={data:table==='organizations'?org:table==='organization_members'?membership:permissions.map(permission_key=>({permission_key})),error:queryError};
      const query={select:()=>query,eq:()=>query,maybeSingle:async()=>result,then:(resolve)=>Promise.resolve(result).then(resolve)};
      return query;
    },
  };
  const navigation={notFound:()=>{throw new Error('NOT_FOUND');},redirect:url=>{throw new Error(`REDIRECT:${url}`);}};
  const stubs={'server-only':{},react:{cache:fn=>fn},'next/navigation':navigation,'utils/supabase/server':{createClient:async()=>client},'./validation':validation};
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
test('unpaid members are routed to billing while billing and settings remain reachable',async()=>{
  const dal=await access({paidAccess:false,permissions:['leads.create','settings.manage']});
  await assert.rejects(dal.requireOrg('tenant-a','leads.create'),/REDIRECT:\/tenant-a\/billing/);
  assert.equal((await dal.requireOrg('tenant-a',undefined,true)).org.id,'org');
  assert.equal((await dal.requireOrg('tenant-a','settings.manage')).org.id,'org');
});
