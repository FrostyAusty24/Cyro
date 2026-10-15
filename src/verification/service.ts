import { botError, botText, type TextParams } from '../i18n/index.js';
import {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, MessageFlags, ModalBuilder,
  PermissionFlagsBits, TextInputBuilder, TextInputStyle,
  type Client, type Guild, type Interaction, type MessageReaction, type PartialMessageReaction,
  type User, type PartialUser, type ButtonInteraction, type ModalSubmitInteraction,
} from 'discord.js';
import type { Logger } from '../logger.js';
import type { CommunityStore } from '../community/store.js';
import { defaultGuild, type CommunityConfig, type VerificationPanel } from '../community/types.js';
import { assertSafeRole } from '../community/config.js';
import { VerificationChallenges, type ChallengeBinding } from './challenges.js';
import { renderVerificationImage } from './image.js';

type Enqueue = <T>(guildId: string, operation: () => Promise<T>) => Promise<T>;
export function currentVerificationPanel(config: CommunityConfig, panel: VerificationPanel | null): panel is VerificationPanel {
  return !!panel && config.verification.enabled && config.verification.channelId === panel.channelId && config.verification.roleId === panel.roleId && config.verification.mode === panel.mode;
}

export async function validateVerificationConfig(guild: Guild, config: CommunityConfig): Promise<void> {
  if (!config.verification.enabled) return;
  const bot = await guild.members.fetchMe({ force: true });
  if (!bot.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error('Cyro needs Manage Roles to verify members.');
  const role = await guild.roles.fetch(config.verification.roleId!, { force: true });
  if (!role || role.guild.id !== guild.id) throw new Error('Select a verification role in this server.');
  assertSafeRole(role);
  const channel = await guild.channels.fetch(config.verification.channelId!);
  if (!channel || channel.guildId !== guild.id || !channel.isTextBased() || channel.isThread() || !('send' in channel)) throw new Error('Select a text channel in this server for verification.');
  const permissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory,
    config.verification.mode === 'reaction' ? PermissionFlagsBits.AddReactions : PermissionFlagsBits.AttachFiles];
  const channelPermissions = channel.permissionsFor(bot);
  if (!channelPermissions?.has(permissions)) throw new Error('Cyro needs View Channel, Send Messages, Read Message History, and Add Reactions or Attach Files in the verification channel.');
  if (!channelPermissions.has(PermissionFlagsBits.EmbedLinks)) throw new Error('Enable Embed Links for Cyro in the verification channel so it can display the verification panel.');
}

