import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('dry-run inspects locally without credentials in output, account creation or state writes',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'cyro-cert-cli-'));
  try {
    const filename=path.join(directory,'renewal.json'),secret='UNUSED_TEST_TOKEN_NOT_REAL_'.repeat(2);
    await writeFile(filename,JSON.stringify({hostname:'backup.cyrobot.ca',zoneId:'a'.repeat(32),cloudflareApiToken:secret,stateDir:'state',certFile:'fullchain.pem',keyFile:'privkey.pem',approvedTermsUrl:'https://letsencrypt.org/documents/LE-SA-v1.8-July-06-2026.pdf',termsAgreed:true}),{mode:0o600});
    const result=await promisify(execFile)(process.execPath,['cli.mjs','--config',filename,'--dry-run'],{cwd:new URL('..',import.meta.url),timeout:10000});
    assert.equal(result.stderr,'');
    assert.equal(result.stdout.includes(secret),false);
    assert.deepEqual(JSON.parse(result.stdout),{event:'certificate_inspection',hostname:'backup.cyrobot.ca',notAfter:null,renewalDue:true,networkUsed:false});
    assert.deepEqual(await readdir(directory),['renewal.json']);
  }finally{await rm(directory,{recursive:true,force:true})}
});
