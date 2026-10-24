import * as fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,createPrivateKey,randomUUID,X509Certificate} from 'node:crypto';
import {createServer} from 'node:net';
import {Resolver} from 'node:dns/promises';
import {setTimeout as sleep} from 'node:timers/promises';

const recordId = /^[a-f0-9]{32}$/i;
async function publicTxtMatches(name,value,signal) {
  return (await Promise.all(['1.1.1.1','8.8.8.8'].map(async server=>{
    const resolver=new Resolver({timeout:5000,tries:1});
    resolver.setServers([server]);
    const cancel=()=>resolver.cancel();
    signal?.addEventListener('abort',cancel,{once:true});
    try {signal?.throwIfAborted();return (await resolver.resolveTxt(name)).some(parts=>parts.join('')===value);}
    catch {return false;}
    finally {signal?.removeEventListener('abort',cancel);}
  }))).every(Boolean);
}

export async function waitForDns(name,value,signal,options={}) {
  const now=options.now??Date.now;
  const pause=options.pause??(()=>sleep(5000,undefined,{signal}));
  const lookup=options.lookup??(()=>publicTxtMatches(name,value,signal));
  const deadline=now()+180000;
  let successes=0;
  while(now()<deadline) {
    signal?.throwIfAborted();
    successes=await lookup()?successes+1:0;
    if(successes===2)return;
    await pause();
  }
  throw new Error('DNS_PROPAGATION_TIMEOUT');
}
function certificateInfo(pem,key,hostname,requireCurrent=false) {
  try {
    const cert=new X509Certificate(pem);
    const info={notBefore:Date.parse(cert.validFrom),notAfter:Date.parse(cert.validTo)};
    if (!cert.checkHost(hostname,{wildcards:false,subject:'never'}) || !cert.checkPrivateKey(createPrivateKey(key)) || cert.ca || cert.verify(cert.publicKey) || !Number.isFinite(info.notBefore) || !Number.isFinite(info.notAfter) || info.notAfter<=info.notBefore) throw new Error();
    if (requireCurrent && (info.notBefore>Date.now() || info.notAfter<=Date.now())) throw new Error();
    return info;
  } catch {throw new Error('CERTIFICATE_INVALID');}
}

export function createStore(config) {
  const journal=path.join(config.stateDir,'challenges.json');
  return {
    async current() {
      let pem;
      try {pem=await privateRead(config.certFile);} catch(error){if(error.code==='ENOENT')return null;throw error;}
      return certificateInfo(pem,await privateRead(config.keyFile),config.hostname);
    },
    async pending() {
      let value;
      try {value=JSON.parse(await privateRead(journal));} catch(error){if(error.code==='ENOENT')return [];throw new Error('CHALLENGE_JOURNAL_INVALID');}
      if(!Array.isArray(value) || value.length>4 || value.some(record=>record.name!==`_acme-challenge.${config.hostname}` || typeof record.value!=='string' || !/^[\w-]{43}$/.test(record.value) || (record.id!==null && !recordId.test(record.id)))) throw new Error('CHALLENGE_JOURNAL_INVALID');
      return value;
    },
    async savePending(value) {await atomicPrivateWrite(journal,JSON.stringify(value));},
    async publish(pem) {
      const info=certificateInfo(pem,await privateRead(config.keyFile),config.hostname,true);
      await atomicPrivateWrite(config.certFile,pem);
      return info;
    },
    async status(value) {await atomicPrivateWrite(path.join(config.stateDir,'status.json'),JSON.stringify(value,null,2)+'\n');},
  };
}
async function ensureDirectory(directory) {
  await fs.mkdir(directory,{recursive:true,mode:0o700});
  const stat=await fs.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform!=='win32' && (stat.mode&0o077)!==0)) throw new Error('PRIVATE_DIRECTORY_UNSAFE');
}

