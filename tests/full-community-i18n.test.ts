import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChannelType, Events, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { botText, setBotLocaleResolver } from '../src/i18n/index.js';
import { BOT_TRANSLATIONS } from '../src/i18n/messages.js';
import { COMMUNITY_MESSAGE_ROWS } from '../src/i18n/community-messages.js';
import { CommunityService } from '../src/community/service.js';
import { defaultGuild, defaultMemberCard, type CommunityGuild } from '../src/community/types.js';
import { localizedMemberCardSettings, memberCardText } from '../src/community/member-card.js';
import { VerificationService } from '../src/verification/service.js';
import { VerificationChallenges } from '../src/verification/challenges.js';

const logger = { warn() {}, error() {} };
const locales = ['en', 'fr', 'es', 'de', 'pt'] as const;
afterEach(() => { setBotLocaleResolver(() => 'en'); vi.restoreAllMocks(); });

function community(guildId = 'de', state = defaultGuild()) {
  const service = new CommunityService({} as never, '.', logger as never);
  const guild = { id: guildId, preferredLocale: 'es-ES' };
  const store = {
    get: () => state, config: () => state.config, level: () => undefined,
    mutate: async (_guild: string, operation: (value: CommunityGuild) => unknown) => operation(state),
  };
  (service as any).store = store;
  const interaction = { commandName: 'counting', guildId, guild, user: { id: 'alice' }, locale: 'fr',
    deferReply: vi.fn(async () => {}), editReply: vi.fn(async (_payload: any) => {}) };
  return { service, state, store, guild, interaction };
}

it('registers complete community translations with unchanged placeholder sets and valid component labels', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
  expect(new Set(COMMUNITY_MESSAGE_ROWS.map(row => row[0])).size).toBe(COMMUNITY_MESSAGE_ROWS.length);
  for (const [en, ...translated] of COMMUNITY_MESSAGE_ROWS) {
    expect(BOT_TRANSLATIONS[en], en).toBeDefined();
    for (const text of translated) { expect(text.trim(), en).not.toBe(''); expect(placeholders(text), en).toEqual(placeholders(en)); }
  }
  for (const locale of locales) {
    setBotLocaleResolver(() => locale);
    expect(botText('guild', 'Enter the image code').length).toBeLessThanOrEqual(45);
    expect(botText('guild', 'Six characters from your verification image').length).toBeLessThanOrEqual(45);
    expect(botText('guild', 'Enter code').length).toBeLessThanOrEqual(80);
  }
});

describe.each(locales)('community outputs in %s', locale => {
  it('uses each guild preference for command text and interpolates user challenge names only once', async () => {
    setBotLocaleResolver(guild => guild);
    const f = community(locale);
    f.state.config.counting.enabled = true; f.state.config.counting.channelId = '123456789012345678';
    f.state.counting.current = 41; f.state.counting.best = 99;
    await (f.service as any).command(f.interaction);
    const counting = f.interaction.editReply.mock.calls[0]![0].content;
    expect(counting).toContain('**42**'); expect(counting).toContain('<#123456789012345678>');
    if (locale !== 'en') expect(counting).not.toContain('Next number:');
    f.state.config.invites.enabled = true; f.state.config.invites.challengeName = 'Choose your roles {target}';
    f.state.inviteScores.alice = { total: 2, active: 1 };
    f.interaction.commandName = 'invites'; await (f.service as any).command(f.interaction);
    const invites = f.interaction.editReply.mock.lastCall![0].content;
    expect(invites).toContain('**Choose your roles {target}**'); expect(invites).toContain('<@alice>');
    if (locale !== 'en') expect(invites).not.toContain('Your progress:');
    f.state.config.levels.enabled = true; f.state.levels.alice = { xp: 100, lastAwardAt: 0 };
    f.interaction.commandName = 'rank'; await (f.service as any).command(f.interaction);
    expect(f.interaction.editReply.mock.lastCall![0].content).toContain('**100**');
    if (locale !== 'en') expect(f.interaction.editReply.mock.lastCall![0].content).not.toContain('Your level:');
    f.interaction.commandName = 'leaderboard'; await (f.service as any).command(f.interaction);
    expect(f.interaction.editReply.mock.lastCall![0].content).toContain('<@alice>');
    if (locale !== 'en') expect(f.interaction.editReply.mock.lastCall![0].content).not.toContain('Community activity');
  });

  it('localizes built-in card text while preserving all saved values and custom headings', () => {
    setBotLocaleResolver(() => locale);
    const settings = defaultMemberCard(), before = structuredClone(settings);
    const localized = localizedMemberCardSettings(settings, 'guild');
    expect(localized.joinHeading).toBe(botText('guild', 'Welcome aboard'));
    expect(localized.leaveFooter).toBe(botText('guild', '{count} members in the community'));
    expect(settings).toEqual(before);
    expect(localizedMemberCardSettings({ ...settings, joinHeading: 'Choose your roles' }, 'guild').joinHeading).toBe('Choose your roles');
    expect(memberCardText('{user} / {server} / {count}', { displayName: 'Name {server}', serverName: 'Server {count}', memberCount: 8 })).toBe('Name {server} / Server {count} / 8');
  });
});

