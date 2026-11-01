import { ActionRowBuilder, ButtonBuilder, ButtonStyle, escapeMarkdown, type MessageCreateOptions } from 'discord.js';
import { botText } from '../i18n/index.js';
import type { Raffle } from './types.js';

export function wheelPayload(guildId: string, r: Raffle, image?: { name: string; data: Buffer }): Pick<MessageCreateOptions, 'embeds' | 'components' | 'files' | 'allowedMentions'> {
  const t = (source: string, params = {}) => botText(guildId, source, params);
  const open = r.status === 'open', ended = r.status === 'ended';
  const winner = ended && r.draw?.index !== null && r.draw?.index !== undefined ? r.entries[r.draw.index] : undefined;
  const status = t(({ posting: 'Preparing the wheel', open: 'Entries open', drawing: 'Spinning…', ended: 'Draw complete', cancelled: 'Cancelled' } as const)[r.status]);
  const fields = [
    { name: t('Hosted by'), value: `<@${r.hostId}>`, inline: true },
    { name: t('Entries'), value: `${r.entries.length} / 100`, inline: true },
    { name: t('Spin time'), value: r.endsAt ? `<t:${Math.floor(r.endsAt / 1000)}:F>\n<t:${Math.floor(r.endsAt / 1000)}:R>` : t('When staff press Spin'), inline: true },
  ];
  if (winner) fields.push({ name: t('Winner'), value: `${winner.userId ? `<@${winner.userId}> · ` : ''}${escapeMarkdown(winner.name)}`, inline: false });
  else if (ended) fields.push({ name: t('Result'), value: t('No entries were received. No winner was drawn.'), inline: false });
  if (ended && r.draw?.animationFailed) fields.push({ name: t('Animation'), value: t('The animation was unavailable. The saved draw result is shown above.'), inline: false });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wheel:enter:${r.id}`).setLabel(t('Enter')).setStyle(ButtonStyle.Success).setDisabled(!open || !r.allowEntries),
    new ButtonBuilder().setCustomId(`wheel:leave:${r.id}`).setLabel(t('Leave')).setStyle(ButtonStyle.Secondary).setDisabled(!open || !r.allowEntries),
    new ButtonBuilder().setCustomId(`wheel:list:${r.id}:0`).setLabel(t('Entrants ({count})', { count: r.entries.length })).setStyle(ButtonStyle.Secondary),
  );
  const staff = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`wheel:spin:${r.id}`).setLabel(t('Spin')).setStyle(ButtonStyle.Primary).setDisabled(!open),
    new ButtonBuilder().setCustomId(`wheel:members:${r.id}`).setLabel(t('Add members')).setStyle(ButtonStyle.Secondary).setDisabled(!open),
  );
  return { embeds: [{ title: r.title, description: r.description || undefined, color: parseInt(r.color.slice(1), 16), fields,
    footer: { text: `${status} · ${t('One entry, one equal chance.')} · ${r.id.slice(0,8)}` }, ...(image ? { image: { url: `attachment://${image.name}` } } : {}) }],
    components: [row, staff], ...(image ? { files: [{ attachment: image.data, name: image.name, description: t('Raffle wheel') }] } : {}), allowedMentions: { parse: [], repliedUser: false } };
}
