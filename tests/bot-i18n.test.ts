import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Events, type Client } from 'discord.js';
import { botLocale, botText, normalizeLocale, setBotLocaleResolver } from '../src/i18n/index.js';
import { BOT_TRANSLATIONS, MESSAGE_ROWS } from '../src/i18n/messages.js';
import { ADDITIONAL_MESSAGE_ROWS } from '../src/i18n/messages-de-pt.js';
import { languageSnapshot, parseLanguageSettings, parseServerLocale } from '../src/control/language.js';
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
    expect(['en-GB', 'fr-CA', 'FR_fr', 'es-ES', 'es-419', 'de', 'de-DE', 'DE_at', 'pt-BR', 'pt_PT', 'pt', 'ja', '', 'french', null].map(normalizeLocale)).toEqual(['en', 'fr', 'fr', 'es', 'es', 'de', 'de', 'de', 'pt', 'pt', 'pt', 'en', 'en', 'en', 'en']);
  });
  it('keeps five guilds independent and explicit server language ahead of caller locale', async () => {
    const locales: Record<string, string> = { 'fr-server': 'fr', 'es-server': 'es', 'de-server': 'de', 'pt-server': 'pt', 'en-server': 'en' };
    setBotLocaleResolver(guild => locales[guild]);
    expect(await Promise.all(['fr-server', 'de-server', 'es-server', 'pt-server', 'fr-server', 'de-server', 'en-server'].map(async id => botText(id, 'Open dashboard', {}, 'es-419')))).toEqual(['Ouvrir le tableau de bord', 'Dashboard öffnen', 'Abrir el panel', 'Abrir painel', 'Ouvrir le tableau de bord', 'Dashboard öffnen', 'Open dashboard']);
  });
  it('only uses interaction or supplied guild locale for an automatic preference', () => {
    setBotLocaleResolver(() => 'auto');
    expect(botLocale('server', 'fr')).toBe('fr');
    expect(botText('server', 'Lock', {}, 'es-419')).toBe('Bloquear');
    expect(botText('server', 'Lock', {}, 'de')).toBe('Sperren');
    expect(botText('server', 'Member limit', {}, 'pt-BR')).toBe('Limite de membros');
    expect(botText('server', 'Lock')).toBe('Lock');
    expect(botText('server', 'Lock', {}, 'ja')).toBe('Lock');
    setBotLocaleResolver(() => undefined);
    expect(botText('server', 'Lock', {}, 'fr')).toBe('Lock');
  });
  it.each(['fr', 'es', 'de', 'pt'])('falls back in %s without translating arbitrary user text and substitutes only once', locale => {
    setBotLocaleResolver(() => locale);
    expect(botText('server', 'An unmapped message with {name}', { name: 'Alice {count}' })).toBe('An unmapped message with Alice {count}');
    expect(botText('server', 'Room renamed to {name}.', { name: 'Open dashboard {name} <@123> $&' })).toContain('Open dashboard {name} <@123> $&');
    expect(botText('server', 'Missing {value}')).toBe('Missing {value}');
    expect(botText('server', 'constructor')).toBe('constructor');
    expect(botText('server', 'Room limit set to {count} members.', { count: 0 })).toContain('0');
  });
  it('ships complete nonduplicate catalogs for all four translations with matching placeholders and commands', () => {
    const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
    const commands = (value: string) => [...value.matchAll(/\/[a-z][a-z0-9-]*/g)].map(match => match[0]).sort();
    expect(new Set(MESSAGE_ROWS.map(row => row[0])).size).toBe(MESSAGE_ROWS.length);
    expect(MESSAGE_ROWS.length).toBeGreaterThan(100);
    expect(new Set(ADDITIONAL_MESSAGE_ROWS.map(row => row[0])).size).toBe(ADDITIONAL_MESSAGE_ROWS.length);
    expect(ADDITIONAL_MESSAGE_ROWS.map(row => row[0]).sort()).toEqual(MESSAGE_ROWS.map(row => row[0]).sort());
    for (const [en] of MESSAGE_ROWS) {
      for (const locale of ['fr', 'es', 'de', 'pt'] as const) {
        const translation = BOT_TRANSLATIONS[en]![locale];
        expect(translation, `${locale}: ${en}`).toBeTruthy();
        expect(placeholders(translation), `${locale}: ${en}`).toEqual(placeholders(en));
        expect(commands(translation), `${locale}: ${en}`).toEqual(commands(en));
      }
    }
  });
  it('accepts all five server languages while keeping canonical saved preferences strict', () => {
    for (const locale of ['en', 'fr', 'es', 'de', 'pt', 'auto']) {
      expect(parseLanguageSettings({ locale })).toEqual({ locale });
      expect(languageSnapshot(parseServerLocale(locale)).locale).toBe(locale);
    }
    expect(languageSnapshot().locale).toBe('en');
    expect(languageSnapshot().languages.map(language => language.id)).toEqual(['en', 'fr', 'es', 'de', 'pt', 'auto']);
    for (const locale of ['ja', 'pt-BR', 'de-DE', 'constructor', null]) expect(() => parseServerLocale(locale)).toThrow('Choose English');
    expect(() => parseLanguageSettings({ locale: 'pt', guildId: 'other-server' })).toThrow('Invalid language settings');
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
    expect(command.description_localizations?.de, command.name).toBeTruthy();
    expect(command.description_localizations?.['pt-BR'], command.name).toBeTruthy();
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
  setBotLocaleResolver(id => id);
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
    for (const [locale, dashboardTitle, welcome, connected, deniedText] of [
      ['de', 'Cyro-Dashboard', 'Willkommen bei Cyro', 'Cyro ist verbunden', 'Schließe zuerst'],
      ['pt', 'Painel do Cyro', 'Boas-vindas ao Cyro', 'Cyro está conectado', 'Conclua primeiro'],
    ]) {
      const dashboard = (await f.invoke(locale!, 'dashboard', 'fr')).editReply.mock.calls[0][0];
      expect(dashboard.embeds[0].toJSON().title).toBe(dashboardTitle);
      expect(new URL(dashboard.components[0].toJSON().components[0].url).searchParams.get('guild')).toBe(locale);
      const localizedHelp = (await f.invoke(locale!, 'help')).editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(localizedHelp.title).toBe(welcome); expect(localizedHelp.description).toContain('/dashboard');
      const localizedPing = (await f.invoke(locale!, 'ping')).editReply.mock.calls[0][0].embeds[0].toJSON();
      expect(localizedPing.title).toBe(connected); expect(localizedPing.description).toContain('42 ms');
      f.access.command.mockRejectedValueOnce(new Error('Complete server membership screening first.'));
      expect((await f.invoke(locale!, 'dashboard')).editReply.mock.calls[0][0].content).toContain(deniedText);
    }
  } finally { f.handler.stop(); }
});

