export const SERVER_LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'fr', name: 'Français' },
  { id: 'es', name: 'Español' },
  { id: 'de', name: 'Deutsch' },
  { id: 'pt', name: 'Português (Brasil)' },
  { id: 'auto', name: 'Follow Discord' },
] as const;

export type ServerLocale = typeof SERVER_LANGUAGES[number]['id'];
export function parseServerLocale(value: unknown): ServerLocale {
  if (typeof value !== 'string' || !SERVER_LANGUAGES.some(language => language.id === value)) {
    throw new Error('Choose English, French, Spanish, German, Portuguese, or Follow Discord.');
  }
  return value as ServerLocale;
}
export function parseLanguageSettings(input: unknown): { locale: ServerLocale } {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'locale')) {
    throw new Error('Invalid language settings.');
  }
  return { locale: parseServerLocale((input as Record<string, unknown>).locale) };
}
export const languageSnapshot = (locale: ServerLocale = 'en') => ({ locale, languages: SERVER_LANGUAGES });
