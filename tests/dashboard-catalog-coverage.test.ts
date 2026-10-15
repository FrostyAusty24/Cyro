import { readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { parseAst } from 'rolldown/parseAst';
import { describe, expect, it } from 'vitest';
import { dashboardErrorScript } from '../src/i18n/dashboard-errors.js';

describe('dashboard translation coverage', () => {
  it('provides four translations for every explicitly marked literal across shipped browser modules', () => {
    const publicDir = new URL('../public/', import.meta.url);
    const files = readdirSync(publicDir).filter(file => file.endsWith('.js'));
    const context = createContext({ window: {} });
    for (const file of files.filter(file => /^i18n-.+\.js$/.test(file))) runInContext(readFileSync(new URL(file, publicDir), 'utf8'), context);
    runInContext(dashboardErrorScript(), context);
    const window = context.window as any;
    const catalogs = Object.fromEntries(['fr', 'es', 'de', 'pt'].map(locale => [locale, Object.assign({}, window.CyroTranslations[locale], window.CyroExtraTranslations[locale], window.CyroAdditionalTranslations[locale], ...window.CyroDashboardCatalogs.map((batch: any) => batch[locale]))]));
    // Product/company names are intentionally identical in every language.
    const properNames = new Set(['Cyro', 'Headache Development', 'Cyro · Headache Development']);
    const missing: string[] = [];
    let marked = 0;
    for (const file of files.filter(file => !file.startsWith('i18n'))) {
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'CallExpression') {
          const name = node.callee.type === 'Identifier' ? node.callee.name : node.callee.property?.name;
          const argument = ['ui', 'translate'].includes(name) ? node.arguments[0] : name === 'setText' ? node.arguments[1] : name === 'setAttribute' ? node.arguments[2] : null;
          if (argument?.type === 'Literal' && typeof argument.value === 'string' && !properNames.has(argument.value)) {
            marked++;
            for (const locale of ['fr', 'es', 'de', 'pt']) if (!Object.hasOwn(catalogs[locale], argument.value)) missing.push(`${file} ${locale}: ${argument.value}`);
          }
        }
        for (const [key, value] of Object.entries(node)) if (key !== 'loc') {
          if (Array.isArray(value)) value.forEach(walk);
          else if (value && typeof value === 'object') walk(value);
        }
      };
      walk(parseAst(readFileSync(new URL(file, publicDir), 'utf8')));
    }
    expect(marked).toBeGreaterThan(1400);
    expect(missing).toEqual([]);
  });
});
