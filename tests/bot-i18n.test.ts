import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Events, type Client } from 'discord.js';
import { botLocale, botText, normalizeLocale, setBotLocaleResolver } from '../src/i18n/index.js';
import { MESSAGE_ROWS } from '../src/i18n/messages.js';
import { createRegistrationPlan } from '../src/commands/register.js';
import { CommandHandler } from '../src/commands/handler.js';
import { suggestionPayload } from '../src/suggestions/service.js';
import { TempVoiceService } from '../src/temp-voice/service.js';
import { ConfessionsService } from '../src/confessions/service.js';
import { VoiceService, spokenText } from '../src/voice/service.js';
import { TTS_VOICES } from '../src/voice/catalog.js';

afterEach(() => { setBotLocaleResolver(() => 'en'); vi.restoreAllMocks(); });

describe('per-server bot language', () => {
  it('normalizes supported Discord regional languages and falls back safely', () => {
    expect(['en-GB', 'fr-CA', 'FR_fr', 'es-ES', 'es-419', 'de', '', 'french', null].map(normalizeLocale)).toEqual(['en', 'fr', 'fr', 'es', 'es', 'en', 'en', 'en', 'en']);
  });
  it('keeps two guilds independent and explicit server language ahead of caller locale', async () => {
    setBotLocaleResolver(guild => guild === 'fr-server' ? 'fr' : guild === 'es-server' ? 'es' : 'en');
    expect(await Promise.all(['fr-server', 'es-server', 'fr-server', 'en-server'].map(async id => botText(id, 'Open dashboard', {}, 'es-419')))).toEqual(['Ouvrir le tableau de bord', 'Abrir el panel', 'Ouvrir le tableau de bord', 'Open dashboard']);
  });
  it('only uses interaction or supplied guild locale for an automatic preference', () => {
    setBotLocaleResolver(() => 'auto');
    expect(botLocale('server', 'fr')).toBe('fr');
    expect(botText('server', 'Lock', {}, 'es-419')).toBe('Bloquear');
    expect(botText('server', 'Lock')).toBe('Lock');
    expect(botText('server', 'Lock', {}, 'ja')).toBe('Lock');
    setBotLocaleResolver(() => undefined);
    expect(botText('server', 'Lock', {}, 'fr')).toBe('Lock');
  });
  it('falls back without translating arbitrary user text and substitutes only once', () => {
    setBotLocaleResolver(() => 'fr');
    expect(botText('server', 'An unmapped message with {name}', { name: 'Alice {count}' })).toBe('An unmapped message with Alice {count}');
    expect(botText('server', 'Room renamed to {name}.', { name: 'Open dashboard {name} <@123> $&' })).toBe('Salon renommé en Open dashboard {name} <@123> $&.');
    expect(botText('server', 'Missing {value}')).toBe('Missing {value}');
    expect(botText('server', 'constructor')).toBe('constructor');
    expect(botText('server', 'Room limit set to {count} members.', { count: 0 })).toContain('0');
  });
  it('ships complete nonduplicate French/Spanish entries with matching placeholders', () => {
    const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
    expect(new Set(MESSAGE_ROWS.map(row => row[0])).size).toBe(MESSAGE_ROWS.length);
    expect(MESSAGE_ROWS.length).toBeGreaterThan(100);
    for (const [en, fr, es] of MESSAGE_ROWS) {
      expect(fr, en).toBeTruthy(); expect(es, en).toBeTruthy();
      expect(placeholders(fr), en).toEqual(placeholders(en));
      expect(placeholders(es), en).toEqual(placeholders(en));
    }
  });
});

it('localizes registered top-level descriptions without changing global/guild restrictions', () => {
  const global = createRegistrationPlan({ discordClientId: '123456789012345678' });
  const development = createRegistrationPlan({ discordClientId: '123456789012345678', commandScope: 'development', developmentGuildId: '223456789012345678' });
  expect(global.body.map(command => command.name)).toEqual(development.body.map(command => command.name));
  for (const command of global.body) {
    expect(command.description_localizations?.fr, command.name).toBeTruthy();
    expect(command.description_localizations?.['es-ES'], command.name).toBeTruthy();
    expect(command.description_localizations?.['es-419']).toBe(command.description_localizations?.['es-ES']);
    for (const text of Object.values(command.description_localizations ?? {})) expect(text!.length).toBeLessThanOrEqual(100);
    expect(command.contexts).toEqual([0]); expect(command.integration_types).toEqual([0]);
  }
  expect(development.body.every(command => !('contexts' in command) && !('integration_types' in command))).toBe(true);
});

