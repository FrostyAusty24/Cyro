'use strict';

// Only explicitly tagged interface copy is translated. Server names, member names,
// editable values and user-authored posts never pass through a DOM text scanner.
window.CyroI18n = (() => {
  const languages = Object.freeze([{ id: 'en', name: 'English' }, { id: 'fr', name: 'Français' }, { id: 'es', name: 'Español' }]);
  const catalogs = { fr: { ...window.CyroTranslations?.fr, ...window.CyroExtraTranslations?.fr }, es: { ...window.CyroTranslations?.es, ...window.CyroExtraTranslations?.es } };
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
  return { languages, get locale() { return locale; }, text, translate, isText, node, setContent, setText, setAttribute, setLocale,
    subscribe(callback) { subscriptions.add(callback); return () => subscriptions.delete(callback); } };
})();

// A short alias makes explicit interface labels easy to identify during review.
const ui = (source, params) => window.CyroI18n.text(source, params);

// Static page chrome is explicitly identified; editable content is never scanned.
for (const [selector, source] of [['title', 'Cyro · Community dashboard'], ['.skip-link', 'Skip to content'], ['.boot p', 'Opening your community dashboard…']]) {
  const target = document.querySelector?.(selector);
  if (target) window.CyroI18n.setText(target, source);
}