export async function atomicPrivateWrite(filename,content) {
  await ensureDirectory(path.dirname(filename));
  try {const stat=await fs.lstat(filename);if(!stat.isFile() || stat.isSymbolicLink())throw new Error('PRIVATE_FILE_UNSAFE');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const temporary=`${filename}.${randomUUID()}.tmp`;
  try {
    const file=await fs.open(temporary,'wx',0o600);
    try {await file.writeFile(content);await file.sync();} finally {await file.close();}
    await fs.rename(temporary,filename);
    // Persist the directory entry on Linux; the file itself was flushed above.
    if(process.platform!=='win32') {
      const directory=await fs.open(path.dirname(filename),'r');
      try {await directory.sync();} finally {await directory.close();}
    }
  } finally {await fs.unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
export async function acquireLock(hostname) {
  const port=41000+createHash('sha256').update(`cyro-certificate:${hostname}`).digest().readUInt16BE(0)%10000;
  const server=createServer(socket=>socket.destroy());
  await new Promise((resolve,reject)=>{
    server.once('error',error=>reject(new Error(('code' in error && error.code==='EADDRINUSE')?'LOCK_BUSY':'LOCK_UNAVAILABLE')));
    server.listen({host:'127.0.0.1',port,exclusive:true},()=>resolve(undefined));
  });
  return ()=>new Promise((resolve,reject)=>server.close(error=>error?reject(new Error('LOCK_RELEASE_FAILED')):resolve()));
}

async function privateRead(filename) {
  const stat=await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size>1024*1024 || (process.platform!=='win32' && (stat.mode&0o077)!==0)) throw new Error('PRIVATE_FILE_UNSAFE');
  return fs.readFile(filename,'utf8');
}

export async function readConfig(filename) {
  let raw;
  try {raw=JSON.parse(await privateRead(filename));} catch {throw new Error('CONFIG_READ_FAILED');}
  if (raw.termsAgreed!==true) throw new Error('CONFIG_TERMS_APPROVAL_REQUIRED');
  if (raw.hostname!=='backup.cyrobot.ca' || !recordId.test(raw.zoneId ?? '') || typeof raw.cloudflareApiToken!=='string' || !/^[a-zA-Z0-9_-]{20,256}$/.test(raw.cloudflareApiToken)) throw new Error('CONFIG_INVALID');
  if (typeof raw.approvedTermsUrl!=='string' || !/^https:\/\/letsencrypt\.org\/documents\/LE-SA-[a-zA-Z0-9.-]+\.pdf$/.test(raw.approvedTermsUrl)) throw new Error('CONFIG_INVALID');
  const base=path.dirname(path.resolve(filename));
  const paths={};
  for (const key of ['stateDir','certFile','keyFile']) {
    if (typeof raw[key]!=='string' || !raw[key]) throw new Error('CONFIG_INVALID');
    paths[key]=path.resolve(base,raw[key]);
    const relative=path.relative(base,paths[key]);
    if (!relative || relative==='..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('CONFIG_PATH_OUTSIDE_PRIVATE_DIRECTORY');
  }
  if (new Set(Object.values(paths)).size!==3 || paths.certFile===path.resolve(filename) || paths.keyFile===path.resolve(filename)) throw new Error('CONFIG_INVALID');
  return {hostname:raw.hostname,zoneId:raw.zoneId,cloudflareApiToken:raw.cloudflareApiToken,approvedTermsUrl:raw.approvedTermsUrl,termsAgreed:true,...paths};
}

export function createCloudflare(config, fetchImpl=fetch, signal) {
  const base=`https://api.cloudflare.com/client/v4/zones/${config.zoneId}/dns_records`;
  async function request(method, suffix='', body, cleanup=false) {
    const timeout=AbortSignal.timeout(cleanup?5000:15000);
    const response=await fetchImpl(base+suffix, {
      method, redirect:'error',
      signal:!cleanup && signal ? AbortSignal.any([signal,timeout]) : timeout,
      headers:{Authorization:`Bearer ${config.cloudflareApiToken}`,'Content-Type':'application/json'},
      ...(body ? {body:JSON.stringify(body)} : {}),
    });
    if (cleanup && response.status===404) return null;
    if (!response.ok) {
      const error=Object.assign(new Error('CLOUDFLARE_REQUEST_FAILED'),{confirmedRejected:method==='POST' && response.status>=400 && response.status<500 && response.status!==408});
      throw error;
    }
    const data=await response.json();
    if (data.success!==true) throw Object.assign(new Error('CLOUDFLARE_REQUEST_FAILED'),{confirmedRejected:method==='POST' && data.success===false});
    return data.result;
  }
  return {
    async create(record) {
      const result=await request('POST','',{type:'TXT',name:record.name,content:record.value,ttl:60});
      if (!result || !recordId.test(result.id)) throw new Error('DNS_CREATE_UNCERTAIN');
      return result.id;
    },
    async remove(record) {
      if (!recordId.test(record.id ?? '')) throw new Error('INVALID_CHALLENGE_ID');
      const suffix=`/${record.id}`;
      const existing=await request('GET',suffix,undefined,true);
      if (!existing) return;
      if (existing.id!==record.id || existing.type!=='TXT' || existing.name!==record.name || existing.content!==record.value) throw new Error('DNS_RECORD_CHANGED');
      await request('DELETE',suffix,undefined,true);
    },
  };
}

export function productionDependencies(config,signal,log) {
  /** @type {import('acme-client').Client|undefined} */
  let client;
  /** @type {typeof import('acme-client')} */
  let acme;
  async function privateKey(filename) {
    try {const pem=await privateRead(filename);createPrivateKey(pem);return pem;}
    catch(error) {
      if(error.code!=='ENOENT')throw new Error('PRIVATE_KEY_INVALID');
      const pem=await acme.crypto.createPrivateRsaKey(2048);
      await atomicPrivateWrite(filename,pem);
      return pem;
    }
  }
  async function getClient() {
    if(client)return client;
    acme=(await import('acme-client')).default;
    acme.setLogger(()=>{});
    acme.axios.defaults.timeout=15000;
    acme.axios.defaults.signal=signal;
    const accountKey=await privateKey(path.join(config.stateDir,'account-key.pem'));
    client=new acme.Client({directoryUrl:acme.directory.letsencrypt.production,accountKey,backoffAttempts:12,backoffMin:2000,backoffMax:10000});
    return client;
  }
  return {
    now:Date.now, log, lock:()=>acquireLock(config.hostname), store:createStore(config),
    dns:createCloudflare(config,fetch,signal), waitDns:(name,value)=>waitForDns(name,value,signal),
    authority:{
      async terms(){return (await getClient()).getTermsOfServiceUrl();},
      async issue(callbacks) {
        const issuer=await getClient();
        const stableKey=await privateKey(config.keyFile);
        const [,csr]=await acme.crypto.createCsr({altNames:[config.hostname]},stableKey);
        signal?.throwIfAborted();
        const certificate=await issuer.auto({csr,termsOfServiceAgreed:true,challengePriority:['dns-01'],challengeCreateFn:callbacks.create,challengeRemoveFn:callbacks.remove});
        await atomicPrivateWrite(path.join(config.stateDir,'account.json'),JSON.stringify({accountUrl:issuer.getAccountUrl()}));
        return certificate;
      },
    },
  };
}
