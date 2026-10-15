import { existsSync, readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

class NodeStub {
  children: NodeStub[] = []; parent: NodeStub | null = null; root = false; ownText = ''; tagName: string;
  attributes: Record<string, string> = {}; dataset: Record<string, string> = {}; listeners: Record<string, ((event: any) => unknown)[]> = {};
  value = ''; disabled = false; selected = false; checked = false; className = ''; hidden = false;
  constructor(tag = '#text') { this.tagName = tag.toUpperCase(); }
  get isConnected(): boolean { return this.root || Boolean(this.parent?.isConnected); }
  get textContent(): string { return this.ownText + this.children.map(node => node.textContent).join(''); }
  set textContent(value: string) { this.replaceChildren(); this.ownText = String(value); }
  append(...nodes: NodeStub[]) { for (const node of nodes) { if (node == null) continue; node.parent = this; this.children.push(node); } }
  replaceChildren(...nodes: NodeStub[]) { for (const child of this.children) child.parent = null; this.children = []; this.ownText = ''; this.append(...nodes); }
  replaceWith(...nodes: NodeStub[]) { if (!this.parent) return; const parent = this.parent; parent.children.splice(parent.children.indexOf(this), 1, ...nodes); this.parent = null; for (const node of nodes) node.parent = parent; }
  setAttribute(key: string, value: string) { this.attributes[key] = value; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value; }
  addEventListener(name: string, listener: (event: any) => unknown) { (this.listeners[name] ||= []).push(listener); }
  async dispatch(name: string) { for (const listener of this.listeners[name] || []) await listener({ target: this, preventDefault() {} }); }
  get all(): NodeStub[] { return this.children.flatMap(child => [child, ...child.all]); }
  querySelector(selector: string): NodeStub | null { return this.all.find(node => selector.startsWith('.') ? node.className.split(' ').includes(selector.slice(1)) : node.tagName === selector.toUpperCase()) || null; }
  querySelectorAll(selector: string) { return this.all.filter(node => node.tagName === selector.toUpperCase()); }
  get elements() { return this.all.filter(node => ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(node.tagName)); }
  reportValidity() { return true; } setCustomValidity() {} focus() {}
}
const asset = (name: string) => readFileSync(new URL(`../public/${name}.js`, import.meta.url), 'utf8');
const snapshot = () => ({ config: { enabled: true, channelId: 'ch1', roleIds: [] }, members: [{ userId: 'u1', totalMs: 3661000, completedMs: 3600000, activeMs: 61000, startedAt: 1760000000000, shifts: 1, lastShiftMs: 3600000 }], counts: { active: 1, members: 1, totalMs: 3661000 }, asOf: 1760000061000 });
function harness(demo = true, data = snapshot()) {
  const body = new NodeStub('body'); body.root = true;
  const document = { body, documentElement: {}, querySelector: () => null, createElement: (tag: string) => new NodeStub(tag), createTextNode: (text: string) => { const node = new NodeStub(); node.textContent = text; return node; } };
  const window: any = { CyroIcons: { create: () => new NodeStub('svg') }, CyroSearchSelect: { enhance: (input: NodeStub) => input } };
  const state: any = { guildId: 'g1', page: 'time-clock', detail: { timeClock: data, channels: [{ id: 'ch1', name: 'Times', type: 0 }, { id: 'ch2', name: 'Other times', type: 0 }], roles: [], members: [{ id: 'u1', displayName: '<img src=x onerror=alert(1)>' }] }, dirty: false, saving: false };
  const api = vi.fn(async () => structuredClone(data)), toast = vi.fn();
  const context = createContext({ window, document, Node: NodeStub, state, DEMO: demo, crypto: { randomUUID }, localStorage: { getItem: () => 'en', setItem() {} }, Intl, Date, WeakRef, setTimeout, clearTimeout });
  for (const name of ['i18n-catalogs', 'i18n-extra-catalogs', 'i18n-additional-catalogs', 'i18n-dashboard-core', 'i18n-dashboard-modules', 'i18n-dashboard-shell', 'i18n-time-clock', 'i18n']) if (existsSync(new URL(`../public/${name}.js`, import.meta.url))) runInContext(asset(name), context);
  const source = asset('app');
  for (const [start, end] of [['function el(', '\nfunction languagePicker'], ['function field(', '\nfunction settingsLayout'], ['function dateLabel(', '\nfunction getConfig']]) runInContext(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), context);
  runInContext('toast = testToast; api = testApi;', Object.assign(context, { testToast: toast, testApi: api }));
  runInContext("function toggleControl(label, checked, change) { return el('label', {}, el('input', {type:'checkbox', checked, onChange: e => change(e.target.checked)}), label); }", context);
  runInContext(asset('time-clock'), context);
  const main = new NodeStub('main'); body.append(main); context.main = main;
  return { context, state, api, main, i18n: window.CyroI18n, run: (script: string) => runInContext(script, context), render: () => runInContext('renderTimeClock(main)', context), button: (text: string) => main.querySelectorAll('button').find(node => node.textContent === text)! };
}

