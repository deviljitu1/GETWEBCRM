import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SourceTextModule,SyntheticModule} from 'node:vm';
import ts from 'typescript';
import * as validation from '../src/utils/crm/validation.ts';

const orgId='11111111-1111-4111-8111-111111111111';
async function actions({denied=false,createError=false,rpcError=false,owner='owner',platform=false,accountEmail='owner@example.com'}={}) {
  const calls=[];
  const query=data=>{const q={select:()=>q,eq:()=>q,single:async()=>({data,error:null}),maybeSingle:async()=>({data,error:null})};return q;};
  const supabase={from:table=>query(table==='organizations'?{slug:'tenant',status:'active'}:{user_id:owner}),rpc:async(name,args)=>{calls.push([name,args]);return {data:null,error:rpcError?{code:'failed'}:null};}};
  const admin={from:()=>query(platform?{user_id:owner}:null),auth:{admin:{
    createUser:async input=>{calls.push(['createUser',input]);return {data:{user:{id:'created'}},error:createError?{message:'failed'}:null};},
    deleteUser:async id=>{calls.push(['deleteUser',id]);return {error:null};},
    getUserById:async id=>{calls.push(['getUser',id]);return {data:{user:{id,email:accountEmail,app_metadata:{existing:true}}},error:null};},
    updateUserById:async(id,input)=>{calls.push(['updateUser',id,input]);return {error:null};},
  }}};
  const dependencies={'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:url=>{throw Error(`REDIRECT:${url}`);}},
    'utils/crm/access':{requirePlatformAdmin:async()=>{if(denied)throw Error('Forbidden');return {supabase,user:{id:'admin'}};}},
    'utils/supabase/admin':{createAdminClient:()=>admin},'utils/crm/rate-limit':{rateLimit:async()=>{}},'utils/crm/validation':validation};
  const source=await readFile(new URL('../src/app/admin/actions.ts',import.meta.url),'utf8');
  const mod=new SourceTextModule(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  await mod.link(name=>{const values=dependencies[name];assert.ok(values,name);return new SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);});});await mod.evaluate();
  return {api:mod.namespace,calls};
}
function form(fields={}) {const f=new FormData();for(const [key,value]of Object.entries({name:'Tenant',slug:'tenant',owner_email:'owner@example.com',password:'temporary-password',...fields})) f.set(key,value);return f;}

test('tenant account and password operations require platform authorization',async()=>{
  const {api,calls}=await actions({denied:true});
  await assert.rejects(api.createOrganization({},form()),/Forbidden/);
  await assert.rejects(api.resetTenantOwnerPassword(orgId,{},form()),/Forbidden/);
  await assert.rejects(api.startTenantSupport(orgId,{},form()),/Forbidden/);
  assert.equal(calls.length,0);
});
test('new tenant owner gets a temporary account and failure removes only that new account',async()=>{
  const {api,calls}=await actions();assert.ok((await api.createOrganization({},form())).message);
  assert.equal(calls[0][1].app_metadata.must_change_password,true);
  assert.equal(calls[1][0],'create_organization');
  const failed=await actions({rpcError:true});assert.ok((await failed.api.createOrganization({},form())).error);
  assert.deepEqual(failed.calls.at(-1),['deleteUser','created']);
});
test('existing owner creation does not change credentials and invalid inputs never create accounts',async()=>{
  const existing=await actions();assert.ok((await existing.api.createOrganization({},form({password:''}))).message);
  assert.equal(existing.calls[0][0],'create_organization');
  for(const fields of [{password:'short'},{slug:'bad/slash'}]) {
    const instance=await actions();assert.ok((await instance.api.createOrganization({},form(fields))).error);assert.equal(instance.calls.length,0);
  }
});
test('password reset blocks own/platform accounts and wrong-owner emails',async()=>{
  for(const options of [{owner:'admin'},{platform:true},{accountEmail:'different@example.com'}]) {
    const {api,calls}=await actions(options);assert.ok((await api.resetTenantOwnerPassword(orgId,{},form())).error);
    assert.ok(!calls.some(call=>call[0]==='updateUser'));
  }
});
test('owner password reset targets verified owner and preserves metadata',async()=>{
  const {api,calls}=await actions();assert.ok((await api.resetTenantOwnerPassword(orgId,{},form())).message);
  const update=calls.find(call=>call[0]==='updateUser');assert.equal(update[1],'owner');
  assert.deepEqual(update[2].app_metadata,{existing:true,must_change_password:true});
});
test('one workspace save validates both inputs and uses a single atomic RPC',async()=>{
  const {api,calls}=await actions();assert.ok((await api.saveWorkspaceSettings(orgId,{},form({status:'active',member_limit:'5'}))).message);
  assert.deepEqual(calls,[['save_workspace_settings',{org_id:orgId,new_status:'active',seats:5}]]);
  for(const fields of [{status:'invalid',member_limit:'5'},{status:'active',member_limit:'0'}]) {
    const invalid=await actions();assert.ok((await invalid.api.saveWorkspaceSettings(orgId,{},form(fields))).error);assert.equal(invalid.calls.length,0);
  }
});
test('support opens only after a successful grant and revocation targets its workspace',async()=>{
  const {api,calls}=await actions();await assert.rejects(api.startTenantSupport(orgId,{},form()),/REDIRECT:\/tenant\/dashboard/);
  assert.deepEqual(calls[0],['grant_support_management',{target_org_id:orgId}]);
  assert.ok((await api.endTenantSupport(orgId,{},form())).message);
  assert.deepEqual(calls.at(-1),['revoke_support_access',{target_org_id:orgId}]);
  const failed=await actions({rpcError:true});assert.ok((await failed.api.startTenantSupport(orgId,{},form())).error);
});
