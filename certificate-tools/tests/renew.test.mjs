import test from 'node:test';
import assert from 'node:assert/strict';
import { renewalDue, renewOnce } from '../renew.mjs';

test('renewal follows two-thirds of actual certificate lifetime for 90, 64, 45 and 6 days', () => {
  for (const days of [90, 64, 45, 6]) {
    const start = Date.UTC(2026, 0, 1), end = start + days * 86400000;
    assert.equal(renewalDue({ notBefore: start, notAfter: end }, start + (end - start) * 0.6), false);
    assert.equal(renewalDue({ notBefore: start, notAfter: end }, start + (end - start) * 0.7), true);
  }
  assert.equal(renewalDue(null, Date.now()), true);
});

test('a certificate that is not due makes no CA or Cloudflare calls', async () => {
  let released = false;
  const result = await renewOnce({hostname:'backup.cyrobot.ca'}, {
    now: () => 100,
    lock: async () => async () => { released = true; },
    store: { current: async () => ({notBefore:0,notAfter:1000}), pending:async()=>[] },
    log:()=>{},
  });
  assert.equal(result.status, 'not_due');
  assert.equal(released, true);
});

function harness(overrides={}) {
  const config={hostname:'backup.cyrobot.ca', termsAgreed:true, approvedTermsUrl:'https://letsencrypt.org/terms.pdf'};
  let pending=[], published=null;
  const calls=[], logs=[];
  const auth={identifier:{value:config.hostname}}, challenge={type:'dns-01'};
  const deps={
    now:()=>100, lock:async()=>async()=>{calls.push('release')}, log:(event,info)=>logs.push({event,...info}),
    store:{current:async()=>null,pending:async()=>structuredClone(pending),savePending:async p=>{pending=structuredClone(p)},publish:async p=>{published=p;return {notBefore:0,notAfter:1000}}},
    authority:{terms:async()=>config.approvedTermsUrl, issue:async callbacks=>{await callbacks.create(auth,challenge,'public-txt-value');await callbacks.remove(auth,challenge,'public-txt-value');return 'NEW CERTIFICATE'}},
    dns:{create:async()=>{calls.push('create');return 'created-id'},remove:async record=>{calls.push(`remove:${record.id}`)}},
    waitDns:async()=>calls.push('propagated'),
  };
  Object.assign(deps,overrides);
  return {config,deps,calls,logs,get pending(){return pending},get published(){return published}};
}

test('successful issuance persists its exact challenge ID, removes only that ID, then publishes',async()=>{
  const h=harness();
  assert.equal((await renewOnce(h.config,h.deps)).status,'renewed');
  assert.deepEqual(h.calls,['create','propagated','remove:created-id','release']);
  assert.deepEqual(h.pending,[]);
  assert.equal(h.published,'NEW CERTIFICATE');
});

test('ACME failure cleans its own challenge, preserves the certificate, releases the lock, and never logs errors containing secrets',async()=>{
  const h=harness();
  h.deps.authority.issue=async cb=>{await cb.create({identifier:{value:h.config.hostname}},{type:'dns-01'},'public-txt-value');throw Error('SUPER_SECRET_TOKEN HTTP trace');};
  await assert.rejects(renewOnce(h.config,h.deps));
  assert.deepEqual(h.calls,['create','propagated','remove:created-id','release']);
  assert.deepEqual(h.pending,[]);
  assert.equal(h.published,null);
  assert.equal(JSON.stringify(h.logs).includes('SUPER_SECRET'),false);
});

test('an unexpected CA agreement blocks issuance and a journal read failure still releases the lock',async()=>{
  const h=harness();
  h.deps.authority.terms=async()=> 'https://letsencrypt.org/new-terms.pdf';
  await assert.rejects(renewOnce(h.config,h.deps),/TERMS_APPROVAL_REQUIRED/);
  assert.deepEqual(h.calls,['release']);
  h.deps.store.pending=async()=>{throw Error('read failure')};
  await assert.rejects(renewOnce(h.config,h.deps));
  assert.deepEqual(h.calls,['release','release']);
});

test('an ambiguous DNS create result remains journaled and blocks another attempt instead of deleting pre-existing records',async()=>{
  const h=harness();
  h.deps.dns.create=async()=>{h.calls.push('uncertain-create');throw Error('response lost');};
  await assert.rejects(renewOnce(h.config,h.deps));
  assert.equal(h.pending.length,1);
  assert.equal(h.pending[0].id,null);
  await assert.rejects(renewOnce(h.config,h.deps),/DNS_CREATE_UNCERTAIN/);
  assert.deepEqual(h.calls,['uncertain-create','release','release']);
});

test('a definite rejected DNS create clears only its own uncreated intent so token correction can retry',async()=>{
  const h=harness();
  h.deps.dns.create=async()=>{const error=Error('CLOUDFLARE_REQUEST_FAILED');error.confirmedRejected=true;throw error;};
  await assert.rejects(renewOnce(h.config,h.deps));
  assert.deepEqual(h.pending,[]);
  assert.deepEqual(h.calls,['release']);
});
