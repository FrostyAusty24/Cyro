import { PermissionFlagsBits, type Guild, type GuildMember, type GuildMemberEditMeOptions } from 'discord.js';
import { loadImage } from '@napi-rs/canvas';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 4096;

export class IdentityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Inspect dimensions before native decoding, including images with maliciously large headers. */
function imageDimensions(bytes: Buffer, format: string): [number, number] | undefined {
  if (format === 'png') {
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') return;
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (format === 'jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) return;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === undefined || marker === 0xda || marker === 0xd9) return;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return;
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) return;
        return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
      }
      offset += length;
    }
    return;
  }
  if (format === 'webp') {
    if (bytes.length < 30 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) return;
    let canvas: [number, number] | undefined, frame: [number, number] | undefined;
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const chunk = bytes.toString('ascii', offset, offset + 4);
      const length = bytes.readUInt32LE(offset + 4), start = offset + 8;
      if (start + length > bytes.length) return;
      if (chunk === 'ANIM' || chunk === 'ANMF') return; // Only static avatars; do not decode arbitrary animation frames.
      if (chunk === 'VP8X') {
        if (canvas || offset !== 12 || length !== 10 || (bytes[start]! & 0x02)) return;
        canvas = [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1];
      } else if (chunk === 'VP8 ') {
        if (frame || length < 10 || !bytes.subarray(start + 3, start + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) return;
        frame = [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
      } else if (chunk === 'VP8L') {
        if (frame || length < 5 || bytes[start] !== 0x2f) return;
        const packed = bytes.readUInt32LE(start + 1);
        frame = [(packed & 0x3fff) + 1, ((packed >>> 14) & 0x3fff) + 1];
      }
      offset = start + length + (length % 2);
    }
    if (offset !== bytes.length || !frame || (canvas && (canvas[0] !== frame[0] || canvas[1] !== frame[1]))) return;
    return frame;
  }
}

async function avatarData(value: unknown): Promise<string | null> {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_AVATAR_BYTES / 3) * 4 + 32) throw new IdentityError(400, 'Upload a PNG, JPEG or WebP picture no larger than 2 MB.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2]!.length % 4 !== 0) throw new IdentityError(400, 'Upload a valid PNG, JPEG or WebP picture.');
  const bytes = Buffer.from(match[2]!, 'base64');
  if (bytes.length > MAX_AVATAR_BYTES || bytes.toString('base64') !== match[2]) throw new IdentityError(400, 'Upload a valid picture no larger than 2 MB.');
  const dimensions = imageDimensions(bytes, match[1]!);
  if (!dimensions || dimensions.some(d => d < 1 || d > MAX_AVATAR_DIMENSION) || dimensions[0] * dimensions[1] > 16_777_216) throw new IdentityError(400, 'Use a PNG, JPEG or WebP picture with dimensions between 1 and 4096 pixels.');
  try {
    // A Buffer source cannot fetch URLs or open paths. Decode once to reject truncated/corrupt uploads.
    const image = await loadImage(bytes);
    if (image.width !== dimensions[0] || image.height !== dimensions[1]) throw new Error('Dimensions do not match.');
  } catch { throw new IdentityError(400, 'This picture could not be decoded. Export it as a PNG, JPEG or WebP and try again.'); }
  return value;
}

export async function parseIdentityPatch(input: unknown): Promise<GuildMemberEditMeOptions> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new IdentityError(400, 'Send a server nickname or profile picture.');
  const values = input as Record<string, unknown>;
  const keys = Object.keys(values);
  if (!keys.length || keys.some(key => !['nickname', 'avatar'].includes(key))) throw new IdentityError(400, 'Only a server nickname and profile picture can be changed.');
  const patch: GuildMemberEditMeOptions = {};
  if ('nickname' in values) {
    if (values.nickname !== null && (typeof values.nickname !== 'string' || values.nickname.length > 32 || /[\x00-\x1f\x7f-\x9f]/.test(values.nickname))) throw new IdentityError(400, 'Use a server nickname of up to 32 characters without line breaks or control characters.');
    patch.nick = typeof values.nickname === 'string' ? values.nickname.trim() || null : null;
  }
  if ('avatar' in values) {
    patch.avatar = await avatarData(values.avatar);
  }
  return patch;
}

export interface GuildIdentity {
  nickname: string | null;
  displayName: string;
  avatarUrl: string;
  customAvatar: boolean;
  defaultName: string;
  defaultAvatarUrl: string;
  canChangeNickname: boolean;
}

function identity(member: GuildMember): GuildIdentity {
  return {
    nickname: member.nickname,
    displayName: member.displayName,
    avatarUrl: member.displayAvatarURL({ size: 256 }),
    customAvatar: Boolean(member.avatar),
    defaultName: member.user.displayName,
    defaultAvatarUrl: member.user.displayAvatarURL({ size: 256 }),
    canChangeNickname: member.permissions.has(PermissionFlagsBits.ChangeNickname),
  };
}

/** Discord stores the per-server profile. No uploaded image is retained in Cyro's data files. */
export class GuildIdentityService {
  private changing = new Set<string>();
  private async member(guild: Guild): Promise<GuildMember> {
    const member = await guild.members.fetchMe({ force: true }).catch(() => { throw new IdentityError(502, 'Discord could not load the current server profile. Reload before making a change.'); });
    if (member.guild.id !== guild.id || member.id !== guild.client.user?.id) throw new IdentityError(502, 'Discord did not return this server’s bot profile.');
    return member;
  }
  async get(guild: Guild): Promise<GuildIdentity> { return identity(await this.member(guild)); }
  async update(guild: Guild, actorId: string, input: unknown, authorize: () => Promise<void>): Promise<GuildIdentity> {
    if (this.changing.has(guild.id)) throw new IdentityError(409, 'A server profile change is already in progress. Wait for it to finish, then reload.');
    if (this.changing.size >= 2) throw new IdentityError(429, 'Profile uploads are busy. Wait a moment before trying again.');
    this.changing.add(guild.id);
    try {
      const patch = await parseIdentityPatch(input);
      const member = await this.member(guild);
      // Recheck the actor after upload validation and Discord reads, as their role may have changed.
      await authorize();
      if (patch.nick === member.nickname) delete patch.nick;
      if (patch.avatar === null && !member.avatar) delete patch.avatar;
      if ('nick' in patch && !member.permissions.has(PermissionFlagsBits.ChangeNickname)) throw new IdentityError(403, 'Cyro needs the Change Nickname permission in this server to change its server name.');
      if (!Object.keys(patch).length) return identity(member);
      try {
        // Only the current guild member is edited. Never call ClientUser#setAvatar or setUsername.
        await guild.members.editMe({ ...patch, reason: `Cyro server profile changed by Discord user ${actorId}` });
      } catch (error) {
        const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
        if (status === 403) throw new IdentityError(403, 'Discord denied this server profile change. Check Cyro’s permissions in this server.');
        if (status === 400) throw new IdentityError(400, 'Discord rejected this name or picture. Try a different name or export the picture as a PNG.');
        if (status === 429) throw new IdentityError(429, 'Discord is limiting profile changes. Wait a few minutes, then reload before changing it again.');
        // No application-level replay: a timeout may have happened after Discord applied the change.
        throw new IdentityError(502, 'Discord did not confirm the profile change. Reload the current profile before trying again.');
      }
      return await this.get(guild);
    } finally { this.changing.delete(guild.id); }
  }
}
