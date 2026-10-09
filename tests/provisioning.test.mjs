import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as validation from '../src/utils/crm/validation.ts';

async function provision({role={id:'role',key:'viewer'},count=0,memberError=null,password='temporary-password',authorized=true}={}) {
  const calls=[];
  const query=result=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>result,then:resolve=>Promise.resolve(result).then(resolve)};return q;};
  const context={user:{id:'admin'},org:{id:'org',slug:'workspace',member_limit:5},supabase:{from:table=>query(table==='roles'?{data:role,error:null}:{count,error:null})}};
  const admin={auth:{admin:{createUser:async input=>{calls.push(['create',input]);return {data:{user:{id:'new-user'}},error:null};},deleteUser:async id=>{calls.push(['delete',id]);return {error:null};}}},from:()=>({insert:async input=>{calls.push(['insert',input]);return {error:memberError};}})};
  const stubs={'utils/supabase/admin':{createAdminClient:()=>admin},'next/cache':{revalidatePath:()=>{}},'utils/crm/access':{requireWriteOrg:async()=>{if(!authorized)throw Error('Forbidden');return context;}},'utils/crm/rate-limit':{rateLimit:async()=>{}},'utils/crm/validation':validation};
  const source=await readFile(new URL('../src/app/[orgSlug]/actions.ts',import.meta.url),'utf8');
  const mod=new SourceTextModule(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  await mod.link(name=>{const stub=stubs[name];assert.ok(stub,name);return new SyntheticModule(Object.keys(stub),function(){for(const [key,value]of Object.entries(stub))this.setExport(key,value);});});await mod.evaluate();
  const form=new FormData();form.set('email','new@example.com');form.set('password',password);form.set('role_id','11111111-1111-4111-8111-111111111111');
  return {run:()=>mod.namespace.addMember('workspace',{},form),calls};
}
test('provisioning rejects owner, foreign roles, full seats and short passwords before creating accounts',async()=>{
  for(const options of [{role:{key:'owner'}},{role:null},{count:5},{password:'short'}]){const {run,calls}=await provision(options);assert.ok((await run()).error);assert.equal(calls.length,0);}
});
test('provisioning requires authorized paid workspace administration',async()=>{const {run,calls}=await provision({authorized:false});await assert.rejects(run,/Forbidden/);assert.equal(calls.length,0);});
test('new accounts require password setup and receive only the validated workspace membership',async()=>{const {run,calls}=await provision();assert.ok((await run()).message);assert.equal(calls[0][1].app_metadata.must_change_password,true);assert.equal(calls[1][1].organization_id,'org');assert.equal(calls[1][1].user_id,'new-user');});
test('failed membership creation removes only the newly created auth account',async()=>{const {run,calls}=await provision({memberError:{code:'P0001'}});assert.ok((await run()).error);assert.deepEqual(calls.at(-1),['delete','new-user']);});
