import { botLocale, botText } from '../i18n/index.js';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { transcriptHtml } from './transcript-view.js';
import type { TextChannel } from 'discord.js';
import type { TicketTranscript } from './store.js';

export interface TranscriptEntry { id?: string; author: string; createdAt: string; content: string; attachments: string[]; editedAt?: string; replyTo?: string; unsupportedKinds?: string[] }
export interface TicketSnapshot { entries: TranscriptEntry[]; newestMessageId: string | null; sourceSha256: string; unsupportedContent?: string[] }
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export function renderTranscript(title: string, entries: TranscriptEntry[], truncated = false, guildId?: string, locale?: string): string {
  const t = (source: string, params = {}) => botText(guildId, source, params, locale);
  const introduction = t('Private support transcript · {count} messages. Includes channel messages available when closing, with embed text and attachment links. It does not download original media, recover deleted messages, or include separate threads. Attachment links may expire; save original files separately before deleting a channel.', { count: entries.length }) + (truncated ? t(' This is an incomplete legacy export; retain the original channel.') : '');
  const articles = entries.map(entry => {
    // The collection/hash remains language independent; only generated export notes change at rendering.
    const marker = entry.unsupportedKinds?.length ? `[Not exported: ${entry.unsupportedKinds.join(', ')}. Keep the original ticket channel to preserve this content.]` : '';
    const content = marker && entry.content.endsWith(marker) ? entry.content.slice(0, -marker.length) + t('[Not exported: {kinds}. Keep the original ticket channel to preserve this content.]', { kinds: entry.unsupportedKinds!.map(kind => t(kind)).join(', ') }) : entry.content;
    const author = entry.author.replace(/ \(\d{17,20}\)$/, '');
    const initials = [...author.replace(/[^\p{L}\p{N} ]/gu, '')].slice(0,2).join('').toUpperCase() || '•';
    const date = new Date(entry.createdAt);
    const timestamp = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(botLocale(guildId,locale),{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(date) + ' UTC' : entry.createdAt;
    const files = entry.attachments.filter(url => /^https:\/\//i.test(url)).map(url => {
      let label = url; try { const parsed = new URL(url); label = decodeURIComponent(parsed.pathname.split('/').pop() || parsed.hostname); } catch { /* Keep the escaped URL. */ }
      return `<a class="attachment" rel="noreferrer noopener" target="_blank" href="${escape(url)}">↗ ${escape(label)}</a>`;
    }).join('');
    return `<article${entry.id ? ` id="message-${escape(entry.id)}"` : ''}><span class="avatar" aria-hidden="true">${escape(initials)}</span><div class="message"><header><b title="${escape(entry.author)}">${escape(author)}</b><time datetime="${escape(entry.createdAt)}">${escape(timestamp)}</time></header>${entry.editedAt || entry.replyTo ? `<small>${entry.editedAt ? escape(t('edited {date}', {date:entry.editedAt})) : ''}${entry.replyTo ? ' · ' + escape(t('reply to {message}',{message:entry.replyTo})) : ''}</small>` : ''}<p>${escape(content)}</p>${files}${entry.id ? `<details class="message-info"><summary>${escape(t('Message details'))}</summary><small>${escape(entry.author)} · ${escape(entry.id)}</small></details>` : ''}</div></article>`;
  }).join('');
  return `<!doctype html><html lang="${botLocale(guildId, locale)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>
*{box-sizing:border-box}body{color-scheme:dark;font:16px Bahnschrift,"Segoe UI",system-ui,sans-serif;background:#080f17;color:#e8eff9;max-width:980px;margin:0 auto;padding:28px 24px;line-height:1.6}h1{font-size:30px;line-height:1.2;margin:8px 0 18px;overflow-wrap:anywhere}.eyebrow{color:#90c7ff;font-size:13px;letter-spacing:.08em}.intro{background:#101c29;border:1px solid #263647;border-radius:12px;padding:18px 22px;margin:22px 0 30px}.intro summary{cursor:pointer;font-weight:600}.intro p{color:#acbbce;font-size:14px;margin-bottom:0}article{display:flex;gap:16px;padding:22px 4px;border-top:1px solid #1e2a39}.avatar{display:flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;border-radius:50%;background:#122e4c;border:1px solid #25547c;color:#b7ddff;font-size:14px;font-weight:600}.message{min-width:0;flex:1}.message header{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 14px}b{color:#f1f6fc}time,small{color:#92a3b9;font-size:12px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0 10px}a{color:#90c7ff;overflow-wrap:anywhere}.attachment{display:block;width:fit-content;max-width:100%;padding:8px 12px;margin-top:8px;border:1px solid #2d425c;border-radius:7px;text-decoration:none;background:#112134}.message-info{font-size:12px;color:#92a3b9;margin-top:12px}.message-info summary{cursor:pointer}footer{color:#92a3b9;padding:28px 0;text-align:center;font-size:12px}@media(max-width:540px){body{padding:20px 14px}article{gap:10px}.avatar{width:32px;height:32px}h1{font-size:25px}}@media print{body{background:white;color:#111}.avatar,.message-info,nav{display:none}article{break-inside:avoid}.intro{background:white}b,time,small,a,footer{color:#333}}
</style></head><body><div class="eyebrow">CYRO · ${escape(t('Transcript'))}</div><h1>${escape(title)}</h1><details class="intro"><summary>${escape(t('{count} messages saved', {count:entries.length}))}</summary><p>${escape(introduction)}</p></details><main aria-label="${escape(t('Conversation'))}">${articles || `<p>${escape(t('No messages were available when this ticket closed.'))}</p>`}</main><footer>Cyro · Headache Development</footer></body></html>`;
}

/** Always prove the end of history; a limit is a failure, never permission to delete. */
export async function collectTicketTranscript(channel: TextChannel, limits: { maxMessages?: number; maxBytes?: number; maxDurationMs?: number } = {}): Promise<TicketSnapshot> {
  const entries: TranscriptEntry[] = [], seen = new Set<string>(), unsupportedContent = new Set<string>();
  const maxMessages = limits.maxMessages ?? 50_000, maxBytes = limits.maxBytes ?? 25 * 1024 * 1024;
  const deadline = Date.now() + (limits.maxDurationMs ?? 5 * 60_000);
  let before: string | undefined, newestMessageId: string | null = null, bytes = 0;
  while (true) {
    if (Date.now() > deadline) throw new Error('Transcript export exceeded its time limit. The ticket channel was retained; ask staff to export it manually.');
    const messages = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}), cache: false });
    if (!messages.size) break;
    const ordered = [...messages.values()].sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : BigInt(a.id) < BigInt(b.id) ? 1 : 0);
    newestMessageId ??= ordered[0]!.id;
    for (const message of ordered) {
      if (seen.has(message.id) || (before && BigInt(message.id) >= BigInt(before))) throw new Error('Discord returned inconsistent transcript pages. The ticket channel was retained.');
      seen.add(message.id);
      // These rich types can contain substantive content outside content/embeds/attachments.
      // Keep the original channel rather than describing a blank entry as a complete export.
      const unsupported: string[] = [];
      if (message.stickers?.size) unsupported.push('stickers');
      if (message.poll) unsupported.push('polls');
      if (message.messageSnapshots?.size) unsupported.push('forwarded messages');
      if (message.components?.some(component => component.type !== 1)) unsupported.push('rich message components');
      for (const kind of unsupported) unsupportedContent.add(kind);
      const embedText = (message.embeds ?? []).map(embed => [embed.title, embed.description, ...embed.fields.flatMap(field => [field.name, field.value]), embed.footer?.text, embed.url, embed.image?.url, embed.thumbnail?.url].filter(Boolean).join('\n')).filter(Boolean);
      const entry: TranscriptEntry = { id: message.id, author: `${message.author.tag} (${message.author.id})`, createdAt: message.createdAt.toISOString(), content: [message.content, ...embedText, ...(unsupported.length ? [`[Not exported: ${unsupported.join(', ')}. Keep the original ticket channel to preserve this content.]`] : [])].filter(Boolean).join('\n\n'), attachments: [...message.attachments.values()].map(a => a.url), ...(message.editedAt ? { editedAt: message.editedAt.toISOString() } : {}), ...(message.reference?.messageId ? { replyTo: message.reference.messageId } : {}), ...(unsupported.length ? { unsupportedKinds: unsupported } : {}) };
      bytes += Buffer.byteLength(JSON.stringify(entry), 'utf8');
      if (entries.length >= maxMessages || bytes > maxBytes) throw new Error('This ticket exceeds the automatic transcript limit. The channel was retained; ask staff to export the full history manually.');
      entries.push(entry);
    }
    before = ordered.at(-1)!.id;
    // Even a short page is followed to its end, so no assumption silently truncates history.
  }
  entries.reverse();
  return { entries, newestMessageId, sourceSha256: hash(JSON.stringify(entries.map(({ unsupportedKinds: _kinds, ...entry }) => entry))), unsupportedContent: [...unsupportedContent] };
}

