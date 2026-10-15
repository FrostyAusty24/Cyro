import { readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

class Element {
  children: Element[] = []; parent: Element | null = null;
  attributes: Record<string, string> = {}; listeners: Record<string, Function[]> = {};
  root = false; ownText = ''; disabled = false; value = ''; className = '';
  constructor(public tagName = '#text') {}
  get isConnected(): boolean { return this.root || Boolean(this.parent?.isConnected); }
  get textContent(): string { return this.ownText + this.children.map(item => item.textContent).join(''); }
  set textContent(value: string) { this.replaceChildren(); this.ownText = value; }
  get childElementCount() { return this.children.filter(item => item.tagName !== '#text').length; }
  append(...items: Element[]) { for (const item of items) { item.parent = this; this.children.push(item); } }
  prepend(...items: Element[]) { for (const item of items) item.parent = this; this.children.unshift(...items); }
  replaceChildren(...items: Element[]) { for (const item of this.children) item.parent = null; this.children = []; this.ownText = ''; this.append(...items); }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  getAttribute(name: string) { return this.attributes[name] ?? null; }
  addEventListener(name: string, handler: Function) { (this.listeners[name] ||= []).push(handler); }
  async click() { for (const handler of this.listeners.click || []) await handler({ target: this }); }
  querySelectorAll(tag: string): Element[] { return this.children.flatMap(item => [...(item.tagName.toLowerCase() === tag ? [item] : []), ...item.querySelectorAll(tag)]); }
  focus() {}
}
const source = (file: string) => readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');

function harness(locale = 'en', responses: Record<string, any> = {}) {
  const body = new Element('BODY'); body.root = true;
  const container = new Element('SECTION'); body.append(container);
  const language = new Element('SELECT'); body.append(language);
  const title = new Element('TITLE'); title.textContent = 'Creator connections · Cyro'; body.append(title);
  const window: any = {};
  const document = {
    body, documentElement: { lang: '' },
    createElement: (tag: string) => new Element(tag.toUpperCase()),
    createTextNode: (text: string) => { const item = new Element(); item.textContent = text; return item; },
    getElementById: (id: string) => id === 'connection-content' ? container : id === 'connection-language' ? language : null,
    querySelector: () => null,
    querySelectorAll: (selector: string) => selector === '[data-i18n]' ? [title] : [],
  };
  const fetch = vi.fn(async (path: string) => { const response = responses[path] ?? { status: 401, error: 'Sign in required.' }; return { ok: !response.status || response.status < 400, status: response.status || 200, json: async () => response }; });
  const context = createContext({ window, document, Node: Element, URL, URLSearchParams, AbortSignal, localStorage: { getItem: () => locale, setItem() {} }, location: { search: '', assign: vi.fn() }, fetch });
  for (const file of ['i18n-catalogs.js', 'i18n-extra-catalogs.js', 'i18n-additional-catalogs.js', ...readdirSync(new URL('../public/', import.meta.url)).filter(file => /^i18n-dashboard-.*\.js$/.test(file)), 'i18n.js']) runInContext(source(file), context);
  return { context, window, document, container, language, title, fetch, i18n: window.CyroI18n };
}
const settle = async () => { for (let index = 0; index < 20; index++) await Promise.resolve(); };

describe('dashboard shared language behavior and creator portal', () => {
  it('refreshes computed numbers and nested labels without replacing custom content', () => {
    const h = harness();
    const copy = h.i18n.text('{server} · @{creator}', { server: h.i18n.text('Discord server'), creator: 'Overview {server} <b>Frosty</b>' });
    const output = h.i18n.node(copy); const count = h.i18n.node(h.i18n.computedText((locale: string) => (12345.6).toLocaleString(locale === 'pt' ? 'pt-BR' : locale)));
    h.document.body.append(output, count);
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale);
      expect(output.textContent).toContain('Overview {server} <b>Frosty</b>');
      expect(output.textContent).not.toContain('Discord server');
      expect(count.textContent).toBe((12345.6).toLocaleString(locale === 'pt' ? 'pt-BR' : locale));
    }
  });

  it('uses explicit server error metadata and safely handles unknown provider errors', () => {
    const h = harness('de');
    const notice = h.i18n.node(h.i18n.errorText({ message: 'Provider token=PRIVATE', i18n: { key: 'Stop public video access for {creator} in {server}? Existing Discord announcements remain. Connections you approved for other servers stay active. Cyro revokes the TikTok authorization when its last connection is removed.', params: { creator: '<script>{server}</script>', server: 'My server' } } }));
    h.document.body.append(notice);
    expect(notice.textContent).toContain('<script>{server}</script>');
    expect(notice.textContent).not.toContain('PRIVATE');
    const unsafe = h.i18n.node(h.i18n.errorText(new Error('Provider token=PRIVATE'))); h.document.body.append(unsafe);
    expect(unsafe.textContent).not.toContain('PRIVATE');
    expect(unsafe.textContent).toContain('Bot-Protokoll');
    h.i18n.setLocale('fr');
    expect(notice.textContent).toContain('Arrêter');
    expect(unsafe.textContent).toContain('journal du bot');
    expect(String(h.i18n.errorText('Nicht verbunden'))).toBe('Non connecté');
  });

  it('translates static portal chrome and signed-out controls using the saved language', async () => {
    const h = harness('fr'); runInContext(source('connections.js'), h.context); await settle();
    expect(h.title.textContent).toBe('Connexions des créateurs · Cyro');
    expect(h.container.textContent).toContain('Commencez avec votre compte Discord');
    expect(h.container.textContent).toContain('Conditions d’utilisation');
    expect(h.language.value).toBe('fr');
    h.i18n.setLocale('de');
    expect(h.container.textContent).toContain('Beginne mit deinem Discord-Konto');
    expect(h.title.textContent).toBe('Creator-Verbindungen · Cyro');
    expect(h.language.value).toBe('de');
  });

  it('preserves creator names and video titles while translating connected controls and dates', async () => {
    const record = { guildId: '100000000000000001', recordId: 'creator-1', creatorName: 'Overview', guildName: 'Connected', username: 'Frosty', connected: true, displayName: 'Welcome' };
    const h = harness('es', { '/api/me': { user: { username: 'Save changes' }, csrfToken: 'test' }, '/api/tiktok/records': { configured: true, records: [record] }, '/api/tiktok/connections': { connections: [] }, '/api/tiktok/videos?guildId=100000000000000001&recordId=creator-1': { videos: [{ title: '<b>Overview {creator}</b>', url: 'https://www.tiktok.com/@frosty/video/1', publishedAt: '2026-10-10T12:00:00Z' }] } });
    runInContext(source('connections.js'), h.context); await settle();
    expect(h.container.textContent).toContain('Save changes'); expect(h.container.textContent).toContain('Overview'); expect(h.container.textContent).toContain('Connected · @Frosty');
    const list = h.container.querySelectorAll('button').find(button => button.textContent === 'Mostrar vídeos públicos recientes')!;
    expect(list).toBeDefined(); await list.click(); await settle();
    expect(h.container.textContent).toContain('<b>Overview {creator}</b>');
    expect(list.textContent).toBe('Ocultar vídeos públicos');
    h.i18n.setLocale('pt'); expect(list.textContent).toBe('Ocultar vídeos públicos');
    expect(h.container.querySelectorAll('time')[0].textContent).toBe(new Date('2026-10-10T12:00:00Z').toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric' }));
    await list.click(); expect(list.textContent).toBe('Mostrar vídeos públicos recentes');
    h.i18n.setLocale('de'); expect(list.textContent).toBe('Aktuelle öffentliche Videos anzeigen');
    expect(h.container.textContent).toContain('Connected · @Frosty');
  });

  it('keeps all shell catalog placeholders and explicit static labels covered in four languages', () => {
    const h = harness(); const catalogs = Object.assign({}, h.window.CyroTranslations.fr, h.window.CyroExtraTranslations.fr, ...h.window.CyroDashboardCatalogs.map((batch: any) => batch.fr));
    const html = source('connections.html');
    const keys = [...html.matchAll(/<[^>]+data-i18n>([^<]+)</g)].map(match => match[1]);
    for (const match of html.matchAll(/aria-label="([^"]+)" data-i18n-aria-label/g)) keys.push(match[1]);
    for (const key of keys) expect(catalogs[key], key).toBeDefined();
    for (const locale of ['fr', 'es', 'de', 'pt']) for (const batch of h.window.CyroDashboardCatalogs) for (const [key, value] of Object.entries(batch[locale] || {})) {
      expect(typeof value, `${locale}: ${key}`).toBe('string');
      const slots = (text: string) => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
      expect(slots(String(value)), `${locale}: ${key}`).toEqual(slots(key));
    }
    for (const page of ['index.html', 'connections.html']) {
      const content = source(page);
      expect(content).toContain('<html lang="en" translate="no">');
      expect(content).toContain('<meta name="google" content="notranslate">');
      for (const file of ['i18n-dashboard-shell.js', 'i18n-dashboard-modules.js', 'i18n-dashboard-core.js', 'i18n-dashboard-home.js', 'i18n-errors.js']) expect(content.indexOf(`/${file}`)).toBeLessThan(content.indexOf('/i18n.js'));
    }
  });
});
