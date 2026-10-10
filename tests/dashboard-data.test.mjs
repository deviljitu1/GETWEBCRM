import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDashboardData } from '../src/utils/crm/dashboard-data.ts';

function client({ failed = '', thrown = '' } = {}) {
  const calls = [];
  const response = table => table === thrown ? Promise.reject(new Error('network failure'))
    : Promise.resolve({ data: table === 'summary' ? { leads: 2, pipeline: [] } : table === 'profiles' ? { full_name: 'Member' } : [], error: table === failed ? { code: 'unavailable' } : null });
  return {
    calls,
    rpc(name,args) { calls.push({table:'summary',args}); return response('summary'); },
    from(table) {
      const filters = {};
      const query = { select:()=>query, eq:(key,value)=>{filters[key]=value;return query;}, gte:()=>query, not:()=>query, order:()=>query, limit:()=>query,
        maybeSingle:()=>query, then(resolve,reject) { calls.push({table,filters});return response(table).then(resolve,reject); } };
      return query;
    },
  };
}

test('dashboard requests are scoped and omit lead queries for restricted roles',async()=>{
  const db=client();const data=await loadDashboardData(db,'org-a','user-a',false);
  assert.deepEqual(db.calls.map(call=>call.table).sort(),['profiles','summary']);
  assert.deepEqual(db.calls.find(call=>call.table==='summary').args,{org_id:'org-a'});
  assert.deepEqual(db.calls.find(call=>call.table==='profiles').filters,{id:'user-a'});
  assert.equal(data.summary.unavailable,false);
});

test('a failed section does not prevent the remaining dashboard data from loading',async()=>{
  for (const setup of [{failed:'summary'},{thrown:'site_visits'},{failed:'profiles'}]) {
    const db=client(setup);const data=await loadDashboardData(db,'org-a','user-a',true);
    const section = setup.failed==='summary' ? 'summary' : setup.failed==='profiles' ? 'profile' : 'visits';
    assert.equal(data[section].unavailable,true);
    assert.equal(data[section].data,null);
    assert.equal(data.followups.unavailable,false);
    for (const call of db.calls.filter(call=>['leads','site_visits'].includes(call.table))) assert.equal(call.filters.organization_id,'org-a');
  }
});
