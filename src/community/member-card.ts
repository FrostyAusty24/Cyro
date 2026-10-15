import { botText } from '../i18n/index.js';
import path from 'node:path';
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { defaultMemberCard, type MemberCardSettings } from './types.js';

export interface MemberCardInput {
  guildId?: string;
  locale?: string;
  kind: 'join' | 'leave';
  displayName: string;
  serverName: string;
  memberCount: number;
  avatarUrl?: string;
  settings: MemberCardSettings;
}

export const MEMBER_CARD_SIZE = { width: 960, height: 340 } as const;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
let fontReady = false;
let activeRenders = 0;

export function memberCardText(value: string, input: Pick<MemberCardInput, 'displayName' | 'serverName' | 'memberCount'>): string {
  const values: Record<string, string> = { user: input.displayName, server: input.serverName, count: String(input.memberCount) };
  return value.replace(/\{(user|server|count)\}/g, (_, key: string) => values[key]!);
}

/** Localize only unchanged built-in copy; custom headings and templates remain literal. */
export function localizedMemberCardSettings(settings: MemberCardSettings, guildId?: string, locale?: string): MemberCardSettings {
  const defaults = defaultMemberCard(), result = { ...defaults, ...settings };
  for (const key of ['joinHeading', 'leaveHeading', 'joinFooter', 'leaveFooter'] as const) {
    if (result[key] === defaults[key]) result[key] = botText(guildId, defaults[key], {}, locale);
  }
  return result;
}

function clean(value: string, max = 300): string {
  return value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, max).trim();
}

function fittedText(ctx: SKRSContext2D, text: string, x: number, y: number, width: number, size: number, weight = 600): void {
  ctx.font = `${weight} ${size}px "Cyro Manrope", sans-serif`;
  const chars = Array.from(clean(text));
  if (ctx.measureText(chars.join('')).width <= width) { ctx.fillText(chars.join(''), x, y); return; }
  while (chars.length && ctx.measureText(`${chars.join('')}…`).width > width) chars.pop();
  ctx.fillText(`${chars.join('')}…`, x, y);
}

/** Only generated Discord CDN avatar paths are fetched; custom URLs and redirects are never followed. */
export async function fetchDiscordAvatar(raw: string | undefined, fetcher: typeof fetch = fetch): Promise<Buffer | undefined> {
  if (!raw) return;
  let url: URL;
  try { url = new URL(raw); } catch { return; }
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.discordapp.com' || url.port || url.username || url.password || url.hash) return;
  if (!/^\/(?:avatars\/\d{17,20}\/(?:a_)?[a-f0-9]{32}|guilds\/\d{17,20}\/users\/\d{17,20}\/avatars\/(?:a_)?[a-f0-9]{32}|embed\/avatars\/[0-5])\.png$/.test(url.pathname)) return;
  url.search = '?size=256';
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(4_000) });
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/png') || Number(response.headers.get('content-length') ?? 0) > MAX_AVATAR_BYTES) {
    await response.body?.cancel(); return;
  }
  const reader = response.body?.getReader();
  if (!reader) return;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_AVATAR_BYTES) { await reader.cancel(); return; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = Buffer.concat(chunks);
  // Bound decoded dimensions before handing the PNG to the native decoder.
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || buffer.toString('ascii', 12, 16) !== 'IHDR') return;
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  if (!width || !height || width > 512 || height > 512) return;
  return buffer;
}

/** Renders locally; this never sends member data to a card-rendering service. */
export async function renderMemberCard(input: MemberCardInput, fetcher: typeof fetch = fetch): Promise<Buffer> {
  if (activeRenders >= 8) throw new Error('Member card renderer is busy.');
  activeRenders++;
  try {
    if (!fontReady) {
      fontReady = GlobalFonts.registerFromPath(path.resolve('public/fonts/Manrope.ttf'), 'Cyro Manrope') !== null;
      if (!fontReady) throw new Error('Member card font is unavailable.');
    }
    const canvas = createCanvas(MEMBER_CARD_SIZE.width, MEMBER_CARD_SIZE.height);
    const ctx = canvas.getContext('2d');
    const settings = localizedMemberCardSettings(input.settings, input.guildId, input.locale);
    const theme = settings.background;
    const accent = /^#[0-9a-f]{6}$/i.test(input.settings.accentColor) ? input.settings.accentColor : '#63D7FF';
    const background = ctx.createLinearGradient(0, 0, 960, 340);
    background.addColorStop(0, theme === 'custom' ? settings.backgroundColor : theme === 'ice' ? '#173346' : theme === 'aurora' ? '#08272d' : '#111b31');
    background.addColorStop(1, theme === 'custom' ? settings.backgroundColor : '#080e1a');
    ctx.fillStyle = background; ctx.fillRect(0, 0, 960, 340);
    if (settings.decoration) {
    ctx.fillStyle = `${accent}0D`;
    ctx.beginPath(); ctx.arc(840, -55, 330, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `${accent}1F`; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(875, 45, 175 + i * 55, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.fillStyle = settings.barColor;
    if (settings.bar === 'left') ctx.fillRect(0, 0, 7, 340);
    if (settings.bar === 'top') ctx.fillRect(0, 0, 960, 7);
    if (settings.showAvatar) {
    ctx.strokeStyle = `${accent}66`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(145, 164, 88, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#172a40'; ctx.beginPath(); ctx.arc(145, 164, 78, 0, Math.PI * 2); ctx.fill();
    let avatarDrawn = false;
    try {
      const avatar = await fetchDiscordAvatar(input.avatarUrl, fetcher);
      if (avatar) {
        const image = await loadImage(avatar);
        ctx.save(); ctx.beginPath(); ctx.arc(145, 164, 78, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(image, 67, 86, 156, 156); ctx.restore(); avatarDrawn = true;
      }
    } catch { /* A missing avatar must not prevent the greeting. */ }
    if (!avatarDrawn) {
      ctx.fillStyle = accent; ctx.font = '700 64px "Cyro Manrope", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Array.from(clean(input.displayName))[0]?.toUpperCase() || '?', 145, 187); ctx.textAlign = 'left';
    }
    }
    const x = settings.showAvatar ? 270 : 65, width = 895 - x;
    ctx.fillStyle = accent;
    const title = memberCardText(input.kind === 'join' ? settings.joinHeading : settings.leaveHeading, input);
    fittedText(ctx, title, x, 105, width, 24, 700);
    ctx.fillStyle = settings.textColor; fittedText(ctx, memberCardText(settings.nameText, input), x, 168, width, 46, 800);
    ctx.fillStyle = settings.secondaryColor; fittedText(ctx, memberCardText(settings.subtitle, input), x, 211, width, 23, 500);
    ctx.fillStyle = settings.secondaryColor; if (settings.showDivider) ctx.fillRect(x, 244, width, 1);
    ctx.fillStyle = settings.secondaryColor;
    fittedText(ctx, memberCardText(input.kind === 'join' ? settings.joinFooter : settings.leaveFooter, input), x, 280, settings.brandText ? width - 165 : width, 18, 500);
    ctx.fillStyle = accent; fittedText(ctx, memberCardText(settings.brandText, input), 750, 280, 145, 16, 800);
    return await canvas.encode('png');
  } finally { activeRenders--; }
}
