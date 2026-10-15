import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Collection, Events } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { botText, setBotLocaleResolver } from '../src/i18n/index.js';
import { MODERATION_MESSAGE_ROWS } from '../src/i18n/moderation-messages.js';
import { DEFAULT_CONFIG, type SupportPanel } from '../src/moderation/core.js';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore } from '../src/moderation/store.js';
import { panelPayload } from '../src/moderation/panels.js';
import { applicationQuestion, supportName } from '../src/moderation/localization.js';
import { collectTicketTranscript, renderTranscript } from '../src/moderation/transcript.js';

const guildId = '123456789012345678';
const otherGuildId = '223456789012345678';
const logger = { warn: vi.fn(), error: vi.fn() };
afterEach(() => { setBotLocaleResolver(() => 'en'); vi.clearAllMocks(); });

function serviceFixture() {
  const store = new ModerationStore('unused.json', async () => {});
  const service = new ModerationService(new EventEmitter() as never, '.', logger as never);
  (service as any).store = store;
  return { store, service };
}

describe('support translations', () => {
  it('has complete placeholder and Discord command parity in all four target languages', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
    const commands = (text: string) => [...text.matchAll(/\/[a-z][a-z-]*(?: (?:close|list|release))?/g)].map(match => match[0]).sort();
    expect(new Set(MODERATION_MESSAGE_ROWS.map(row => row[0])).size).toBe(MODERATION_MESSAGE_ROWS.length);
    for (const [source, ...translations] of MODERATION_MESSAGE_ROWS) for (const translation of translations) {
      expect(translation.trim(), source).not.toBe('');
      expect(placeholders(translation), source).toEqual(placeholders(source));
      expect(commands(translation), source).toEqual(commands(source));
    }
  });

  it('localizes panel controls per guild while leaving custom server content and identifiers untouched', () => {
    setBotLocaleResolver(id => id === guildId ? 'de' : 'pt');
    const config = structuredClone(DEFAULT_CONFIG);
    config.tickets.enabled = true;
    const panel: SupportPanel = { id: 'help', name: 'Need a hand?', kind: 'tickets', presentation: 'select', title: 'Need a hand?', description: 'Welcome {member} — custom text', options: [{ id: 'default', label: 'Support' }] };
    const de = panelPayload(config, panel, guildId, 'fr');
    const pt = panelPayload(config, panel, otherGuildId, 'es');
    const menu = (payload: typeof de) => payload.components[0]!.toJSON().components[0] as any;
    expect(menu(de).placeholder).toBe('Wähle eine Ticketkategorie');
    expect(menu(pt).placeholder).toBe('Escolha uma categoria de ticket');
    expect(menu(de).custom_id).toBe('mod:panel:help');
    expect(menu(de).options).toEqual([{ label: 'Support', value: 'default' }]);
    expect(de.embeds[0]!.toJSON()).toMatchObject({ title: panel.title, description: panel.description });
  });

  it('translates only reserved built-in definitions, not matching words in custom form content', () => {
    setBotLocaleResolver(() => 'fr');
    const context = { guildId };
    expect(supportName(context, { id: 'default', name: 'Team application' })).toBe('Candidature à l’équipe');
    expect(supportName(context, { id: 'my-form', name: 'Team application' })).toBe('Team application');
    const form = { id: 'default', name: 'Team application', enabled: true, reviewChannelId: null, reviewerRoleIds: [], acceptedRoleId: null, questions: [...DEFAULT_CONFIG.applications.questions] };
    expect(applicationQuestion(context, form, form.questions[0]!)).toBe('Pourquoi souhaitez-vous rejoindre l’équipe ?');
    expect(applicationQuestion(context, { ...form, id: 'custom' }, form.questions[0]!)).toBe(form.questions[0]);
    expect(applicationQuestion(context, form, 'What is your custom {reason}?')).toBe('What is your custom {reason}?');
  });

  it('uses server locale for shared ticket panels and user locale for private confirmation in automatic mode', async () => {
    setBotLocaleResolver(() => 'auto');
    const { store, service } = serviceFixture();
    await store.update(guildId, state => { state.config.tickets.enabled = true; });
    const send = vi.fn(async () => ({}));
    const actor = { permissions: { has: () => true }, roles: { cache: new Map() } };
    const channel = { send, permissionsFor: () => ({ has: () => true }) };
    (service as any).textChannel = async () => channel;
    const interaction = { guildId, locale: 'fr', guild: { preferredLocale: 'de', members: { fetch: async () => actor, fetchMe: async () => ({}) } }, user: { id: 'member' }, editReply: vi.fn() };
    await (service as any).ticket(interaction, 'panel');
    expect(send.mock.calls[0]![0].embeds[0].toJSON()).toMatchObject({ title: 'Brauchst du Hilfe?', description: 'Wähle eine Kategorie, um ein Ticket zu öffnen.' });
    expect(interaction.editReply).toHaveBeenCalledWith('Panneau de tickets publié.');
    await service.flush();
  });

  it('keeps supplied moderation reasons verbatim and localizes log headings for the guild', async () => {
    setBotLocaleResolver(() => 'pt');
    const { store, service } = serviceFixture();
    await store.update(guildId, state => { state.config.modLogChannelId = 'log'; });
    const send = vi.fn(async () => ({}));
    (service as any).textChannel = async () => ({ send });
    const reason = 'Custom reason: Accepted {member} <@123456789012345678>';
    await (service as any).recordCase({ id: guildId, preferredLocale: 'de' }, { action: 'warn', userId: 'user', actorId: 'staff', reason });
    const embed = send.mock.calls[0]![0].embeds[0].toJSON();
    expect(embed.title).toBe('Moderação · Advertência');
    expect(embed.description).toBe(reason);
    expect(embed.fields[0].name).toBe('Membro / canal');
    expect(store.read(guildId).cases[0]?.reason).toBe(reason);
    await service.flush();
  });

  it.each(['fr', 'es', 'de', 'pt'])('returns translated known errors and keeps external details only in logs (%s)', async locale => {
    setBotLocaleResolver(() => locale);
    const client = new EventEmitter();
    const service = new ModerationService(client as never, '.', logger as never);
    const reply = vi.fn(async () => {});
    const interaction = { guildId, locale: 'en-US', isRepliable: () => true, reply };
    service.attach();
    (service as any).handleInteraction = async () => { throw new Error('Support tickets are disabled.'); };
    client.emit(Events.InteractionCreate, interaction); await service.flush();
    expect(reply.mock.calls[0]![0].content).toBe(botText(guildId, 'Support tickets are disabled.'));
    expect(reply.mock.calls[0]![0].content).not.toBe('Support tickets are disabled.');
    (service as any).handleInteraction = async () => { throw new Error('PRIVATE upstream response /token/secret'); };
    client.emit(Events.InteractionCreate, interaction); await service.flush();
    expect(reply.mock.calls[1]![0].content).not.toContain('PRIVATE');
    expect(reply.mock.calls[1]![0].content).toBe(botText(guildId, 'Cyro could not complete this support action. Please check permissions or try again shortly.'));
    expect(logger.warn).toHaveBeenCalledWith('Moderation interaction failed.', expect.objectContaining({ error: 'PRIVATE upstream response /token/secret' }));
    service.stop();
  });

  it('translates transcript UI while preserving chat content, HTML escaping, and language-independent recovery hashes', async () => {
    setBotLocaleResolver(id => id === guildId ? 'de' : 'es');
    const original = 'Need a hand? <script>not code</script> {member}';
    const message = { id: '42', author: { tag: 'Frosty', id: 'member' }, createdAt: new Date(0), editedAt: new Date(1), reference: { messageId: '41' }, content: original, attachments: new Collection(), embeds: [], stickers: new Collection([['sticker', {}]]) };
    const fetch = vi.fn().mockResolvedValueOnce(new Collection([['42', message]])).mockResolvedValueOnce(new Collection());
    const snapshot = await collectTicketTranscript({ messages: { fetch } } as never);
    const legacyEntries = snapshot.entries.map(({ unsupportedKinds: _kinds, ...entry }) => entry);
    expect(snapshot.sourceSha256).toBe(createHash('sha256').update(JSON.stringify(legacyEntries)).digest('hex'));
    const de = renderTranscript('My custom title', snapshot.entries, false, guildId);
    const es = renderTranscript('My custom title', snapshot.entries, false, otherGuildId);
    expect(de).toContain('<html lang="de">');
    expect(de).toContain('Privater Supportverlauf');
    expect(de).toContain('bearbeitet');
    expect(de).toContain('Nicht exportiert: Sticker');
    expect(es).toContain('Transcripción de soporte privada');
    expect(es).toContain('Sin exportar: pegatinas');
    for (const html of [de, es]) {
      expect(html).toContain('Need a hand? &lt;script&gt;not code&lt;/script&gt; {member}');
      expect(html).not.toContain('<script>');
      expect(html).toContain('My custom title');
    }
    expect(snapshot.entries[0]!.content).toContain(original);
  });
});
