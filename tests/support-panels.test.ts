import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, applicationForms, mergeConfig, ticketTypes, type ApplicationForm, type SupportPanel, type TicketType } from '../src/moderation/core.js';
import { panelPayload, selectedPanelOption } from '../src/moderation/panels.js';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore } from '../src/moderation/store.js';

const guildId = '123456789012345678', otherGuildId = '223456789012345678';
const roleId = '323456789012345678', channelId = '423456789012345678', categoryId = '523456789012345678';
const type = (id = 'support'): TicketType => ({ id, name: id, enabled: true, categoryId, archiveCategoryId: null, logChannelId: channelId, staffRoleIds: [roleId], maxOpenPerUser: 2 });
const form = (id = 'staff'): ApplicationForm => ({ id, name: id, enabled: true, reviewChannelId: channelId, reviewerRoleIds: [roleId], acceptedRoleId: null, questions: ['Why would you like to help?'] });
const panel = (kind: 'tickets' | 'applications' = 'tickets'): SupportPanel => ({ id: 'welcome', name: 'Welcome', kind, presentation: 'buttons', title: 'Choose a category', description: 'We are here to help.', options: [{ id: kind === 'tickets' ? 'support' : 'staff', label: 'Start here' }] });
const config = () => mergeConfig(undefined, { tickets: { enabled: true, types: [type()] }, applications: { enabled: true, forms: [form()] }, panels: [panel()] });
const logger = { warn() {}, error() {} };
function serviceWith(store: ModerationStore, client: unknown = {}) {
  const service = new ModerationService(client as never, '.', logger as never);
  (service as any).store = store;
  return service;
}

describe('support definition configuration', () => {
  it('retains legacy settings as default and validates named configuration atomically', () => {
    const old = structuredClone(DEFAULT_CONFIG); delete old.tickets.types; delete old.applications.forms; delete old.panels;
    old.tickets.staffRoleIds = [roleId];
    const migrated = mergeConfig(old, {});
    expect(ticketTypes(migrated)[0]).toMatchObject({ id: 'default', staffRoleIds: [roleId] });
    expect(applicationForms(migrated)[0]?.questions).toEqual(old.applications.questions);
    const saved = config();
    expect(() => mergeConfig(saved, { tickets: { types: [] } })).toThrow('reference');
    expect(mergeConfig(saved, { tickets: { types: [] }, panels: [] }).panels).toEqual([]);
    expect(saved.tickets.types).toHaveLength(1);
  });
  it('rejects duplicate IDs, oversized collections, unknown fields, missing destinations and invalid options', () => {
    expect(() => mergeConfig(undefined, { tickets: { types: [type(), type()] } })).toThrow('unique');
    expect(() => mergeConfig(undefined, { tickets: { types: Array.from({ length: 26 }, (_, i) => type(`type-${i}`)) } })).toThrow('25');
    expect(() => mergeConfig(undefined, { tickets: { types: [{ ...type(), surprise: true }] } })).toThrow('required');
    expect(() => mergeConfig(undefined, { tickets: { types: [{ ...type(), categoryId: null }] } })).toThrow('category');
    expect(() => mergeConfig(config(), { panels: [{ ...panel(), options: [{ id: 'other-server', label: 'Other' }] }] })).toThrow('reference');
    expect(() => mergeConfig(config(), { panels: [{ ...panel(), options: [{ id: 'support', label: 'x'.repeat(81) }] }] })).toThrow('80');
    expect(() => mergeConfig(config(), { applications: { forms: [{ ...form(), questions: Array(6).fill('Why?') }] } })).toThrow('1–5');
    expect(() => mergeConfig(config(), { applications: { forms: [{ ...form(), acceptedRoleId: '../other' }] } })).toThrow('Discord IDs');
  });
  it('checks category and role references against the authenticated guild', async () => {
    const store = new ModerationStore('unused.json', async () => {});
    const guild = { id: guildId, members: { fetchMe: async () => ({}) }, roles: { fetch: async () => ({ id: roleId, guild: { id: otherGuildId }, managed: false }) } };
    const service = serviceWith(store, { guilds: { fetch: async () => guild } });
    await expect(service.updateConfig(guildId, { tickets: { types: [type()] } })).rejects.toThrow('this server');
    guild.roles.fetch = async () => ({ id: roleId, guild: { id: guildId }, managed: false });
    (guild as any).channels = { fetch: async () => ({ guild: { id: otherGuildId }, type: 4 }) };
    await expect(service.updateConfig(guildId, { tickets: { types: [type()] } })).rejects.toThrow('this server');
    expect(store.read(guildId).config.tickets.types).toEqual([]);
  });
});

