import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import type { TextChannel } from 'discord.js';
import type { TicketTranscript } from './store.js';

export interface TranscriptEntry { id?: string; author: string; createdAt: string; content: string; attachments: string[]; editedAt?: string; replyTo?: string }
export interface TicketSnapshot { entries: TranscriptEntry[]; newestMessageId: string | null; sourceSha256: string; unsupportedContent?: string[] }
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export function renderTranscript(title: string, entries: TranscriptEntry[], truncated = false): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><style>body{font:16px system-ui;background:#0c1421;color:#e8eff9;max-width:900px;margin:40px auto;padding:24px}article{border-top:1px solid #33445c;padding:18px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#aabbcf}a{color:#71cfff}</style></head><body><h1>${escape(title)}</h1><p>Private support transcript · ${entries.length} messages. Includes channel messages available when closing, with embed text and attachment links. It does not download original media, recover deleted messages, or include separate threads. Attachment links may expire; save original files separately before deleting a channel.${truncated ? ' This is an incomplete legacy export; retain the original channel.' : ''}</p>${entries.map(entry => `<article${entry.id ? ` id="message-${escape(entry.id)}"` : ''}><b>${escape(entry.author)}</b> <small>${escape(entry.createdAt)}${entry.id ? ` · ${escape(entry.id)}` : ''}${entry.editedAt ? ` · edited ${escape(entry.editedAt)}` : ''}${entry.replyTo ? ` · reply to ${escape(entry.replyTo)}` : ''}</small><p>${escape(entry.content)}</p>${entry.attachments.filter(url => /^https:\/\//i.test(url)).map(url => `<p><a rel="noreferrer noopener" href="${escape(url)}">${escape(url)}</a></p>`).join('')}</article>`).join('')}</body></html>`;
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
      const entry: TranscriptEntry = { id: message.id, author: `${message.author.tag} (${message.author.id})`, createdAt: message.createdAt.toISOString(), content: [message.content, ...embedText, ...(unsupported.length ? [`[Not exported: ${unsupported.join(', ')}. Keep the original ticket channel to preserve this content.]`] : [])].filter(Boolean).join('\n\n'), attachments: [...message.attachments.values()].map(a => a.url), ...(message.editedAt ? { editedAt: message.editedAt.toISOString() } : {}), ...(message.reference?.messageId ? { replyTo: message.reference.messageId } : {}) };
      bytes += Buffer.byteLength(JSON.stringify(entry), 'utf8');
      if (entries.length >= maxMessages || bytes > maxBytes) throw new Error('This ticket exceeds the automatic transcript limit. The channel was retained; ask staff to export the full history manually.');
      entries.push(entry);
    }
    before = ordered.at(-1)!.id;
    // Even a short page is followed to its end, so no assumption silently truncates history.
  }
  entries.reverse();
  return { entries, newestMessageId, sourceSha256: hash(JSON.stringify(entries)), unsupportedContent: [...unsupportedContent] };
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
  async save(guildId: string, operationId: string, title: string, snapshot: TicketSnapshot, uploadLimit = 8 * 1024 * 1024): Promise<{ receipt: TicketTranscript; data: Buffer }> {
    if (!/^[a-z0-9-]+$/i.test(operationId)) throw new Error('Invalid transcript operation.');
    let data = Buffer.from(renderTranscript(title, snapshot.entries), 'utf8');
    let filename = `ticket-${operationId}.html`;
    if (data.byteLength > uploadLimit) { data = gzipSync(data); filename += '.gz'; }
    if (data.byteLength > uploadLimit) throw new Error('The complete transcript is too large to send safely. The ticket channel was retained; staff must export it manually.');
    const destination = this.filename(guildId, filename), temporary = `${destination}.${randomUUID()}.tmp`;
    await mkdir(this.directory(guildId), { recursive: true, mode: 0o700 });
    try { await writeFile(temporary, data, { mode: 0o600, flush: true }); await rename(temporary, destination); }
    finally { await rm(temporary, { force: true }).catch(() => undefined); }
    return { data, receipt: { filename, sha256: hash(data), sourceSha256: snapshot.sourceSha256, messageCount: snapshot.entries.length, newestMessageId: snapshot.newestMessageId, unsupportedContent: snapshot.unsupportedContent ?? [], savedAt: new Date().toISOString() } };
  }
  async verify(guildId: string, receipt: TicketTranscript): Promise<void> {
    const data = await readFile(this.filename(guildId, receipt.filename));
    if (hash(data) !== receipt.sha256) throw new Error('The local saved transcript failed verification. The ticket channel was retained.');
  }
  async purgeGuild(guildId: string): Promise<void> { await rm(this.directory(guildId), { force: true, recursive: true }); }
}
