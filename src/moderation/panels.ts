import { botText } from '../i18n/index.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { applicationForms, ticketTypes, type ModerationConfig, type SupportPanel } from './core.js';

export function panelPayload(config: ModerationConfig, panel: SupportPanel, guildId?: string, locale?: string) {
  if (!(panel.kind === 'tickets' ? config.tickets.enabled : config.applications.enabled)) throw new Error('Enable this support feature before publishing its panel.');
  const definitions = panel.kind === 'tickets' ? ticketTypes(config) : applicationForms(config);
  const options = panel.options.filter(option => definitions.some(definition => definition.id === option.id && definition.enabled));
  if (!options.length) throw new Error('This panel has no enabled options.');
  const prefix = `mod:panel:${panel.id}`;
  const components: (ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder>)[] = [];
  if (panel.presentation === 'select') {
    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(prefix).setPlaceholder(botText(guildId, panel.kind === 'tickets' ? 'Choose a ticket category' : 'Choose an application', {}, locale)).setMinValues(1).setMaxValues(1).addOptions(options.map(option => ({ label: option.label, value: option.id })))));
  } else {
    for (let offset = 0; offset < options.length; offset += 5) components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(options.slice(offset, offset + 5).map(option => new ButtonBuilder().setCustomId(`${prefix}:${option.id}`).setLabel(option.label).setStyle(ButtonStyle.Primary))));
  }
  const embed = new EmbedBuilder().setColor(0x82d9f7).setTitle(panel.title);
  if (panel.description) embed.setDescription(panel.description);
  return { embeds: [embed], components, allowedMentions: { parse: [] as never[] } };
}

export function selectedPanelOption(config: ModerationConfig, customId: string, selected: readonly string[] | undefined): { kind: SupportPanel['kind']; id: string } {
  const [, , panelId, buttonId, extra] = customId.split(':');
  const panel = config.panels?.find(item => item.id === panelId);
  if (!panel || extra) throw new Error('This panel is no longer available. Ask staff to publish an updated panel.');
  if (selected ? panel.presentation !== 'select' || selected.length !== 1 || buttonId : panel.presentation !== 'buttons' || !buttonId) throw new Error('Invalid panel selection.');
  const id = selected?.[0] ?? buttonId!;
  if (!panel.options.some(option => option.id === id)) throw new Error('This option does not belong to this panel.');
  return { kind: panel.kind, id };
}
