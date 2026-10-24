#!/usr/bin/env node
import {setTimeout as sleep} from 'node:timers/promises';
import {readConfig,createStore,productionDependencies} from './runtime.mjs';
import {renewOnce,renewalDue} from './renew.mjs';

// Never print provider errors, Axios objects, config values, request bodies or keys.
const knownErrors=new Set(['CONFIG_READ_FAILED','CONFIG_INVALID','CONFIG_TERMS_APPROVAL_REQUIRED','CONFIG_PATH_OUTSIDE_PRIVATE_DIRECTORY','TERMS_APPROVAL_REQUIRED','LOCK_BUSY','LOCK_UNAVAILABLE','LOCK_RELEASE_FAILED','DNS_CREATE_UNCERTAIN','DNS_CLEANUP_FAILED','DNS_RECORD_CHANGED','INVALID_CHALLENGE_ID','DNS_PROPAGATION_TIMEOUT','CLOUDFLARE_REQUEST_FAILED','UNEXPECTED_CHALLENGE','CHALLENGE_JOURNAL_INVALID','PRIVATE_FILE_UNSAFE','PRIVATE_DIRECTORY_UNSAFE','PRIVATE_KEY_INVALID','CERTIFICATE_INVALID']);
const safeCode=error=>knownErrors.has(error?.message)?error.message:'RENEWAL_FAILED';
const log=(event,info={})=>process.stdout.write(JSON.stringify({event,...info})+'\n');

async function main() {
  const args=process.argv.slice(2);
  if(args.length===1 && args[0]==='--help') {
    process.stdout.write('Usage: node cli.mjs --config <private/renewal.json> [--once|--watch|--check-config|--dry-run]\n');
    return;
  }
  let filename,mode='--once';
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--config' && !filename && args[i+1])filename=args[++i];
    else if(['--once','--watch','--check-config','--dry-run'].includes(args[i]) && mode==='--once')mode=args[i];
    else throw new Error('CONFIG_INVALID');
  }
  if(!filename)throw new Error('CONFIG_INVALID');
  const stop=new AbortController();
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>stop.abort());
  let lastSuccessfulCheckAt=null,notAfter=null;
  do {
    let config,store,failed=false;
    try {
      config=await readConfig(filename);
      store=createStore(config);
      if(mode==='--check-config') {log('configuration_valid',{hostname:config.hostname});return;}
      const current=await store.current();
      notAfter=current?.notAfter??null;
      if(mode==='--dry-run') {log('certificate_inspection',{hostname:config.hostname,notAfter,renewalDue:renewalDue(current,Date.now()),networkUsed:false});return;}
      const signal=AbortSignal.any([stop.signal,AbortSignal.timeout(12*60*1000)]);
      signal.throwIfAborted();
      const result=await renewOnce(config,productionDependencies(config,signal,log));
      notAfter=result.notAfter;
      lastSuccessfulCheckAt=new Date().toISOString();
      await store.status({state:result.status,hostname:config.hostname,checkedAt:lastSuccessfulCheckAt,lastSuccessfulCheckAt,notAfter:new Date(notAfter).toISOString(),error:null});
    } catch(error) {
      failed=true;
      const code=stop.signal.aborted?'STOPPED':safeCode(error);
      log('certificate_check_failed',{code});
      if(store) await store.status({state:'error',hostname:config.hostname,checkedAt:new Date().toISOString(),lastSuccessfulCheckAt,notAfter:notAfter?new Date(notAfter).toISOString():null,error:code}).catch(()=>log('status_write_failed'));
      if(mode!=='--watch') {process.exitCode=code==='LOCK_BUSY'?2:1;return;}
    }
    if(mode!=='--watch' || stop.signal.aborted)return;
    // Normal checks are twelve-hourly; recoverable failures retry hourly.
    try {await sleep((failed?1:12)*60*60*1000,undefined,{signal:stop.signal});} catch {return;}
  } while(!stop.signal.aborted);
}

main().catch(error=>{log('certificate_check_failed',{code:safeCode(error)});process.exitCode=1;});
