export const TTS_MAX_CHARACTERS = 400;
export const TTS_SPEAKER_MAX_CHARACTERS = 48;

/** Names are speech labels, never Discord mentions, markup or links. */
export function speechSpeakerName(displayName?: string, username?: string): string {
  for (const value of [displayName, username]) {
    if (!value) continue;
    const clean = value.normalize('NFKC')
      .replace(/https?:\/\/\S+|\bdiscord\.gg\/\S+/gi, ' ')
      .replace(/<[^>]*>|@everyone|@here/gi, ' ')
      .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
      .replace(/[^\p{L}\p{M}\p{N} .,'’-]/gu, ' ')
      .replace(/\s+/g, ' ').trim()
      .slice(0, TTS_SPEAKER_MAX_CHARACTERS).replace(/[\uD800-\uDBFF]$/, '').trim();
    if (/[\p{L}\p{N}]/u.test(clean)) return clean;
  }
  return 'Someone';
}

/** Keep the member's full message allowance separate from the small optional speech label. */
export function prepareSpeechText(text: string, speakerName?: string): string {
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (!clean || clean.length > TTS_MAX_CHARACTERS) throw new Error(`Speech must contain 1–${TTS_MAX_CHARACTERS} characters.`);
  if (speakerName === undefined) return clean;
  if (typeof speakerName !== 'string' || !speakerName.trim() || speakerName.length > TTS_SPEAKER_MAX_CHARACTERS) throw new Error('Choose a valid speech speaker name.');
  return `${speechSpeakerName(speakerName)} said: ${clean}`;
}
