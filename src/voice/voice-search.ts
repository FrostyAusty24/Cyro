import { TTS_LANGUAGES, TTS_VOICES } from './catalog.js';
import { botText, normalizeLocale } from '../i18n/index.js';

export function localizedVoiceName(voice: typeof TTS_VOICES[number], locale = 'en'): string {
  if(normalizeLocale(locale)==='en') return voice.name;
  const t=(source:string)=>botText(null,source,{},locale);
  const language=voice.language==='en' ? voice.accent==='British'?'British English':'American English' : TTS_LANGUAGES.find(item=>item.id===voice.language)!.name;
  return `${voice.name.split(' · ')[0]} · ${t(language)} · ${t(voice.gender==='male'?'Male voice':'Female voice')}`;
}

const fold = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

/** Only public catalog entries are searched. No saved member preferences are returned. */
export function voiceChoices(query: unknown, preferredLanguage = 'en', available: (id: string) => boolean = () => true) {
  const terms = fold(typeof query === 'string' ? query.slice(0, 100) : '').trim().split(/\s+/).filter(Boolean);
  const preferred = preferredLanguage.split('-')[0];
  return TTS_VOICES.filter(voice => {
    if (!available(voice.id)) return false;
    const language = TTS_LANGUAGES.find(item => item.id === voice.language);
    const searchable = fold(`${voice.id} ${voice.name} ${voice.accent} ${language?.name ?? ''} ${language?.nativeName ?? ''} ${localizedVoiceName(voice,preferredLanguage)}`);
    return terms.every(term => term === 'male' || term === 'female' ? voice.gender === term : searchable.includes(term));
  }).sort((left, right) => Number(right.language.split('-')[0] === preferred) - Number(left.language.split('-')[0] === preferred))
    .slice(0, 25).map(voice => ({ name: localizedVoiceName(voice,preferredLanguage).slice(0,100), value: voice.id }));
}
