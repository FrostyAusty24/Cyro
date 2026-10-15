import { BOT_TRANSLATIONS } from './messages.js';

export type BotLocale = 'en' | 'fr' | 'es' | 'de' | 'pt';
export type BotLocalePreference = BotLocale | 'auto';
export type TextParams = Readonly<Record<string, string | number>>;

/** Unsupported Discord/browser locales deliberately fall back to English. */
export function normalizeLocale(value: unknown): BotLocale {
  if (typeof value !== 'string') return 'en';
  const base = value.trim().toLowerCase().replace(/_/g, '-').split('-')[0];
  return base === 'fr' || base === 'es' || base === 'de' || base === 'pt' ? base : 'en';
}

let localeResolver: (guildId: string) => string | undefined = () => 'en';
/** One bot process, independent server preferences. No process-wide active language. */
export function setBotLocaleResolver(resolver: typeof localeResolver): void { localeResolver = resolver; }

export function botLocale(guildId: string | null | undefined, discordLocale?: string | null): BotLocale {
  const configured = guildId ? localeResolver(guildId) ?? 'en' : 'auto';
  return normalizeLocale(configured === 'auto' ? discordLocale : configured);
}

/** Translate only developer-owned copy. Insert names, URLs and user text after lookup. */
export function botText(guildId: string | null | undefined, sourceEnglish: string, params: TextParams = {}, discordLocale?: string | null): string {
  const locale = botLocale(guildId, discordLocale);
  const entry = Object.hasOwn(BOT_TRANSLATIONS, sourceEnglish) ? BOT_TRANSLATIONS[sourceEnglish] : undefined;
  const template = locale === 'en' ? sourceEnglish : entry?.[locale] ?? sourceEnglish;
  // A single pass keeps placeholders inside user values literal and never evaluates them.
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (token, key: string) => Object.hasOwn(params, key) ? String(params[key]) : token);
}