it('uses the server locale for public automatic counting notices, without leaking another guild preference', async () => {
  setBotLocaleResolver(guild => guild === 'fixed' ? 'pt' : 'auto');
  for (const guildId of ['auto', 'fixed']) {
    const f = community(guildId);
    f.state.config.counting = { enabled: true, channelId: 'count' };
    const message = { guildId, guild: { preferredLocale: 'de' }, channelId: 'count', content: '3', id: 'message', author: { id: 'alice' }, react: vi.fn(async () => {}), reply: vi.fn(async (_payload: any) => {}) };
    await (f.service as any).processMessage(message);
    const content = message.reply.mock.lastCall![0].content;
    expect(content).toBe(botText(guildId, 'The next number was **{expected}**. The count resets. Start again at **1**.', { expected: 1 }, 'de'));
    expect(content).not.toContain('The next number'); expect(message.react).toHaveBeenCalledWith('❌');
    expect(message.reply.mock.lastCall![0].allowedMentions).toEqual({ parse: [], repliedUser: false });
  }
});

it('localizes only default welcome messages and keeps custom server text and inserted tokens literal', async () => {
  setBotLocaleResolver(() => 'auto');
  const f = community();
  const send = vi.fn(async (_payload: any) => {});
  const channel = { guildId: 'de', isTextBased: () => true, send };
  const guild = { id: 'de', preferredLocale: 'de', name: 'Server {count}', memberCount: 4, channels: { fetch: async () => channel } };
  const member = { id: 'alice', guild };
  f.state.config.welcome.enabled = true; f.state.config.welcome.channelId = 'welcome';
  await (f.service as any).sendWelcome(member, true);
  expect(send.mock.lastCall![0].content).toBe('Willkommen <@alice> auf Server {count}! Du bist Mitglied Nummer 4.');
  expect(f.state.config.welcome.message).toBe(defaultGuild().config.welcome.message);
  f.state.config.welcome.message = 'Choose your roles';
  await (f.service as any).sendWelcome(member, true);
  expect(send.mock.lastCall![0].content).toBe('Choose your roles');
});

it('renders localized invite logs without translating names, codes or Discord references', async () => {
  setBotLocaleResolver(() => 'auto');
  const f = community('guild');
  f.state.config.invites.loggingEnabled = true; f.state.config.invites.logChannelId = 'log';
  const send = vi.fn(async (_payload: any) => {});
  const channel = { guildId: 'guild', type: ChannelType.GuildText, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator), send };
  const guild = { id: 'guild', preferredLocale: 'es-ES', channels: { fetch: async () => channel }, members: { fetchMe: async () => ({}) } };
  await (f.service as any).sendInviteLog(guild, { event: 'joined', memberName: 'Choose your roles', memberId: 'alice', at: 1, source: 'invite', inviteCode: 'Welcome', inviterId: 'bob', inviteChannelId: 'channel', reason: 'matched', referralInviterId: 'carol' });
  const payload = send.mock.lastCall![0], embed = payload.embeds[0].toJSON();
  expect(embed.title).toBe('Un miembro se unió'); expect(embed.description).toBe('Choose your roles (<@alice>)');
  expect(embed.fields[1].value).toContain('Código de invitación: Welcome'); expect(embed.fields[1].value).toContain('<#channel>');
  expect(embed.fields[2].value).not.toContain('One observed'); expect(payload.allowedMentions).toEqual({ parse: [] });
});

