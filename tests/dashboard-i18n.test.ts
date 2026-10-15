import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// Text/attribute DOM adapter: execute the shipped translation runtime and form
// helpers. Browser layout and native select behavior need separate visual QA.
class TestNode {
  children: TestNode[] = [];
  parent: TestNode | null = null;
  attributes: Record<string, string> = {};
  listeners: Record<string, ((event: any) => unknown)[]> = {};
  ownText = '';
  value = '';
  disabled = false;
  selected = false;
  className = '';
  root = false;
  constructor(public tagName = '#text') {}
  get isConnected(): boolean { return this.root || Boolean(this.parent?.isConnected); }
  get textContent(): string { return this.ownText + this.children.map(node => node.textContent).join(''); }
  set textContent(value: string) { this.replaceChildren(); this.ownText = value; }
  append(...nodes: TestNode[]) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes: TestNode[]) { for (const child of this.children) child.parent = null; this.children = []; this.ownText = ''; this.append(...nodes); }
  setAttribute(key: string, value: string) { this.attributes[key] = value; }
  addEventListener(type: string, listener: (event: any) => unknown) { (this.listeners[type] ||= []).push(listener); }
  async dispatch(type: string) { for (const listener of this.listeners[type] || []) await listener({ target: this, preventDefault() {} }); }
  get elements(): TestNode[] { return this.children.flatMap(child => ['INPUT', 'BUTTON', 'SELECT'].includes(child.tagName) ? [child] : child.elements); }
  reportValidity() { return true; }
}

function harness(initialLocale: string | null = null, blockedStorage = false) {
  const values = new Map<string, string>();
  if (initialLocale) values.set('cyro.dashboard.locale', initialLocale);
  const localStorage = { getItem: (key: string) => { if (blockedStorage) throw Error('Blocked'); return values.get(key) || null; }, setItem: (key: string, value: string) => { if (blockedStorage) throw Error('Blocked'); values.set(key, value); } };
  const body = new TestNode('BODY'); body.root = true;
  const document = { body, documentElement: { lang: '' }, createElement: (tag: string) => new TestNode(tag.toUpperCase()), createTextNode: (text: string) => { const node = new TestNode(); node.textContent = text; return node; } };
  const window: any = {};
  const context = createContext({ window, document, localStorage, Node: TestNode, structuredClone });
  for (const file of ['i18n-catalogs.js', 'i18n-extra-catalogs.js', 'i18n-additional-catalogs.js', 'i18n.js']) {
    const path = new URL(`../public/${file}`, import.meta.url);
    if (existsSync(path)) runInContext(readFileSync(path, 'utf8'), context);
  }
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  runInContext(source.slice(source.indexOf('function el('), source.indexOf('\nfunction icon(')), context);
  return { context, document, window, i18n: window.CyroI18n, values, el: runInContext('el', context) };
}