describe('Discord panels', () => {
  it('renders 25 choices as five button rows or one dropdown with valid Discord payloads', () => {
    const types = Array.from({ length: 25 }, (_, i) => type(`option-${i}`));
    const input = { ...panel(), options: types.map(item => ({ id: item.id, label: item.name })) };
    const saved = mergeConfig(undefined, { tickets: { enabled: true, types }, panels: [input] });
    const buttons = panelPayload(saved, input);
    expect(buttons.components).toHaveLength(5);
    expect(buttons.components.map(row => row.toJSON().components.length)).toEqual([5, 5, 5, 5, 5]);
    const dropdown = panelPayload(saved, { ...input, presentation: 'select' });
    expect((dropdown.components[0]!.toJSON().components[0] as any).options).toHaveLength(25);
    expect(buttons.allowedMentions).toEqual({ parse: [] });
  });
  it('rejects forged, stale and wrong-kind selections within each guild', () => {
    const saved = config();
    expect(selectedPanelOption(saved, 'mod:panel:welcome:support', undefined)).toEqual({ kind: 'tickets', id: 'support' });
    expect(() => selectedPanelOption(saved, 'mod:panel:welcome:staff', undefined)).toThrow('belong');
    expect(() => selectedPanelOption(DEFAULT_CONFIG, 'mod:panel:welcome:support', undefined)).toThrow('available');
    expect(() => selectedPanelOption(saved, 'mod:panel:welcome', ['support'])).toThrow('Invalid');
    saved.panels![0]!.presentation = 'select';
    expect(selectedPanelOption(saved, 'mod:panel:welcome', ['support']).id).toBe('support');
    expect(() => selectedPanelOption(saved, 'mod:panel:welcome', ['support', 'staff'])).toThrow('Invalid');
    expect(() => selectedPanelOption(saved, 'mod:panel:welcome:support', undefined)).toThrow('Invalid');
  });
  it('refuses a public panel with no enabled options or when its feature is paused', () => {
    const saved = config(); saved.tickets.types![0]!.enabled = false;
    expect(() => panelPayload(saved, panel())).toThrow('no enabled');
    saved.tickets.enabled = false;
    expect(() => panelPayload(saved, panel())).toThrow('Enable');
  });
  it('publishes only into the selected guild and returns the real posted message link', async () => {
    const store = new ModerationStore('unused.json', async () => {});
    await store.update(guildId, state => { state.config = config(); });
    const send = vi.fn(async () => ({ id: 'message', url: 'https://discord.com/channels/server/channel/message' }));
    const channel = { id: channelId, guild: { id: otherGuildId }, type: 0, permissionsFor: () => ({ has: () => true }), send };
    const guild = { id: guildId, channels: { fetch: async () => channel }, members: { fetchMe: async () => ({}) } };
    const service = serviceWith(store, { guilds: { fetch: async () => guild } });
    await expect(service.publishPanel(guildId, { panelId: 'welcome', channelId })).rejects.toThrow('this server');
    expect(send).not.toHaveBeenCalled();
    channel.guild.id = guildId;
    const result = await service.publishPanel(guildId, { panelId: 'welcome', channelId });
    expect(result).toMatchObject({ messageId: 'message', channelId });
    expect(send).toHaveBeenCalledTimes(1);
    await expect(service.publishPanel(otherGuildId, { panelId: 'welcome', channelId })).rejects.toThrow('Save');
  });
});

