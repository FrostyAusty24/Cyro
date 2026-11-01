import { afterEach, expect, it, vi } from 'vitest';
import { REST } from 'discord.js';
import { createRegistrationPlan, registerCommands } from '../src/commands/register.js';
import { Logger } from '../src/logger.js';
afterEach(()=>vi.restoreAllMocks());
it('keeps dashboard commands intact when deploying built-ins into an explicit development guild',async()=>{
  const post=vi.spyOn(REST.prototype,'post').mockResolvedValue({}),put=vi.spyOn(REST.prototype,'put').mockResolvedValue({});
  const config={discordClientId:'123456789012345678',discordToken:'test-only',commandScope:'development' as const,developmentGuildId:'223456789012345678'};
  await registerCommands(config as never,new Logger('error'));
  expect(put).not.toHaveBeenCalled();expect(post).toHaveBeenCalledTimes(createRegistrationPlan(config).body.length);
  for(const [route,options] of post.mock.calls){expect(route).toBe('/applications/123456789012345678/guilds/223456789012345678/commands');expect(options?.body).not.toHaveProperty('contexts');}
});
it('keeps built-in production registration global',async()=>{
  const post=vi.spyOn(REST.prototype,'post').mockResolvedValue({}),put=vi.spyOn(REST.prototype,'put').mockResolvedValue({});
  await registerCommands({discordClientId:'123456789012345678',discordToken:'test-only',commandScope:'global'} as never,new Logger('error'));
  expect(post).not.toHaveBeenCalled();expect(put).toHaveBeenCalledOnce();expect(put.mock.calls[0]?.[0]).toBe('/applications/123456789012345678/commands');
});
