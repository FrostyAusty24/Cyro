import type { Platform } from '../types.js';

export const isYouTubeChannelId = (value: string): boolean => /^UC[a-zA-Z0-9_-]{22}$/.test(value);

function youtubeUsername(input: string): string {
  let value = input.trim();
  if (value.includes('://') || /^(?:www\.|m\.)?youtube\.com\//i.test(value)) {
    let url: URL;
    try { url = new URL(value.includes('://') ? value : `https://${value}`); }
    catch { throw new Error('Use a YouTube @handle or /channel/UC… URL.'); }
    if (!['https:', 'http:'].includes(url.protocol) || !['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) || url.username || url.password) throw new Error('Use a YouTube channel URL.');
    const parts = url.pathname.split('/').filter(Boolean).map(part => decodeURIComponent(part));
    if (parts[0] === 'channel' && parts[1] && isYouTubeChannelId(parts[1])) value = parts[1];
    else if (parts[0]?.startsWith('@')) value = parts[0];
    else throw new Error('Use a YouTube @handle or /channel/UC… URL, not a video URL.');
  }
  if (isYouTubeChannelId(value)) return value;
  value = value.replace(/^@/, '');
  if (!/^[\p{L}\p{M}\p{N}_.-]{1,100}$/u.test(value)) throw new Error('Use a valid YouTube @handle or channel ID.');
  return `@${value.toLowerCase()}`;
}

export function normalizeUsername(platform: Platform, input: string): string {
  if (platform === 'youtube') return youtubeUsername(input);
  let value = input.trim();
  if (!value) throw new Error('Streamer username cannot be empty.');

  try {
    const candidate = value.includes('://') ? value : `https://${value}`;
    const url = new URL(candidate);
    const expectedHost = platform === 'tiktok' ? 'tiktok.com' : `${platform}.tv`;
    const isPlatformUrl = url.hostname === expectedHost || url.hostname === `www.${expectedHost}` ||
      (platform === 'kick' && ['kick.com', 'www.kick.com'].includes(url.hostname));
    if (isPlatformUrl) value = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } catch {
    // The input is a username, not a URL.
  }

  value = value.replace(/^@/, '').split(/[/?#]/, 1)[0]?.trim() ?? '';
  if (!value || !/^[a-zA-Z0-9_.-]+$/.test(value)) {
    throw new Error('Use a valid username or channel URL.');
  }
  if (value.length > 50) throw new Error('Streamer username is too long.');
  return value.toLowerCase();
}

export function streamUrl(platform: Platform, username: string): string {
  if (platform === 'youtube') return isYouTubeChannelId(username) ? `https://www.youtube.com/channel/${username}/live` : `https://www.youtube.com/@${encodeURIComponent(username.replace(/^@/, ''))}/live`;
  if (platform === 'tiktok') return `https://www.tiktok.com/@${username}/live`;
  if (platform === 'kick') return `https://kick.com/${username}`;
  return `https://twitch.tv/${username}`;
}