function handlerFixture() {
  const client: any = new EventEmitter(); client.ws = { ping: 42 };
  const access = { command: vi.fn(async () => undefined) };
  const handler = new CommandHandler(client as Client, {} as never, {} as never, {} as never, {} as never, { error: vi.fn() } as never, undefined, { dashboardEnabled: true, dashboardUrl: 'https://cyro.example' }, access as never);
  handler.attach();
  const invoke = async (guildId: string, commandName: string, locale = 'en-US') => {
    const interaction: any = { commandName, guildId, guild: { id: guildId }, locale, user: { id: 'member' }, isAutocomplete: () => false, isChatInputCommand: () => true, inCachedGuild: () => true, memberPermissions: { has: () => true }, isRepliable: () => true, replied: false, deferred: false, reply: vi.fn(), editReply: vi.fn(), deferReply: vi.fn(async () => { interaction.deferred = true; }) };
    client.emit(Events.InteractionCreate, interaction); await handler.flush(); return interaction;
  };
  return { handler, invoke, access };
}

it('localizes help, dashboard and ping in actual command replies without changing links or commands', async () => {
  setBotLocaleResolver(id => id === 'fr' ? 'fr' : 'es');
  const f = handlerFixture();
  try {
    const fr = (await f.invoke('fr', 'dashboard')).editReply.mock.calls[0][0];
    const es = (await f.invoke('es', 'dashboard')).editReply.mock.calls[0][0];
    expect(fr.embeds[0].toJSON().title).toBe('Tableau de bord Cyro');
    expect(es.embeds[0].toJSON().title).toBe('Panel de Cyro');
    expect(new URL(fr.components[0].toJSON().components[0].url).searchParams.get('guild')).toBe('fr');
    expect(new URL(es.components[0].toJSON().components[0].url).searchParams.get('guild')).toBe('es');
    const help = (await f.invoke('fr', 'help')).editReply.mock.calls[0][0].embeds[0].toJSON();
    expect(help.title).toBe('Bienvenue sur Cyro'); expect(help.description).toContain('/dashboard');
    expect(help.fields[0].value).toContain('/suggestion'); expect(help.fields[1].value).toContain('/ttsvoice');
    const ping = (await f.invoke('es', 'ping')).editReply.mock.calls[0][0].embeds[0].toJSON();
    expect(ping.title).toBe('Cyro está conectado'); expect(ping.description).toContain('42 ms'); expect(ping.description).toContain('/help');
    f.access.command.mockRejectedValueOnce(new Error('Complete server membership screening first.'));
    const denied = await f.invoke('fr', 'dashboard');
    expect(denied.editReply.mock.calls[0][0].content).toContain('Terminez d’abord');
  } finally { f.handler.stop(); }
});

it('localizes suggestion chrome while preserving member names, content, decisions and vote IDs', () => {
  setBotLocaleResolver(() => 'es');
  const record: any = { id: '823456789012345678', number: 5, authorName: 'Open dashboard', authorId: 'member', text: 'Welcome to Cyro {name}', channelId: 'channel', createdAt: new Date().toISOString(), status: 'accepted', delivery: 'sent', syncPending: false, votes: {}, decision: { reason: 'Your voice room', status: 'accepted', actorId: 'staff', at: new Date().toISOString() } };
  const payload: any = suggestionPayload('server', record);
  expect(payload.embeds[0]).toMatchObject({ title: 'Sugerencia n.º 5 · Aceptada', description: record.text, author: { name: record.authorName }, fields: [{ name: 'Respuesta del equipo', value: record.decision.reason }] });
  const buttons = payload.components[0].toJSON().components;
  expect(buttons[0]).toMatchObject({ label: 'A favor · 0', custom_id: `suggest:vote:${record.id}:up`, disabled: true });
  expect(payload.allowedMentions).toEqual({ parse: [], repliedUser: false });
});

it('localizes room panels using guild locale in auto mode and keeps durable panel receipts stable', () => {
  setBotLocaleResolver(() => 'auto');
  const service = new TempVoiceService({} as never, 'unused-i18n-test', {} as never, {} as never);
  const room: any = { ownerId: '222222222222222222', channelId: '333333333333333333', panel: { reference: 'a'.repeat(24) } };
  const payload = (service as any).panelPayload({ id: '111111111111111111', preferredLocale: 'fr' }, room);
  expect(payload.embeds[0].title).toBe('Votre salon vocal');
  expect(payload.embeds[0].description).toContain(`<@${room.ownerId}>`);
  expect(payload.embeds[0].footer.text).toBe(`Voice room controls · ${room.panel.reference}`);
  expect(payload.components[0].toJSON().components.map((button: any) => button.label)).toEqual(['Verrouiller', 'Déverrouiller', 'Renommer', 'Limite de membres']);
  expect(payload.components[1].toJSON().components.map((button: any) => button.label)).toEqual(['Retirer un membre', 'Autoriser un membre']);
});

