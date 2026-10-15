import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

class TextNode {
  textContent = ''; isConnected = true;
  constructor(public tagName = '#text') {}
  setAttribute() {}
}
function harness() {
  const window: any = {};
  const context = createContext({ window, document: { documentElement: {}, querySelector: () => null, createTextNode: () => new TextNode() }, localStorage: { getItem: () => 'en', setItem() {} }, WeakRef, Intl, Date });
  for (const file of ['i18n-catalogs.js', 'i18n-extra-catalogs.js', 'i18n-additional-catalogs.js', 'i18n-dashboard-core.js', 'i18n.js']) runInContext(readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), context);
  const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const [start, end] of [['const format =', '\nconst safeId'], ['function dateLabel(', '\nfunction getConfig'], ['function duration(', '\nfunction streamCoverage'], ['function recoveryKind(', '\nfunction renderRecoveryIssues'], ['function creatorAccountCount(', '\nfunction renderStreams']]) runInContext(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), context);
  return { context, i18n: window.CyroI18n, rows: window.CyroDashboardCatalogs[0], source, run: (script: string) => runInContext(script, context) };
}
describe('complete dashboard core translations', () => {
  it('supplies all four translations and preserves interpolation variables', () => {
    const { rows } = harness();
    const keys = Object.keys(rows.fr);
    expect(keys.length).toBeGreaterThan(230);
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      expect(Object.keys(rows[locale])).toEqual(keys);
      for (const key of keys) { expect(rows[locale][key].trim(), `${locale}: ${key}`).not.toBe(''); expect(params(rows[locale][key]), `${locale}: ${key}`).toEqual(params(key)); }
    }
  });
  it('updates nested dynamic statuses, dates and durations without reconstructing the view', () => {
    const h = harness();
    const notice = h.i18n.node(h.run("ui('Ticket closed · {member}', { member: 'Save changes <Sam>' })"));
    const action = h.i18n.node(h.run("ui('{action} · {member}', { action: moderationAction('warn'), member: 'Sam' })"));
    const date = h.i18n.node(h.run("dateLabel('2026-10-15T12:00:00Z')"));
    const duration = h.i18n.node(h.run('duration(5400)'));
    const metric = h.i18n.node(h.run('streamMetric(1234.5)'));
    const immutable = [notice, action, date, duration, metric];
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale);
      expect(notice.textContent).toContain('Save changes <Sam>');
      expect(notice.textContent).not.toContain('Ticket closed');
      expect(action.textContent).not.toContain('Warning');
      expect(date.textContent).toBe(new Date('2026-10-15T12:00:00Z').toLocaleString(locale === 'pt' ? 'pt-BR' : locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
      expect(duration.textContent).not.toContain('hr');
      expect(metric.textContent).toBe((1234.5).toLocaleString(locale === 'pt' ? 'pt-BR' : locale, { maximumFractionDigits: 1 }));
      expect([notice, action, date, duration, metric]).toEqual(immutable);
    }
  });
  it('translates every stored recovery stage and kind and keeps machine values unchanged', () => {
    const h = harness();
    for (const locale of ['fr', 'es', 'de', 'pt']) {
      h.i18n.setLocale(locale);
      for (const stage of ['prepared', 'sending', 'transcript-saved', 'archiving', 'deleting', 'role-changing', 'needs-review']) expect(String(h.run(`recoveryStage('${stage}')`))).not.toBe(stage);
      for (const kind of ['ticket-create', 'ticket-close', 'application-submit', 'application-accept']) expect(String(h.run(`recoveryKind('${kind}')`))).not.toBe(kind);
    }
    expect(h.source).toContain('error.i18n = data.i18n');
    expect(h.source).not.toMatch(/toast\(error\.message|setContent\(message, error\.message|renderLanding\(error\.message/);
    expect(h.source).not.toContain('Some dashboard pages still use English');
  });
  it('uses singular and plural account counts in creator cards as languages change', () => {
    const h = harness();
    const one = h.i18n.node(h.run('creatorAccountCount(1)'));
    const two = h.i18n.node(h.run('creatorAccountCount(2)'));
    const expected = { en: ['1 account', '2 accounts'], fr: ['1 compte', '2 comptes'], es: ['1 cuenta', '2 cuentas'], de: ['1 Konto', '2 Konten'], pt: ['1 conta', '2 contas'] };
    for (const [locale, labels] of Object.entries(expected)) {
      h.i18n.setLocale(locale);
      expect([one.textContent, two.textContent]).toEqual(labels);
    }
    expect(h.source).toContain('creatorAccountCount(accounts.length)');
  });
  it('keeps default templates reactive but leaves configured welcome text untouched', () => {
    const h = harness();
    const serverName = 'Welcome {user}';
    h.context.serverName = serverName;
    const defaultPreview = h.i18n.node(h.run("ui('Welcome {user} to {server}!', { user: '@Sam', server: serverName })"));
    const customText = 'Welcome {user} to {server}!';
    h.i18n.setLocale('fr');
    expect(defaultPreview.textContent).toBe('Bienvenue @Sam sur Welcome {user} !');
    expect(customText).toBe('Welcome {user} to {server}!');
    expect(h.source).toContain('template ? replacePreview(template) : ui(joining');
  });
});