function verification(locale = 'de') {
  const state = defaultGuild(), guildId = 'guild', channelId = 'channel', roleId = 'role';
  state.config.verification = { ...state.config.verification, enabled: true, channelId, roleId };
  state.verificationPanel = { channelId, messageId: 'panel', roleId, mode: 'challenge' };
  const role = { id: roleId, guild: { id: guildId }, editable: true, managed: false, permissions: new PermissionsBitField() };
  const member = { pending: false, user: { bot: false }, roles: { cache: new Map(), add: vi.fn(async () => {}) } };
  const message = { id: 'panel', author: { id: 'bot' }, react: vi.fn(async () => {}) };
  const channel = { id: channelId, guildId, isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator), send: vi.fn(async (_payload: any) => message) };
  const guild = { id: guildId, preferredLocale: locale, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageRoles) }), fetch: async () => member }, channels: { fetch: async () => channel }, roles: { fetch: async () => role } };
  const client = Object.assign(new EventEmitter(), { user: { id: 'bot' }, guilds: { fetch: async () => guild } });
  const store = { config: () => state.config, get: () => state, mutate: async (_id: string, cb: (state: CommunityGuild) => unknown) => cb(state) };
  const challenges = new VerificationChallenges(Date.now, () => 'AB2C3D');
  const service = new VerificationService(client as never, store as never, async (_id, op) => op(), logger as never, challenges);
  const interaction = (customId: string) => ({ guildId, channelId, locale, user: { id: 'alice', bot: false }, customId, message, deferred: false, replied: false, isButton: () => true, isModalSubmit: () => false,
    deferReply: vi.fn(async function(this: any) { this.deferred = true; }), editReply: vi.fn(async (_payload: any) => {}), reply: vi.fn(async (_payload: any) => {}), showModal: vi.fn(async (_modal: any) => {}) });
  return { state, channel, guild, service, client, member, interaction };
}

it.each(locales)('keeps verification panels, private image instructions and modal labels usable in %s', async locale => {
  setBotLocaleResolver(() => 'auto');
  const f = verification(locale); f.service.attach();
  try {
    await f.service.publishPanel('guild');
    const published = f.channel.send.mock.lastCall![0];
    expect(published.embeds[0].toJSON().title).toBe(botText('guild', 'Verify your membership', {}, locale));
    expect(published.components[0].toJSON().components[0].label).toBe(botText('guild', 'Verify', {}, locale));
    const start = f.interaction('verify:start'); f.client.emit(Events.InteractionCreate, start); await f.service.flush();
    const payload = start.editReply.mock.lastCall![0];
    expect(payload.content).toContain(botText('guild', 'Enter code', {}, locale));
    expect(payload.files[0].name).toBe('verification.png');
    const answer = f.interaction(payload.components[0].toJSON().components[0].custom_id);
    f.client.emit(Events.InteractionCreate, answer); await f.service.flush();
    expect(answer.showModal.mock.lastCall![0].toJSON().title).toBe(botText('guild', 'Enter the image code', {}, locale));
    const invalid = f.interaction('verify:answer:invalid'); f.client.emit(Events.InteractionCreate, invalid); await f.service.flush();
    expect(invalid.reply.mock.lastCall![0].content).toBe(botText('guild', 'This image expired or was replaced. Select Verify on the server panel for a new one.', {}, locale));
  } finally { f.service.stop(); await f.service.flush(); }
});

it('preserves custom verification wording even when it matches another translated key', async () => {
  setBotLocaleResolver(() => 'de');
  const f = verification(); f.state.config.verification.title = 'Choose your roles'; f.state.config.verification.message = 'Welcome aboard';
  await f.service.publishPanel('guild');
  expect(f.channel.send.mock.lastCall![0].embeds[0].toJSON()).toMatchObject({ title: 'Choose your roles', description: 'Welcome aboard' });
});
