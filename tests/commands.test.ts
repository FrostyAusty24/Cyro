import { describe, expect, it } from 'vitest';
import { commandBuilders } from '../src/commands/builders.js';

describe('Discord command schema', () => {
  it('builds all platform management commands', () => {
    const commands = commandBuilders.map((builder) => builder.toJSON());
    expect(commands.map((command) => command.name)).toEqual(['twitch', 'kick', 'tiktok', 'youtube', 'streamalerts', 'streamer-leaderboard', 'dashboard']);
    for (const command of commands.slice(0, 4)) {
      expect(command.options?.map((option) => option.name)).toEqual([
        'add', 'edit', 'clear', 'toggle', 'remove', 'list', 'test', 'check',
      ]);
      expect(command.default_member_permissions).toBe(String(1 << 5));
    }
  });
});
