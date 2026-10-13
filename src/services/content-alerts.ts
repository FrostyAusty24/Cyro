import { createHash } from 'node:crypto';
import { EmbedBuilder, escapeMarkdown, type Client } from 'discord.js';
import type { JsonStore } from '../storage/store.js';
import type { StreamerRecord, UploadResult, UploadSnapshot, UploadState } from '../types.js';
import { titleMatches } from '../utils/template.js';

export const DEFAULT_UPLOAD_TEMPLATE = '{role} 🎬 **{creator} uploaded a new video on {platform}!**\n{title}\n{url}';
const UNCERTAIN_DELIVERY_HINT = 'A video announcement has an uncertain delivery outcome. Check the channel; Cyro will not automatically resend it.';

export function renderUploadMessage(record: StreamerRecord, video: UploadSnapshot): string {
  const values: Record<string, string> = {
    creator: record.creatorName || record.displayName, streamer: record.creatorName || record.displayName,
    member: record.discordMemberId ? `<@${record.discordMemberId}>` : '', username: record.username,
    platform: record.platform === 'youtube' ? 'YouTube' : record.platform === 'tiktok' ? 'TikTok' : record.platform,
    title: video.title, url: video.url, publishedAt: video.publishedAt,
    role: record.uploads?.pingRoleId ? `<@&${record.uploads.pingRoleId}>` : '',
  };
  return (record.uploads?.messageTemplate || DEFAULT_UPLOAD_TEMPLATE)
    .replace(/\{(creator|streamer|member|username|platform|title|url|publishedAt|role)\}/g, (_, key: string) => values[key]!).slice(0, 2000);
}

function remember(state: UploadState, video: UploadSnapshot): void {
  if (state.seen.some(item => item.id === video.id)) return;
  state.seen.push({ id: video.id, publishedAt: video.publishedAt });
  state.seen.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.id.localeCompare(b.id));
  while (state.seen.length > 1000) {
    const removed = state.seen.shift()!;
    if (!state.ignorePublishedBefore || Date.parse(removed.publishedAt) > Date.parse(state.ignorePublishedBefore)) state.ignorePublishedBefore = removed.publishedAt;
  }
}

/** Called under the monitor lock; all claims are saved before Discord mutations. */
export async function applyUploadResult(client: Client, store: JsonStore, id: string, result: UploadResult): Promise<number> {
  const record = await store.get(id);
  if (!record?.uploads?.enabled || result.kind === 'deferred') return 0;
  const state: UploadState = structuredClone(record.uploadState ?? { seen: [], deliveries: [] });
  // A process exit while a send was pending has an unknown outcome. Never replay it.
  for (const receipt of state.deliveries) if (receipt.status === 'pending') receipt.status = 'uncertain';
  if (result.kind === 'error') {
    state.lastError = result.error.slice(0, 500);
    state.lastCheckedAt = new Date().toISOString();
    await store.update(id, { uploadState: state });
    return 0;
  }
  state.lastCheckedAt = result.checkedAt;
  state.lastError = state.deliveries.some(delivery => delivery.status === 'uncertain') ? UNCERTAIN_DELIVERY_HINT : undefined;
  if (!state.baselineAt) {
    state.baselineAt = result.checkedAt; state.ignorePublishedBefore = result.checkedAt;
    for (const video of result.items) remember(state, video);
    await store.update(id, { uploadState: state });
    return 0;
  }
  const candidates = result.items.filter(video => !state.seen.some(item => item.id === video.id) &&
    Date.parse(video.publishedAt) > Date.parse(state.ignorePublishedBefore ?? state.baselineAt!));
  let sent = 0;
  // Persist a successful check and recovered uncertain receipts even when no new posts exist.
  await store.update(id, { uploadState: state });
  for (const video of candidates) {
    if (state.seen.some(item => item.id === video.id)) continue;
    if (!titleMatches(record.uploads.titleFilter, video.title)) {
      remember(state, video); await store.update(id, { uploadState: state }); continue;
    }
    const guild = await client.guilds.fetch(record.guildId).catch(() => undefined);
    const channel = guild ? await guild.channels.fetch(record.uploads.channelId).catch(() => undefined) : undefined;
    if (!channel?.isSendable() || channel.guildId !== record.guildId) {
      state.lastError = 'The upload channel is missing or is not sendable in this server.';
      await store.update(id, { uploadState: state });
      break;
    }
    const embed = new EmbedBuilder().setColor(record.platform === 'youtube' ? 0xff0033 : 0x25f4ee)
      .setTitle(`${record.creatorName || record.displayName} uploaded a video`.slice(0, 256))
      .setDescription(escapeMarkdown(video.title).slice(0, 4096)).setURL(video.url).setTimestamp(new Date(video.publishedAt))
      .setFooter({ text: `New upload • ${record.username}`.slice(0, 2048) });
    if (video.thumbnailUrl?.startsWith('https://')) embed.setImage(video.thumbnailUrl);
    if (record.avatarUrl?.startsWith('https://')) embed.setThumbnail(record.avatarUrl);
    remember(state, video);
    state.deliveries.push({ videoId: video.id, channelId: record.uploads.channelId, attemptedAt: new Date().toISOString(), status: 'pending' });
    state.deliveries = state.deliveries.slice(-100);
    // Failure here prevents sending. Failure after sending leaves a durable claim.
    await store.update(id, { uploadState: state });
    const receipt = state.deliveries.at(-1)!;
    try {
      const message = await channel.send({ content: renderUploadMessage(record, video), embeds: [embed],
        allowedMentions: record.uploads.pingRoleId ? { parse: [], roles: [record.uploads.pingRoleId] } : { parse: [] },
        nonce: createHash('sha256').update(`${record.guildId}:${record.id}:${video.id}`).digest('hex').slice(0, 24), enforceNonce: true });
      receipt.status = 'sent'; receipt.messageId = message.id;
      await store.update(id, { uploadState: state });
      sent++;
    } catch {
      receipt.status = 'uncertain';
      state.lastError = UNCERTAIN_DELIVERY_HINT;
      await store.update(id, { uploadState: state });
      // Stop this batch to avoid a burst of failed sends while Discord is unavailable.
      break;
    }
  }
  return sent;
}
