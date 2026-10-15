/** Stable IDs are saved in server settings and member preferences; never reorder their meanings. */
export const ENGLISH_TTS_VOICES = [
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

export const TTS_LANGUAGES = [
  { id: 'en', name: 'English', nativeName: 'English' },
  { id: 'fr', name: 'French', nativeName: 'Français' },
  { id: 'es', name: 'Spanish', nativeName: 'Español' },
  { id: 'de', name: 'German', nativeName: 'Deutsch' },
  { id: 'it', name: 'Italian', nativeName: 'Italiano' },
  { id: 'pt-BR', name: 'Brazilian Portuguese', nativeName: 'Português (Brasil)' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
] as const;
export type SpeechLanguage = typeof TTS_LANGUAGES[number]['id'];

/** Language belongs to the voice; dashboard/bot translation settings never change pronunciation. */
export const TTS_VOICES = [
  ...ENGLISH_TTS_VOICES.map(voice => ({ ...voice, language: 'en' as const })),
  { id: 'fr-siwis', name: 'Siwis · French female', engineVoice: 'ff_siwis', gender: 'female', accent: 'French', language: 'fr' },
  { id: 'es-dora', name: 'Dora · Spanish female', engineVoice: 'ef_dora', gender: 'female', accent: 'Spanish', language: 'es' },
  { id: 'es-alex', name: 'Alex · Spanish male', engineVoice: 'em_alex', gender: 'male', accent: 'Spanish', language: 'es' },
  { id: 'es-santa', name: 'Santa · Spanish male', engineVoice: 'em_santa', gender: 'male', accent: 'Spanish', language: 'es' },
  { id: 'it-sara', name: 'Sara · Italian female', engineVoice: 'if_sara', gender: 'female', accent: 'Italian', language: 'it' },
  { id: 'it-nicola', name: 'Nicola · Italian male', engineVoice: 'im_nicola', gender: 'male', accent: 'Italian', language: 'it' },
  { id: 'pt-dora', name: 'Dora · Brazilian Portuguese female', engineVoice: 'pf_dora', gender: 'female', accent: 'Brazilian', language: 'pt-BR' },
  { id: 'pt-alex', name: 'Alex · Brazilian Portuguese male', engineVoice: 'pm_alex', gender: 'male', accent: 'Brazilian', language: 'pt-BR' },
  { id: 'pt-santa', name: 'Santa · Brazilian Portuguese male', engineVoice: 'pm_santa', gender: 'male', accent: 'Brazilian', language: 'pt-BR' },
  { id: 'hi-alpha', name: 'Alpha · Hindi female', engineVoice: 'hf_alpha', gender: 'female', accent: 'Hindi', language: 'hi' },
  { id: 'hi-beta', name: 'Beta · Hindi female', engineVoice: 'hf_beta', gender: 'female', accent: 'Hindi', language: 'hi' },
  { id: 'hi-omega', name: 'Omega · Hindi male', engineVoice: 'hm_omega', gender: 'male', accent: 'Hindi', language: 'hi' },
  { id: 'hi-psi', name: 'Psi · Hindi male', engineVoice: 'hm_psi', gender: 'male', accent: 'Hindi', language: 'hi' },
  { id: 'de-thorsten', name: 'Thorsten · German male', engineVoice: 'piper_de_thorsten', gender: 'male', accent: 'German', language: 'de' },
  { id: 'de-kerstin', name: 'Kerstin · German female', engineVoice: 'piper_de_kerstin', gender: 'female', accent: 'German', language: 'de' },
] as const;

export type VoiceId = typeof TTS_VOICES[number]['id'];
export type TtsVoiceId = VoiceId;
const voiceIds: ReadonlySet<string> = new Set(TTS_VOICES.map(voice => voice.id));
export const isVoiceId = (id: unknown): id is VoiceId => typeof id === 'string' && voiceIds.has(id);
