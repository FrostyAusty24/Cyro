import { readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { parseAst } from 'rolldown/parseAst';
import { afterEach, describe, expect, it } from 'vitest';
import { TIME_CLOCK_MESSAGE_ROWS } from '../src/i18n/time-clock.js';
import { BOT_TRANSLATIONS } from '../src/i18n/messages.js';
import { botError, botText, BotMessageError, setBotLocaleResolver } from '../src/i18n/index.js';
import { dashboardErrorScript } from '../src/i18n/dashboard-errors.js';
import { commandDescriptionLocalizations } from '../src/i18n/commands.js';
import { localizeCommandOptions } from '../src/i18n/command-options.js';
import { timeClockCommands } from '../src/time-clock/commands.js';
import { TimeClockService } from '../src/time-clock/service.js';

const locales = ['fr', 'es', 'de', 'pt'] as const;
const metadataLocales = ['fr', 'es-ES', 'es-419', 'de', 'pt-BR'] as const;
const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
const commands = (text: string) => [...text.matchAll(/\/[a-z][a-z0-9-]*(?: (?:in|out|me|clock|member|panel))?/g)].map(match => match[0]).sort();
afterEach(() => setBotLocaleResolver(() => 'en'));

function literalBranches(expression: any): string[] {
  if (!expression) return [];
  if (expression.type === 'Literal' && typeof expression.value === 'string') return [expression.value];
  if (expression.type === 'ConditionalExpression') return [...literalBranches(expression.consequent), ...literalBranches(expression.alternate)];
  return [];
}

function sourceKeys(source: string, browser = false): Set<string> {
  const keys = new Set<string>();
  const file = parseAst(source, { lang: browser ? 'js' : 'ts' });
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const name = node.callee.name;
      const index = browser ? name === 'ui' ? 0 : -1 : name === 'botText' ? 1 : name === 't' ? 0 : name === 'botError' ? 3 : -1;
      if (index >= 0) literalBranches(node.arguments[index]).forEach(key => keys.add(key));
    }
    if (!browser && node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'BotMessageError') literalBranches(node.arguments?.[0]).forEach(key => keys.add(key));
    for (const [key, value] of Object.entries(node)) if (key !== 'loc') {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(file);
  return keys;
}

function browserCatalogs() {
  const context = createContext({ window: {}, document: { documentElement: {} }, localStorage: { getItem: () => 'en', setItem() {} }, WeakRef, Intl });
  const publicDir = new URL('../public/', import.meta.url);
  for (const file of readdirSync(publicDir).filter(file => /^i18n-.+\.js$/.test(file))) runInContext(readFileSync(new URL(file, publicDir), 'utf8'), context);
  runInContext(dashboardErrorScript(), context);
  runInContext(readFileSync(new URL('i18n.js', publicDir), 'utf8'), context);
  const window = context.window as any;
  const catalogs = Object.fromEntries(locales.map(locale => [locale, Object.assign({}, window.CyroTranslations[locale], window.CyroExtraTranslations[locale], window.CyroAdditionalTranslations[locale], ...window.CyroDashboardCatalogs.map((batch: any) => batch[locale]))]));
  return { catalogs, i18n: window.CyroI18n, clockCatalog: window.CyroDashboardCatalogs.find((batch: any) => batch.fr['Who can clock in?']) };
}

describe('time clock language coverage', () => {
  it('covers every fixed backend output and error with preserved placeholders and commands', () => {
    expect(new Set(TIME_CLOCK_MESSAGE_ROWS.map(row => row[0])).size).toBe(TIME_CLOCK_MESSAGE_ROWS.length);
    for (const [source, ...translations] of TIME_CLOCK_MESSAGE_ROWS) {
      expect(BOT_TRANSLATIONS[source], source).toBeDefined();
      for (const translated of translations) {
        expect(translated.trim(), source).not.toBe('');
        expect(placeholders(translated), source).toEqual(placeholders(source));
        expect(commands(translated), source).toEqual(commands(source));
      }
    }
    const keys = new Set(['Your recorded time', 'Member recorded time']);
    for (const file of ['service', 'types']) for (const key of sourceKeys(readFileSync(new URL(`../src/time-clock/${file}.ts`, import.meta.url), 'utf8'))) keys.add(key);
    expect(keys.size).toBeGreaterThan(35);
    for (const source of keys) for (const locale of locales) expect(BOT_TRANSLATIONS[source]?.[locale], `${locale}: ${source}`).toBeTruthy();
  });

  it('localizes every description and option while retaining command names and values', () => {
    for (const builder of timeClockCommands) {
      const command = builder.toJSON();
      const translated = commandDescriptionLocalizations(command.name, command.description);
      expect(command.name).toBe('time');
      for (const locale of metadataLocales) expect(translated?.[locale]?.length).toBeLessThanOrEqual(100);
      const before = structuredClone(command.options), options = localizeCommandOptions(command.options ?? []);
      const visit = (items: any[]) => items.forEach(item => {
        for (const locale of metadataLocales) {
          expect(item.description_localizations?.[locale], item.description).toBeTruthy();
          expect(item.description_localizations[locale].length, item.description).toBeLessThanOrEqual(100);
        }
        visit(item.options ?? []);
      });
      visit(options);
      expect(command.options).toEqual(before);
      expect(options.map(option => option.name)).toEqual(['in', 'out', 'me', 'clock', 'member', 'panel']);
      expect(options.find(option => option.name === 'clock')?.options?.[0]).toMatchObject({ name: 'page', min_value: 1, max_value: 100000 });
    }
  });

  it.each(locales)('renders personal replies in %s and does not reinterpret inserted data', locale => {
    setBotLocaleResolver(() => locale);
    const service = new TimeClockService({} as never, '.', {} as never, {} as never);
    const row = { userId: '123456789012345678', completedMs: 7200000, startedAt: 1, shifts: 2, lastShiftMs: 3600000, activeMs: 61000, totalMs: 7261000 };
    const embed = (service as any).personalEmbed('guild', row, 'en-US');
    expect(embed.title).toBe(BOT_TRANSLATIONS['Your recorded time']![locale]);
    expect(embed.description).toBe('<@123456789012345678>');
    expect(embed.fields[0].name).toBe(BOT_TRANSLATIONS['Total time']![locale]);
    expect(embed.fields[0].value).toBe('2h 1min 1s');
    for (const label of ['Clock in', 'Clock out', 'My time']) expect(botText('guild', label).length).toBeLessThanOrEqual(80);
    const error = botError('guild', new BotMessageError('Choose a time clock page from 1 to {pages}.', { pages: 'Name {count} <@123>' }));
    expect(error).toContain('Name {count} <@123>');
    expect(error).not.toContain('Choose a time clock page');
  });

  it('covers browser forms, statuses, help and conditional empty/error notices in every language', () => {
    const { catalogs, clockCatalog, i18n } = browserCatalogs();
    const keys = sourceKeys(readFileSync(new URL('../public/time-clock.js', import.meta.url), 'utf8'), true);
    keys.add('Time clock'); keys.add('Member shifts and total time'); keys.add('Set up time clock');
    for (const key of sourceKeys(readFileSync(new URL('../public/help.js', import.meta.url), 'utf8'), true)) if (key.includes('Enable the time clock')) keys.add(key);
    expect(keys.size).toBeGreaterThan(60);
    for (const source of keys) for (const locale of locales) expect(catalogs[locale][source], `${locale}: ${source}`).toBeTruthy();
    for (const source of Object.keys(clockCatalog.fr)) for (const locale of locales) {
      const translated = clockCatalog[locale][source];
      expect(translated?.trim(), source).toBeTruthy();
      expect(placeholders(translated), source).toEqual(placeholders(source));
      expect(commands(translated), source).toEqual(commands(source));
    }
    const nestedError = i18n.text('{error} Check the channel before publishing again.', { error: i18n.errorText({ i18n: { key: 'Time clock is not available.', params: {} } }) });
    for (const locale of locales) {
      i18n.setLocale(locale);
      expect(String(nestedError)).toContain(catalogs[locale]['Time clock is not available.']);
      expect(String(nestedError)).not.toContain('Check the channel');
    }
  });
});
