'use strict';

// Shared, same-origin Lucide symbols for the dashboard and public pages.
// Keep legacy names so feature modules can use the existing icon() API.
window.CyroIcons = (() => {
  const namespace = 'http://www.w3.org/2000/svg';
  const aliases = Object.freeze({
    grid: 'layout-dashboard',
    radio: 'radio-tower',
    wave: 'hand-heart',
    shield: 'shield-check',
    ticket: 'tickets',
    file: 'file-text',
    chevron: 'chevron-right',
    arrow: 'arrow-right',
    trash: 'trash-2',
    edit: 'pencil',
    lock: 'lock-keyhole',
    logout: 'log-out',
    spark: 'sparkles',
    help: 'circle-help',
    chart: 'chart-no-axes-combined',
    voice: 'door-open',
    confession: 'messages-square',
    message: 'message-square-text'
  });
  const symbols = new Set([
    'arrow-right', 'award', 'bug', 'chart-no-axes-combined', 'check',
    'chevron-down', 'chevron-right', 'circle-check', 'circle-help', 'clock',
    'door-open', 'file-text', 'gift', 'hand-heart', 'hash', 'headphones',
    'key-round', 'layout-dashboard', 'lightbulb', 'link', 'lock-keyhole',
    'log-out', 'menu', 'message-square-text', 'messages-square', 'music',
    'paintbrush', 'pencil', 'pin', 'plus', 'radio-tower', 'search',
    'shield-check', 'sparkles', 'tickets', 'trash-2', 'users', 'vote', 'x'
  ]);
  // Discord is a brand mark, not a Lucide interface symbol.
  const discordPath = 'M8 5 4 6c-2 4-3 8-2 12l5 2 1-2M16 5l4 1c2 4 3 8 2 12l-5 2-1-2M7 17c3 2 7 2 10 0M8 11v2M16 11v2M8 7c3-1 5-1 8 0';

  function create(name, extra = '') {
    const svg = document.createElementNS(namespace, 'svg');
    for (const [attribute, value] of Object.entries({
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'aria-hidden': 'true', focusable: 'false', class: `icon ${extra}`.trim()
    })) svg.setAttribute(attribute, value);

    if (name === 'discord') {
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('d', discordPath);
      svg.append(path);
    } else {
      const resolved = Object.hasOwn(aliases, name) ? aliases[name] : name;
      const symbol = symbols.has(resolved) ? resolved : 'circle-help';
      const use = document.createElementNS(namespace, 'use');
      use.setAttribute('href', `/icons.svg#${symbol}`);
      svg.append(use);
    }
    return svg;
  }

  return Object.freeze({ create });
})();
