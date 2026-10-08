import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import ts from 'typescript';
import { validWebhookSignature, checkoutUrl } from '../src/utils/billing/signature.ts';

test('webhook signatures authenticate the exact raw body and reject malformed signatures', () => {
  const raw = '{ "event": "subscription.charged" }', secret = 'test-webhook-only';
  const signature = createHmac('sha256',secret).update(raw).digest('hex');
  assert.equal(validWebhookSignature(raw,signature,secret),true);
  for (const input of [null,'bad','f'.repeat(64),signature.slice(1)]) assert.equal(validWebhookSignature(raw,input,secret),false);
  assert.equal(validWebhookSignature(JSON.stringify(JSON.parse(raw)),signature,secret),false);
  assert.equal(validWebhookSignature(raw,signature,''),false);
});
test('checkout links cannot redirect customers to an attacker host', () => {
  assert.equal(checkoutUrl('https://rzp.io/rzp/example'),'https://rzp.io/rzp/example');
  for (const value of ['https://rzp.io.evil.example/x','http://rzp.io/x','https://user:pass@rzp.io/x','https://rzp.io:8080/x','javascript:alert(1)']) assert.throws(()=>checkoutUrl(value));
});

async function webhook(sync) {
  const source = await readFile(new URL('../src/app/api/webhooks/razorpay/route.ts',import.meta.url),'utf8');
  const routeModule = new SourceTextModule(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  await routeModule.link(specifier => {
    const exports = specifier === 'node:crypto' ? {createHash} : specifier === 'utils/billing/signature' ? {validWebhookSignature} : {syncSubscription:sync};
    return new SyntheticModule(Object.keys(exports),function(){for (const [key,value] of Object.entries(exports)) this.setExport(key,value);});
  });
  await routeModule.evaluate(); return routeModule.namespace.POST;
}
function request(raw, signed = true) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return new Request('https://crm.example/api/webhooks/razorpay',{method:'POST',body:raw,headers:{'x-razorpay-signature':signed ? createHmac('sha256',secret).update(raw).digest('hex') : '0'.repeat(64)}});
}
test('invalid signatures never invoke billing synchronization', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET='test-only-secret';
  let calls=0; const post=await webhook(async()=>calls++);
  assert.equal((await post(request('{}',false))).status,401); assert.equal(calls,0);
});
test('valid subscription events synchronize only the signed provider identifier', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET='test-only-secret';
  let received; const post=await webhook(async (...args)=>received=args);
  const raw=JSON.stringify({event:'subscription.charged',payload:{subscription:{entity:{id:'sub_Test123',notes:{organization_id:'attacker-supplied'}}}}});
  assert.equal((await post(request(raw))).status,200); assert.equal(received[0],'sub_Test123'); assert.match(received[1],/^[a-f0-9]{64}$/);
});
test('billing failures return retryable status and do not acknowledge processing', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET='test-only-secret';
  const post=await webhook(async()=>{throw new Error('transient');});
  const raw=JSON.stringify({event:'subscription.cancelled',payload:{subscription:{entity:{id:'sub_Test123'}}}});
  assert.equal((await post(request(raw))).status,503);
});
test('oversized and malformed signed webhook payloads are rejected', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET='test-only-secret';
  const post=await webhook(async()=>assert.fail('must not sync'));
  assert.equal((await post(request('x'.repeat(65537)))).status,413);
  assert.equal((await post(request('{broken'))).status,400);
  assert.equal((await post(request(JSON.stringify({event:'subscription.charged',payload:{}})))).status,400);
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});