describe('dashboard time clock', () => {
  it('loads the feature assets, navigation and help with an opt-in sample dataset', () => {
    const app = asset('app'), html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
    expect(app).toContain("['time-clock', 'Time clock', 'clock']"); expect(app).toContain("'time-clock': renderTimeClock");
    expect(html.indexOf('/i18n-time-clock.js')).toBeLessThan(html.indexOf('/i18n.js'));
    expect(html.indexOf('/time-clock.js')).toBeLessThan(html.indexOf('/app.js'));
    expect(asset('help')).toContain('/time me'); expect(asset('help')).toContain('/time clock');
    expect(app).toContain('state.demoDetail.timeClock =');
  });

  it('shows precise snapshot durations and renders member names as text, not markup', async () => {
    const h = harness(); await h.render();
    expect(String(h.run('timeClockDuration(3661999)'))).toBe('1h 1m 1s');
    expect(String(h.run('timeClockDuration(90000000)'))).toBe('25h 0m 0s');
    expect(h.main.textContent).toContain('<img src=x onerror=alert(1)>'); expect(h.main.querySelectorAll('img')).toEqual([]);
    expect(h.main.textContent).toContain('1h 1m 1s'); expect(h.main.textContent).toContain('0h 1m 1s');
    expect(h.main.textContent).toContain('Times as of'); expect(h.main.textContent).toContain('Refresh times');
    expect(h.api).not.toHaveBeenCalled();
  });

  it('keeps settings drafts and control nodes through locale changes and times refresh', async () => {
    const h = harness(); await h.render(); const form = h.main.querySelector('form')!;
    const channel = form.querySelectorAll('select').find(node => node.dataset.searchKind === 'channels')!;
    channel.value = 'ch2'; await channel.dispatch('change'); const controls = [...form.elements];
    expect(h.state.dirty).toBe(true); expect(h.button('Publish time-clock panel').disabled).toBe(true);
    for (const locale of ['fr', 'es', 'de', 'pt']) { h.i18n.setLocale(locale); expect(form.elements).toEqual(controls); expect(channel.value).toBe('ch2'); expect(h.state.dirty).toBe(true); }
    h.i18n.setLocale('en'); await h.button('Refresh times').dispatch('click');
    expect(channel.value).toBe('ch2'); expect(h.state.dirty).toBe(true); expect(h.main.textContent).toContain('Your unsaved settings are still here.');
    expect(h.state.detail.timeClock.config.channelId).toBe('ch1');
    await form.dispatch('submit'); expect(h.state.detail.timeClock.config.channelId).toBe('ch2'); expect(h.state.dirty).toBe(false);
    await h.button('Publish time-clock panel').dispatch('click'); expect(h.main.textContent).toContain('Nothing was posted to Discord.'); expect(h.api).not.toHaveBeenCalled();
  });

  it('searches all snapshot members and pages records without altering recorded totals', async () => {
    const data = snapshot(); data.members = Array.from({ length: 31 }, (_, index) => ({ ...data.members[0], userId: `member-${String(index).padStart(2, '0')}`, totalMs: index * 1000, startedAt: index < 2 ? 1760000000000 : null as any })); data.counts.members = 31;
    const h = harness(true, data); await h.render();
    expect(h.main.querySelectorAll('tbody')[0].children).toHaveLength(25);
    await h.button('Next').dispatch('click'); expect(h.main.querySelectorAll('tbody')[0].children).toHaveLength(6);
    const search = h.main.querySelectorAll('input').find(node => node.attributes.type === 'search')!;
    search.value = 'member-02'; await search.dispatch('input'); expect(h.main.querySelectorAll('tbody')[0].children).toHaveLength(1);
    expect(h.main.querySelectorAll('tbody')[0].textContent).toContain('member-02'); expect(h.main.textContent).toContain('Page 1 of 1');
    search.value = ''; await search.dispatch('input');
    const filter = h.main.querySelectorAll('select').find(node => !node.dataset.searchKind)!; filter.value = 'active'; await filter.dispatch('change'); expect(h.main.querySelectorAll('tbody')[0].children).toHaveLength(2);
    expect(h.state.detail.timeClock.members).toEqual(data.members);
  });

  it('saves through the authorized guild API and publishes only saved enabled settings', async () => {
    const h = harness(false); await h.render(); expect(h.api).toHaveBeenCalledWith('/api/guilds/g1/time-clock');
    const form = h.main.querySelector('form')!, channel = form.querySelectorAll('select').find(node => node.dataset.searchKind === 'channels')!;
    channel.value = 'ch2'; await channel.dispatch('change');
    await h.button('Publish time-clock panel').dispatch('click'); expect(h.api).toHaveBeenCalledTimes(1);
    h.api.mockResolvedValueOnce({ config: { enabled: true, channelId: 'ch2', roleIds: [] } } as any); await form.dispatch('submit');
    expect(h.api).toHaveBeenLastCalledWith('/api/guilds/g1/time-clock', 'PATCH', { enabled: true, channelId: 'ch2', roleIds: [] });
    h.api.mockResolvedValueOnce({ messageUrl: 'https://discord.com/channels/1/2/3' } as any); await h.button('Publish time-clock panel').dispatch('click');
    expect(h.api).toHaveBeenLastCalledWith('/api/guilds/g1/time-clock/panel', 'POST', { operationId: expect.any(String) });
    expect(h.main.querySelectorAll('a').some(node => node.attributes.href === 'https://discord.com/channels/1/2/3')).toBe(true);
    expect(h.state.saving).toBe(false);
  });

  it('reuses a panel operation ID after an uncertain response and ignores unsafe returned links', async () => {
    const h = harness(false); await h.render(); h.api.mockRejectedValueOnce(new Error('network'));
    await h.button('Publish time-clock panel').dispatch('click'); const first = h.api.mock.calls.at(-1) as unknown[];
    h.api.mockResolvedValueOnce({ messageUrl: 'javascript:alert(1)' } as any); await h.button('Publish time-clock panel').dispatch('click');
    const second = h.api.mock.calls.at(-1) as unknown[]; expect(second[2]).toEqual(first[2]);
    expect(h.main.querySelectorAll('a').some(node => node.attributes.href === 'javascript:alert(1)')).toBe(false);
  });

  it('keeps the previous activity and draft when refreshing fails or navigation makes a response stale', async () => {
    const h = harness(false); await h.render(); h.api.mockRejectedValueOnce(new Error('network'));
    await h.button('Refresh times').dispatch('click'); expect(h.main.textContent).toContain('Previous time records are still shown.'); expect(h.main.textContent).toContain('1h 1m 1s');
    let finish: (data: any) => void = () => {}; h.api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.button('Refresh times').dispatch('click'); h.state.guildId = 'g2';
    finish({ ...snapshot(), counts: { active: 99, members: 99, totalMs: 999 } }); await pending;
    expect(h.state.detail.timeClock.counts.active).toBe(1);
  });
});
