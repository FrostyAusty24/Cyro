import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

const files = ['setup', 'studio', 'identity', 'suggestions', 'status-roles', 'audio', 'confessions', 'temp-voice', 'community-tools', 'help'];
const asset = (name: string) => readFileSync(new URL(`../public/${name}.js`, import.meta.url), 'utf8');
class NodeStub {
  children: NodeStub[] = []; parent: NodeStub | null = null; root = false; ownText = ''; tagName: string;
  attributes: Record<string, string> = {}; dataset: Record<string, string> = {}; listeners: Record<string, ((event: any) => unknown)[]> = {};
  value = ''; disabled = false; selected = false; checked = false; className = ''; hidden = false;
  style = { setProperty() {} }; classList = { toggle() {}, add() {}, remove() {} };
  constructor(tag = '#text') { this.tagName = tag.toUpperCase(); }
  get isConnected(): boolean { return this.root || Boolean(this.parent?.isConnected); }
  get textContent(): string { return this.ownText + this.children.map(node => node.textContent).join(''); }
  set textContent(value: string) { this.replaceChildren(); this.ownText = String(value); }
  append(...nodes: NodeStub[]) { for (const node of nodes) { if (node == null) continue; node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes: NodeStub[]) { for (const child of this.children) child.parent = null; this.children = []; this.ownText = ''; this.append(...nodes); }
  replaceWith(node: NodeStub) { if (!this.parent) return; const parent = this.parent; parent.children.splice(parent.children.indexOf(this), 1, node); this.parent = null; node.parent = parent; }
  setAttribute(key: string, value: string) { this.attributes[key] = value; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value; }
  getAttribute(key: string) { return this.attributes[key]; }
  addEventListener(name: string, listener: (event: any) => unknown) { (this.listeners[name] ||= []).push(listener); }
  async dispatch(name: string) { for (const listener of this.listeners[name] || []) await listener({ target: this, preventDefault() {} }); }
  get all(): NodeStub[] { return this.children.flatMap(child => [child, ...child.all]); }
  querySelector(selector: string): NodeStub | null { return this.all.find(node => selector.startsWith('.') ? node.className.split(' ').includes(selector.slice(1)) : node.tagName === selector.toUpperCase()) || null; }
  querySelectorAll(selector: string) { return this.all.filter(node => node.tagName === selector.toUpperCase()); }
  get elements() { return this.all.filter(node => ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(node.tagName)); }
  reportValidity() { return true; } setCustomValidity() {} focus() {}
}
function harness() {
  const body = new NodeStub('body'); body.root = true;
  const document = { body, documentElement: {}, querySelector: () => null, querySelectorAll: () => [], createElement: (tag: string) => new NodeStub(tag), createTextNode: (text: string) => { const node = new NodeStub(); node.textContent = text; return node; } };
  const window: any = { CyroIcons: { create: () => new NodeStub('svg') }, CyroSearchSelect: { enhance: (input: NodeStub) => input } };
  const state: any = { guildId: 'g1', page: 'identity', guilds: [{ id: 'g1', name: 'Save changes' }], detail: { channels: [{ id: 'ch1', name: 'Open', type: 0 }], roles: [{ id: 'r1', name: 'Reward role' }], posts: [] }, dirty: false, saving: false };
  const api = vi.fn(), toast = vi.fn();
  const context = createContext({ window, document, Node: NodeStub, state, DEMO: true, api, toast, crypto: { randomUUID }, localStorage: { getItem: () => 'en', setItem() {} }, location: { origin: 'https://cyro.test' }, URL, URLSearchParams, setTimeout, clearTimeout, Intl, Date, WeakRef });
  for (const name of ['i18n-catalogs', 'i18n-extra-catalogs', 'i18n-additional-catalogs', 'i18n-dashboard-modules', 'i18n-dashboard-shell', 'i18n-dashboard-core', 'i18n-time-clock', 'i18n']) {
    try { runInContext(asset(name), context); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const source = asset('app');
  for (const [start, end] of [['function el(', '\nfunction languagePicker'], ['function field(', '\nfunction settingsLayout'], ['function dateLabel(', '\nfunction getConfig']]) {
    runInContext(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), context);
  }
  // Use the real element/form builders. Only navigation/network/toast dependencies are stubs.
  runInContext('toast = testToast; api = testApi;', Object.assign(context, { testToast: toast, testApi: api }));
  runInContext("function toggleControl(label, checked, change) { return el('label', {}, el('input', {type:'checkbox', checked, onChange: e => change(e.target.checked)}), label); }", context);
  runInContext('async function confirmAction() { return true; }', context);
  for (const name of files) runInContext(asset(name), context);
  return { context, state, api, toast, body, i18n: window.CyroI18n, window, run: (code: string) => runInContext(code, context), mount() { const main = new NodeStub('main'); body.append(main); context.main = main; return main; } };
}

describe('complete dashboard module translations', () => {
  it('covers static module copy in all languages with stable placeholders and command names', () => {
    const h = harness();
    const catalogs: Record<string, Record<string, string>> = {};
    for (const group of [h.window.CyroTranslations, h.window.CyroExtraTranslations, h.window.CyroAdditionalTranslations, ...h.window.CyroDashboardCatalogs]) for (const locale of ['fr', 'es', 'de', 'pt']) catalogs[locale] = { ...catalogs[locale], ...group[locale] };
    const variables = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    const commands = (text: string) => [...text.matchAll(/(?<![a-zA-Z0-9.])\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*/g)].map(m => m[0]).sort();
    const moduleRows = h.window.CyroDashboardCatalogs.find((group: any) => group.fr['Shown to members when they choose an option.']);
    expect(Object.keys(moduleRows.fr).length).toBeGreaterThan(300);
    for (const [source, value] of Object.entries(moduleRows.fr)) for (const locale of ['fr', 'es', 'de', 'pt']) {
      const translated = moduleRows[locale][source];
      expect(translated?.trim(), `${locale}: ${source}`).toBeTruthy();
      expect(variables(translated), `${locale}: ${source}`).toEqual(variables(source));
      expect(commands(translated), `${locale}: ${source}`).toEqual(commands(source));
    }
    for (const name of files) {
      const source = asset(name); expect(() => new Script(source)).not.toThrow();
      for (const match of source.matchAll(/ui\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g)) {
        const key = runInContext(match[1], createContext({}));
        for (const locale of ['fr', 'es', 'de', 'pt']) expect(catalogs[locale][key], `${name}/${locale}: ${key}`).toBeDefined();
      }
    }
  });

  it('switches identity labels, nested picture state and ARIA without losing an unsaved nickname', async () => {
    const h = harness(), main = h.mount();
    await h.run('renderIdentity(main)');
    const nickname = main.querySelectorAll('input').find(node => node.attributes.type === 'text')!;
    nickname.value = 'Save changes <Frosty>'; await nickname.dispatch('input');
    const form = main.querySelector('form')!; const initialControls = [...form.elements];
    const snapshot = JSON.stringify(h.state.detail);
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale);
      expect(main.querySelector('form')).toBe(form);
      expect(form.elements).toEqual(initialControls);
      expect(nickname.value).toBe('Save changes <Frosty>');
      expect(h.state.dirty).toBe(true);
      expect(main.textContent).toContain('Save changes <Frosty>');
      expect(main.textContent).not.toContain('Default picture');
      expect(main.textContent).not.toContain('Give Cyro a name and picture');
      expect(main.querySelector('.identity-avatar')!.attributes['aria-label']).not.toBe('Bot picture preview');
    }
    expect(JSON.stringify(h.state.detail)).toBe(snapshot);
    await form.dispatch('submit');
    expect(h.run("identityDemoData.get('g1').nickname")).toBe('Save changes <Frosty>');
    expect(h.api).not.toHaveBeenCalled();
  });

  it('keeps poll question and answers while translating its live preview and controls', async () => {
    const h = harness(); h.state.page = 'polls'; const main = h.mount();
    h.run("renderPublishing(main, 'poll')");
    const form = main.querySelector('form')!;
    const question = form.querySelectorAll('input').find(node => node.attributes.maxlength === '300')!;
    const answers = form.querySelector('textarea')!;
    question.value = 'Open or Closed? <user text>'; await question.dispatch('input');
    answers.value = 'Open\nClosed'; await answers.dispatch('input');
    const controls = [...form.elements];
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale);
      expect(form.elements).toEqual(controls);
      expect(question.value).toBe('Open or Closed? <user text>');
      expect(answers.value).toBe('Open\nClosed');
      expect(main.textContent).toContain('Open or Closed? <user text>');
      expect(main.querySelector('.publish-preview')!.textContent).not.toContain('One answer per person');
      expect(h.state.dirty).toBe(true);
    }
    expect(h.api).not.toHaveBeenCalled();
  });

  it('translates suggestion status chips without translating a member’s identical text', () => {
    const h = harness();
    const chip = h.run("suggestionStatus({ status: 'accepted', delivery: 'sent' })") as NodeStub;
    const memberText = h.run("el('p', {}, 'Accepted')") as NodeStub;
    h.body.append(chip, memberText);
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale); expect(chip.textContent).not.toBe('Accepted'); expect(memberText.textContent).toBe('Accepted');
    }
  });

  it('preserves selected voice IDs while translating language and gender labels', () => {
    const h = harness(); const change = vi.fn();
    Object.assign(h.context, { testVoices: [{ id: 'bm_daniel', name: 'Daniel · British · male', accent: 'British', language: 'en', gender: 'male', available: true }], voiceConfig: { defaultVoice: 'bm_daniel' }, onVoiceChange: change });
    const picker = h.run('voicePicker(testVoices, voiceConfig, onVoiceChange)'); h.body.append(picker.languageInput, picker.voiceInput);
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale);
      expect(picker.voiceInput.value).toBe('bm_daniel');
      expect(picker.voiceInput.textContent).toContain('Daniel');
      expect(picker.voiceInput.textContent).not.toContain('British English');
      expect(picker.voiceInput.textContent).not.toContain('Male voice');
    }
    expect(change).not.toHaveBeenCalled();
  });

  it('translates an existing server-language warning and unknown failures safely, without English leakage', () => {
    const h = harness();
    const source = 'Some temporary room changes are waiting. Check Cyro’s channel permissions; it will retry safely.';
    h.i18n.setLocale('fr'); const french = h.i18n.translate(source);
    h.context.backendWarning = french;
    const node = h.i18n.node(h.run('uiServerCopy(backendWarning)')); h.body.append(node);
    h.i18n.setLocale('de'); expect(node.textContent).toBe(h.i18n.translate(source)); expect(node.textContent).not.toBe(french);
    const error = h.i18n.node(h.run("uiError(new Error('Internal English / private-path/token'))")); h.body.append(error);
    for (const locale of ['fr', 'es', 'de', 'pt']) { h.i18n.setLocale(locale); expect(error.textContent).not.toContain('Internal English'); expect(error.textContent).not.toContain('private-path'); }
  });
});
