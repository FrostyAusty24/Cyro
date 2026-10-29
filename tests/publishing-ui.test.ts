import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { expect, it } from 'vitest';
import { dashboardError, dashboardErrorScript, DASHBOARD_TRANSLATIONS } from '../src/i18n/dashboard-errors.js';

const source=(name:string)=>readFileSync(new URL(`../public/${name}`,import.meta.url),'utf8');
const missing='Cyro is missing these permissions in this channel: Embed Links. Ask a server admin to check Cyro’s role and this channel’s permissions.';
function harness(locale='en'){
  const window:any={};
  const context=createContext({window,document:{documentElement:{},querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem:()=>locale,setItem:()=>{}}});
  for(const file of ['i18n-catalogs.js','i18n-extra-catalogs.js','i18n-additional-catalogs.js','i18n-dashboard-modules.js'])runInContext(source(file),context);
  runInContext(dashboardErrorScript(),context);runInContext(source('i18n.js'),context);runInContext(source('studio.js'),context);
  return {window, failure:runInContext('studioPublishFailure',context)};
}

it('shows a definite refusal without a duplicate-post warning in every dashboard language',()=>{
  for(const locale of ['en','fr','es','de','pt']){
    const h=harness(locale),error={...dashboardError(new Error(missing)),publishOutcome:'not_sent'};
    const result=h.failure(error,false);
    expect(result.uncertain).toBe(false);
    const copy=String(result.message);
    expect(copy).not.toContain('Check the channel before');
    if(locale==='en')expect(copy).toContain('Nothing was posted.');
    else {expect(copy).not.toContain('Nothing was posted.');expect(copy).not.toContain('Embed Links');}
    expect(copy).not.toContain('{error}');
  }
});

it('keeps uncertainty for timeouts, unstructured errors and retries after a lost response',()=>{
  const h=harness();
  for(const error of [{message:'Timed out'},{...dashboardError(new Error(missing)),publishOutcome:'unknown'},{...dashboardError(new Error(missing)),publishOutcome:false}]){
    const result=h.failure(error,false);expect(result.uncertain).toBe(true);expect(String(result.message)).toContain('Check the channel before');
  }
  const result=h.failure({...dashboardError(new Error(missing)),publishOutcome:'not_sent'},true);
  expect(result.uncertain).toBe(true);expect(String(result.message)).not.toContain('Nothing was posted.');
});

it('has localized copy for every allowed missing-permission combination',()=>{
  const labels=['View Channel','Send Messages','Send Polls','Embed Links'];
  for(let mask=1;mask<16;mask++){
    const names=labels.filter((_,index)=>mask&(1<<index));
    const key=`Cyro is missing these permissions in this channel: ${names.join(', ')}. Ask a server admin to check Cyro’s role and this channel’s permissions.`;
    expect(dashboardError(new Error(key)).i18n.key).toBe(key);
    for(const locale of ['fr','es','de','pt'] as const)expect(DASHBOARD_TRANSLATIONS[key]?.[locale]).toBeTruthy();
  }
});

it('transports only recognized publish-outcome metadata from the dashboard response',async()=>{
  const app=source('app.js');const apiSource=app.slice(app.indexOf('async function api('),app.indexOf('\nfunction brand('));
  for(const publishOutcome of ['not_sent','unknown','untrusted']){
    const context=createContext({state:{},AbortSignal,fetch:async()=>({ok:false,status:400,json:async()=>({error:missing,publishOutcome})})});
    runInContext(apiSource,context);
    const error=await runInContext("api('/api/guilds/123/messages','POST',{}).catch(error=>error)",context);
    expect(error.publishOutcome).toBe(publishOutcome==='untrusted'?undefined:publishOutcome);
  }
});
