import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSiteData } from '../src/utils/crm/site-data.ts';

function client(records = {}, fail = '') {
  const calls=[];
  return { calls, rpc:async(name,args)=>{calls.push({table:name,args});return {data:{projects:3},error:null};},
    from(table) {
      const filters={}; let from=0,to=999,columns;
      const query={select:value=>{columns=value;return query;},eq:(key,value)=>{filters[key]=value;return query;},order:()=>query,range:(a,b)=>{from=a;to=b;return query;},then(resolve,reject){
        calls.push({table,filters,from,to,columns});
        return Promise.resolve({data:(records[table]||[]).filter(r=>!r.organization_id||r.organization_id===filters.organization_id).slice(from,to+1),error:table===fail?{code:'denied'}:null}).then(resolve,reject);
      }};return query;
    },
  };
}
test('site overview uses only its summary RPC',async()=>{
  const db=client();const data=await loadSiteData(db,'org-a','dashboard',true,1,1);
  assert.equal(db.calls.length,1);assert.deepEqual(db.calls[0],{table:'site_management_summary',args:{org_id:'org-a'}});assert.equal(data.summary.projects,3);
});
test('read-only daily tab omits unused form lookups and scopes every query',async()=>{
  const db=client();await loadSiteData(db,'org-a','daily',false,1,1);
  assert.deepEqual(db.calls.map(c=>c.table).sort(),['site_daily_reports','site_projects']);
  assert.ok(db.calls.every(c=>c.filters.organization_id==='org-a'));
});
test('paging exposes records after the old fixed limit without cross-org rows',async()=>{
  const db=client({site_tasks:[...Array.from({length:101},(_,id)=>({id,organization_id:'org-a'})),{id:'private',organization_id:'org-b'}]});
  const one=await loadSiteData(db,'org-a','tasks',false,1,1);
  const three=await loadSiteData(db,'org-a','tasks',false,3,1);
  assert.equal(one.primary.rows.length,50);assert.equal(one.primary.hasMore,true);
  assert.deepEqual(three.primary.rows.map(r=>r.id),[100]);assert.equal(three.primary.hasMore,false);
});
test('required dropdowns continue beyond a single lookup batch',async()=>{
  const db=client({site_projects:Array.from({length:501},(_,id)=>({id,name:`Project ${id}`}))});
  const data=await loadSiteData(db,'org-a','daily',true,1,1);
  assert.equal(data.projects.length,501);assert.equal(db.calls.filter(c=>c.table==='site_projects').length,2);
  assert.ok(db.calls.some(c=>c.table==='site_contractors'));assert.ok(!db.calls.some(c=>c.table==='site_bookings'));
});
test('query failures are not treated as empty lists',async()=>{
  await assert.rejects(loadSiteData(client({},'site_tasks'),'org-a','tasks',false,1,1),/Unable to load records/);
});

test('new reports are paginated, org-scoped and do not fetch unused lookups',async()=>{
  for (const [view,table] of [['missing','site_missing_daily_reports'],['balances','site_contractor_balances'],['costs','site_expense_totals'],['consumption','site_material_totals']]) {
    const db=client({[table]:[...Array.from({length:51},(_,id)=>({id,organization_id:'org-a'})),{id:'private',organization_id:'org-b'}]});
    const data=await loadSiteData(db,'org-a',view,false,1,1);
    assert.equal(db.calls.length,1);
    assert.equal(db.calls[0].table,table);
    assert.equal(db.calls[0].filters.organization_id,'org-a');
    assert.equal(data.primary.rows.length,50);
    assert.equal(data.primary.hasMore,true);
    const next=await loadSiteData(db,'org-a',view,false,2,1);
    assert.deepEqual(next.primary.rows.map(row=>row.id),[50]);
    assert.equal(next.primary.hasMore,false);
    await assert.rejects(loadSiteData(client({},table),'org-a',view,false,1,1),/Unable to load records/);
  }
});

test('report views preserve invoker RLS, explicit permission guards and org joins',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/00013_site_reporting.sql',import.meta.url),'utf8');
  assert.equal((sql.match(/WITH \(security_invoker=true\)/g)||[]).length,4);
  assert.equal((sql.match(/has_org_permission\([^\n]+,'sites.read'\)/g)||[]).length,4);
  assert.match(sql,/d.organization_id=p.organization_id AND d.project_id=p.id/);
  assert.match(sql,/organization_id=c.organization_id AND contractor_id=c.id/g);
  assert.match(sql,/organization_id=p.organization_id AND project_id=p.id/);
  assert.match(sql,/organization_id=m.organization_id AND material_id=m.id/);
  assert.match(sql,/Asia\/Kolkata/);
});
