import { describe, expect, it } from 'vitest';
import { createRegistrationPlan } from '../src/commands/register.js';
import { COMMAND_OPTION_ROWS, localizeCommandOptions } from '../src/i18n/command-options.js';

const locales = ['fr', 'es-ES', 'es-419', 'de', 'pt-BR'] as const;
function withoutLocalizations(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutLocalizations);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !key.endsWith('_localizations')).map(([key, item]) => [key, withoutLocalizations(item)]));
}

describe('translated Discord command option metadata', () => {
  it('covers every current subcommand, option description and fixed choice in global and development plans', () => {
    for (const scope of ['global', 'development'] as const) {
      const plan = createRegistrationPlan({ discordClientId: '123456789012345678', commandScope: scope, developmentGuildId: scope === 'development' ? '223456789012345678' : undefined });
      let count = 0;
      const visit = (options: any[]) => {
        for (const option of options) {
          count++;
          for (const locale of locales) {
            expect(option.description_localizations?.[locale], `${option.name}: ${option.description} (${locale})`).toBeTruthy();
            expect(option.description_localizations[locale].length).toBeLessThanOrEqual(100);
          }
          for (const choice of option.choices ?? []) for (const locale of locales) {
            expect(choice.name_localizations?.[locale], `${option.name}: ${choice.name} (${locale})`).toBeTruthy();
            expect(choice.name_localizations[locale].length).toBeLessThanOrEqual(100);
          }
          visit(option.options ?? []);
        }
      };
      for (const command of plan.body) visit(command.options ?? []);
      expect(count).toBeGreaterThan(100);
      expect(plan.body.find(command => command.name === 'ttsvoice')?.options?.[0]).toMatchObject({ name: 'voice', autocomplete: true, required: true, max_length: 100 });
      expect(plan.body.find(command => command.name === 'ttsvoice')?.options?.[0]).toHaveProperty('choices', undefined);
    }
  });

  it('preserves values, restrictions, names and existing third-party localizations without mutating its input', () => {
    const input = [{ type: 2, name: 'group', description: 'Open a support ticket', options: [
      { type: 1, name: 'action', description: 'Clear an optional setting', options: [
        { type: 3, name: 'setting', description: 'Setting to clear', required: true, description_localizations: { ja: '設定' }, choices: [{ name: 'Ping role', value: 'pingRole', name_localizations: { ja: 'ロール' } }] },
        { type: 4, name: 'limit', description: '1–99, or 0 for no limit', min_value: 0, max_value: 99 },
      ] },
    ] }];
    const before = structuredClone(input), result = localizeCommandOptions(input);
    expect(input).toEqual(before); expect(withoutLocalizations(result)).toEqual(withoutLocalizations(before));
    const setting = result[0]!.options[0]!.options[0]!;
    expect(setting.description_localizations).toMatchObject({ ja: '設定', de: 'Zu löschende Einstellung' });
    expect(setting.choices?.[0]).toMatchObject({ name: 'Ping role', value: 'pingRole', name_localizations: { ja: 'ロール', 'pt-BR': 'Cargo a mencionar' } });
  });

  it('keeps metadata within Discord limits and preserves template placeholders and platform names', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g)].map(match => match[0]).sort();
    expect(new Set(COMMAND_OPTION_ROWS.map(row => row[0])).size).toBe(COMMAND_OPTION_ROWS.length);
    for (const [en, ...translations] of COMMAND_OPTION_ROWS) for (const translation of translations) {
      expect(translation.length, en).toBeGreaterThan(0); expect(translation.length, `${en}: ${translation}`).toBeLessThanOrEqual(100);
      expect(placeholders(translation), en).toEqual(placeholders(en));
    }
    // Discord counts the longest localization for each name/description, rather than their sum.
    const textSize = (entry: any): number => ['name', 'description'].reduce((sum, key) => sum + Math.max(String(entry[key] ?? '').length, ...Object.values(entry[`${key}_localizations`] ?? {}).map(value => String(value).length)), 0)
      + (typeof entry.value === 'string' ? entry.value.length : 0)
      + (entry.options ?? []).reduce((sum: number, option: any) => sum + textSize(option), 0)
      + (entry.choices ?? []).reduce((sum: number, choice: any) => sum + textSize(choice), 0);
    const plan = createRegistrationPlan({ discordClientId: '123456789012345678', commandScope: 'global' });
    for (const command of plan.body) expect(textSize(command), command.name).toBeLessThanOrEqual(8000);
  });
});