it('localizes confession acknowledgments while passing member-written text unchanged to creation', async () => {
  setBotLocaleResolver(() => 'auto');
  const client = new EventEmitter();
  const service = new ConfessionsService(client as Client, 'unused-i18n-test', { warn: vi.fn() } as never, {} as never);
  const create = vi.spyOn(service, 'create').mockResolvedValue({ number: 9, messageUrl: 'https://discord.com/channels/g/c/m' });
  service.attach();
  const interaction: any = { commandName: 'confess', locale: 'es-419', guildId: 'server', guild: { id: 'server' }, user: { id: 'member' }, id: 'request', isChatInputCommand: () => true, inCachedGuild: () => true, replied: false, deferred: false, options: { getString: () => 'Welcome to Cyro {number}' }, deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(), reply: vi.fn() };
  client.emit(Events.InteractionCreate, interaction); await service.flush(); service.stop();
  expect(create).toHaveBeenCalledWith(interaction.guild, 'member', 'Welcome to Cyro {number}', 'request');
  expect(interaction.editReply.mock.calls[0][0].content).toContain('Confesión n.º 9 publicada: https://discord.com/channels/g/c/m');
  expect(interaction.editReply.mock.calls[0][0].content).toContain('Discord sigue recibiendo tu comando original y su autor.');
});

it('keeps voice UI language separate from the chosen speech language and stable voice IDs', async () => {
  setBotLocaleResolver(guildId => guildId === 'fr-server' ? 'fr' : 'es');
  const client = new EventEmitter();
  const service = new VoiceService(client as Client, 'unused-i18n-test', { warn: vi.fn() } as never, {} as never);
  const setVoice = vi.spyOn(service, 'setVoice').mockResolvedValue('es-dora');
  const startTts = vi.spyOn(service, 'startTts').mockResolvedValue(undefined);
  const playMusic = vi.spyOn(service, 'playMusic').mockResolvedValue(2);
  service.attach();
  const invoke = async (guildId: string, commandName: string, value: string) => {
    const interaction: any = { commandName, locale: 'en-US', guildId, guild: { id: guildId }, user: { id: 'member' }, isChatInputCommand: () => true, inCachedGuild: () => true, replied: false, deferred: false, options: { getString: () => value }, deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(), reply: vi.fn() };
    client.emit(Events.InteractionCreate, interaction); await service.flush(); return interaction;
  };
  try {
    const fr = await invoke('fr-server', 'ttsvoice', 'es-dora');
    expect(setVoice).toHaveBeenLastCalledWith(fr.guild, 'member', 'es-dora');
    expect(fr.editReply.mock.calls[0][0].embeds[0]).toMatchObject({ title: 'Audio Cyro', description: `Votre voix pour ce serveur est maintenant ${TTS_VOICES.find(voice => voice.id === 'es-dora')!.name}.` });
    const es = await invoke('es-server', 'ttsvoice1', '');
    expect(setVoice).toHaveBeenLastCalledWith(es.guild, 'member', 'voice1');
    expect(es.editReply.mock.calls[0][0].embeds[0].description).toContain('Tu voz para este servidor ahora es Daniel');
    const started = await invoke('fr-server', 'addtts', '');
    expect(startTts).toHaveBeenCalledWith(started.guild, 'member');
    expect(started.editReply.mock.calls[0][0].embeds[0].description).toContain('Utilisez /ttsvoice');
    const music = await invoke('es-server', 'playmusic', 'https://example.com/song.mp3');
    expect(playMusic).toHaveBeenCalledWith(music.guild, 'member', 'https://example.com/song.mp3', expect.any(Function));
    expect(music.editReply.mock.calls[0][0].embeds[0].description).toContain('posición 2');
    setVoice.mockRejectedValueOnce(new Error('Complete server membership screening first.'));
    const denied = await invoke('fr-server', 'ttsvoice', 'fr-siwis');
    expect(denied.editReply.mock.calls[0][0].content).toContain('Terminez d’abord');
    expect(spokenText('Hola https://example.com', 'es')).toBe('Hola enlace');
  } finally { service.stop(); await service.flush(); }
});