export class TicketTranscriptArchive {
  constructor(private readonly root: string) {}
  private directory(guildId: string): string {
    if (!/^\d{17,20}$/.test(guildId)) throw new Error('Invalid transcript guild.');
    return path.join(this.root, guildId);
  }
  private filename(guildId: string, filename: string): string {
    if (!/^ticket-[a-z0-9-]+\.html(?:\.gz)?$/i.test(filename)) throw new Error('Invalid transcript filename.');
    return path.join(this.directory(guildId), filename);
  }
  async save(guildId: string, operationId: string, title: string, snapshot: TicketSnapshot, uploadLimit = 8 * 1024 * 1024, locale?: string): Promise<{ receipt: TicketTranscript; data: Buffer }> {
    if (!/^[a-z0-9-]+$/i.test(operationId)) throw new Error('Invalid transcript operation.');
    let data = Buffer.from(renderTranscript(title, snapshot.entries, false, guildId, locale), 'utf8');
    let filename = `ticket-${operationId}.html`;
    if (data.byteLength > uploadLimit) { data = gzipSync(data); filename += '.gz'; }
    if (data.byteLength > uploadLimit) throw new Error('The complete transcript is too large to send safely. The ticket channel was retained; staff must export it manually.');
    const destination = this.filename(guildId, filename), temporary = `${destination}.${randomUUID()}.tmp`;
    await mkdir(this.directory(guildId), { recursive: true, mode: 0o700 });
    try { await writeFile(temporary, data, { mode: 0o600, flush: true }); await rename(temporary, destination); }
    finally { await rm(temporary, { force: true }).catch(() => undefined); }
    return { data, receipt: { filename, sha256: hash(data), sourceSha256: snapshot.sourceSha256, messageCount: snapshot.entries.length, newestMessageId: snapshot.newestMessageId, unsupportedContent: snapshot.unsupportedContent ?? [], savedAt: new Date().toISOString() } };
  }
  async read(guildId: string, receipt: TicketTranscript): Promise<Buffer> {
    const data = await readFile(this.filename(guildId, receipt.filename));
    if (hash(data) !== receipt.sha256) throw new Error('Saved transcript failed verification.');
    return transcriptHtml(data, receipt.filename);
  }
  async verify(guildId: string, receipt: TicketTranscript): Promise<void> {
    const data = await readFile(this.filename(guildId, receipt.filename));
    if (hash(data) !== receipt.sha256) throw new Error('The local saved transcript failed verification. The ticket channel was retained.');
  }
  async purgeGuild(guildId: string): Promise<void> { await rm(this.directory(guildId), { force: true, recursive: true }); }
}