/** Guild queues are shared with configuration writes, so a revoked configuration cannot race a role grant. */
export class VerificationService {
  private readonly active = new Set<Promise<void>>();
  private readonly publishedAt = new Map<string, number>();
  private stopped = false;
  private attached = false;
  constructor(private readonly client: Client, private readonly store: CommunityStore, private readonly enqueue: Enqueue, private readonly logger: Logger, private readonly challenges = new VerificationChallenges()) {}
  private track(task: Promise<void>): void {
    this.active.add(task);
    void task.finally(() => this.active.delete(task)).catch(() => undefined);
  }
  private report(error: unknown): void { this.logger.error('Verification operation failed.', error instanceof Error ? error.message : String(error)); }
  private readonly onInteraction = (interaction: Interaction): void => {
    if (this.stopped || !('customId' in interaction) || !interaction.customId.startsWith('verify:') || (!interaction.isButton() && !interaction.isModalSubmit())) return;
    const task = this.handleInteraction(interaction).catch(async error => {
      this.report(error);
      const content = botError(interaction.guildId, error, interaction.locale, 'Verification could not finish. Please try again.');
      try {
        if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } });
        else if (!interaction.replied) await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      } catch (replyError) { this.report(replyError); }
    });
    this.track(task);
  };
  private readonly onReaction = (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): void => {
    if (this.stopped || user.bot || reaction.emoji.id || reaction.emoji.name !== '✅') return;
    const guildId = reaction.message.guildId;
    if (!guildId) return;
    const state = this.store.get(guildId);
    if (!currentVerificationPanel(state.config, state.verificationPanel) || state.verificationPanel.mode !== 'reaction' || state.verificationPanel.messageId !== reaction.message.id || state.verificationPanel.channelId !== reaction.message.channelId) return;
    const task = this.enqueue(guildId, async () => {
      // Guild and panel identity come from Discord events, then are rechecked against durable state.
      const binding = { guildId, userId: user.id, roleId: state.verificationPanel!.roleId, panelId: reaction.message.id, channelId: reaction.message.channelId };
      const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
      if (message.author.id !== this.client.user?.id) return;
      const guild = await this.client.guilds.fetch(guildId);
      await this.grant(guild, binding, 'reaction');
    }).catch(error => this.report(error));
    this.track(task);
  };
  attach(): void {
    if (this.attached || this.stopped) return;
    this.attached = true;
    this.client.on(Events.InteractionCreate, this.onInteraction);
    this.client.on(Events.MessageReactionAdd, this.onReaction);
  }
  stop(): void {
    this.stopped = true;
    if (!this.attached) return;
    this.attached = false;
    this.client.off(Events.InteractionCreate, this.onInteraction);
    this.client.off(Events.MessageReactionAdd, this.onReaction);
  }
  async flush(): Promise<void> {
    while (this.active.size) await Promise.allSettled([...this.active]);
    if (this.stopped) this.challenges.clear();
  }
  invalidateGuild(guildId: string): void { this.challenges.invalidateGuild(guildId); this.publishedAt.delete(guildId); }

  async publishPanel(guildId: string): Promise<{ channelId: string; messageId: string; url: string }> {
    if (this.stopped) throw new Error('Verification is stopping.');
    return this.enqueue(guildId, async () => {
      if (Date.now() - (this.publishedAt.get(guildId) ?? 0) < 30_000) throw new Error('A verification panel was just published. Please wait 30 seconds before publishing another.');
      const config = this.store.config(guildId);
      if (!config.verification.enabled) throw new Error('Enable and save verification before publishing its panel.');
      const guild = await this.client.guilds.fetch(guildId);
      await validateVerificationConfig(guild, config);
      const channel = await guild.channels.fetch(config.verification.channelId!);
      if (!channel?.isTextBased() || !('send' in channel)) throw new Error('Verification channel is unavailable.');
      const challenge = config.verification.mode === 'challenge';
      const t = (source: string) => botText(guildId, source, {}, guild.preferredLocale);
      const defaults = defaultGuild().config.verification;
      const title = config.verification.title === defaults.title ? t('Verify your membership') : config.verification.title;
      const description = config.verification.message === defaults.message ? t('Verify to receive access to the server.') : config.verification.message;
      const message = await channel.send({
        embeds: [new EmbedBuilder().setColor(0x82d9f7).setTitle(title).setDescription(description)],
        components: challenge ? [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('verify:start').setStyle(ButtonStyle.Primary).setLabel(t('Verify')).setEmoji('🧊'))] : [],
        allowedMentions: { parse: [] },
      });
      await this.store.mutate(guildId, state => { state.verificationPanel = { channelId: channel.id, messageId: message.id, roleId: config.verification.roleId!, mode: config.verification.mode }; });
      this.challenges.invalidateGuild(guildId);
      this.publishedAt.set(guildId, Date.now());
      if (!challenge) await message.react('✅');
      return { channelId: channel.id, messageId: message.id, url: `https://discord.com/channels/${guildId}/${channel.id}/${message.id}` };
    });
  }

  private validBinding(binding: ChallengeBinding, mode: 'reaction' | 'challenge'): boolean {
    const state = this.store.get(binding.guildId);
    return currentVerificationPanel(state.config, state.verificationPanel) && state.verificationPanel.mode === mode
      && state.verificationPanel.channelId === binding.channelId && state.verificationPanel.messageId === binding.panelId && state.verificationPanel.roleId === binding.roleId;
  }
  private async grant(guild: Guild, binding: ChallengeBinding, mode: 'reaction' | 'challenge'): Promise<void> {
    if (guild.id !== binding.guildId || !this.validBinding(binding, mode)) throw new Error('This verification panel is no longer active. Use the latest panel.');
    const bot = await guild.members.fetchMe({ force: true });
    if (!bot.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error('Cyro needs Manage Roles. Please contact a server moderator.');
    const role = await guild.roles.fetch(binding.roleId, { force: true });
    if (!role || role.guild.id !== guild.id) throw new Error('The verification role is unavailable. Please contact a server moderator.');
    assertSafeRole(role);
    const member = await guild.members.fetch({ user: binding.userId, force: true });
    if (member.user.bot) throw new Error('Bot accounts cannot use member verification.');
    if (member.pending) throw new Error('Complete Discord membership screening first, then try verification again.');
    if (!member.roles.cache.has(role.id)) await member.roles.add(role.id, botText(guild.id, mode === 'challenge' ? 'Completed Cyro image verification' : 'Accepted Cyro reaction verification', {}, guild.preferredLocale));
  }
  private async handleInteraction(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
    const t = (source: string, params: TextParams = {}) => botText(interaction.guildId, source, params, interaction.locale);
    if (!interaction.guildId || !interaction.channelId || interaction.user.bot) { await interaction.reply({ content: t('Use verification in its Discord server.'), flags: MessageFlags.Ephemeral }); return; }
    const userBinding = { guildId: interaction.guildId, userId: interaction.user.id };
    if (interaction.isButton() && interaction.customId.startsWith('verify:answer:')) {
      const token = interaction.customId.slice('verify:answer:'.length);
      const binding = this.challenges.lookup(token, userBinding);
      if (!binding || !this.validBinding(binding, 'challenge')) throw new Error('This image expired or was replaced. Select Verify on the server panel for a new one.');
      await interaction.showModal(new ModalBuilder().setCustomId(`verify:submit:${token}`).setTitle(t('Enter the image code'))
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('code').setLabel(t('Six characters from your verification image')).setStyle(TextInputStyle.Short).setRequired(true).setMinLength(6).setMaxLength(6))));
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await this.enqueue(interaction.guildId, async () => {
      const guild = await this.client.guilds.fetch(interaction.guildId!);
      if (interaction.isButton() && interaction.customId === 'verify:start') {
        const state = this.store.get(guild.id), panel = state.verificationPanel;
        if (!currentVerificationPanel(state.config, panel) || panel.mode !== 'challenge' || panel.messageId !== interaction.message.id || panel.channelId !== interaction.channelId || interaction.message.author.id !== this.client.user?.id) throw new Error('This verification panel is no longer active. Use the latest panel.');
        const member = await guild.members.fetch({ user: interaction.user.id, force: true });
        if (member.pending) throw new Error('Complete Discord membership screening first, then select Verify again.');
        if (member.roles.cache.has(panel.roleId)) { await interaction.editReply({ content: t('You already have the verified role.') }); return; }
        const challenge = this.challenges.issue({ ...userBinding, channelId: panel.channelId, panelId: panel.messageId, roleId: panel.roleId });
        await interaction.editReply({ content: t('Read the six characters in this image, then select **Enter code**. It expires in 5 minutes and allows 3 attempts. Letters are not case-sensitive. If you need help with the image, contact a server moderator.'),
          files: [new AttachmentBuilder(renderVerificationImage(challenge.code), { name: 'verification.png', description: t('Private verification challenge. Contact a moderator if the image is inaccessible.') })],
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`verify:answer:${challenge.token}`).setLabel(t('Enter code')).setStyle(ButtonStyle.Primary))], allowedMentions: { parse: [] } });
        return;
      }
      if (interaction.isModalSubmit() && interaction.customId.startsWith('verify:submit:')) {
        const token = interaction.customId.slice('verify:submit:'.length);
        const binding = this.challenges.lookup(token, userBinding);
        if (!binding || !this.validBinding(binding, 'challenge')) throw new Error('This image expired or was replaced. Select Verify for a new one.');
        const result = this.challenges.answer(token, userBinding, interaction.fields.getTextInputValue('code'));
        if (result.kind === 'success') {
          await this.grant(guild, result.binding, 'challenge');
          await interaction.editReply({ content: t('Verified! Your member role has been added.'), allowedMentions: { parse: [] } });
        } else if (result.kind === 'wrong') await interaction.editReply({ content: t(result.remaining === 1 ? 'That code did not match. You have 1 attempt remaining. Select Enter code beneath your image to try again.' : 'That code did not match. You have {remaining} attempts remaining. Select Enter code beneath your image to try again.', { remaining: result.remaining }) });
        else if (result.kind === 'locked') await interaction.editReply({ content: t('Too many incorrect answers. Wait 60 seconds, then select Verify on the server panel for a new image.') });
        else throw new Error('This image expired. Select Verify for a new one.');
        return;
      }
      throw new Error('This verification action is not available. Use the latest panel.');
    });
  }
}
