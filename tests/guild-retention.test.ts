import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { GuildRetention } from '../src/services/guild-retention.js';
import { Logger } from '../src/logger.js';

it('retains removed guilds for 30 days, cancels on rejoin, and skips cleanup while offline', async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'guild-retention-'));
  try{
    const id='123456789012345678';let ready=true;
    const cache=new Map<string,unknown>();
    const client={isReady:()=>ready,guilds:{cache}} as unknown as Client;
    const purgeGuild=vi.fn(async()=>undefined);
    const service=new GuildRetention(client,path.join(directory,'removed.json'),[{guildIds:async()=>[id],purgeGuild}],new Logger('error'));
    await service.init();await service.reconcile(1000);await service.reconcile(1000+29*86400000);
    expect(purgeGuild).not.toHaveBeenCalled();
    cache.set(id,{});await service.reconcile(1000+30*86400000);
    expect(JSON.parse(await readFile(path.join(directory,'removed.json'),'utf8'))).toEqual({});
    cache.delete(id);await service.reconcile(1000+31*86400000);
    ready=false;await service.reconcile(1000+70*86400000);expect(purgeGuild).not.toHaveBeenCalled();
    ready=true;await service.reconcile(1000+70*86400000);expect(purgeGuild).toHaveBeenCalledExactlyOnceWith(id,expect.any(Function));
  }finally{await rm(directory,{recursive:true,force:true});}
});