it.each([
  ['es', 'Sugerencia n.º 5 · Aceptada', 'Respuesta del equipo', 'A favor · 0'],
  ['de', 'Vorschlag Nr. 5 · Angenommen', 'Antwort des Teams', 'Dafür · 0'],
  ['pt', 'Sugestão nº 5 · Aceita', 'Resposta da equipe', 'A favor · 0'],
])('localizes %s suggestion chrome while preserving member names, content, decisions and vote IDs', (locale, title, staffLabel, voteLabel) => {
  setBotLocaleResolver(() => locale);
  const record: any = { id: '823456789012345678', number: 5, authorName: 'Open dashboard', authorId: 'member', text: 'Welcome to Cyro {name}', channelId: 'channel', createdAt: new Date().toISOString(), status: 'accepted', delivery: 'sent', syncPending: false, votes: {}, decision: { reason: 'Your voice room', status: 'accepted', actorId: 'staff', at: new Date().toISOString() } };
  const payload: any = suggestionPayload('server', record);
  expect(payload.embeds[0]).toMatchObject({ title, description: record.text, author: { name: record.authorName }, fields: [{ name: staffLabel, value: record.decision.reason }] });
  const buttons = payload.components[0].toJSON().components;
  expect(buttons[0]).toMatchObject({ label: voteLabel, custom_id: `suggest:vote:${record.id}:up`, disabled: true });
  expect(payload.allowedMentions).toEqual({ parse: [], repliedUser: false });
});

