import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudflare,readConfig,acquireLock,atomicPrivateWrite,createStore,waitForDns} from '../runtime.mjs';
import {mkdtemp,writeFile,readFile,lstat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('Cloudflare cleanup checks and deletes only the created ID, leaving all other TXT records untouched',async()=>{
  const id='a'.repeat(32), zoneId='b'.repeat(32), calls=[];
  const record={name:'_acme-challenge.backup.cyrobot.ca',value:'public-value',id};
  const fakeFetch=async(url,options)=>{
    calls.push({url,options});
    return new Response(JSON.stringify({success:true,result:{id,name:record.name,content:record.value,type:'TXT'}}),{status:200});
  };
  const cf=createCloudflare({zoneId,cloudflareApiToken:'secret'},fakeFetch);
  await cf.remove(record);
  assert.deepEqual(calls.map(c=>c.options.method),['GET','DELETE']);
  assert.ok(calls.every(c=>c.url===`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${id}`));
});

test('the operating system lock rejects a concurrent process and can be acquired after release',async()=>{
  const hostname=`test-${process.pid}`;
  const release=await acquireLock(hostname);
  try {await assert.rejects(acquireLock(hostname),/LOCK_BUSY/);} finally {await release();}
  await (await acquireLock(hostname))();
});

test('atomic private publication replaces the file and preserves restricted access',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'cyro-cert-test-'));
  try {
    const filename=path.join(directory,'fullchain.pem');
    await atomicPrivateWrite(filename,'old');
    await atomicPrivateWrite(filename,'new');
    assert.equal(await readFile(filename,'utf8'),'new');
    if(process.platform!=='win32')assert.equal((await lstat(filename)).mode&0o077,0);
  } finally {await rm(directory,{recursive:true,force:true})}
});

test('store rejects an invalid certificate before replacing the existing certificate or stable key',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'cyro-cert-test-'));
  try {
    const config={hostname:'backup.cyrobot.ca',stateDir:path.join(directory,'state'),keyFile:path.join(directory,'key.pem'),certFile:path.join(directory,'cert.pem')};
    await atomicPrivateWrite(config.keyFile,'EXISTING PRIVATE KEY');
    await atomicPrivateWrite(config.certFile,'EXISTING CERTIFICATE');
    const store=createStore(config);
    await assert.rejects(store.publish('INVALID NEW CERTIFICATE'));
    assert.equal(await readFile(config.certFile,'utf8'),'EXISTING CERTIFICATE');
    assert.equal(await readFile(config.keyFile,'utf8'),'EXISTING PRIVATE KEY');
  } finally {await rm(directory,{recursive:true,force:true})}
});

test('configuration is private, resolves paths relative to itself, and rejects missing CA approval without exposing values',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'cyro-cert-test-'));
  try {
    const filename=path.join(directory,'renewal.json');
    const config={hostname:'backup.cyrobot.ca',zoneId:'a'.repeat(32),cloudflareApiToken:'s'.repeat(40),stateDir:'state',certFile:'fullchain.pem',keyFile:'privkey.pem',approvedTermsUrl:'https://letsencrypt.org/documents/LE-SA-v1.8-July-06-2026.pdf',termsAgreed:true};
    await writeFile(filename,JSON.stringify(config),{mode:0o600});
    assert.equal((await readConfig(filename)).certFile,path.join(directory,'fullchain.pem'));
    config.termsAgreed=false;
    await writeFile(filename,JSON.stringify(config));
    await assert.rejects(readConfig(filename),error=>error.message==='CONFIG_TERMS_APPROVAL_REQUIRED');
  } finally {await rm(directory,{recursive:true,force:true})}
});

test('DNS propagation requires two successive matches and times out within its configured bound',async()=>{
  let lookups=0, now=0;
  await waitForDns('example.test','txt',undefined,{lookup:async()=>++lookups>=2,now:()=>now,pause:async()=>{now+=5000}});
  assert.equal(lookups,3);
  now=0;
  await assert.rejects(waitForDns('example.test','txt',undefined,{lookup:async()=>false,now:()=>now,pause:async()=>{now+=5000}}),/DNS_PROPAGATION_TIMEOUT/);
  assert.equal(now,180000);
});
