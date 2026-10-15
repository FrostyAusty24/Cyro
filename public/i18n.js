'use strict';

// Only explicitly tagged interface copy is translated. Server names, member names,
// editable values and user-authored posts never pass through a DOM text scanner.
window.CyroI18n = (() => {
  const languages = Object.freeze([{ id: 'en', name: 'English' }, { id: 'fr', name: 'Français' }, { id: 'es', name: 'Español' }, { id: 'de', name: 'Deutsch' }, { id: 'pt', name: 'Português (Brasil)' }]);
  const catalogs = Object.fromEntries(languages.filter(language => language.id !== 'en').map(({ id }) =>
    [id, { ...window.CyroTranslations?.[id], ...window.CyroExtraTranslations?.[id], ...window.CyroAdditionalTranslations?.[id],
      ...Object.assign({}, ...(window.CyroDashboardCatalogs || []).map(batch => Array.isArray(batch)
        ? Object.fromEntries(batch.map(row => [row[0], row[['en', 'fr', 'es', 'de', 'pt'].indexOf(id)]])) : batch[id])) }]));
  const knownSources = new Set(Object.values(catalogs).flatMap(catalog => Object.keys(catalog)));
  const sourceByTranslation = new Map();
  for (const catalog of Object.values(catalogs)) for (const [source, value] of Object.entries(catalog)) {
    // Fixed server-generated notices may already use the server's language.
    // Never infer a template from arbitrary provider errors or user content.
    if (!/\{[a-zA-Z0-9_]+\}/.test(value)) sourceByTranslation.set(value, source);
  }
  const storageKey = 'cyro.dashboard.locale';
  const marker = Symbol('Cyro interface copy');
  const bindings = new Set();
  const subscriptions = new Set();
  let locale = 'en';
  const normalize = value => languages.some(language => language.id === value) ? value : 'en';
  try { locale = normalize(localStorage.getItem(storageKey)); } catch { /* Private browsing may block storage. */ }
  function translate(source, params = {}) {
    const catalog = catalogs[locale];
    const pattern = locale !== 'en' && catalog && Object.hasOwn(catalog, source) ? catalog[source] : source;
    return String(pattern).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
  }
  function text(source, params = {}) {
    if (source && source[marker]) return source;
    return { [marker]: true, source, params, toString() { return translate(source, params); } };
  }
  function computedText(formatter) {
    return { [marker]: true, toString() { return String(formatter(locale)); } };
  }
  function errorText(error) {
    if (isText(error)) return error;
    const metadata = error?.i18n;
    if (metadata && typeof metadata.key === 'string' && knownSources.has(metadata.key)) return text(metadata.key, metadata.params || {});
    const message = typeof error === 'string' ? error : error?.message;
    if (typeof message === 'string' && knownSources.has(message)) return text(message);
    if (sourceByTranslation.has(message)) return text(sourceByTranslation.get(message));
    return text('The request could not be completed. Check the bot log and try again.');
  }
  const isText = value => Boolean(value && value[marker]);
  function bind(node, key, copy, apply) {
    for (const binding of bindings) if (!binding.ref.deref() || binding.ref.deref() === node && binding.key === key) bindings.delete(binding);
    if (isText(copy)) bindings.add({ ref: new WeakRef(node), key, copy, apply, connected: Boolean(node.isConnected) });
    apply(String(copy ?? ''), node);
    return node;
  }
  function node(copy) {
    const result = document.createTextNode('');
    return bind(result, 'text', copy, (value, target) => { target.textContent = value; });
  }
  function setContent(target, copy) {
    // Bind the text node, not its container: later replaceChildren calls must not
    // be undone by a locale switch (for example, restoring a button's old label).
    target.replaceChildren(node(copy));
    return target;
  }
  function setText(target, source, params = {}) { return setContent(target, text(source, params)); }
  function setAttribute(target, attribute, source, params = {}) {
    const copy = isText(source) ? source : text(source, params);
    return bind(target, attribute, copy, (value, targetNode) => targetNode.setAttribute(attribute, value));
  }
  function setLocale(value) {
    locale = normalize(value);
    try { localStorage.setItem(storageKey, locale); } catch { /* The current session still switches. */ }
    document.documentElement.lang = locale;
    for (const binding of bindings) {
      // Discard removed views without retaining their nodes indefinitely. Unmounted
      // nodes may be built before insertion; they remain eligible on their first pass.
      const target = binding.ref.deref();
      if (!target || binding.connected && !target.isConnected) { bindings.delete(binding); continue; }
      binding.connected ||= Boolean(target.isConnected);
      binding.apply(String(binding.copy), target);
    }
    for (const subscriber of subscriptions) subscriber(locale);
    return locale;
  }
  document.documentElement.lang = locale;
  return { languages, get locale() { return locale; }, text, computedText, errorText, translate, isText, node, setContent, setText, setAttribute, setLocale,
    subscribe(callback) { subscriptions.add(callback); return () => subscriptions.delete(callback); } };
})();

// A short alias makes explicit interface labels easy to identify during review.
const ui = (source, params) => window.CyroI18n.text(source, params);
const uiError = error => window.CyroI18n.errorText(error);
const uiServerCopy = value => window.CyroI18n.errorText(value);

// Static page chrome is explicitly identified; editable content is never scanned.
for (const [selector, source] of [['title:not([data-i18n])', 'Cyro · Community dashboard'], ['.skip-link', 'Skip to content'], ['.boot p', 'Opening your community dashboard…']]) {
  const target = document.querySelector?.(selector);
  if (target) window.CyroI18n.setText(target, source);
}
for (const target of document.querySelectorAll?.('[data-i18n]') || []) window.CyroI18n.setText(target, target.textContent);
for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
  for (const target of document.querySelectorAll?.(`[data-i18n-${attribute}]`) || []) window.CyroI18n.setAttribute(target, attribute, target.getAttribute(attribute));
}
