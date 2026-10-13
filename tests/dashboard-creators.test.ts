import { expect, it, vi } from 'vitest';
import { DashboardCreators } from '../src/dashboard/creators.js';
import { DashboardStreams } from '../src/dashboard/streams.js';

it('validates every linked live-role assignment before changing the creator member', async () => {
  const creator={id:'c',guildId:'g',name:'Creator',accountIds:['a','b'],discordMemberId:'111111111111111111'};
  const before=[{id:'a',creatorId:'c',liveRoleId:'role'},{id:'b',creatorId:'c',liveRoleId:'role'}];
  const store={getCreator:async()=>creator,forGuild:async()=>before,updateCreator:vi.fn(),get:vi.fn()};
  const validate=vi.fn(async(_guild:unknown,record:{id:string})=>{if(record.id==='b')throw new Error('Role missing');});
  const service=new DashboardCreators(store as never,{reconcileEdit:vi.fn()} as never,{withLock:async(fn:()=>unknown)=>fn()} as never,{validate} as never);
  await expect(service.update({id:'g',members:{fetch:async()=>({})}} as never,'c',{discordMemberId:'222222222222222222'})).rejects.toThrow('Role missing');
  expect(validate).toHaveBeenCalledTimes(2);
  expect(store.updateCreator).not.toHaveBeenCalled();
});

it('uses the destination profile member on account moves and rejects another guild profile', async () => {
  const before={id:'a',guildId:'g',creatorId:'old',discordMemberId:'111111111111111111',state:'offline'};
  let destination={id:'new',guildId:'g',discordMemberId:'222222222222222222'};
  const update=vi.fn(async(_id:string,patch:unknown)=>({...before,...patch as object}));
  const reconcileEdit=vi.fn(async()=>undefined);
  const store={get:async()=>before,getCreator:async()=>destination,forGuild:async()=>[before,{...before,id:'b'}],update};
  const service=new DashboardStreams(store as never,{} as never,{reconcileEdit} as never,{withLock:async(fn:()=>unknown)=>fn()} as never);
  const validate=vi.spyOn(service,'validate').mockResolvedValue();
  await service.update({id:'g'} as never,'a',{creatorId:'new',cooldownSeconds:60,discordMemberId:before.discordMemberId});
  expect(update).toHaveBeenCalledExactlyOnceWith('a',{creatorId:'new',cooldownSeconds:60,discordMemberId:'222222222222222222'});
  expect(validate).toHaveBeenCalledWith({id:'g'},expect.objectContaining({discordMemberId:'222222222222222222'}));
  expect(reconcileEdit).toHaveBeenCalledOnce();
  destination={...destination,guildId:'foreign'};
  await expect(service.update({id:'g'} as never,'a',{creatorId:'new'})).rejects.toThrow('not found in this server');
  expect(update).toHaveBeenCalledOnce();
});
