import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule,SyntheticModule } from 'node:vm';
import ts from 'typescript';
import * as validation from '../src/utils/crm/validation.ts';
async function actions({user={id:'verified-user'},updateError=null}={}) {
  const writes=[];
  const supabase={auth:{getUser:async()=>({data:{user},error:null}),updateUser:async value=>{writes.push(value);return {error:updateError};}}};
  const source=await readFile(new URL('../src/app/auth/actions.ts',import.meta.url),'utf8');
  const routeModule=new SourceTextModule(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  const stubs={'next/headers':{headers:async()=>new Headers()},'next/navigation':{redirect:()=>assert.fail('unexpected redirect')},'utils/supabase/server':{createClient:async()=>supabase},'utils/crm/rate-limit':{rateLimit:async()=>{}},'utils/crm/validation':validation};
  await routeModule.link(name=>{const exports=stubs[name];return new SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value);});});
  await routeModule.evaluate();return {actions:routeModule.namespace,writes};
}
function passwords(password,confirmation=password) {const form=new FormData();form.set('password',password);form.set('confirmation',confirmation);return form;}
test('password changes require a verified session and matching strong passwords',async()=>{
  const anonymous=await actions({user:null});assert.ok((await anonymous.actions.changePassword({},passwords('new-test-password'))).error);assert.equal(anonymous.writes.length,0);
  const valid=await actions();
  for(const form of [passwords('short'),passwords('new-test-password','different')]) assert.ok((await valid.actions.changePassword({},form)).error);
  assert.equal(valid.writes.length,0);
  assert.ok((await valid.actions.changePassword({},passwords('new-test-password'))).message);assert.deepEqual(valid.writes,[{password:'new-test-password'}]);
});
test('failed password changes do not report success or expose provider errors',async()=>{
  const rejected=await actions({updateError:{message:'private provider details'}});
  const result=await rejected.actions.changePassword({},passwords('new-test-password'));assert.ok(result.error);assert.equal(result.message,undefined);assert.equal(result.error.includes('private'),false);
});
