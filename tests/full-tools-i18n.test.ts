import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { botText, botError, BotMessageError, setBotLocaleResolver } from '../src/i18n/index.js';
import { BOT_TRANSLATIONS } from '../src/i18n/messages.js';
import { TOOLS_MESSAGE_ROWS, matchesToolsReference } from '../src/i18n/tools-messages.js';
import { bugReportPayload, CommunityToolsService } from '../src/community-tools/service.js';
import { parseBugContent } from '../src/community-tools/types.js';
import { suggestionPayload } from '../src/suggestions/service.js';
import { ConfessionsService } from '../src/confessions/service.js';
import { TempVoiceService } from '../src/temp-voice/service.js';

const G = '111111111111111111', U = '222222222222222222', B = '333333333333333333', C = '444444444444444444', M = '555555555555555555';
const locales = ['fr', 'es', 'de', 'pt'] as const;
const dirs: string[] = [];
afterEach(async () => { setBotLocaleResolver(() => 'en'); vi.restoreAllMocks(); for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function temp() { const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-tools-i18n-')); dirs.push(dir); return dir; }
const logger: any = { warn: vi.fn(), info: vi.fn() };

it('keeps all tool templates complete with identical parameters in every language', () => {
  const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m => m[1]).sort();
  expect(new Set(TOOLS_MESSAGE_ROWS.map(r => r[0])).size).toBe(TOOLS_MESSAGE_ROWS.length);
  for (const [en, ...translations] of TOOLS_MESSAGE_ROWS) {
    expect(translations).toHaveLength(4);
    for (const text of translations) { expect(text.trim()).not.toBe(''); expect(placeholders(text), en).toEqual(placeholders(en)); }
    for (const locale of locales) expect(BOT_TRANSLATIONS[en]?.[locale], `${locale}: ${en}`).toBeTruthy();
  }
});

it.each(locales)('localizes public bug reports in %s without changing submitted text, mention policy or action IDs', locale => {
  setBotLocaleResolver(id => id === G ? locale : 'en');
  const report: any = { id: M, number: 17, title: 'Saved {number} user title', details: 'User text stays untouched @everyone', steps: 'Keep this literal', status: 'in_progress', authorName: 'Frosty', authorId: U, categoryName: 'Custom category', createdAt: '2026-01-01T00:00:00Z' };
  const payload = bugReportPayload(report, G, 'en-US'), embed: any = payload.embeds![0];
  expect(embed.title).toContain('17'); expect(embed.title).toContain(report.title); expect(embed.title).not.toBe(`Bug #17 · ${report.title}`);
  expect(embed.description).toBe(report.details); expect(embed.author.name).toBe('Frosty'); expect(embed.fields[0].value).toBe('Custom category'); expect(embed.fields[3].value).toBe(report.steps);
  expect(embed.fields[1].value).toBe(BOT_TRANSLATIONS['In progress']![locale]);
  const buttons: any[] = (payload.components![0] as any).toJSON().components;
  expect(buttons.map(b => b.custom_id)).toEqual(['open', 'in_progress', 'resolved', 'dismissed'].map(s => `bug:status:${M}:${s}`));
  expect(buttons[1].disabled).toBe(true); expect(payload.allowedMentions).toEqual({ parse: [], repliedUser: false });
  const english: any = bugReportPayload(report, '666666666666666666', locale).embeds![0]; expect(english.fields[1].value).toBe('In progress');
});

it.each(locales)('localizes bug forms and bounded validation errors in the private %s locale', async locale => {
  setBotLocaleResolver(() => 'auto');
  const service = new CommunityToolsService({} as any, await temp(), logger, { commandMember: vi.fn() } as any); await service.init();
  vi.spyOn(service, 'getConfig').mockReturnValue({ bugs: { enabled: true, cooldownMinutes: 5, categories: [{ id: 'game', name: 'User category', channelId: C }] }, stickies: [] });
  const interaction: any = { guildId: G, guild: { id: G, preferredLocale: 'en-US' }, locale, member: {}, commandName: 'bugreport',
    isChatInputCommand: () => true, isAutocomplete: () => false, isModalSubmit: () => false, isButton: () => false, inCachedGuild: () => true,
    options: { getString: () => 'game' }, showModal: vi.fn(async () => {}), isRepliable: () => true, reply: vi.fn(async () => {}) };
  (service as any).onInteraction(interaction); await service.flush();
  const modal = interaction.showModal.mock.calls[0][0].toJSON();
  expect(modal.custom_id).toBe('bug:create:game'); expect(modal.title).toContain('User category'); expect(modal.title.length).toBeLessThanOrEqual(45);
  for (const row of modal.components) expect(row.components[0].label.length).toBeLessThanOrEqual(45);
  expect(modal.components[0].components[0].label).toBe(BOT_TRANSLATIONS['Short title · your name is included']![locale]);
  let failure: unknown; try { parseBugContent({ title: '', details: 'hello', steps: '' }); } catch (error) { failure = error; }
  expect(failure).toBeInstanceOf(BotMessageError);
  const translated = botError(G, failure, locale); expect(translated).not.toContain('Title must'); expect(translated).toContain('150'); expect(translated).not.toContain('{min}');
  service.stop();
});

it('renders dynamic errors using the caller locale and never exposes arbitrary provider errors', async () => {
  setBotLocaleResolver(() => 'auto');
  const service = new ConfessionsService({} as any, await temp(), logger, {} as any); await service.init();
  const make = () => { const interaction: any = { guild: { id: G, preferredLocale: 'en-US' }, guildId: G, locale: 'de', commandName: 'confess', id: M, user: { id: U },
    isChatInputCommand: () => true, inCachedGuild: () => true, options: { getString: () => 'Secret user confession' }, deferred: false, replied: false,
    deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(async () => {}) }; return interaction; };
  vi.spyOn(service, 'create').mockRejectedValueOnce(new BotMessageError('Please wait {seconds} seconds before sending another confession.', { seconds: 42 })).mockRejectedValueOnce(new Error('private-provider-body SECRET'));
  const first = make(); (service as any).onInteraction(first); await service.flush();
  expect(first.editReply.mock.calls[0][0].content).toBe(botText(G, 'Please wait {seconds} seconds before sending another confession.', { seconds: 42 }, 'de'));
  const second = make(); (service as any).onInteraction(second); await service.flush();
  const reply = second.editReply.mock.calls[0][0]; expect(reply.content).not.toMatch(/SECRET|private-provider|Secret user confession/); expect(reply.content).toBe(botText(G, 'I could not complete that confession. Please check channel permissions or try again shortly.', {}, 'de'));
  expect(reply.allowedMentions).toEqual({ parse: [] }); service.stop();
});

it.each(locales)('preserves historical %s room/sticky receipts when the configured language changes', async locale => {
  const reference = 'a'.repeat(24);
  for (const source of ['Voice room controls · {reference}', 'Channel reminder · {reference}']) {
    setBotLocaleResolver(() => locale); const translated = botText(G, source, { reference });
    setBotLocaleResolver(() => 'en');
    expect(matchesToolsReference(translated, source, reference)).toBe(true);
    expect(matchesToolsReference(source.replace('{reference}', reference), source, reference)).toBe(true);
    expect(matchesToolsReference('Untrusted footer · ' + reference, source, reference)).toBe(false);
    expect(matchesToolsReference(translated, source, 'b'.repeat(24))).toBe(false);
  }
  const service: any = new TempVoiceService({ user: { id: B } } as any, await temp(), logger, {} as any);
  const historical = TOOLS_MESSAGE_ROWS.find(row => row[0] === 'Voice room controls · {reference}')![locales.indexOf(locale) + 1]!.replace('{reference}', reference);
  const message = { author: { id: B }, guildId: G, channelId: C, type: 0, webhookId: null, embeds: [{ footer: { text: historical } }] };
  expect(service.ownedPanel(message, G, C, reference)).toBe(true);
  expect(service.ownedPanel({ ...message, author: { id: U } }, G, C, reference)).toBe(false);
  expect(service.ownedPanel({ ...message, channelId: M }, G, C, reference)).toBe(false);
});

it('keeps shared suggestion payloads in the guild locale while preserving user content', () => {
  setBotLocaleResolver(() => 'auto');
  const payload = suggestionPayload(G, { id: M, number: 2, authorName: 'User', authorId: U, text: 'An English suggestion {count}', channelId: C, createdAt: '2026-01-01T00:00:00Z', status: 'open', delivery: 'sent', syncPending: false, votes: {} }, 'pt-BR');
  const embed: any = payload.embeds![0]; expect(embed.title).toContain('Sugestão'); expect(embed.description).toBe('An English suggestion {count}');
  expect((payload.components![0] as any).toJSON().components[0].custom_id).toBe(`suggest:vote:${M}:up`);
});

it('catalogs every fixed owned error key, preventing future silent English fallback', async () => {
  for (const directory of ['community-tools', 'suggestions', 'confessions', 'temp-voice']) for (const file of ['service.ts', 'types.ts']) {
    const source = await readFile(new URL(`../src/${directory}/${file}`, import.meta.url), 'utf8');
    for (const match of source.matchAll(/new BotMessageError\('((?:\\.|[^'\\])*)'/g)) {
      const key = match[1]!.replace(/\\'/g, "'").replace(/\\n/g, '\n');
      for (const locale of locales) expect(BOT_TRANSLATIONS[key]?.[locale], `${directory}/${file} ${locale}: ${key}`).toBeTruthy();
    }
  }
});