describe('application and ticket record snapshots', () => {
  it('routes each ticket type to its own category and enforces its per-user limit', async () => {
    const store = new ModerationStore('unused.json', async () => {});
    const report = { ...type('report'), categoryId: '623456789012345678', staffRoleIds: ['723456789012345678'], maxOpenPerUser: 1 };
    await store.update(guildId, state => { state.config = mergeConfig(config(), { tickets: { types: [type(), report] } }); });
    const service = serviceWith(store);
    const actor = { id: 'member', user: { username: 'member' } };
    const created: any[] = [];
    const guild = {
      id: guildId, members: { fetch: async () => actor, fetchMe: async () => ({ id: 'bot' }) },
      roles: { fetch: async (id: string) => ({ id, guild: { id: guildId }, managed: false }) },
      channels: {
        fetch: async (id?: string) => id ? { id, guild: { id: guildId }, type: 4, permissionsFor: () => ({ has: () => true }) } : new Map(),
        create: async (payload: unknown) => { created.push(payload); return { id: `channel-${created.length}`, send: async () => {} }; },
      },
    };
    (service as any).privateChannel = async () => ({ id: channelId });
    const interaction = { guildId, guild, user: { id: actor.id }, editReply: async () => {} };
    await (service as any).ticket(interaction, 'open', 'report');
    await expect((service as any).ticket(interaction, 'open', 'report')).rejects.toThrow('limit for this category');
    await (service as any).ticket(interaction, 'open', 'support');
    expect(created.map(item => item.parent)).toEqual([report.categoryId, categoryId]);
    expect(created[0].permissionOverwrites.map((item: any) => item.id)).toEqual([guildId, 'bot', 'member', report.staffRoleIds[0]]);
    expect(store.read(guildId).tickets.map(ticket => ticket.ticketType?.id)).toEqual(['report', 'support']);
    await store.update(guildId, state => { state.config.tickets.types = []; });
    expect(store.read(guildId).tickets[0]?.ticketType).toEqual(report);
  });
  it('opens a selected application modal as the initial response, without Discord fetches', async () => {
    const store = new ModerationStore('unused.json', async () => {});
    await store.update(guildId, state => { state.config = config(); });
    const service = serviceWith(store);
    const interaction = { guildId, user: { id: 'applicant' }, showModal: vi.fn(async () => {}), deferReply: vi.fn() };
    await (service as any).showApplication(interaction, 'staff');
    const modal = interaction.showModal.mock.calls[0]![0] as any;
    expect(modal.toJSON().custom_id).toMatch(/^mod:application:submit:staff:[a-f0-9]{16}$/);
    expect(interaction.deferReply).not.toHaveBeenCalled();
    const openedId = modal.toJSON().custom_id;
    await store.update(guildId, state => { state.config.applications.forms![0]!.reviewChannelId = categoryId; });
    await expect((service as any).submitApplication({ guildId, customId: openedId })).rejects.toThrow('changed');
  });
  it('submits different forms independently and stores the chosen review policy before sending', async () => {
    let disk = '';
    const store = new ModerationStore('unused.json', async data => { disk = data; });
    await store.update(guildId, state => { state.config = mergeConfig(config(), { applications: { forms: [form('staff'), form('creator')] } }); });
    const service = serviceWith(store);
    const send = vi.fn(async () => {
      const saved = JSON.parse(disk)[guildId].applications.at(-1);
      expect(saved.operation.kind).toBe('application-submit');
      expect(saved.applicationForm.reviewerRoleIds).toEqual([roleId]);
      return { id: 'message-' + saved.applicationForm.id };
    });
    (service as any).privateChannel = async () => ({ id: channelId, send });
    for (const formId of ['staff', 'creator']) {
      let modal: any;
      await (service as any).showApplication({ guildId, user: { id: 'member' }, showModal: async (value: any) => { modal = value; } }, formId);
      await (service as any).submitApplication({ guildId, customId: modal.data.custom_id, user: { id: 'member' }, guild: { members: { fetch: async () => ({}) } }, fields: { getTextInputValue: () => 'I can help.' }, editReply: async () => {} });
    }
    expect(store.read(guildId).applications.map(item => item.applicationForm?.id)).toEqual(['staff', 'creator']);
    expect(send).toHaveBeenCalledTimes(2);
    await expect((service as any).showApplication({ guildId, user: { id: 'member' } }, 'staff')).rejects.toThrow('waiting');
  });
  it('retains the original ticket staff after deleting its type and pausing new tickets', async () => {
    const store = new ModerationStore('unused.json', async () => {});
    await store.update(guildId, state => {
      state.config.tickets.enabled = false;
      state.tickets.push({ id: 'old', channelId, ownerId: 'owner', status: 'open', createdAt: new Date().toISOString(), claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, ticketType: type('removed') });
    });
    const service = serviceWith(store);
    const actor = { id: 'staff', permissions: { has: () => false }, roles: { cache: new Map([[roleId, {}]]) } };
    const send = vi.fn(async () => {});
    (service as any).textChannel = async () => ({ send });
    await (service as any).ticket({ guildId, channelId, user: { id: actor.id }, guild: { members: { fetch: async () => actor } }, editReply: async () => {} }, 'claim');
    expect(store.read(guildId).tickets[0]?.claimedBy).toBe('staff');
    expect(send).toHaveBeenCalledOnce();
  });
  it('authorizes an application decision using its original reviewers after the form is deleted', async () => {
    const store = new ModerationStore('unused.json', async () => {});
    const replacementRole = '823456789012345678';
    await store.update(guildId, state => {
      state.config.applications.reviewerRoleIds = [replacementRole];
      state.applications.push({ id: 'old', userId: 'applicant', channelId, messageId: 'review', status: 'pending', createdAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null, answers: ['private'], questions: ['why'], applicationForm: form('deleted') });
    });
    const service = serviceWith(store);
    let actor = { id: 'replacement', permissions: { has: () => false }, roles: { cache: new Map([[replacementRole, {}]]) } };
    (service as any).privateChannel = async () => ({ id: channelId });
    const message = { id: 'review', edit: vi.fn(async () => {}) };
    const interaction = { guildId, channelId, customId: 'mod:application:deny:old', user: { id: 'actor' }, guild: { members: { fetch: async () => actor } }, message, editReply: async () => {} };
    await expect((service as any).reviewApplication(interaction)).rejects.toThrow('reviewers');
    actor = { ...actor, id: 'original', roles: { cache: new Map([[roleId, {}]]) } };
    await (service as any).reviewApplication(interaction);
    expect(store.read(guildId).applications[0]).toMatchObject({ status: 'denied', reviewedBy: 'original', answers: [] });
  });
  it('preserves legacy records and snapshots their audiences across restart and config edits', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'support-migrate-'));
    try {
      const filename = path.join(dir, 'moderation.json');
      const legacy = structuredClone(DEFAULT_CONFIG); delete legacy.panels; delete legacy.tickets.types; delete legacy.applications.forms;
      legacy.tickets.staffRoleIds = [roleId]; legacy.tickets.logChannelId = channelId;
      legacy.applications.reviewerRoleIds = [roleId]; legacy.applications.acceptedRoleId = categoryId;
      const ticket = { id: 'old-ticket', ownerId: 'member', channelId, status: 'open' };
      const application = { id: 'old-application', userId: 'member', channelId, status: 'pending', questions: ['Original question'], answers: ['Original answer'] };
      await writeFile(filename, JSON.stringify({ [guildId]: { config: legacy, cases: [], tickets: [ticket], applications: [application] } }));
      const store = new ModerationStore(filename); await store.init();
      expect(store.read(guildId).tickets[0]?.ticketType).toMatchObject({ id: 'default', staffRoleIds: [roleId] });
      await store.update(guildId, state => { state.config.tickets.staffRoleIds = []; state.config.applications.acceptedRoleId = null; });
      const second = new ModerationStore(filename); await second.init();
      expect(second.read(guildId).applications[0]?.applicationForm).toMatchObject({ id: 'default', questions: ['Original question'], acceptedRoleId: categoryId });
      expect(second.read(guildId).applications[0]?.answers).toEqual(['Original answer']);
      expect(second.read(guildId).tickets[0]?.ticketType?.staffRoleIds).toEqual([roleId]);
      expect(JSON.parse(await readFile(filename, 'utf8'))[guildId].tickets[0].id).toBe('old-ticket');
      expect(second.read(otherGuildId).tickets).toEqual([]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
