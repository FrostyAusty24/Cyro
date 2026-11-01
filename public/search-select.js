'use strict';

// Native selects remain the source of values, change events and form validation.
// Only one searchable popup can be open, so document listeners never accumulate.
window.CyroSearchSelect = (() => {
  const controls = new WeakMap();
  const localeControls = new Set();
  let active = null;
  let sequence = 0;
  const translate = (source, params) => window.CyroI18n?.translate(source, params) ?? source;
  window.CyroI18n?.subscribe(() => {
    active?.close(false);
    for (const reference of localeControls) {
      const select = reference.deref();
      if (!select?.isConnected) localeControls.delete(reference);
      else controls.get(select)?.sync();
    }
  });
  const normalize = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  function matches(option, query) {
    const haystack = normalize(`${option.label} ${option.value}`);
    return normalize(query).trim().split(/\s+/).every(part => haystack.includes(part));
  }
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function enhance(select, label) {
    if (controls.has(select)) return controls.get(select).wrapper;
    // Older browsers keep their working native control instead of a clipped popup.
    if (typeof document.createElement('div').showPopover !== 'function') return select;
    const kind = select.dataset.searchKind || 'options';
    const id = select.id || `search-select-${++sequence}`;
    select.id = id;
    const wrapper = node('div', 'search-select');
    const trigger = node('button', 'search-select-trigger');
    const value = node('span', 'search-select-value');
    trigger.type = 'button'; trigger.id = `${id}-trigger`;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `${id}-options`);
    trigger.append(value, window.CyroIcons.create('chevron-down'));
    select.classList.add('search-select-native');
    select.tabIndex = -1; select.hidden = true; select.setAttribute('aria-hidden', 'true');
    wrapper.append(select, trigger);
    let popup = null, search = null, list = null, summary = null, rows = [], highlighted = -1;
    let cleanup = null;
    const disabled = () => select.disabled || Boolean(select.closest('fieldset:disabled'));
    const options = () => [...select.options];
    const optionDisabled = option => option.disabled || option.parentElement?.tagName === 'OPTGROUP' && option.parentElement.disabled;
    const labelText = () => select.getAttribute('aria-label') || String(label);
    function sync() {
      const selected = options().filter(option => option.selected);
      const names = selected.map(option => option.label);
      value.textContent = names.length ? names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : '') : translate(`Select ${kind}`);
      trigger.title = names.join(', ');
      trigger.disabled = disabled();
      trigger.setAttribute('aria-label', `${labelText()}: ${names.length ? names.join(', ') : translate('None selected')}`);
      trigger.setAttribute('aria-required', String(select.required));
      const hint = select.getAttribute('aria-describedby');
      if (hint) trigger.setAttribute('aria-describedby', hint);
      else trigger.removeAttribute('aria-describedby');
      if (select.validity.valid) trigger.removeAttribute('aria-invalid');
      if (trigger.disabled) close(false);
      if (popup) draw();
    }
    function close(restoreFocus = false) {
      if (!popup) return;
      cleanup?.(); cleanup = null;
      if (typeof popup.hidePopover === 'function' && popup.matches(':popover-open')) popup.hidePopover();
      popup.remove(); popup = null; search = null; list = null; rows = []; highlighted = -1;
      trigger.setAttribute('aria-expanded', 'false');
      if (active?.select === select) active = null;
      if (restoreFocus && trigger.isConnected && !trigger.disabled) trigger.focus();
    }
    function highlight(index, scroll = true) {
      highlighted = index;
      rows.forEach((row, position) => row.element.classList.toggle('is-active', position === index));
      if (rows[index]) {
        search.setAttribute('aria-activedescendant', rows[index].element.id);
        if (scroll) rows[index].element.scrollIntoView({ block: 'nearest' });
      } else search.removeAttribute('aria-activedescendant');
    }
    function move(direction) {
      const enabled = rows.map((row, index) => optionDisabled(row.option) ? -1 : index).filter(index => index >= 0);
      if (!enabled.length) return highlight(-1);
      const position = enabled.indexOf(highlighted);
      highlight(enabled[(position + direction + enabled.length) % enabled.length]);
    }
    function choose(option) {
      if (disabled() || optionDisabled(option)) return;
      if (select.multiple) option.selected = !option.selected;
      else select.value = option.value;
      if (!select.multiple) close(true);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      if (popup) search.focus();
    }
    function draw() {
      const previouslyActive = rows[highlighted]?.option;
      const filtered = options().filter(option => matches(option, search.value));
      rows = filtered.map((option, index) => {
        const row = node('div', 'search-select-option');
        row.id = `${id}-option-${index}`;
        row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(option.selected));
        if (optionDisabled(option)) row.setAttribute('aria-disabled', 'true');
        row.append(node('span', 'search-select-option-label', option.label), window.CyroIcons.create('check'));
        row.addEventListener('pointerdown', event => event.preventDefault());
        row.addEventListener('click', () => choose(option));
        row.addEventListener('pointermove', () => { if (!optionDisabled(option)) highlight(index, false); });
        return { element: row, option };
      });
      list.replaceChildren(...rows.map(row => row.element));
      if (!rows.length) list.append(node('p', 'search-select-empty', window.CyroI18n ? translate('No results. Try another name or ID.') : `No ${kind} match. Try another name or ID.`));
      const count = options().filter(option => option.selected && option.value).length;
      summary.textContent = window.CyroI18n ? translate(select.multiple ? '{count} selected · Select again to remove' : '{count} options', { count: select.multiple ? count : filtered.length }) : select.multiple ? `${count} selected · Select again to remove` : `${filtered.length} ${filtered.length === 1 ? 'option' : 'options'}`;
      const keepIndex = rows.findIndex(row => row.option === previouslyActive && !optionDisabled(row.option));
      const selectedIndex = rows.findIndex(row => row.option.selected && !optionDisabled(row.option));
      highlight(keepIndex >= 0 ? keepIndex : selectedIndex >= 0 ? selectedIndex : rows.findIndex(row => !optionDisabled(row.option)), false);
    }
    function position() {
      if (!popup) return;
      if (!trigger.isConnected || !trigger.getClientRects().length) return close(false);
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight;
      const rect = trigger.getBoundingClientRect();
      const popupWidth = Math.min(Math.max(rect.width, 280), width - 24);
      popup.style.width = `${popupWidth}px`;
      popup.style.left = `${Math.max(left + 12, Math.min(rect.left, left + width - popupWidth - 12))}px`;
      const below = top + height - rect.bottom - 12, above = rect.top - top - 12;
      const up = below < 220 && above > below;
      popup.style.maxHeight = `${Math.max(120, Math.min(380, up ? above : below))}px`;
      popup.style.top = `${up ? Math.max(top + 12, rect.top - popup.getBoundingClientRect().height - 6) : rect.bottom + 6}px`;
    }
    function open(query = '') {
      if (disabled() || !trigger.isConnected) return;
      if (popup) return close(true);
      active?.close(false);
      popup = node('div', 'search-select-popup');
      popup.setAttribute('popover', 'manual');
      search = node('input', 'search-select-search');
      search.type = 'text'; search.value = query; search.autocomplete = 'off'; search.spellcheck = false;
      search.placeholder = translate(`Search ${kind}…`);
      search.setAttribute('role', 'combobox'); search.setAttribute('aria-label', window.CyroI18n ? translate('Search {label}', { label: labelText() }) : `Search ${labelText().toLocaleLowerCase()}`);
      search.setAttribute('aria-autocomplete', 'list'); search.setAttribute('aria-expanded', 'true'); search.setAttribute('aria-controls', `${id}-options`);
      list = node('div', 'search-select-options'); list.id = `${id}-options`;
      list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', labelText());
      if (select.multiple) list.setAttribute('aria-multiselectable', 'true');
      summary = node('p', 'search-select-summary'); summary.setAttribute('role', 'status');
      const footer = node('div', 'search-select-footer'); footer.append(summary);
      if (select.multiple) {
        const done = node('button', 'search-select-done', translate('Done')); done.type = 'button';
        done.addEventListener('click', () => close(true)); footer.append(done);
      }
      popup.append(search, list, footer);
      // The top layer avoids clipping by the glass sidebar, cards or scrolling forms.
      // Keep the popup in its wrapper for the mobile drawer's focus containment.
      wrapper.append(popup);
      popup.showPopover();
      active = { select, close };
      trigger.setAttribute('aria-expanded', 'true');
      draw(); position(); search.focus();
      search.addEventListener('input', () => { highlighted = -1; rows = []; draw(); position(); });
      popup.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.target === search && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1); }
        else if (event.target === search && event.key === 'Enter') { event.preventDefault(); if (!event.isComposing && rows[highlighted]) choose(rows[highlighted].option); }
        else if (event.target === search && event.key === 'Tab' && event.shiftKey) { event.preventDefault(); close(true); }
      });
      const outside = event => { if (!wrapper.contains(event.target)) close(false); };
      const focusOut = () => queueMicrotask(() => { if (popup && !wrapper.contains(document.activeElement)) close(false); });
      const layout = new MutationObserver(() => { if (!trigger.isConnected || disabled()) close(false); });
      layout.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'inert'] });
      document.addEventListener('pointerdown', outside, true);
      wrapper.addEventListener('focusout', focusOut);
      window.addEventListener('resize', position);
      document.addEventListener('scroll', position, true);
      window.visualViewport?.addEventListener('resize', position);
      window.visualViewport?.addEventListener('scroll', position);
      cleanup = () => {
        layout.disconnect(); document.removeEventListener('pointerdown', outside, true);
        wrapper.removeEventListener('focusout', focusOut); window.removeEventListener('resize', position);
        document.removeEventListener('scroll', position, true);
        window.visualViewport?.removeEventListener('resize', position); window.visualViewport?.removeEventListener('scroll', position);
      };
    }
    trigger.addEventListener('click', () => open());
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!popup) open(); }
      else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); open(event.key); }
    });
    select.addEventListener('change', sync);
    select.addEventListener('invalid', event => { event.preventDefault(); trigger.setAttribute('aria-invalid', 'true'); trigger.focus(); if (!popup) open(); });
    const changes = new MutationObserver(sync);
    changes.observe(select, { attributes: true, childList: true, subtree: true });
    controls.set(select, { wrapper, sync, close });
    if (window.CyroI18n) localeControls.add(new WeakRef(select));
    sync();
    return wrapper;
  }
  return { enhance, sync: select => controls.get(select)?.sync(), close: () => active?.close(false) };
})();
