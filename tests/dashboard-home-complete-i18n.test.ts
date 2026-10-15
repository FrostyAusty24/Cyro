import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

class TestNode {
  children: TestNode[] = []; text = ''; isConnected = true; attributes: Record<string,string> = {}; value = ''; selected = false;
  classList = { add() {} };
  constructor(public tagName = '#text') {}
  append(...nodes: TestNode[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: TestNode[]) { this.children = []; this.text = ''; this.append(...nodes); }
  get textContent(): string { return this.text + this.children.map(child => child.textContent).join(''); }
  set textContent(value: string) { this.replaceChildren(); this.text = value; }
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  addEventListener() {}
  querySelector(tag: string): TestNode | undefined { return this.children.find(child => child.tagName === tag.toUpperCase()) || this.children.map(child => child.querySelector(tag)).find(Boolean); }
}
async function harness(serverCount = 1234, fail = false) {
  const window: any = { CyroIcons: { create: () => new TestNode('SVG') } }, sources = new Set<string>();
  const document = { documentElement: {}, querySelector: () => null, createElement: (tag: string) => new TestNode(tag.toUpperCase()), createTextNode: (value: string) => { const node = new TestNode(); node.text = value; return node; } };
  const context = createContext({ window, document, Node: TestNode, localStorage: { getItem: () => 'en', setItem() {} }, WeakRef, Intl, Date, AbortSignal, fetch: async () => ({ ok: !fail, json: async () => ({ serverCount }) }) });
  for (const file of ['i18n-catalogs.js', 'i18n-extra-catalogs.js', 'i18n-additional-catalogs.js', 'i18n-dashboard-core.js', 'i18n-dashboard-home.js', 'i18n.js']) runInContext(readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), context);
  const original = window.CyroI18n.text;
  window.CyroI18n.text = (source: any, params: any) => { if (typeof source === 'string') sources.add(source); return original(source, params); };
  const app = new TestNode('DIV');
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  runInContext(source.slice(source.indexOf('function el('), source.indexOf('\nfunction icon(')), context);
  runInContext(readFileSync(new URL('../public/home.js', import.meta.url), 'utf8'), context);
  context.app = app;
  runInContext("window.CyroHome.render({ app, el, brand: () => el('a', {}, el('small', {}, 'Brand')), login: el('a', {}, ui('Continue with Discord')), setup: true });", context);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { app, window, sources };
}

describe('complete public home translations', () => {
  it('covers all rendered landing-page, feature and FAQ copy in every supported language', async () => {
    const { app, window, sources } = await harness();
    const known = Object.assign({}, window.CyroTranslations.fr, window.CyroExtraTranslations.fr, window.CyroAdditionalTranslations.fr, ...window.CyroDashboardCatalogs.map((catalog: any) => catalog.fr));
    expect([...sources].filter(source => !Object.hasOwn(known, source) && source !== 'Cyro · Headache Development')).toEqual([]);
    const view = app.children[0];
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    const home = window.CyroDashboardCatalogs.at(-1);
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      for (const [key, text] of Object.entries(home[locale])) expect(placeholders(text as string), `${locale}: ${key}`).toEqual(placeholders(key));
      window.CyroI18n.setLocale(locale);
      expect(app.children[0]).toBe(view);
      expect(app.textContent).not.toContain('Your community.');
      expect(app.textContent).not.toContain('Who can open my server’s dashboard?');
      expect(app.textContent).not.toContain('Live count from Cyro');
      expect(app.textContent).toContain('/playmusic');
      expect(app.textContent).toContain((1234).toLocaleString(locale === 'pt' ? 'pt-BR' : locale));
      expect(app.querySelector('select')?.attributes['aria-label']).toBe(window.CyroI18n.translate('Dashboard language'));
    }
  });
  it('translates singular live counts and failed count notices without showing fabricated counts', async () => {
    const single = await harness(1);
    single.window.CyroI18n.setLocale('de');
    expect(single.app.textContent).toContain('Verbundener Discord-Server');
    const failed = await harness(999, true);
    failed.window.CyroI18n.setLocale('fr');
    expect(failed.app.textContent).toContain('Total en direct temporairement indisponible');
    expect(failed.app.textContent).not.toContain('999');
  });
});