it.each([
  { locale: 'fr', title: 'Votre salon vocal', primary: ['Verrouiller', 'Déverrouiller', 'Renommer', 'Limite de membres'], members: ['Retirer un membre', 'Autoriser un membre'] },
  { locale: 'de', title: 'Dein Sprachraum', primary: ['Sperren', 'Entsperren', 'Umbenennen', 'Mitgliederlimit'], members: ['Mitglied entfernen', 'Mitglied zulassen'] },
  { locale: 'pt-BR', title: 'Sua sala de voz', primary: ['Bloquear', 'Desbloquear', 'Renomear', 'Limite de membros'], members: ['Remover membro', 'Permitir membro'] },
])('localizes room panels using $locale guild locale in auto mode and keeps durable panel receipts stable', ({ locale, title, primary, members }) => {
  setBotLocaleResolver(() => 'auto');
  const service = new TempVoiceService({} as never, 'unused-i18n-test', {} as never, {} as never);
  const room: any = { ownerId: '222222222222222222', channelId: '333333333333333333', panel: { reference: 'a'.repeat(24) } };
  const payload = (service as any).panelPayload({ id: '111111111111111111', preferredLocale: locale }, room);
  expect(payload.embeds[0].title).toBe(title);
  expect(payload.embeds[0].description).toContain(`<@${room.ownerId}>`);
  expect(payload.embeds[0].footer.text).toBe(`Voice room controls · ${room.panel.reference}`);
  expect(payload.components[0].toJSON().components.map((button: any) => button.label)).toEqual(primary);
  expect(payload.components[1].toJSON().components.map((button: any) => button.label)).toEqual(members);
});

it.each([
  ['es-419', 'Confesión n.º 9 publicada:', 'Discord sigue recibiendo tu comando original y su autor.'],
  ['de', 'Beichte Nr. 9 wurde veröffentlicht:', 'Discord erhält weiterhin deinen ursprünglichen Befehl und dessen Verfasser.'],
  ['pt-BR', 'Confissão nº 9 publicada:', 'O Discord ainda recebe seu comando original e a identidade de quem o enviou.'],
])('localizes %s confession acknowledgments while passing member-written text unchanged to creation', async (locale, confirmation, privacyNotice) => {
  setBotLocaleResolver(() => 'auto');
  const client = new EventEmitter();
  const service = new ConfessionsService(client as Client, 'unused-i18n-test', { warn: vi.fn() } as never, {} as never);
  const create = vi.spyOn(service, 'create').mockResolvedValue({ number: 9, messageUrl: 'https://discord.com/channels/g/c/m' });
  service.attach();
  const interaction: any = { commandName: 'confess', locale, guildId: 'server', guild: { id: 'server' }, user: { id: 'member' }, id: 'request', isChatInputCommand: () => true, inCachedGuild: () => true, replied: false, deferred: false, options: { getString: () => 'Welcome to Cyro {number}' }, deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(), reply: vi.fn() };
  client.emit(Events.InteractionCreate, interaction); await service.flush(); service.stop();
  expect(create).toHaveBeenCalledWith(interaction.guild, 'member', 'Welcome to Cyro {number}', 'request');
  expect(interaction.editReply.mock.calls[0][0].content).toContain(`${confirmation} https://discord.com/channels/g/c/m`);
  expect(interaction.editReply.mock.calls[0][0].content).toContain(privacyNotice);
});

it('keeps voice UI language separate from the chosen speech language and stable voice IDs', async () => {
  setBotLocaleResolver(guildId => guildId.split('-')[0]);
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
    for (const [locale, title, description, missingVoice] of [
      ['de', 'Cyro-Audio', 'Deine Stimme auf diesem Server ist jetzt', 'Diese Stimme ist auf diesem Host noch nicht installiert.'],
      ['pt', 'Áudio do Cyro', 'Sua voz neste servidor agora é', 'Esta voz ainda não está instalada nesta hospedagem.'],
    ]) {
      const chosen = await invoke(`${locale}-server`, 'ttsvoice', 'es-dora');
      expect(setVoice).toHaveBeenLastCalledWith(chosen.guild, 'member', 'es-dora');
      expect(chosen.editReply.mock.calls[0][0].embeds[0]).toMatchObject({ title, description: `${description} ${TTS_VOICES.find(voice => voice.id === 'es-dora')!.name}.` });
      setVoice.mockRejectedValueOnce(new Error('This voice is not installed on this host yet. Choose another voice or ask the bot operator to install it.'));
      expect((await invoke(`${locale}-server`, 'ttsvoice', 'es-dora')).editReply.mock.calls[0][0].content).toContain(missingVoice);
    }
    expect(spokenText('Hola https://example.com', 'es')).toBe('Hola enlace');
  } finally { service.stop(); await service.flush(); }
});
