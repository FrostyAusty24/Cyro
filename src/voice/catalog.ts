/** Stable IDs are saved in server settings and member preferences; never reorder their meanings. */
export const TTS_VOICES = [
  { id: 'voice1', name: 'Daniel · British male', engineVoice: 'bm_daniel', gender: 'male', accent: 'British' },
  { id: 'voice2', name: 'Michael · American male', engineVoice: 'am_michael', gender: 'male', accent: 'American' },
  { id: 'voice3', name: 'Heart · American female', engineVoice: 'af_heart', gender: 'female', accent: 'American' },
  { id: 'voice4', name: 'Bella · American female', engineVoice: 'af_bella', gender: 'female', accent: 'American' },
  { id: 'voice5', name: 'Fenrir · American male', engineVoice: 'am_fenrir', gender: 'male', accent: 'American' },
  { id: 'voice6', name: 'Puck · American male', engineVoice: 'am_puck', gender: 'male', accent: 'American' },
  { id: 'voice7', name: 'George · British male', engineVoice: 'bm_george', gender: 'male', accent: 'British' },
  { id: 'voice8', name: 'Fable · British male', engineVoice: 'bm_fable', gender: 'male', accent: 'British' },
  { id: 'voice9', name: 'Nicole · American female', engineVoice: 'af_nicole', gender: 'female', accent: 'American' },
  { id: 'voice10', name: 'Emma · British female', engineVoice: 'bf_emma', gender: 'female', accent: 'British' },
  { id: 'voice11', name: 'Aoede · American female', engineVoice: 'af_aoede', gender: 'female', accent: 'American' },
  { id: 'voice12', name: 'Sarah · American female', engineVoice: 'af_sarah', gender: 'female', accent: 'American' },
] as const;

export type VoiceId = typeof TTS_VOICES[number]['id'];
export type TtsVoiceId = VoiceId;
const voiceIds: ReadonlySet<string> = new Set(TTS_VOICES.map(voice => voice.id));
export const isVoiceId = (id: unknown): id is VoiceId => typeof id === 'string' && voiceIds.has(id);
