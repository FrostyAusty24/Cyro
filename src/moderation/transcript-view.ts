import { deflateRawSync, gunzipSync } from 'node:zlib';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { botText } from '../i18n/index.js';
import { exportMarker } from './recovery.js';
import type { Ticket, TicketTranscript, SupportOperation } from './store.js';

export const TRANSCRIPT_ROUTE = /^\/transcripts\/(\d{17,20})\/([a-zA-Z0-9-]{1,64})$/;
export const TRANSCRIPT_CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; sandbox allow-downloads allow-popups allow-popups-to-escape-sandbox";
export class TranscriptAccessError extends Error { constructor(public status: number, message: string) { super(message); } }
export const transcriptPath = (guildId: string, ticketId: string) => `/transcripts/${encodeURIComponent(guildId)}/${encodeURIComponent(ticketId)}`;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const CRC_TABLE = Uint32Array.from({length:256}, (_, index) => { let value = index; for(let bit=0;bit<8;bit++) value=(value>>>1)^((value&1)?0xedb88320:0); return value>>>0; });
export function transcriptHtml(data: Buffer, filename: string): Buffer {
  return filename.endsWith('.gz') ? gunzipSync(data, { maxOutputLength: 128 * 1024 * 1024 }) : data;
}
// A single, fixed-name HTML file in a standards-compliant ZIP. No archive paths come from message text.
export function transcriptDownload(data: Buffer, receipt: Pick<TicketTranscript, 'filename'>): { data: Buffer; filename: string } {
  if (!/^ticket-[a-z0-9-]+\.html(?:\.gz)?$/i.test(receipt.filename)) throw new Error('Invalid transcript filename.');
  const html = transcriptHtml(data, receipt.filename), compressed = deflateRawSync(html);
  const name = Buffer.from(receipt.filename.replace(/\.gz$/, ''), 'utf8');
  let crc = 0xffffffff;
  for (const byte of html) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 255]!;
  crc = (crc ^ 0xffffffff) >>> 0;
  const local = Buffer.alloc(30), central = Buffer.alloc(46), end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50,0); local.writeUInt16LE(20,4); local.writeUInt16LE(0x800,6); local.writeUInt16LE(8,8); local.writeUInt16LE(33,12);
  local.writeUInt32LE(crc,14); local.writeUInt32LE(compressed.length,18); local.writeUInt32LE(html.length,22); local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50,0); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(0x800,8); central.writeUInt16LE(8,10); central.writeUInt16LE(33,14);
  central.writeUInt32LE(crc,16); central.writeUInt32LE(compressed.length,20); central.writeUInt32LE(html.length,24); central.writeUInt16LE(name.length,28);
  end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(1,8); end.writeUInt16LE(1,10); end.writeUInt32LE(central.length + name.length,12); end.writeUInt32LE(local.length + name.length + compressed.length,16);
  const zipped = Buffer.concat([local,name,compressed,central,name,end]);
  if (zipped.length > 8 * 1024 * 1024) throw new Error('The complete transcript is too large to send safely. The ticket channel was retained; staff must export it manually.');
  return { data: zipped, filename: receipt.filename.replace(/\.html(?:\.gz)?$/, '.zip') };
}
export function transcriptReaderPage(html: Buffer, pathname: string, guildId: string, locale?: string): Buffer {
  const t = (s: string) => botText(guildId,s,{},locale);
  const tools = `<nav aria-label="${escape(t('Transcript'))}" style="display:flex;gap:16px;align-items:center;justify-content:space-between;padding:14px 0;margin-bottom:24px;border-bottom:1px solid #263647"><strong>Cyro · ${escape(t('Transcript'))}</strong><a href="${escape(pathname)}?download=1" target="_blank" rel="noopener noreferrer" style="color:#90c7ff">${escape(t('Download transcript'))}</a></nav>`;
  return Buffer.from(html.toString('utf8').replace('<body>', `<body>${tools}`), 'utf8');
}
export function transcriptPost(guildId: string, ticket: Ticket, operation: SupportOperation, download: { data: Buffer; filename: string }, dashboardUrl?: string, locale?: string) {
  const t = (s: string, params = {}) => botText(guildId,s,params,locale);
  const embed = new EmbedBuilder().setColor(0x0771e3).setTitle(t('Ticket transcript saved'))
    .setDescription(t('Open the transcript to read the conversation. The ZIP attachment contains an HTML copy you can keep.'))
    .addFields({ name:t('Member'),value:`<@${ticket.ownerId}>`,inline:true },{name:t('Closed by'),value:`<@${operation.actorId}>`,inline:true},
      {name:t('Messages'),value:String(operation.transcript?.messageCount ?? 0),inline:true})
    .setFooter({text:exportMarker(operation.id)}).setTimestamp(operation.transcript?.savedAt ? new Date(operation.transcript.savedAt) : new Date());
  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (dashboardUrl) {
    const base = new URL(dashboardUrl);
    if (base.protocol === 'https:' || (base.protocol === 'http:' && ['localhost','127.0.0.1'].includes(base.hostname)))
      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel(t('Open transcript')).setStyle(ButtonStyle.Link).setURL(new URL(transcriptPath(guildId,ticket.id),base).href)));
  }
  return { embeds:[embed], components, files:[new AttachmentBuilder(download.data,{name:download.filename})], allowedMentions:{parse:[] as never[]} };
}
