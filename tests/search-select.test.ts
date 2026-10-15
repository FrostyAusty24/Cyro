import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// Small DOM adapter exercises the shipped browser control without adding a DOM
// dependency. Layout/real browser focus and appearance have separate browser QA.
class UiEvent {
  target: Element | null = null;
  defaultPrevented = false;
  stopped = false;
  key = '';
  shiftKey = false;
  isComposing = false;
  bubbles = false;
  constructor(public type: string, init = {}) { Object.assign(this, init); }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.stopped = true; }
}
class Target {
  listeners = new Map<string, Set<(event: UiEvent) => void>>();
  addEventListener(type: string, listener: (event: UiEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: (event: UiEvent) => void) { this.listeners.get(type)?.delete(listener); }
  dispatchEvent(event: UiEvent) {
    event.target ||= this as unknown as Element;
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    if (event.bubbles && !event.stopped && this instanceof Element) this.parentElement?.dispatchEvent(event);
    return !event.defaultPrevented;
  }
}
class Element extends Target {
  children: Element[] = [];
  parentElement: Element | null = null;
  attributes = new Map<string, string>();
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  className = '';
  id = '';
  disabled = false;
  hidden = false;
  required = false;
  multiple = false;
  tabIndex = 0;
  namespaceURI = 'http://www.w3.org/2000/svg';
  popoverOpen = false;
  ownText = '';
  ownValue = '';
  ownSelected = false;
  classList = {
    add: (name: string) => { if (!this.className.split(' ').includes(name)) this.className += ` ${name}`; },
    toggle: (name: string, enabled: boolean) => { this.className = this.className.split(' ').filter(value => value !== name).join(' '); if (enabled) this.classList.add(name); },
  };
  constructor(public tagName: string, public ownerDocument: Doc) { super(); }
  set textContent(value: string) { this.ownText = value; this.children = []; }
  get textContent(): string { return this.ownText + this.children.map(child => child.textContent).join(''); }
  get label() { return this.textContent; }
  get options(): Element[] { return this.children.flatMap(child => child.tagName === 'OPTION' ? [child] : child.options); }
  get selectedOptions() { return this.options.filter(option => option.selected); }
  get selected() { return this.ownSelected; }
  set selected(value: boolean) {
    if (value && this.parentElement?.tagName === 'SELECT' && !this.parentElement.multiple) this.parentElement.options.forEach(option => { option.ownSelected = false; });
    this.ownSelected = value;
  }
  get value(): string { return this.tagName === 'SELECT' ? this.selectedOptions[0]?.value || '' : this.ownValue; }
  set value(value: string) {
    if (this.tagName === 'SELECT') this.options.forEach(option => { option.ownSelected = option.value === value; });
    else this.ownValue = value;
  }
  get validity() { return { valid: !this.required || Boolean(this.value) }; }
  get isConnected(): boolean { return this === this.ownerDocument.body || Boolean(this.parentElement?.isConnected); }
  append(...children: Element[]) { children.forEach(child => { child.remove(); child.parentElement = this; this.children.push(child); }); }
  replaceChildren(...children: Element[]) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; this.ownText = ''; this.append(...children); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
    if (key === 'id') this.id = value;
    if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  getAttribute(key: string) { return this.attributes.get(key) ?? null; }
  removeAttribute(key: string) { this.attributes.delete(key); }
  contains(other: Element): boolean { return this === other || this.children.some(child => child.contains(other)); }
  closest(selector: string): Element | null { return selector === 'fieldset:disabled' && this.tagName === 'FIELDSET' && this.disabled ? this : this.parentElement?.closest(selector) || null; }
  focus() { this.ownerDocument.activeElement = this; }
  getClientRects() { return this.isConnected ? [{}] : []; }
  getBoundingClientRect() { return { left: 20, top: 120, bottom: 164, width: 320, height: 240 }; }
  scrollIntoView() {}
  showPopover() { this.popoverOpen = true; }
  hidePopover() { this.popoverOpen = false; }
  matches(selector: string) { return selector === ':popover-open' && this.popoverOpen; }
}
class Doc extends Target {
  body = new Element('BODY', this);
  activeElement: Element = this.body;
  createElement(tag: string) { return new Element(tag.toUpperCase(), this); }
  createElementNS(_namespace: string, tag: string) { return this.createElement(tag); }
}
function find(root: Element, predicate: (element: Element) => boolean): Element[] {
  return [root, ...root.children.flatMap(child => find(child, predicate))].filter(predicate);
}
function harness(initial: { name: string; id: string; selected?: boolean; disabled?: boolean }[], multiple = false) {
  const document = new Doc();
  const observers: { active: boolean; callback: () => void }[] = [];
  class Observer {
    entry: { active: boolean; callback: () => void };
    constructor(callback: () => void) { this.entry = { active: false, callback }; observers.push(this.entry); }
    observe() { this.entry.active = true; }
    disconnect() { this.entry.active = false; }
  }
  const window = Object.assign(new Target(), { innerWidth: 1200, innerHeight: 900, CyroSearchSelect: undefined as any });
  runInNewContext(readFileSync(new URL('../public/icons.js', import.meta.url), 'utf8'), { document, window });
  runInNewContext(readFileSync(new URL('../public/search-select.js', import.meta.url), 'utf8'), { document, window, MutationObserver: Observer, Event: UiEvent, queueMicrotask });
  const select = document.createElement('select'); select.id = 'test-select'; select.multiple = multiple; select.dataset.searchKind = 'roles';
  select.setAttribute('aria-describedby', 'role-help');
  for (const item of initial) { const option = document.createElement('option'); option.textContent = item.name; option.value = item.id; option.selected = Boolean(item.selected); option.disabled = Boolean(item.disabled); select.append(option); }
  const wrapper = window.CyroSearchSelect.enhance(select, 'Staff roles'); document.body.append(wrapper);
  const trigger = find(wrapper, element => element.tagName === 'BUTTON')[0];
  const popup = () => find(wrapper, element => element.className === 'search-select-popup')[0];
  const input = () => find(wrapper, element => element.getAttribute('role') === 'combobox')[0];
  const rows = () => find(wrapper, element => element.getAttribute('role') === 'option');
  const click = (element: Element) => element.dispatchEvent(new UiEvent('click'));
  const query = (value: string) => { input().value = value; input().dispatchEvent(new UiEvent('input')); };
  const key = (value: string, extra = {}) => input().dispatchEvent(new UiEvent('keydown', { key: value, bubbles: true, ...extra }));
  return { document, window, select, wrapper, trigger, popup, input, rows, click, query, key, flush: () => observers.filter(observer => observer.active).forEach(observer => observer.callback()) };
}

describe('searchable channel, server and role controls', () => {
  it('searches case-insensitive accent-normalized words or IDs and emits the native selection change', () => {
    const ui = harness([{ name: 'No role', id: '', selected: true }, { name: 'Équipe • Stream Support', id: '45678' }, { name: 'Viewer', id: '98765' }]);
    const changes: string[] = []; ui.select.addEventListener('change', () => changes.push(ui.select.value));
    ui.click(ui.trigger); ui.query('equipe SUPPORT');
    expect(ui.rows().map(row => row.textContent)).toEqual(['Équipe • Stream Support']);
    ui.query('98765'); expect(ui.rows()[0].textContent).toBe('Viewer');
    ui.query('not here'); expect(ui.rows()).toHaveLength(0); expect(ui.popup().textContent).toContain('No roles match.');
    ui.key('Enter'); expect(changes).toEqual([]);
    ui.query('support'); ui.key('Enter');
    expect(ui.select.value).toBe('45678'); expect(changes).toEqual(['45678']); expect(ui.popup()).toBeUndefined();
    expect(ui.trigger.textContent).toBe('Équipe • Stream Support');
  });

  it('keeps selections outside the current multi-role filter and allows deselection without modifiers', () => {
    const ui = harness([{ name: 'Moderator', id: '1', selected: true }, { name: 'Support', id: '2' }, { name: 'Viewer', id: '3' }], true);
    ui.click(ui.trigger); ui.query('support'); ui.key('Enter');
    expect(ui.select.selectedOptions.map(option => option.value)).toEqual(['1', '2']);
    expect(ui.input().value).toBe('support'); expect(ui.popup().textContent).toContain('2 selected');
    ui.query('absent'); expect(ui.select.selectedOptions).toHaveLength(2);
    ui.query('moderator'); ui.click(ui.rows()[0]);
    expect(ui.select.selectedOptions.map(option => option.value)).toEqual(['2']); expect(ui.trigger.textContent).toBe('Support');
    expect(find(ui.popup(), element => element.getAttribute('role') === 'listbox')[0].getAttribute('aria-multiselectable')).toBe('true');
    ui.key('Escape'); expect(ui.document.activeElement).toBe(ui.trigger);
  });

  it('moves through enabled options without selecting until Enter and restores focus on Escape', () => {
    const ui = harness([{ name: 'First', id: '1', selected: true }, { name: 'Locked', id: '2', disabled: true }, { name: 'Third', id: '3' }]);
    ui.click(ui.trigger); ui.key('ArrowDown');
    expect(ui.input().getAttribute('aria-activedescendant')).toBe(ui.rows()[2].id); expect(ui.select.value).toBe('1');
    ui.key('ArrowUp'); expect(ui.input().getAttribute('aria-activedescendant')).toBe(ui.rows()[0].id);
    ui.key('ArrowDown'); ui.key('Enter'); expect(ui.select.value).toBe('3');
    ui.click(ui.trigger); ui.query('First'); ui.key('Escape');
    expect(ui.select.value).toBe('3'); expect(ui.document.activeElement).toBe(ui.trigger);
    expect(ui.select.hidden).toBe(true); expect(ui.select.tabIndex).toBe(-1); expect(ui.trigger.getAttribute('aria-describedby')).toBe('role-help');
  });

  it('reflects a programmatic guild rollback without dispatching another change', () => {
    const ui = harness([{ name: 'Server one', id: '1', selected: true }, { name: 'Server two', id: '2' }]);
    let changes = 0; ui.select.addEventListener('change', () => { changes++; });
    ui.click(ui.trigger); ui.query('two'); ui.key('Enter');
    ui.select.value = '1'; ui.window.CyroSearchSelect.sync(ui.select);
    expect(ui.trigger.textContent).toBe('Server one'); expect(changes).toBe(1);
  });

  it.each(['saving', 'dirty'])('keeps the original server and picker label when the actual %s switch guard rejects it', async reason => {
    const ui = harness([{ name: 'Server one', id: '1', selected: true }, { name: 'Server two', id: '2' }]);
    ui.select.value = '2'; ui.window.CyroSearchSelect.sync(ui.select);
    const state = { saving: reason === 'saving', dirty: reason === 'dirty', guildId: '1', detail: { retainedDraft: true } };
    const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    const source = app.slice(app.indexOf('async function selectGuild('), app.indexOf('async function refreshGuilds('));
    let confirmations = 0;
    const switchGuild = runInNewContext(`${source}\nselectGuild`, {
      state, window: ui.window, document: { getElementById: () => ui.select }, toast: () => {},
      confirmAction: async () => { confirmations++; return false; },
    });
    await switchGuild('2');
    expect(ui.select.value).toBe('1'); expect(ui.trigger.textContent).toBe('Server one');
    expect(state.guildId).toBe('1'); expect(state.detail).toEqual({ retainedDraft: true });
    expect(confirmations).toBe(reason === 'dirty' ? 1 : 0);
  });

  it('closes and disables on save and retains the selected value when controls are restored', () => {
    const ui = harness([{ name: 'Viewer', id: '1', selected: true }, { name: 'Support', id: '2' }]);
    ui.click(ui.trigger); ui.select.disabled = true; ui.flush();
    expect(ui.popup()).toBeUndefined(); expect(ui.trigger.disabled).toBe(true);
    ui.click(ui.trigger); expect(ui.popup()).toBeUndefined();
    ui.select.disabled = false; ui.flush(); ui.click(ui.trigger);
    expect(ui.popup()).toBeDefined(); expect(ui.select.value).toBe('1');
  });

  it('cleans up active document listeners when its page is removed', () => {
    const ui = harness([{ name: 'Viewer', id: '1' }]);
    ui.click(ui.trigger); expect(ui.document.listeners.get('pointerdown')?.size).toBe(1);
    ui.wrapper.remove(); ui.flush();
    expect(ui.popup()).toBeUndefined(); expect(ui.document.listeners.get('pointerdown')?.size).toBe(0); expect(ui.document.listeners.get('scroll')?.size).toBe(0);
  });

  it('forwards native required-field validation to the visible searchable control', () => {
    const ui = harness([{ name: 'No role', id: '', selected: true }, { name: 'Viewer', id: '1' }]);
    ui.select.required = true; ui.flush();
    const event = new UiEvent('invalid'); ui.select.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); expect(ui.trigger.getAttribute('aria-invalid')).toBe('true'); expect(ui.document.activeElement).toBe(ui.input());
    ui.query('Viewer'); ui.key('Enter'); expect(ui.trigger.getAttribute('aria-invalid')).toBeNull();
  });
});