describe('dashboard languages', () => {
  it('uses English by default, normalizes unsupported stored locales and persists supported choices', () => {
    const ui = harness('zz');
    expect(ui.i18n.locale).toBe('en');
    expect(ui.document.documentElement.lang).toBe('en');
    ui.i18n.setLocale('fr');
    expect(ui.values.get('cyro.dashboard.locale')).toBe('fr');
    expect(ui.document.documentElement.lang).toBe('fr');
    expect(harness('es').i18n.translate('Save changes')).toBe('Guardar cambios');
    expect(harness('de').i18n.translate('Save changes')).toBe('Änderungen speichern');
    expect(harness('pt').i18n.translate('Save changes')).toBe('Salvar alterações');
    expect(ui.i18n.languages.map((language: any) => language.id)).toEqual(['en', 'fr', 'es', 'de', 'pt']);
  });

  it('falls back to English and preserves unknown template placeholders', () => {
    const { i18n } = harness('fr');
    expect(i18n.translate('Not translated: {value}', { value: '42' })).toBe('Not translated: 42');
    expect(i18n.translate('Use {user} and {server}.')).toBe('Use {user} and {server}.');
    expect(i18n.translate('constructor')).toBe('constructor');
    expect(i18n.translate('__proto__')).toBe('__proto__');
    expect(i18n.translate('{label}: {selection}', { label: 'Owner', selection: 'Émilie' })).toBe('Owner : Émilie');
  });

  it('continues to switch when browser storage is unavailable', () => {
    const { i18n, document } = harness(null, true);
    expect(() => i18n.setLocale('es')).not.toThrow();
    expect(document.documentElement.lang).toBe('es');
    expect(i18n.translate('Cancel')).toBe('Cancelar');
  });

  it('covers every existing catalog key in German and Portuguese and preserves all interpolation placeholders', () => {
    const { window } = harness();
    const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(match => match[1]).sort();
    const catalogs = [window.CyroTranslations, window.CyroExtraTranslations, window.CyroAdditionalTranslations];
    const keys = [...new Set(catalogs.flatMap(catalog => Object.keys(catalog.fr || {})))].sort();
    expect(keys.length).toBeGreaterThan(880);
    for (const locale of ['de', 'pt']) expect(Object.keys(window.CyroAdditionalTranslations[locale]).sort(), locale).toEqual(keys);
    for (const catalog of catalogs) {
      for (const locale of ['fr', 'es', 'de', 'pt']) for (const [source, translated] of Object.entries(catalog[locale] || {})) {
        expect(typeof translated, `${locale}: ${source}`).toBe('string');
        expect((translated as string).trim().length, `${locale}: ${source}`).toBeGreaterThan(0);
        expect(placeholders(translated as string), `${locale}: ${source}`).toEqual(placeholders(source));
      }
    }
  });

  it('translates only tagged labels, leaving identical user-authored text untouched', () => {
    const { i18n, el, document } = harness();
    const label = el('span', {}, i18n.text('Overview'));
    const serverName = el('span', {}, 'Overview');
    const post = el('p', {}, '<img src=x onerror=alert(1)>');
    const interpolated = el('span', {}, i18n.text('{label}: {selection}', { label: 'Room', selection: '<script>steal()</script>' }));
    const control = el('input', { value: 'Overview', placeholder: i18n.text('Search') });
    document.body.append(label, serverName, post, interpolated, control);
    i18n.setLocale('fr');
    expect(label.textContent).toBe('Vue d’ensemble');
    expect(serverName.textContent).toBe('Overview');
    expect(control.value).toBe('Overview');
    expect(control.attributes.placeholder).toBe('Rechercher');
    expect(post.children[0].tagName).toBe('#text');
    expect(post.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(interpolated.textContent).toContain('<script>steal()</script>');
    expect(interpolated.children.every((node: TestNode) => node.tagName === '#text')).toBe(true);
    for (const locale of ['de', 'pt']) {
      i18n.setLocale(locale);
      expect(label.textContent).not.toBe('Overview');
      expect(serverName.textContent).toBe('Overview');
      expect(control.value).toBe('Overview');
      expect(post.textContent).toBe('<img src=x onerror=alert(1)>');
      expect(interpolated.textContent).toContain('<script>steal()</script>');
      expect(interpolated.children.every((node: TestNode) => node.tagName === '#text')).toBe(true);
    }
  });

  it('does not resurrect stale button text or stale errors after content is replaced', () => {
    const { i18n, el, document } = harness();
    const button = el('button', {}, i18n.text('Save changes')); document.body.append(button);
    i18n.setText(button, 'Saving…');
    button.replaceChildren(el('span', {}, '✓'), i18n.node(i18n.text('Save changes')));
    i18n.setLocale('fr');
    expect(button.textContent).toBe('✓Enregistrer les modifications');
    i18n.setText(button, 'Saving…');
    i18n.setContent(button, 'Untranslated provider error');
    i18n.setLocale('es');
    expect(button.textContent).toBe('Untranslated provider error');
  });

  it('switches languages without replacing a dirty form or changing its submitted settings', async () => {
    const h = harness();
    const state: any = { detail: { community: { config: { welcome: { message: 'Overview' } } } }, dirty: false, saving: false };
    const api = vi.fn();
    Object.assign(h.context, { state, DEMO: true, clone: structuredClone, getConfig: () => structuredClone(state.detail.community.config), api, guildPath: () => '/api/guilds/test', icon: () => new TestNode('SVG'), toast: () => {}, putPath: (object: any, path: string, value: any) => { object.welcome.message = value; } });
    const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    runInContext(source.slice(source.indexOf('function formSession('), source.indexOf('\nfunction field(')), h.context);
    const session = runInContext("formSession('community')", h.context);
    const input = h.el('input', { value: 'Welcome <everyone>' });
    session.form.append(input); session.finish(); h.document.body.append(session.form);
    session.change('welcome.message', input.value);
    const form = session.form, children = [...form.children];
    for (const locale of ['fr', 'es', 'de', 'pt']) h.i18n.setLocale(locale);
    expect(session.form).toBe(form);
    expect(form.children).toEqual(children);
    expect(input.value).toBe('Welcome <everyone>');
    expect(state.dirty).toBe(true);
    expect(form.textContent).toContain('Salvar alterações');
    await form.dispatch('submit');
    expect(state.detail.community.config.welcome.message).toBe('Welcome <everyone>');
    expect(state.dirty).toBe(false);
    expect(api).not.toHaveBeenCalled();
  });

  it('ships syntactically valid browser files and loads translation assets before app code', () => {
    const publicPath = new URL('../public/', import.meta.url);
    for (const file of readdirSync(publicPath).filter(file => file.endsWith('.js'))) expect(() => new Script(readFileSync(new URL(file, publicPath), 'utf8'), { filename: file })).not.toThrow();
    const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
    expect(html.indexOf('/i18n-catalogs.js')).toBeLessThan(html.indexOf('/i18n.js'));
    expect(html.indexOf('/i18n-additional-catalogs.js')).toBeGreaterThan(html.indexOf('/i18n-extra-catalogs.js'));
    expect(html.indexOf('/i18n-additional-catalogs.js')).toBeLessThan(html.indexOf('/i18n.js'));
    expect(html.indexOf('/i18n.js')).toBeLessThan(html.indexOf('/app.js'));
  });

  it('keeps server language separate from the local interface choice and saves only on submit', async () => {
    const h = harness('es');
    const state: any = { guildId: '1234', detail: { language: { locale: 'en' } }, dirty: false, saving: false };
    const api = vi.fn(async (_path: string, _method: string, body: any) => ({ locale: body.locale }));
    Object.assign(h.context, { state, DEMO: false, api, safeId: encodeURIComponent, field: (label: unknown, input: TestNode, hint: unknown) => h.el('label', {}, label, input, hint), panel: (title: unknown, body: TestNode) => h.el('section', {}, title, body) });
    const source = readFileSync(new URL('../public/help.js', import.meta.url), 'utf8');
    runInContext(source.slice(source.indexOf('function serverLanguagePanel(')), h.context);
    const card = runInContext('serverLanguagePanel()', h.context) as TestNode;
    h.document.body.append(card);
    const form = card.children.find(child => child.tagName === 'FORM')!;
    const input = form.elements.find(child => child.tagName === 'SELECT')!;
    expect(input.children.map(child => child.value)).toEqual(expect.arrayContaining(['de', 'pt', 'auto']));
    input.value = 'de';
    await input.dispatch('change');
    h.i18n.setLocale('en');
    expect(input.value).toBe('de');
    expect(state.dirty).toBe(true);
    expect(state.detail.language.locale).toBe('en');
    expect(api).not.toHaveBeenCalled();
    await form.dispatch('submit');
    expect(api).toHaveBeenCalledExactlyOnceWith('/api/guilds/1234/language', 'PATCH', { locale: 'de' });
    expect(state.detail.language.locale).toBe('de');
    expect(h.i18n.locale).toBe('en');
    expect(state.dirty).toBe(false);
  });

  it('shows unavailable voices without silently replacing a stored default or counting them as available', async () => {
    const h = harness('de');
    const source = readFileSync(new URL('../public/audio.js', import.meta.url), 'utf8');
    runInContext(source.slice(source.indexOf('function voicePicker('), source.indexOf('\nasync function renderVoice(')), h.context);
    const config = { defaultVoice: 'de-thorsten' };
    const change = vi.fn((path: string, value: string) => { config.defaultVoice = value; });
    const voices = [
      { id: 'voice1', name: 'Daniel · British male', gender: 'male', accent: 'British', language: 'en', available: true },
      { id: 'de-thorsten', name: 'Thorsten · German male', gender: 'male', language: 'de', available: false },
      { id: 'de-kerstin', name: 'Kerstin · German female', gender: 'female', language: 'de', available: false },
      { id: 'pt-dora', name: 'Dora · Brazilian Portuguese female', gender: 'female', language: 'pt-BR' },
    ];
    Object.assign(h.context, { config, change, voices });
    const picker = runInContext('voicePicker(voices, config, change)', h.context);
    h.document.body.append(picker.languageInput, picker.voiceInput);
    expect(picker.stats).toEqual({ voices: 2, languages: 2 });
    expect(picker.hasUnavailable).toBe(true);
    expect(config.defaultVoice).toBe('de-thorsten');
    expect(picker.voiceInput.value).toBe('de-thorsten');
    const option = picker.voiceInput.children[0].children[0];
    expect(option.disabled).toBe(true);
    expect(option.selected).toBe(true);
    expect(option.textContent).toContain('Thorsten');
    expect(option.textContent).toContain('nicht verfügbar');
    expect(change).not.toHaveBeenCalled();
    h.i18n.setLocale('pt');
    expect(option.textContent).toContain('Thorsten');
    expect(option.textContent).toContain('Indisponível');
    expect(config.defaultVoice).toBe('de-thorsten');
    picker.languageInput.value = 'pt-BR'; await picker.languageInput.dispatch('change');
    expect(change).toHaveBeenCalledExactlyOnceWith('defaultVoice', 'pt-dora');
    expect(picker.voiceInput.value).toBe('pt-dora');
    // A synthetic event cannot select an unavailable language either.
    picker.languageInput.value = 'de'; await picker.languageInput.dispatch('change');
    expect(config.defaultVoice).toBe('pt-dora');
    expect(picker.languageInput.value).toBe('pt-BR');
    expect(change).toHaveBeenCalledTimes(1);
  });
});
