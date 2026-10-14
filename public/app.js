'use strict';

// The demo is intentionally opt-in and never sends requests or saves server data.
const DEMO = new URLSearchParams(location.search).get('demo') === '1';
const app = document.getElementById('app');
const navigation = [
  ['overview', 'Overview', 'grid'], ['streams', 'Creators & alerts', 'radio'],
  ['streamer-leaderboard', 'Streamer leaderboard', 'chart'],
  ['counting', 'Counting', 'hash'], ['suggestions', 'Suggestions', 'spark'], ['confessions', 'Anonymous confessions', 'confession'], ['voice', 'Music & TTS', 'music'], ['welcome', 'Welcome & roles', 'wave'], ['status-roles', 'Status roles', 'award'], ['verification', 'Verification', 'lock'],
  ['invites', 'Invites & levels', 'gift'], ['moderation', 'Moderation', 'shield'], ['identity', 'Bot appearance', 'edit'],
  ['tickets', 'Support tickets', 'ticket'], ['applications', 'Applications', 'file'],
  ['staff', 'Staff leaderboard', 'award'], ['messages', 'Channel messages', 'file'], ['polls', 'Polls', 'chart'], ['access', 'Access & commands', 'lock']
];
const iconPaths = {
  grid: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  radio: ['M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8', 'M12 11v2'],
  hash: ['M5 9h14M4 15h14M11 3 7 21M17 3l-4 18'],
  wave: ['M8 13V6a2 2 0 0 1 4 0v6M12 11V4a2 2 0 0 1 4 0v8M16 11V7a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2M4 3l-2 2M1 8h2'],
  gift: ['M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9H8a3 3 0 1 1 3-3l1 3ZM12 9h4a3 3 0 1 0-3-3l-1 3Z'],
  shield: ['M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Z', 'm8 12 3 3 5-6'],
  ticket: ['M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5ZM15 5v3M15 11v2M15 16v3'],
  file: ['M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h5'],
  award: ['M8 15 6 22l6-3 6 3-2-7', 'M19 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z'],
  users: ['M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M16 4a4 4 0 0 1 0 8M22 21v-3a4 4 0 0 0-3-4', 'M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  plus: ['M12 5v14M5 12h14'], chevron: ['m9 5 7 7-7 7'], arrow: ['M4 12h16m-6-6 6 6-6 6'],
  check: ['m5 12 4 4L19 6'], menu: ['M3 6h18M3 12h18M3 18h18'],
  clock: ['M12 7v5l3 2', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  link: ['m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 9l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0'],
  trash: ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'],
  edit: ['m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15v6Z'],
  lock: ['M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3'],
  logout: ['M9 4H3v16h6M9 12h12m-4-4 4 4-4 4'],
  spark: ['m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z'],
  help: ['M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  chart: ['M4 21V10M10 21V3M16 21v-7M22 21V7'],
  music: ['M9 18V5l12-2v13M9 9l12-2', 'M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM21 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z'],
  confession: ['M21 11a8 8 0 0 1-8 8H7l-4 3V5a3 3 0 0 1 3-3h7a8 8 0 0 1 8 9Z', 'M8 8h8M8 12h5'],
  discord: ['M8 5 4 6c-2 4-3 8-2 12l5 2 1-2M16 5l4 1c2 4 3 8 2 12l-5 2-1-2M7 17c3 2 7 2 10 0M8 11v2M16 11v2M8 7c3-1 5-1 8 0']
};
const state = { me: null, guilds: [], guildId: null, detail: null, page: 'overview', dirty: false, staffPeriod: '7d', streamerPeriod: '7d', streamerSort: 'trackedMilliseconds', streamerView: 'creators', status: null, streamEditor: null, creatorEditor: null, loading: false, saving: false, loadSequence: 0 };
let toastTimer;
let closeNavigation = null;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'className') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'checked' || key === 'selected' || key === 'disabled' || key === 'hidden') node[key] = Boolean(value);
    else if (key === 'value') node.value = value;
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
function icon(name, extra = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.65', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: `icon ${extra}` })) svg.setAttribute(k, v);
  for (const d of iconPaths[name] || iconPaths.grid) { const p = document.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', d); svg.append(p); }
  return svg;
}
const clone = value => JSON.parse(JSON.stringify(value));
const format = value => Number(value || 0).toLocaleString();
const safeId = value => encodeURIComponent(String(value));
const guildPath = () => `/api/guilds/${safeId(state.guildId)}`;
function byPath(obj, path) { return path.split('.').reduce((value, key) => value?.[key], obj); }
function putPath(obj, path, value) { const keys = path.split('.'); const key = keys.pop(); let target = obj; for (const part of keys) target = target[part] ||= {}; target[key] = value; }
function channelName(id) { return state.detail?.channels?.find(channel => channel.id === id)?.name || id || 'No channel selected'; }
function userLabel(id) { return state.detail?.members?.find(member => member.id === id)?.displayName || `User ${id}`; }
function platformName(platform) { return ({ twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', youtube: 'YouTube' })[platform] || capitalize(platform); }
function tag(text, color = '') { return el('span', { className: `tag ${color}` }, text); }
function link(text, page) { return el('a', { className: 'text-link', href: `#${page}` }, text, icon('arrow')); }
function button(text, action, kind = '', iconName = null) { return el('button', { type: 'button', className: `button ${kind}`, onClick: action }, iconName && icon(iconName), text); }
function enabledTag(enabled) { return tag(enabled ? 'Enabled' : 'Not set up', enabled ? 'green' : 'muted'); }
function toast(message, isError = false) { clearTimeout(toastTimer); const box = document.getElementById('toast'); box.className = `toast${isError ? ' error' : ''}`; box.textContent = message; box.hidden = false; toastTimer = setTimeout(() => { box.hidden = true; }, 5000); }
async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, credentials: 'same-origin', signal: AbortSignal.timeout(25000), headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-CSRF-Token': state.me?.csrfToken || '' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  let data; try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) { const error = new Error(typeof data.error === 'string' ? data.error : data.error?.message || data.message || `Request failed (${response.status}). Please try again.`); error.status = response.status; throw error; }
  return data;
}
function brand() { return el('a', { className: 'brand', href: '#overview', 'aria-label': 'Cyro overview' }, el('span', { className: 'brand-mark' }, el('img', { src: '/cyro-logo.png', alt: '', width: 48, height: 48 })), el('span', { className: 'brand-name' }, 'Cyro', el('small', {}, 'by Headache Development'))); }
function demoBanner() { return DEMO ? el('div', { className: 'demo-banner' }, el('strong', {}, 'Demo workspace'), 'Sample data. Changes stay in this browser session.', el('a', { href: '/' }, 'Exit demo')) : null; }
function empty(title, description, iconName = 'grid', cta = null) { return el('div', { className: 'empty-state' }, icon(iconName), el('h3', {}, title), el('p', {}, description), cta); }
function panel(title, body, action = null, description = null) { return el('section', { className: 'panel' }, el('div', { className: 'panel-header' }, el('div', {}, el('h2', {}, title), description && el('p', { className: 'panel-description' }, description)), action), body); }
function metric(label, value, detail, iconName, accent = '') { return el('div', { className: 'metric' }, icon(iconName), el('div', { className: 'metric-label' }, label), el('div', { className: `metric-value ${accent}` }, value), el('div', { className: 'metric-detail' }, detail)); }
function heading(title, description, action = null) { return el('header', { className: 'page-heading' }, el('div', {}, el('h1', {}, title), el('p', { className: 'subtitle' }, description)), action); }
function contextCard(title, text, iconName = 'help', extra = null) { return el('section', { className: 'context-card' }, el('span', { className: 'module-icon' }, icon(iconName)), el('h3', {}, title), el('p', {}, text), extra); }

function renderLanding(error = null) {
  window.CyroSearchSelect.close();
  closeNavigation?.(false);
  closeNavigation = null;
  const setup = state.status && !state.status.configured;
  const login = setup ? el('span', { className: 'button secondary' }, 'Dashboard setup needed') : el('a', { className: 'button', href: '/auth/login' }, icon('discord'), 'Continue with Discord');
  window.CyroHome.render({ app, el, icon, brand, login, setup, error });
}
function feature(iconName, color, title, copy) { return el('div', { className: 'module-row' }, el('div', { className: `module-icon ${color}` }, icon(iconName)), el('div', { className: 'module-text' }, el('div', { className: 'module-name' }, title), el('div', { className: 'module-copy' }, copy))); }

function renderShell() {
  window.CyroSearchSelect.close();
  closeNavigation?.(false);
  state.page = navigation.some(item => item[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  const active = navigation.find(item => item[0] === state.page);
  const select = el('select', { id: 'guild-select', 'data-search-kind': 'servers', onChange: event => selectGuild(event.target.value) }, state.guilds.map(g => el('option', { value: g.id, selected: g.id === state.guildId }, g.name + (g.installed ? '' : ' · Add bot'))));
  const guildPicker = window.CyroSearchSelect.enhance(select, 'Your server');
  const nav = el('nav', { className: 'nav', 'aria-label': 'Community settings' }, navigation.map(([key, label, iconName]) => [({ overview: 'Workspace', streams: 'Creators', counting: 'Community', moderation: 'Server management' })[key] && el('p', { className: 'nav-label' }, ({ overview: 'Workspace', streams: 'Creators', counting: 'Community', moderation: 'Server management' })[key]), el('a', { href: `#${key}`, ...(key === state.page ? { 'aria-current': 'page' } : {}) }, icon(iconName), label)]));
  const shell = el('div', { className: 'shell' });
  const toggleMenu = () => setMenuOpen(!shell.classList.contains('menu-open'));
  const menuButton = el('button', { type: 'button', className: 'menu-toggle', 'aria-label': 'Toggle navigation', 'aria-controls': 'server-navigation', 'aria-expanded': 'false', onClick: toggleMenu }, icon('menu'));
  const sidebar = el('aside', { id: 'server-navigation', className: 'sidebar', 'aria-label': 'Server navigation' }, brand(), el('div', { className: 'guild-control' }, el('label', { for: guildPicker === select ? 'guild-select' : 'guild-select-trigger' }, 'Your server'), guildPicker), nav, el('div', { className: 'sidebar-foot' }, el('a', { className: 'install-link', href: '/invite' }, icon('plus'), 'Add to another server'), el('a', { className: 'community-link', href: 'https://discord.gg/dAZheerkkD', target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Headache Development community and support (opens in a new tab)' }, icon('discord'), el('span', {}, 'Headache Development', el('small', {}, 'Community & support')), icon('arrow')), el('nav', { className: 'dashboard-public-links', 'aria-label': 'Creator and legal links' }, el('a', { href: '/?home=1' }, 'About Cyro'), el('a', { href: '/connections' }, 'My connections'), el('a', { href: '/privacy' }, 'Privacy'), el('a', { href: '/terms' }, 'Terms'))));
  const title = state.me?.user?.username || 'Your account';
  const topbar = el('header', { className: 'topbar' }, el('div', { className: 'breadcrumb' }, menuButton, icon('grid'), el('span', { className: 'breadcrumb-context' }, state.guilds.find(g => g.id === state.guildId)?.name || 'Your servers'), icon('chevron'), el('strong', {}, active[1])), el('div', { className: 'topbar-right' }, el('span', { className: 'status-pill' }, DEMO ? 'Demo session' : 'Connected to Discord'), el('div', { className: 'user-menu' }, el('span', { className: 'avatar', title }, title.slice(0, 2).toUpperCase()), el('button', { type: 'button', className: 'signout', onClick: logout }, 'Sign out'))));
  const main = el('main', { id: 'main', className: 'content', tabindex: '-1' });
  const workspace = el('div', { className: 'workspace' }, demoBanner(), topbar, main);
  function setMenuOpen(open, restoreFocus = true) {
    const wasOpen = shell.classList.contains('menu-open');
    shell.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    workspace.inert = open;
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      (sidebar.querySelector('[aria-current="page"]') || (guildPicker === select ? select : guildPicker.querySelector('button'))).focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      if (wasOpen && restoreFocus && menuButton.isConnected) menuButton.focus();
    }
  }
  closeNavigation = restoreFocus => setMenuOpen(false, restoreFocus);
  shell.addEventListener('keydown', event => {
    if (!shell.classList.contains('menu-open')) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); return; }
    if (event.key !== 'Tab') return;
    const controls = [...sidebar.querySelectorAll('a[href], input:not(:disabled), select:not(:disabled):not([aria-hidden="true"]), button:not(:disabled)')].filter(node => node.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  shell.append(sidebar, el('button', { type: 'button', className: 'mobile-overlay', tabindex: '-1', 'aria-label': 'Close navigation', onClick: toggleMenu }), workspace);
  app.replaceChildren(shell);
  if (state.loading) { main.append(el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), 'Loading server settings…')); return; }
  if (!state.guilds.length) { main.append(el('div', { className: 'account-empty' }, heading('Make yourself at home.', 'No servers granting you dashboard access were found. You can still connect your own creator accounts.'), el('div', { className: 'login-actions' }, el('a', { className: 'button', href: '/connections' }, 'Open creator connections', icon('arrow')), el('a', { className: 'button secondary', href: '/invite' }, 'Add to Discord')))); return; }
  const guild = state.guilds.find(g => g.id === state.guildId);
  if (guild && !guild.installed) {
    const actions = el('div', { className: 'login-actions centered-actions' }, el('a', { className: 'button', href: guild.inviteUrl || `/invite?guild_id=${safeId(guild.id)}` }, 'Add to this server'), button('Refresh connection', refreshGuilds, 'secondary'));
    main.append(heading(guild.name, 'Connect the bot to start setting up your community.'), panel('One more step', empty('Your dashboard is ready.', 'Add Cyro to this server, then refresh to load its settings.', 'discord', actions)));
    return;
  }
  if (!state.detail) { main.append(el('div', { className: 'alert' }, state.loadError || 'Could not load this server.', button('Try again', () => selectGuild(state.guildId, true), 'secondary small'))); return; }
  const pages = { overview: renderOverview, streams: renderStreams, 'streamer-leaderboard': renderStreamerLeaderboard, counting: renderCounting, suggestions: renderSuggestions, confessions: renderConfessions, voice: renderVoice, welcome: renderWelcome, 'status-roles': renderStatusRoles, verification: renderVerification, invites: renderInvites, moderation: renderModeration, identity: renderIdentity, tickets: main => renderSupportSetup(main, 'tickets'), applications: main => renderSupportSetup(main, 'applications'), staff: renderStaff, messages: main => renderPublishing(main, 'message'), polls: main => renderPublishing(main, 'poll'), access: renderAccess };
  pages[state.page](main);
}

function renderOverview(main) {
  const { guild, community, moderation, streams = [] } = state.detail;
  const cc = community.config, mc = moderation.config, cs = community.snapshot, ms = moderation.snapshot;
  const openTickets = (ms.tickets || []).filter(t => t.status === 'open').length;
  const activeStreams = streams.filter(stream => stream.enabled);
  main.append(heading(guild.name, 'Server overview. Keep up with your community and manage its tools.', el('a', { className: 'button secondary', href: '#welcome' }, icon('plus'), 'Welcome settings')));
  if (ms.recoveryIssues?.length) main.append(el('div', { className: 'alert info' }, `${ms.recoveryIssues.length} interrupted operation(s) need staff review. `, el('a', { href: '#tickets' }, 'Review tickets'), ' or ', el('a', { href: '#applications' }, 'applications'), ' before repeating an action.'));
  main.append(el('div', { className: 'metrics' }, metric('Community members', guild.memberCount == null ? '—' : format(guild.memberCount), 'Members in this server', 'users'), metric('Stream alerts', format(activeStreams.length), `${streams.filter(s => s.state === 'live' && s.enabled).length} accounts live right now`, 'radio'), metric('Community count', format(cs.counting?.current), `Personal best: ${format(cs.counting?.best)}`, 'hash'), metric('Open tickets', format(openTickets), openTickets ? 'Waiting for your team' : 'No open conversations', 'ticket')));
  const left = el('div', { className: 'stack' });
  const right = el('div', { className: 'stack' });
  left.append(panel('Community counting', el('div', { className: 'counter-showcase' }, el('div', { className: 'counter-label' }, tag(cc.counting.channelId ? `# ${channelName(cc.counting.channelId)}` : 'Counting channel'), enabledTag(cc.counting.enabled)), el('div', { className: 'count-big' }, format(cs.counting?.current)), el('p', { className: 'count-caption' }, cc.counting.enabled ? `Someone's next move is ${format((cs.counting?.current || 0) + 1)}. Keep it going together.` : 'Set a channel and let your members build something together.'), el('progress', { className: 'counter-progress', value: cs.counting?.current || 0, max: Math.max(1, cs.counting?.best || 1), 'aria-label': 'Current count compared with server record' }), el('div', { className: 'counter-foot' }, el('span', {}, 'CURRENT STREAK'), el('span', {}, `BEST · ${format(cs.counting?.best)}`))), link('Configure', 'counting')));
  left.append(panel('Creator watchlist', streams.length ? el('div', { className: 'stream-list' }, streams.slice(0, 4).map(stream => el('div', { className: 'module-row' }, el('div', { className: 'stream-avatar' }, (stream.displayName || stream.username).slice(0, 2).toUpperCase()), el('div', { className: 'module-text' }, el('div', { className: 'module-name' }, stream.displayName || stream.username), el('div', { className: 'module-copy' }, `${capitalize(stream.platform)} · #${channelName(stream.alertChannelId)}`)), tag(!stream.enabled ? 'Live off' : stream.state === 'live' ? 'Live now' : 'Watching', !stream.enabled ? 'muted' : stream.state === 'live' ? 'green' : '')))) : empty('Put your creators in the spotlight.', 'Connect a streamer and let the community know when they go live.', 'radio', link('Add a streamer', 'streams')), link('Manage alerts', 'streams')));
  right.append(panel('Server modules', el('div', { className: 'module-list' }, [
    ['shield', 'green', 'Moderation', 'Filters, warnings & your mod log', 'moderation', mc.enabled],
    ['wave', 'purple', 'Welcome & roles', 'Greetings and automatic roles', 'welcome', cc.welcome.enabled],
    ['award', 'purple', 'Status roles', 'A reward for showing your community', 'status-roles', state.detail.statusRoles?.config.enabled],
    ['music', 'purple', 'Music & TTS', 'Audio queues and a voice for your chat', 'voice', state.detail.voice?.config.musicEnabled || state.detail.voice?.config.ttsEnabled],
    ['confession', '', 'Anonymous confessions', 'A space to share without a name', 'confessions', state.detail.confessions?.config.enabled],
    ['gift', 'orange', 'Invites', cc.invites.loggingEnabled ? 'Staff invite history and join sources' : cc.invites.enabled ? cc.invites.challengeName : 'Logs and community challenges', 'invites', cc.invites.enabled || cc.invites.loggingEnabled],
    ['ticket', '', 'Support tickets', 'Support channels your way', 'tickets', mc.tickets.enabled],
    ['file', '', 'Applications', 'Staff and role applications', 'applications', mc.applications.enabled]
  ].map(([ic, color, title, copy, page, enabled]) => el('a', { href: `#${page}`, className: 'module-row' }, el('span', { className: `module-icon ${color}` }, icon(ic)), el('div', { className: 'module-text' }, el('div', { className: 'module-name' }, title), el('div', { className: 'module-copy' }, copy)), tag(enabled ? 'On' : 'Set up', enabled ? 'green' : 'muted'))))));
  const recent = [...(ms.moderationCases || []).map(c => ({ text: `${capitalize(c.action)} · ${userLabel(c.userId)}`, at: c.createdAt })), ...(ms.tickets || []).map(t => ({ text: `Ticket ${t.status === 'closed' ? 'closed' : 'opened'} · ${userLabel(t.ownerId)}`, at: t.closedAt || t.createdAt }))].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 3);
  right.append(panel('Recent activity', recent.length ? el('div', { className: 'activity-list' }, recent.map(item => el('div', { className: 'activity-item' }, el('span', { className: 'activity-dot' }), el('div', {}, el('p', {}, item.text), el('time', { datetime: item.at }, dateLabel(item.at)))))) : empty('A fresh start.', 'Moderation actions and ticket activity will appear here as your community gets going.', 'clock')));
  main.append(el('div', { className: 'dashboard-columns' }, left, right), el('footer', { className: 'overview-bottom' }, el('span', {}, icon('lock'), 'Settings are private to your server admins.'), el('span', {}, DEMO ? 'Sample activity · Demo workspace' : 'Server data loaded when you opened this page')));
}

function capitalize(value) { const text = String(value || ''); return text ? text[0].toUpperCase() + text.slice(1) : ''; }
function dateLabel(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Date unavailable' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function getConfig(type) { return clone(state.detail[type].config); }
function toggleControl(label, checked, onChange) { return el('label', { className: 'toggle' }, el('input', { type: 'checkbox', checked, 'aria-label': label, onChange: event => onChange(event.target.checked) }), el('span', { className: 'toggle-track' })); }
function formSession(type) {
  const config = getConfig(type); let saved = JSON.stringify(config); let busy = false; let afterSave = null;
  const message = el('span', { className: 'save-status', role: 'status' }, 'Your settings are up to date.');
  const save = el('button', { className: 'button', type: 'submit', disabled: true }, icon('check'), 'Save changes');
  const form = el('form', { className: 'settings-form' });
  function change(path, value) { putPath(config, path, value); state.dirty = saved !== JSON.stringify(config); save.disabled = busy || !state.dirty; message.className = 'save-status'; message.textContent = state.dirty ? 'You have unsaved changes.' : 'Your settings are up to date.'; }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    busy = true; state.saving = true; let completed = false;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    save.textContent = 'Saving…'; message.textContent = 'Saving your settings…'; message.className = 'save-status';
    try {
      const result = DEMO ? { config: clone(config) } : await api(`${guildPath()}/${type}`, 'PATCH', config);
      state.detail[type].config = result.config; if (state.detail[type].snapshot) state.detail[type].snapshot.config = result.config;
      Object.assign(config, clone(result.config)); saved = JSON.stringify(config); state.dirty = false;
      message.textContent = DEMO ? 'Saved for this demo session.' : 'Changes saved. Your server is up to date.'; message.className = 'save-status success';
      toast(DEMO ? 'Demo settings saved in this session.' : 'Server settings saved.');
      completed = true;
    } catch (error) { message.textContent = error.message; message.className = 'save-status error'; }
    finally { busy = false; state.saving = false; controls.forEach(([control, wasDisabled]) => { control.disabled = wasDisabled; }); save.disabled = !state.dirty; save.replaceChildren(icon('check'), 'Save changes'); if (completed) afterSave?.(); }
  });
  return { config, change, form, onSaved(callback) { afterSave = callback; }, finish() { form.append(el('div', { className: 'save-bar' }, message, save)); return form; } };
}
function field(label, input, hint = null) { const id = `field-${Math.random().toString(36).slice(2, 10)}`; input.id = id; if (hint) input.setAttribute('aria-describedby', `${id}-hint`); const searchable = input.tagName === 'SELECT' && input.dataset.searchKind; const control = searchable ? window.CyroSearchSelect.enhance(input, label) : input; return el('div', { className: 'field' }, el('label', { for: control === input ? id : `${id}-trigger`, className: 'field-label' }, label), control, hint && el('span', { className: 'field-hint', id: `${id}-hint` }, hint)); }
function textField(session, label, path, hint = '', options = {}) {
  const textarea = options.multiline;
  const input = el(textarea ? 'textarea' : 'input', { type: options.type || 'text', value: byPath(session.config, path) ?? '', placeholder: options.placeholder || '', min: options.min, max: options.max, maxlength: options.maxlength, required: options.required, rows: textarea ? options.rows || 3 : null, onInput: event => { const value = options.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value; session.change(path, value); options.onInput?.(value); } });
  return field(label, input, hint);
}
function linesField(session, label, path, hint, maxLines = 20, maxLength = 200) {
  const input = el('textarea', { rows: 4, value: (byPath(session.config, path) || []).join('\n'), onInput: event => { const values = event.target.value.split('\n').map(s => s.trim()).filter(Boolean); event.target.setCustomValidity(values.length > maxLines ? `Use at most ${maxLines} entries.` : values.some(value => value.length > maxLength) ? `Each entry must be ${maxLength} characters or fewer.` : ''); session.change(path, values); } });
  return field(label, input, hint);
}
function channelField(session, label, path, hint, category = false, emptyLabel = null, textOnly = false) {
  const current = byPath(session.config, path);
  const options = (state.detail.channels || []).filter(c => category ? c.type === 4 || c.type === 'GuildCategory' : c.type === 0 || c.type === 'GuildText' || (!textOnly && (c.type === 5 || c.type === 'GuildAnnouncement')));
  const select = el('select', { 'data-search-kind': category ? 'categories' : 'channels', onChange: event => session.change(path, event.target.value || null) }, el('option', { value: '', selected: !current }, emptyLabel || (category ? 'Select a category' : 'Select a channel')), options.map(c => el('option', { value: c.id, selected: current === c.id }, `${category ? '' : '# '}${c.name}`)), current && !options.some(c => c.id === current) && el('option', { value: current, selected: true }, `Unavailable · ${current}`));
  return field(label, select, hint);
}
function roleField(session, label, path, hint, multiple = false) {
  const current = byPath(session.config, path);
  const roles = (state.detail.roles || []).filter(role => role.id !== state.guildId && !role.managed);
  const selectedIds = multiple ? current || [] : current ? [current] : [];
  const missing = selectedIds.filter(id => !roles.some(role => role.id === id));
  const select = el('select', { 'data-search-kind': 'roles', multiple, size: multiple ? Math.min(5, Math.max(3, roles.length)) : null, onChange: event => session.change(path, multiple ? [...event.target.selectedOptions].map(o => o.value).filter(Boolean) : event.target.value || null) }, !multiple && el('option', { value: '', selected: !current }, 'No role'), roles.map(role => el('option', { value: role.id, selected: selectedIds.includes(role.id) }, role.name)), missing.map(id => el('option', { value: id, selected: true }, `Unavailable role · ${id}`)));
  return field(label, select, (hint || '') + (multiple ? ' Search and select as many roles as you need.' : ''));
}
function toggleSection(session, title, text, path) { return el('div', { className: 'form-section' }, el('div', { className: 'toggle-row' }, el('div', {}, el('h3', {}, title), el('p', {}, text)), toggleControl(title, Boolean(byPath(session.config, path)), value => session.change(path, value)))); }
function settingsLayout(main, session, sections, aside) { session.form.append(...sections); main.append(el('div', { className: 'settings-grid' }, session.finish(), el('aside', {}, aside))); }

function renderCounting(main) {
  const session = formSession('community'), count = state.detail.community.snapshot.counting || {};
  main.append(heading('Counting', 'A simple game that gives the whole server something to build.', null), el('div', { className: 'metrics' }, metric('Current count', format(count.current), `Next up: ${format((count.current || 0) + 1)}`, 'hash'), metric('Server record', format(count.best), 'The highest count reached together', 'award')));
  settingsLayout(main, session, [panel('Counting channel', [toggleSection(session, 'Enable counting', 'Turn a text channel into a community counting game.', 'counting.enabled'), el('div', { className: 'form-section' }, channelField(session, 'Where should members count?', 'counting.channelId', 'The bot needs View Channel, Read Message History, Send Messages, and Add Reactions.'))])], [contextCard('How it works', 'Members take turns posting the next whole number. The bot reacts with a check when it is correct.', 'hash', el('ol', {}, el('li', {}, 'Start at 1 and count up, one number per message.'), el('li', {}, 'A different member must send each number.'), el('li', {}, 'An incorrect number resets the count. Your record stays saved.'))), contextCard('Make it a team ritual', 'Pin the rules in your counting channel. Members can use /counting to see the current count and the server record.', 'spark')]);
}

function renderWelcome(main) {
  const session = formSession('community');
  const welcome = session.config.welcome;
  welcome.joinFormat ??= 'text'; welcome.goodbyeFormat ??= welcome.goodbyeMessage ? 'text' : 'off';
  welcome.card = { ...memberCardDefaults, ...welcome.card };
  main.append(heading('Welcome & roles', 'Greet arrivals and departures with a message, a personalized image card, or both.', null));
  let previewKind = 'join';
  const preview = el('span', {}), cardPreview = el('div', { className: 'member-card-preview' }), previewNote = el('p', { className: 'field-hint' });
  const replacePreview = (value, user = '@new-member') => String(value || '').replaceAll('{user}', user).replaceAll('{server}', state.detail.guild.name).replaceAll('{count}', format(Math.max(0, (state.detail.guild.memberCount || 0) + (previewKind === 'join' ? 1 : -1))));
  const updatePreview = () => {
    const settings = session.config.welcome, joining = previewKind === 'join';
    const mode = joining ? settings.joinFormat : settings.goodbyeFormat;
    const template = joining ? settings.message : settings.goodbyeMessage;
    preview.textContent = mode === 'off' ? 'Goodbye announcements are turned off.' : mode === 'card' ? 'Your image card is sent on its own.' : mode === 'text' && !template ? 'No goodbye message is set, so no announcement is sent.' : replacePreview(template || (joining ? 'Welcome {user} to {server}!' : '{user} has left {server}.'));
    cardPreview.className = `member-card-preview theme-${settings.card.background}`;
    cardPreview.style.setProperty('--card-accent', /^#[0-9a-f]{6}$/i.test(settings.card.accentColor) ? settings.card.accentColor : '#63D7FF');
    renderCardPreview(cardPreview, settings.card, joining, replacePreview);
    previewNote.textContent = 'Sample member. The sent image uses their Discord name and avatar. ' + (mode === 'card' || mode === 'both' ? `Image cards are selected for ${joining ? 'joins' : 'leaves'}.` : `Choose an image format above to send this card on ${joining ? 'joins' : 'leaves'}.`);
  };
  const selectSetting = (label, path, choices, hint) => field(label, el('select', { onChange: event => { session.change(path, event.target.value); updatePreview(); } }, choices.map(([value, text]) => el('option', { value, selected: byPath(session.config, path) === value }, text))), hint);
  updatePreview();
  const rolesArea = el('div', {});
  const renderRoleRows = () => {
    const roles = session.config.selfRoles.roles;
    const availableRoles = (state.detail.roles || []).filter(role => role.id !== state.guildId && !role.managed);
    rolesArea.replaceChildren(...roles.map((entry, index) => el('div', { className: 'self-role-row' }, field('Role', el('select', { 'data-search-kind': 'roles', 'aria-label': `Self role ${index + 1}`, onChange: e => { entry.roleId = e.target.value; session.change('selfRoles.roles', roles); } }, el('option', { value: '', selected: !entry.roleId }, 'Select a role'), availableRoles.map(role => el('option', { value: role.id, selected: role.id === entry.roleId }, role.name)), entry.roleId && !availableRoles.some(role => role.id === entry.roleId) && el('option', { value: entry.roleId, selected: true }, `Unavailable role · ${entry.roleId}`))), field('Button label', el('input', { type: 'text', maxlength: 80, value: entry.label, placeholder: 'Choose this role', onInput: e => { entry.label = e.target.value; session.change('selfRoles.roles', roles); } })), el('button', { type: 'button', className: 'icon-button', 'aria-label': `Remove self role ${index + 1}`, onClick: () => { roles.splice(index, 1); session.change('selfRoles.roles', roles); renderRoleRows(); } }, icon('trash')))));
    rolesArea.append(button('Add a role', () => { if (roles.length >= 20) return toast('You can add up to 20 self roles.', true); roles.push({ roleId: '', label: '' }); session.change('selfRoles.roles', roles); renderRoleRows(); }, 'secondary small', 'plus'));
  };
  renderRoleRows();
  const formats = [['text', 'Message only'], ['card', 'Image card only'], ['both', 'Message and image card']];
  settingsLayout(main, session, [
    panel('Arrival & departure announcements', [toggleSection(session, 'Enable greetings & join roles', 'Send your chosen greetings and give new members their automatic roles.', 'welcome.enabled'), el('div', { className: 'form-section' }, channelField(session, 'Welcome channel', 'welcome.channelId', 'Join and leave announcements are sent here.'), el('div', { className: 'field-row' }, selectSetting('When someone joins', 'welcome.joinFormat', formats, 'Image cards use the member’s Discord avatar.'), selectSetting('When someone leaves', 'welcome.goodbyeFormat', [['off', 'No announcement'], ...formats], 'Choose separately from your join format.')), textField(session, 'Welcome message', 'welcome.message', 'Use {user}, {server}, and {count}. Also used if an image cannot be created.', { multiline: true, maxlength: 1000, required: true, onInput: updatePreview }), textField(session, 'Goodbye message', 'welcome.goodbyeMessage', 'Use {user}, {server}, and {count}. A blank message in Message only mode stays silent; other enabled formats use a short default.', { multiline: true, maxlength: 1000, onInput: updatePreview }), roleField(session, 'Roles given on join', 'welcome.autoRoleIds', 'Choose up to 10 roles below the bot’s highest role.', true))]),
    panel('Image card style', el('div', { className: 'form-section' }, field('Preview event', el('select', { onChange: event => { previewKind = event.target.value; updatePreview(); } }, el('option', { value: 'join' }, 'Member joins'), el('option', { value: 'leave' }, 'Member leaves'))), cardPreview, previewNote, el('div', { className: 'field-row' }, textField(session, 'Join heading', 'welcome.card.joinHeading', 'Up to 120 characters. Leave blank to hide; supports placeholders.', { maxlength: 120, onInput: updatePreview }), textField(session, 'Leave heading', 'welcome.card.leaveHeading', 'The member’s name appears below this heading.', { maxlength: 120, onInput: updatePreview })), el('div', { className: 'field-row' }, selectSetting('Card background', 'welcome.card.background', [['midnight', 'Midnight blue'], ['aurora', 'Deep aurora'], ['ice', 'Icy slate'], ['custom', 'Custom solid colour']], 'A dark background keeps the member’s name clear.'), textField(session, 'Card accent', 'welcome.card.accentColor', 'The avatar ring and card heading color.', { type: 'color', onInput: updatePreview })))),
    studioCardFields(session, updatePreview),
    panel('Let members choose their roles', el('div', { className: 'form-section' }, el('p', { className: 'form-intro' }, 'Create role buttons for interests, notifications, and community groups. Up to 20 roles.'), rolesArea, el('div', { className: 'hint-box' }, 'Save your changes, then use ', el('code', {}, '/roles-panel'), ' in the Discord channel where members should choose roles.')))
  ], [contextCard('Message preview', 'This follows the event selected in your image preview.', 'wave', el('div', { className: 'preview-message' }, el('span', { className: 'preview-author' }, 'Cyro'), preview)), contextCard('Sending image cards', 'Cyro needs Attach Files in your welcome channel. If a card cannot be created or that permission is removed, Cyro sends the text greeting. Missing avatars use the member’s initial.', 'file'), contextCard('A quick permissions check', 'The bot needs Manage Roles, and its highest role must be above every role it assigns. Managed integration roles cannot be self-assigned.', 'shield')]);
}

function renderInvites(main) {
  const session = formSession('community'), snapshot = state.detail.community.snapshot;
  main.append(heading('Invites & levels', 'See where members came from, run optional challenges, and recognize their activity.', null));
  const ready = snapshot.inviteTracking?.ready;
  if ((session.config.invites.enabled || session.config.invites.loggingEnabled) && !ready) main.append(el('div', { className: 'alert info' }, snapshot.inviteTracking?.note || 'Invite tracking is waiting for a baseline. The bot needs Manage Server to read invite counts.'));
  settingsLayout(main, session, [
    panel('Staff invite logger', [toggleSection(session, 'Log joins and departures', 'Keep a staff history of members and the invite used. Works with challenges switched off.', 'invites.loggingEnabled'), el('div', { className: 'form-section' }, channelField(session, 'Invite log channel', 'invites.logChannelId', 'Optional: copy future entries to a text channel. Discord permissions decide who can read it. Leave empty for dashboard-only logs.', false, 'Dashboard only', true), el('p', { className: 'form-intro' }, 'Logging begins after you save. Existing members and earlier joins are not backfilled. Cyro needs Manage Server to read invite use counts.'))]),
    panel('Invite challenge', [toggleSection(session, 'Run an invite challenge', 'Count attributed joins and show members their progress with /invites. This is separate from the staff log.', 'invites.enabled'), el('div', { className: 'form-section' }, textField(session, 'Challenge name', 'invites.challengeName', 'Give your members a reason to bring someone along.', { maxlength: 80, placeholder: 'Bring a friend' }), textField(session, 'Invites to reach the goal', 'invites.challengeTarget', 'The target shown alongside each member’s invite progress.', { type: 'number', min: 1, max: 100000 }))]),
    panel('Community levels', [toggleSection(session, 'Reward conversation with XP', 'Members gain XP through server conversation.', 'levels.enabled'), el('div', { className: 'form-section' }, el('p', { className: 'form-intro' }, 'Members can check their level and XP with /rank. Activity rewards use a cooldown to keep regular conversation worthwhile.'))])
  ], [contextCard('What the log shows', 'See who joined or left, the inviter and invite code when identifiable, and the destination channel. An invite code does not reveal the website or app where somebody clicked it.', 'gift'), contextCard('When the source is unknown', 'Discord does not attach an invite code to a join. Cyro compares usage counts; simultaneous joins, expired links, vanity links, and missed events can leave the source unknown.', 'shield'), contextCard('Choose who can read the log', 'Set the log channel permissions in Discord for your preferred audience. Dashboard logs remain limited to members granted access by your server owner.', 'lock')]);
  const logSection = el('div', { className: 'section-gap' });
  renderInviteHistory(logSection, snapshot.inviteLog || []);
  main.append(logSection);
  session.onSaved(async () => {
    if (DEMO) return;
    try {
      const latest = await api(guildPath());
      if (state.page !== 'invites' || latest.guild.id !== state.guildId) return;
      state.detail.community.snapshot = latest.community.snapshot;
      state.detail.members = latest.members;
      if (!state.dirty) renderShell();
    } catch { toast('Settings saved. Reload the page to refresh invite history.'); }
  });
  main.append(el('div', { className: 'two-panels section-gap' }, panel('Invite leaderboard', simpleLeaderboard(snapshot.inviteLeaderboard || [], ['Active invites', 'Total joins'], row => [format(row.active), format(row.total)], 'No attributed invites yet.')), panel('Community levels', simpleLeaderboard(snapshot.levelLeaderboard || [], ['Level', 'XP'], row => [format(row.level), format(row.xp)], 'No community XP yet.'))));
}

function renderInviteHistory(container, initialRows) {
  let rows = initialRows, query = '', eventKind = '', busy = false;
  const results = el('div'), summary = el('p', { className: 'form-intro', role: 'status' });
  const reasons = { matched: 'One invite increased by one use.', 'no-baseline': 'No reliable baseline yet.', ambiguous: 'Multiple changes; source unclear.', 'deleted-invite': 'An invite disappeared before attribution.', 'no-use-change': 'No identifiable invite-use increase.', 'fetch-failed': 'Invite counts unavailable.', 'unknown-join': 'No recorded source for this member.' };
  const identity = (id, name) => el('div', { className: 'invite-identity' }, el('strong', {}, name || userLabel(id)), el('small', {}, id));
  const draw = () => {
    const filtered = rows.filter(row => (!eventKind || row.event === eventKind) && (!query || [row.memberId, row.memberName, row.inviterId, row.inviteCode, row.inviteChannelId, row.reason, row.source, row.inviterId && userLabel(row.inviterId)].join(' ').toLowerCase().includes(query)));
    summary.textContent = `${filtered.length} shown · ${rows.length} recent entries loaded. Up to 1,000 retained per server; the newest 250 appear here. Refresh to load new events.`;
    results.replaceChildren(filtered.length ? table(['Event', 'Member', 'Invited by', 'Invite source', 'When'], filtered.map(row => [
      tag(row.event === 'left' ? 'Left' : 'Joined', row.event === 'left' ? 'muted' : 'green'), identity(row.memberId, row.memberName), row.inviterId ? identity(row.inviterId) : 'Unknown',
      el('div', { className: 'invite-source' }, row.inviteCode ? el('code', {}, row.inviteCode) : el('strong', {}, 'Unknown'), row.inviteChannelId && el('span', {}, `# ${channelName(row.inviteChannelId)}`), el('small', {}, row.event === 'left' && row.inviteCode ? 'Last recorded join source.' : reasons[row.reason] || 'Source unavailable.')), dateLabel(row.at)
    ])) : empty(rows.length ? 'No matching invite entries.' : 'No invite events recorded yet.', rows.length ? 'Try another member, inviter or invite code.' : 'Turn on Log joins and departures and save. Future joins and departures will appear here, even without a challenge.', 'gift'));
  };
  const refresh = button('Refresh history', async () => {
    if (busy) return;
    if (state.dirty) { toast('Save your settings before refreshing history.'); return; }
    busy = true; refresh.disabled = true;
    try { if (!DEMO) { const latest = await api(guildPath()); if (latest.guild.id !== state.guildId) return; state.detail.community.snapshot = latest.community.snapshot; state.detail.members = latest.members; rows = latest.community.snapshot.inviteLog || []; } draw(); }
    catch (error) { toast(error.message); }
    finally { busy = false; refresh.disabled = false; }
  }, 'secondary');
  container.replaceChildren(panel('Invite history', [el('div', { className: 'form-section' }, el('div', { className: 'field-row' }, field('Search invite history', el('input', { type: 'search', placeholder: 'Member, inviter or invite code', onInput: e => { query = e.target.value.trim().toLowerCase(); draw(); } })), field('Event type', el('select', { onChange: e => { eventKind = e.target.value; draw(); } }, el('option', { value: '' }, 'All events'), el('option', { value: 'joined' }, 'Joins'), el('option', { value: 'left' }, 'Departures')))), summary), results], refresh));
  draw();
}

function renderModeration(main) {
  const session = formSession('moderation');
  main.append(heading('Moderation', 'Set clear boundaries and keep a useful record of moderation decisions.', null));
  settingsLayout(main, session, [panel('Moderation & filters', [toggleSection(session, 'Enable moderation', 'Allow moderation tools and configured message filters.', 'enabled'), el('div', { className: 'form-section' }, channelField(session, 'Moderation log channel', 'modLogChannelId', 'Choose a text channel for moderation records. Its Discord permissions decide who can read them.'), linesField(session, 'Blocked words & phrases', 'blockedWords', 'One entry per line. The filter checks new messages and edits. Keep your list specific. Up to 100 entries, 80 characters each.', 100, 80))]), panel('Anti-spam', [toggleSection(session, 'Automatically handle message floods', 'Time out members who exceed your message limit.', 'antiSpam.enabled'), el('div', { className: 'form-section' }, el('div', { className: 'field-row' }, textField(session, 'Message limit', 'antiSpam.maxMessages', 'Messages in one time window.', { type: 'number', min: 3, max: 30 }), textField(session, 'Time window (seconds)', 'antiSpam.windowSeconds', 'How long to watch for a flood.', { type: 'number', min: 3, max: 60 })), textField(session, 'Timeout length (minutes)', 'antiSpam.timeoutMinutes', 'How long a spam timeout lasts.', { type: 'number', min: 1, max: 1440 }))])], [contextCard('Tools for your moderators', 'Use /moderate warn, /moderate timeout, /moderate kick, /moderate ban, and /moderate purge in Discord. Actions require the corresponding Discord permission and respect role hierarchy.', 'shield'), contextCard('Give the bot the right access', 'Filters need Message Content intent. Timeouts need Moderate Members. Logging needs access to the selected channel.', 'lock')]);
  const cases = state.detail.moderation.snapshot.moderationCases || [];
  main.append(el('div', { className: 'section-gap' }, panel('Recent moderation cases', cases.length ? table(['Action', 'Member', 'Reason', 'Date'], cases.slice(0, 15).map(c => [tag(capitalize(c.action), 'muted'), el('span', { className: 'leaderboard-identity' }, userLabel(c.userId)), c.reason || 'No reason recorded', dateLabel(c.createdAt)])) : empty('No moderation cases yet.', 'Actions handled by the bot will appear here.', 'shield'))));
}

function renderRecoveryIssues(main, recordType) {
  const issues = (state.detail.moderation.snapshot.recoveryIssues || []).filter(issue => issue.recordType === recordType);
  if (!issues.length) return;
  main.append(el('section', { className: 'recovery-notice', 'aria-label': 'Interrupted operations' }, panel('Needs staff review', el('div', { className: 'panel-body' }, el('p', { className: 'form-intro' }, 'An operation was interrupted. Check the Discord channel or review message and the bot log before repeating it; a step may already have completed.'), el('ul', { className: 'recovery-list' }, issues.map(issue => el('li', {}, el('strong', {}, `${capitalize(String(issue.kind).replaceAll('-', ' '))} · ${issue.id}`), el('span', {}, `Stage: ${issue.stage}`), issue.operationId && el('p', {}, 'Operation: ', el('code', {}, issue.operationId)), el('p', {}, issue.detail)))), el('div', { className: 'hint-box' }, 'Use ', el('code', {}, '/support-recovery list'), ' in Discord to recheck. After inspecting the outcome, an administrator can use ', el('code', {}, '/support-recovery release'), ' with the operation ID and a review reason. Releasing clears stalled local state; it does not change or delete anything in Discord.')), tag(`${issues.length} to review`, 'orange'))));
}
function table(headers, rows) { return el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, headers.map(header => el('th', { scope: 'col' }, header)))), el('tbody', {}, rows.map(row => el('tr', {}, row.map(cell => el('td', {}, cell))))))); }
function simpleLeaderboard(rows, headings, cells, emptyCopy) {
  return rows.length ? table(['#', 'Member', ...headings], rows.slice(0, 10).map((row, i) => [el('span', { className: `rank${i === 0 ? ' first' : ''}` }, String(i + 1).padStart(2, '0')), el('span', { className: 'leaderboard-identity' }, userLabel(row.userId)), ...cells(row)])) : empty('The leaderboard starts with your members.', emptyCopy, 'award');
}
function renderStaff(main) {
  const rows = state.detail.moderation.snapshot.staffLeaderboard?.[state.staffPeriod] || [];
  const claims = rows.reduce((sum, row) => sum + row.claims, 0), closes = rows.reduce((sum, row) => sum + row.closes, 0);
  main.append(heading('Staff leaderboard', 'A clear view of who is helping your community, one conversation at a time.', null), el('div', { className: 'metrics' }, metric('Active support staff', format(rows.length), 'Staff with activity in this period', 'users'), metric('Tickets claimed', format(claims), 'Conversations picked up by your team', 'ticket'), metric('Tickets closed', format(closes), 'Support conversations completed', 'check')));
  const tabs = el('div', { className: 'tabs', 'aria-label': 'Leaderboard time period' }, [['7d', '7 days'], ['30d', '30 days'], ['all', 'Retained history']].map(([key, title]) => el('button', { type: 'button', 'aria-pressed': state.staffPeriod === key ? 'true' : 'false', onClick: () => { state.staffPeriod = key; renderShell(); } }, title)));
  main.append(panel('Your support team', rows.length ? table(['Rank', 'Staff member', 'Claims', 'Closes', 'Avg. time to claim'], rows.map((row, index) => [el('span', { className: `rank${index === 0 ? ' first' : ''}` }, String(index + 1).padStart(2, '0')), el('div', { className: 'table-name' }, el('span', { className: 'avatar' }, String(index + 1)), el('span', { className: 'leaderboard-identity' }, userLabel(row.userId))), format(row.claims), format(row.closes), row.averageClaimSeconds == null ? '—' : duration(row.averageClaimSeconds)])) : empty('Every helping hand matters.', 'Once staff begin claiming and closing tickets, their contributions appear here.', 'award'), tabs, 'Ticket contributions for the selected period'), el('div', { className: 'integration-note' }, icon('help'), 'Counts show activity handled through this bot. They are one part of understanding your team’s work.'));
}
function duration(seconds) { if (seconds < 60) return `${Math.round(seconds)} sec`; if (seconds < 3600) return `${Math.round(seconds / 60)} min`; return `${(seconds / 3600).toFixed(1)} hr`; }

function trackedTime(milliseconds) {
  const minutes = Math.floor(Math.max(0, Number(milliseconds) || 0) / 60000);
  if (minutes === 0) return milliseconds > 0 ? '<1m' : '0m';
  if (minutes < 60) return `${minutes}m`;
  return `${format(Math.floor(minutes / 60))}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`;
}
function streamMetric(value, signed = false) {
  if (!Number.isFinite(value)) return 'Unavailable';
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return signed && value > 0 ? `+${formatted}` : formatted;
}
function streamCoverage(row, key) {
  const covered = Math.max(0, Number(row[key]) || 0), total = Math.max(0, Number(row.trackedMilliseconds) || 0);
  const percent = total > 0 ? Math.min(100, Math.round(covered / total * 100)) : 0;
  return el('small', { className: 'stream-metric-note', title: `${trackedTime(covered)} of ${trackedTime(total)} confirmed time has this metric.` }, `${percent}% coverage`);
}
function sortedStreamStats(entries, key) {
  return [...entries].sort((a, b) => {
    const av = Number.isFinite(a[key]) ? a[key] : null, bv = Number.isFinite(b[key]) ? b[key] : null;
    if (av === null && bv !== null) return 1;
    if (bv === null && av !== null) return -1;
    if (av !== null && bv !== null && av !== bv) return bv - av;
    return (b.trackedMilliseconds || 0) - (a.trackedMilliseconds || 0) || String(a.displayName || a.username).localeCompare(String(b.displayName || b.username));
  });
}
function renderStreamerLeaderboard(main) {
  const stats = state.detail.streamStats;
  const grouped = state.streamerView === 'creators';
  const retentionDays = stats?.retentionDays || 90;
  const source = (grouped ? stats?.creatorLeaderboards : stats?.leaderboards)?.[state.streamerPeriod] || [];
  const entries = sortedStreamStats(source, state.streamerSort);
  const rangeNote = state.streamerPeriod === '7d' ? 'Today and the previous 6 calendar days, in UTC.' : state.streamerPeriod === '30d' ? 'Today and the previous 29 calendar days, in UTC.' : `Up to ${retentionDays} days of retained history.`;
  main.append(heading('Streamer leaderboard', 'One creator, every connected platform. Explore the accounts behind their activity.', el('a', { className: 'button secondary', href: '#streams' }, icon('radio'), 'Manage alerts')));
  const viewSelect = el('select', { id: 'streamer-view', onChange: event => { state.streamerView = event.target.value; renderShell(); document.getElementById('streamer-view')?.focus(); } }, [['creators', 'Creator profiles'], ['accounts', 'Platform accounts']].map(([value, name]) => el('option', { value, selected: state.streamerView === value }, name)));
  const periodSelect = el('select', { id: 'streamer-period', onChange: event => { state.streamerPeriod = event.target.value; renderShell(); document.getElementById('streamer-period')?.focus(); } }, [['7d', 'Past 7 days'], ['30d', 'Past 30 days'], ['all', `Retained history · ${retentionDays} days`]].map(([value, name]) => el('option', { value, selected: state.streamerPeriod === value }, name)));
  const sortSelect = el('select', { id: 'streamer-sort', onChange: event => { state.streamerSort = event.target.value; renderShell(); document.getElementById('streamer-sort')?.focus(); } }, [['trackedMilliseconds', 'Tracked time'], ['averageViewers', 'Average concurrent viewers'], ['followersGained', 'Net followers']].map(([value, name]) => el('option', { value, selected: state.streamerSort === value }, name)));
  main.append(el('div', { className: 'stream-stats-toolbar' }, el('div', { className: 'stream-stats-controls' }, el('div', { className: 'field' }, el('label', { className: 'field-label', for: 'streamer-view' }, 'Leaderboard view'), viewSelect), el('div', { className: 'field' }, el('label', { className: 'field-label', for: 'streamer-period' }, 'Leaderboard period'), periodSelect), el('div', { className: 'field' }, el('label', { className: 'field-label', for: 'streamer-sort' }, 'Sort by'), sortSelect)), el('p', { className: 'stream-period-note' }, rangeNote)));
  if (!stats || (grouped && !stats.creatorLeaderboards)) {
    main.append(panel('Stream activity', empty(grouped ? 'Creator statistics are not available yet.' : 'Stream stats are not available yet.', 'This view needs a bot version that supplies these statistics. Your existing stream alerts can continue to run.', 'chart', link('Manage stream alerts', 'streams'))));
  } else {
    main.append(el('div', { className: 'metrics' }, metric(grouped ? 'Combined platform time' : 'Tracked account time', trackedTime(entries.reduce((sum, row) => sum + (row.trackedMilliseconds || 0), 0)), 'Simulcasting counts on each platform', 'clock'), metric(grouped ? 'Creators ranked' : 'Accounts ranked', format(entries.length), 'With activity in this period', 'users'), metric('Account sessions', format(entries.reduce((sum, row) => sum + (row.sessions || 0), 0)), 'Sessions across connected accounts', 'radio'), metric('Confirmed active', format(entries.filter(row => row.active).length), grouped ? 'Creators with an active account sample' : 'At their most recent saved sample', 'check', 'green')));
    const headers = ['Rank', grouped ? 'Creator' : 'Platform account', grouped ? 'Platform time' : 'Tracked time', 'Avg. viewers', grouped ? 'Highest platform peak' : 'Peak viewers', 'Net followers', 'Sessions', 'Status'];
    const ranking = entries.length ? el('div', { className: 'table-wrap stream-stats-table-wrap' }, el('table', { className: 'stream-stats-table' }, el('caption', { className: 'sr-only' }, `${grouped ? 'Creator' : 'Account'} leaderboard. ${rangeNote} Sorted by ${sortSelect.selectedOptions[0]?.textContent}. Unavailable metrics appear last.`), el('thead', {}, el('tr', {}, headers.map(name => el('th', { scope: 'col' }, name)))), el('tbody', {}, entries.map((row, index) => {
      const identity = row.displayName || row.username || 'Unknown creator';
      const platformLabel = grouped ? (row.platforms || []).map(platformName).join(' · ') : `${platformName(row.platform)} · ${row.username || ''}`;
      const cells = [el('span', { className: `rank${index === 0 ? ' first' : ''}` }, String(index + 1).padStart(2, '0')), el('div', { className: 'table-name' }, el('div', { className: 'stream-avatar' }, identity.slice(0, 2).toUpperCase()), el('div', {}, el('strong', {}, identity), el('small', {}, platformLabel), grouped && el('small', { className: 'stream-metric-note' }, `${row.accounts?.length || 0} platform account(s)`), row.discordMemberId && el('small', { className: 'stream-metric-note' }, userLabel(row.discordMemberId)))), el('strong', { className: 'stream-number' }, trackedTime(row.trackedMilliseconds)), el('div', {}, el('span', { className: Number.isFinite(row.averageViewers) ? 'stream-number' : 'stream-unavailable' }, streamMetric(row.averageViewers)), Number.isFinite(row.averageViewers) && streamCoverage(row, 'viewerTrackedMilliseconds')), el('span', { className: Number.isFinite(row.peakViewers) ? 'stream-number' : 'stream-unavailable' }, streamMetric(row.peakViewers)), el('div', {}, el('span', { className: Number.isFinite(row.followersGained) ? 'stream-number' : 'stream-unavailable' }, streamMetric(row.followersGained, true)), Number.isFinite(row.followersGained) && streamCoverage(row, 'followerTrackedMilliseconds')), el('span', { className: 'stream-number' }, format(row.sessions)), el('div', {}, tag(row.active ? 'Confirmed active' : 'Not active', row.active ? 'green' : 'muted'), el('small', { className: 'stream-metric-note' }, row.lastTrackedAt ? `Last tracked ${dateLabel(row.lastTrackedAt)}` : 'No saved sample'))];
      return el('tr', {}, cells.map((cell, column) => el('td', { 'data-label': headers[column] }, cell)));
    })))) : empty('The next live announcement starts the story.', 'No confirmed stream activity was tracked in this period. Add a creator in Stream alerts; counting begins when the bot posts a live announcement.', 'radio', link('Manage stream alerts', 'streams'));
    main.append(panel(grouped ? 'Creator standings' : 'Platform account standings', ranking, tag(DEMO ? 'Sample statistics' : `${retentionDays}-day retention`, 'muted'), grouped ? 'Platform time is summed. The peak is the highest single-platform sample.' : 'Unavailable metrics are never treated as zero.'));
  }
  main.append(el('div', { className: 'stream-stats-explainer' }, contextCard('Every platform contributes its own time', 'Time starts at the bot’s live announcement and stops when the stream ends, alerts pause, or the announcement is deleted. Unconfirmed gaps are excluded. Creator totals add account time: one hour on Twitch and YouTube contributes two platform hours, even when broadcast together.', 'clock'), contextCard('Read the metrics in context', 'Viewer averages are weighted by each account’s covered time; peaks show the highest single-platform sample, not a combined audience. These are sampled concurrent viewers, not total views. Net followers sums supported Twitch gains minus losses; Kick, TikTok, and YouTube are unavailable. Its baseline begins at the first confirmed poll after the announcement. Coverage shows the platform time with that metric.', 'chart')));
  main.append(el('footer', { className: 'overview-bottom' }, el('span', {}, icon('clock'), stats?.updatedAt ? `${DEMO ? 'Sample updated' : 'Last updated'} ${dateLabel(stats.updatedAt)}` : 'No saved samples yet'), el('span', {}, 'Periods follow UTC calendar days. Refresh to load new samples.')));
}

function demoStreamStats() {
  const now = new Date();
  const seed = [
    ['sample-1', 'twitch', 'lunaplays', 'LunaPlays', 31.5, 86.4, 241, 37, 1, 0.8, 6, true],
    ['sample-2', 'kick', 'afterhours', 'AfterHours', 42.25, 47.2, 120, null, 1, 0, 9, false],
    ['sample-3', 'twitch', 'oakandember', 'Oak & Ember', 18.5, 102.8, 380, 12, 0.65, 0.4, 5, true],
    ['sample-4', 'tiktok', 'novalate', 'Nova Late', 7.25, null, null, null, 0, 0, 3, false],
    ['sample-5', 'twitch', 'pixelcorner', 'Pixel Corner', 9, 0, 0, 0, 1, 1, 4, false],
    ['sample-6', 'twitch', 'quietquest', 'QuietQuest', 24, 33, 84, -3, 0.95, 0.8, 7, false],
    ['sample-7', 'kick', 'lunaplays', 'Luna on Kick', 12.5, 41.2, 92, null, 1, 0, 4, true],
    ['sample-8', 'youtube', '@LunaPlays', 'Luna on YouTube', 10.25, 63.6, 158, null, 0.75, 0, 3, false]
  ];
  const rows = multiplier => seed.map(([streamerId, platform, username, displayName, hours, averageViewers, peakViewers, followersGained, viewerCoverage, followerCoverage, sessions, active]) => ({ streamerId, platform, username, displayName, trackedMilliseconds: hours * 3600000 * multiplier, averageViewers, peakViewers, followersGained: followersGained === null ? null : followersGained * multiplier, viewerTrackedMilliseconds: hours * 3600000 * multiplier * viewerCoverage, followerTrackedMilliseconds: hours * 3600000 * multiplier * followerCoverage, sessions: sessions * multiplier, active, lastTrackedAt: new Date(now.getTime() - (active ? 60000 : 7200000)).toISOString() }));
  return { leaderboards: { '7d': rows(1), '30d': rows(3), all: rows(7) }, retentionDays: 90, updatedAt: now.toISOString() };
}

function syncDemoCreators(detail = state.detail) {
  if (!DEMO || !detail) return;
  const creators = detail.creators || [], streams = detail.streams || [], stats = detail.streamStats;
  for (const stream of streams) { const creator = creators.find(item => item.id === stream.creatorId); stream.creatorName = creator?.name; stream.discordMemberId = creator?.discordMemberId || null; }
  if (!stats) return;
  stats.creatorLeaderboards = {};
  for (const period of ['7d', '30d', 'all']) {
    const entries = stats.leaderboards[period] || [];
    for (const row of entries) {
      const stream = streams.find(item => item.id === row.streamerId);
      if (stream) row.creatorId = stream.creatorId;
      row.active = Boolean(row.active && stream?.enabled && stream.state === 'live');
    }
    stats.creatorLeaderboards[period] = creators.flatMap(creator => {
      const accounts = entries.filter(row => row.creatorId === creator.id);
      if (!accounts.length) return [];
      const sum = key => accounts.reduce((total, row) => total + (row[key] || 0), 0);
      const viewerTime = sum('viewerTrackedMilliseconds');
      const followerValues = accounts.map(row => row.followersGained).filter(Number.isFinite);
      const peakValues = accounts.map(row => row.peakViewers).filter(Number.isFinite);
      return [{ creatorId: creator.id, displayName: creator.name, discordMemberId: creator.discordMemberId, platforms: [...new Set(accounts.map(row => row.platform))], accounts, trackedMilliseconds: sum('trackedMilliseconds'), averageViewers: viewerTime > 0 ? accounts.reduce((total, row) => total + (row.averageViewers || 0) * row.viewerTrackedMilliseconds, 0) / viewerTime : null, peakViewers: peakValues.length ? Math.max(...peakValues) : null, followersGained: followerValues.length ? followerValues.reduce((total, value) => total + value, 0) : null, viewerTrackedMilliseconds: viewerTime, followerTrackedMilliseconds: sum('followerTrackedMilliseconds'), sessions: sum('sessions'), active: accounts.some(row => row.active), lastTrackedAt: accounts.map(row => row.lastTrackedAt).sort().at(-1) }];
    });
    stats.creatorLeaderboards[period].push(...entries.filter(row => !creators.some(creator => creator.id === row.creatorId)).map(row => ({ ...row, creatorId: row.streamerId, platforms: [row.platform], accounts: [row] })));
  }
  for (const creator of creators) creator.accountIds = [...new Set([...(creator.accountIds || []).filter(id => { const connected = streams.find(stream => stream.id === id); return !connected || connected.creatorId === creator.id; }), ...streams.filter(stream => stream.creatorId === creator.id).map(stream => stream.id), ...stats.leaderboards.all.filter(row => row.creatorId === creator.id).map(row => row.streamerId)])];
}

function renderStreams(main) {
  const streams = state.detail.streams || [];
  const creators = state.detail.creators || [];
  main.append(heading('Creators & alerts', 'One profile for each creator, with separate live and uploaded-video announcements.', button('Create profile', () => openStreamEditor('creator', {}), '', 'plus')));
  if (state.creatorEditor) renderCreatorEditor(main, state.creatorEditor);
  if (state.streamEditor) renderStreamEditor(main, state.streamEditor);
  main.append(el('div', { className: 'creator-list-summary' }, el('span', {}, `${creators.length} creator profile(s) · ${streams.length} connected account(s)`), link('View streamer leaderboard', 'streamer-leaderboard')));
  if (!creators.length) main.append(panel('Your creators', empty('Start with the person behind the stream.', 'Create a profile, then connect their Twitch, Kick, TikTok, or YouTube accounts. Existing accounts are never merged automatically.', 'users', button('Create your first profile', () => openStreamEditor('creator', {}), 'secondary', 'plus'))));
  for (const creator of creators) {
    const accounts = streams.filter(stream => stream.creatorId === creator.id);
    const retainedCount = Math.max(0, (creator.accountIds || []).length - accounts.length);
    const actions = el('div', { className: 'creator-actions' }, button('Add platform', () => openStreamEditor('account', { creatorId: creator.id }), 'secondary small', 'plus'), el('button', { type: 'button', className: 'icon-button', 'aria-label': `Edit profile ${creator.name}`, onClick: () => openStreamEditor('creator', creator) }, icon('edit')), !accounts.length && el('button', { type: 'button', className: 'icon-button', 'aria-label': `Delete empty profile ${creator.name}`, onClick: () => removeCreator(creator) }, icon('trash')));
    const header = el('div', { className: 'creator-header' }, el('div', { className: 'creator-identity' }, el('span', { className: 'stream-avatar' }, creator.name.slice(0, 2).toUpperCase()), el('div', {}, el('h2', {}, creator.name), el('p', {}, creator.discordMemberId ? `Discord member: ${userLabel(creator.discordMemberId)}` : 'No Discord member linked', ' · ', `${accounts.length} account(s)`))), actions);
    const rows = accounts.map(stream => {
      const accountLabel = `${platformName(stream.platform)} ${stream.username}`;
      return el('li', { className: 'creator-account' }, el('div', { className: 'account-identity' }, tag(platformName(stream.platform)), el('div', {}, el('strong', {}, stream.username), el('small', {}, `Live: ${stream.enabled ? '# ' + channelName(stream.alertChannelId) : 'off'}`), stream.uploads?.enabled && el('small', {}, `Uploads: # ${channelName(stream.uploads.channelId)}`), stream.platform === 'tiktok' && !DEMO && el('a', { className: 'creator-connection-link', href: `/connections?guild=${encodeURIComponent(state.guildId)}&record=${encodeURIComponent(stream.id)}`, target: '_blank', rel: 'noopener noreferrer' }, stream.tiktokConnection?.connected ? 'TikTok connection' : 'Creator sign-in'))), el('div', { className: 'account-status' }, tag(!stream.enabled ? 'Live off' : stream.state === 'live' ? 'Live now' : 'Watching', stream.enabled && stream.state === 'live' ? 'green' : 'muted')), el('div', { className: 'table-actions' }, toggleControl(`Enable live alerts for ${accountLabel}`, stream.enabled, async enabled => { if (!await discardStreamDraft()) { renderShell(); return; } try { await saveStream(stream.id, { enabled }); stream.enabled = enabled; if (DEMO) syncDemoCreators(); toast(enabled ? 'Live alerts enabled.' : 'Live alerts paused. Upload settings are unchanged.'); renderShell(); } catch (error) { toast(error.message, true); renderShell(); } }), el('button', { type: 'button', className: 'icon-button', 'aria-label': `Edit account ${accountLabel}`, onClick: () => openStreamEditor('account', stream) }, icon('edit')), el('button', { type: 'button', className: 'icon-button', 'aria-label': `Remove account ${accountLabel}`, onClick: () => removeStream(stream) }, icon('trash'))));
    });
    main.append(el('section', { className: 'panel creator-card' }, header, accounts.length ? el('ul', { className: 'creator-accounts', 'aria-label': `${creator.name} platform accounts` }, rows) : el('div', { className: 'creator-empty' }, 'No connected accounts. Add a platform to start announcing this creator.'), retainedCount > 0 && el('p', { className: 'panel-footer' }, `${retainedCount} removed account(s) remain grouped here to preserve any history. Deleting an empty profile keeps past account statistics available individually.`)));
  }
  const unassigned = streams.filter(stream => !creators.some(creator => creator.id === stream.creatorId));
  if (unassigned.length) main.append(panel('Accounts awaiting a profile', el('div', { className: 'panel-body' }, el('p', { className: 'form-intro' }, 'These accounts were not matched to a profile. Choose a profile explicitly to keep them separate until you decide.'), unassigned.map(stream => button(`Assign ${platformName(stream.platform)} ${stream.username}`, () => openStreamEditor('account', stream), 'secondary small')))));
  main.append(el('div', { className: 'integration-note' }, icon('help'), 'Each account has its own alert settings. Multiple accounts on the same platform are supported. YouTube discovery slows as more channels are tracked (about 15 minutes per distinct channel by default). Provider availability depends on your host.'));
}

async function discardStreamDraft() {
  if (state.saving) return false;
  if (state.dirty && !await confirmAction('Leave your unsaved changes?', 'Save your profile or account settings first, or discard them to continue.')) return false;
  state.dirty = false; state.creatorEditor = null; state.streamEditor = null;
  return true;
}
async function openStreamEditor(kind, existing) {
  if (!await discardStreamDraft()) return;
  state[kind === 'creator' ? 'creatorEditor' : 'streamEditor'] = clone(existing);
  renderShell();
  document.querySelector('.stream-editor input:not(:disabled), .stream-editor select:not(:disabled)')?.focus();
}
function renderCreatorEditor(main, existing) {
  const editing = Boolean(existing.id), draft = { name: '', discordMemberId: '', ...clone(existing) };
  let busy = false;
  const form = el('form', { className: 'stream-editor' });
  const session = { config: draft, change: (key, value) => { draft[key] = value; state.creatorEditor = draft; state.dirty = true; } };
  const message = el('span', { className: 'save-status', role: 'status' }, 'A profile groups only the accounts you choose.');
  const submit = el('button', { type: 'submit', className: 'button' }, editing ? 'Save profile' : 'Create profile');
  form.append(el('div', { className: 'form-section' }, textField(session, 'Creator name', 'name', 'The shared name displayed above this creator’s platform accounts.', { required: true, maxlength: 80, placeholder: 'Creator name' }), textField(session, 'Discord member ID', 'discordMemberId', 'Optional. All linked accounts use this member when assigning their live roles.', { maxlength: 20, placeholder: 'Discord member ID' })), el('div', { className: 'save-bar' }, message, el('div', { className: 'login-actions' }, button('Cancel', () => { state.creatorEditor = null; state.dirty = false; renderShell(); }, 'secondary'), submit)));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    const body = { name: draft.name.trim(), discordMemberId: draft.discordMemberId?.trim() || null };
    if (!body.name || (body.discordMemberId && !/^\d{17,20}$/.test(body.discordMemberId))) { message.textContent = !body.name ? 'Enter a creator name.' : 'Enter a valid Discord member ID, or leave it blank.'; message.className = 'save-status error'; return; }
    busy = true; state.saving = true; [...form.elements].forEach(control => { control.disabled = true; }); submit.textContent = 'Saving…';
    try {
      if (DEMO) { if (editing) Object.assign(state.detail.creators.find(creator => creator.id === existing.id), body, { updatedAt: new Date().toISOString() }); else state.detail.creators.push({ ...body, id: `demo-creator-${crypto.randomUUID()}`, guildId: state.guildId, accountIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); syncDemoCreators(); }
      else { await api(editing ? `${guildPath()}/creators/${safeId(existing.id)}` : `${guildPath()}/creators`, editing ? 'PATCH' : 'POST', body); state.detail = await api(guildPath()); }
      state.creatorEditor = null; state.dirty = false; state.saving = false; renderShell(); toast(editing ? 'Creator profile saved.' : 'Profile created. Add a platform account when ready.');
    } catch (error) { busy = false; state.saving = false; [...form.elements].forEach(control => { control.disabled = false; }); message.textContent = error.message; message.className = 'save-status error'; submit.textContent = editing ? 'Save profile' : 'Create profile'; }
  });
  main.append(el('div', { className: 'stream-form-panel' }, panel(editing ? `Edit profile · ${existing.name}` : 'Create a creator profile', form)));
}
async function removeCreator(creator) {
  if (!await discardStreamDraft()) return;
  if (state.detail.streams.some(stream => stream.creatorId === creator.id)) return toast('Move or remove the connected accounts before deleting this profile.', true);
  if (!await confirmAction('Delete this empty profile?', `Remove ${creator.name}? This removes the profile grouping. Past account statistics are retained and remain available individually.`, 'Delete profile', 'Keep profile')) return;
  state.saving = true;
  try { if (!DEMO) await api(`${guildPath()}/creators/${safeId(creator.id)}`, 'DELETE'); state.detail.creators = state.detail.creators.filter(item => item.id !== creator.id); if (DEMO) syncDemoCreators(); else state.detail = await api(guildPath()); renderShell(); toast('Empty profile deleted. Past account statistics are retained.'); } catch (error) { toast(error.message, true); } finally { state.saving = false; }
}

function renderStreamEditor(main, existing) {
  const editing = Boolean(existing.id);
  const draft = { creatorId: '', platform: 'twitch', username: '', alertChannelId: '', pingRoleId: null, liveRoleId: null, titleFilter: '', cooldownSeconds: 300, messageTemplate: '', cleanupMode: 'offline', enabled: true, ...clone(existing) };
  draft.uploads = { enabled: false, channelId: existing.alertChannelId || '', pingRoleId: null, titleFilter: '', messageTemplate: '', ...clone(existing.uploads || {}) };
  let busy = false;
  const form = el('form', { className: 'stream-editor' });
  const session = { config: draft, change: (path, value) => { putPath(draft, path, value); state.streamEditor = draft; state.dirty = true; } };
  const message = el('span', { className: 'save-status', role: 'status' }, editing ? 'Settings apply only to this platform account.' : 'Connect another account to the selected profile.');
  const submit = el('button', { type: 'submit', className: 'button' }, editing ? 'Save account' : 'Connect account');
  const creators = state.detail.creators || [];
  const memberNote = el('div', { className: 'hint-box' });
  const updateMemberNote = () => { const creator = creators.find(item => item.id === draft.creatorId); memberNote.textContent = creator?.discordMemberId ? `Live roles use ${userLabel(creator.discordMemberId)} from ${creator.name}’s profile. Edit the profile to change this member.` : 'The selected profile has no Discord member linked. Add one to the profile before using a role while live.'; };
  updateMemberNote();
  const creatorSelect = el('select', { required: true, onChange: event => { session.change('creatorId', event.target.value); updateMemberNote(); } }, el('option', { value: '', selected: !draft.creatorId }, 'Choose a creator profile'), creators.map(creator => el('option', { value: creator.id, selected: draft.creatorId === creator.id }, creator.name)));
  const uploadSection = el('div', { className: 'form-section' });
  const drawUploadSettings = () => uploadSection.replaceChildren(uploadSettingsFields(session, existing));
  const platformSelect = el('select', { disabled: editing, onChange: event => { session.change('platform', event.target.value); if (!['youtube', 'tiktok'].includes(draft.platform)) session.change('uploads.enabled', false); drawUploadSettings(); } }, ['twitch', 'kick', 'tiktok', 'youtube'].map(platform => el('option', { value: platform, selected: draft.platform === platform }, platformName(platform))));
  const username = textField(session, 'Account username or YouTube channel', 'username', 'Twitch, Kick, TikTok: account username. YouTube: @handle, channel ID, or a youtube.com/@handle or /channel/ID URL.', { required: true, maxlength: 100, placeholder: 'creatorname or @YouTubeHandle' });
  if (editing) username.querySelector('input').disabled = true;
  form.append(el('div', { className: 'form-section' }, field('Creator profile', creatorSelect, editing ? 'Choose another profile to move this account and its retained history. Accounts are never merged automatically.' : 'You can link multiple different accounts from the same platform.'), el('div', { className: 'field-row' }, field('Streaming platform', platformSelect), username), channelField(session, 'Alert channel', 'alertChannelId', 'The bot needs permission to send messages and embed links here.'), el('div', { className: 'field-row' }, roleField(session, 'Role to notify', 'pingRoleId', 'Optional role mention in announcements.'), roleField(session, 'Role while live', 'liveRoleId', 'Optional role given to the member on the creator profile.')), memberNote, el('div', { className: 'field-row section-gap' }, textField(session, 'Title filter', 'titleFilter', 'Optional text the stream title must contain.'), textField(session, 'Alert cooldown (seconds)', 'cooldownSeconds', 'Minimum time between announcements.', { type: 'number', min: 0, max: 86400 })), textField(session, 'Announcement message', 'messageTemplate', 'Leave blank for the default. Placeholders: {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}.', { multiline: true, maxlength: 1800 }), field('When the stream ends', el('select', { onChange: event => session.change('cleanupMode', event.target.value) }, [['offline', 'Update the message to offline'], ['delete', 'Delete the announcement'], ['keep', 'Keep the announcement']].map(([value, text]) => el('option', { value, selected: value === draft.cleanupMode }, text))))));
  form.prepend(toggleSection(session, 'Announce when live', 'Watch this account for live streams. Upload alerts can run separately.', 'enabled'));
  if (existing.liveCapability?.reason) form.append(el('div', { className: 'form-section provider-note' }, existing.liveCapability.reason));
  drawUploadSettings(); form.append(uploadSection);
  form.append(el('div', { className: 'save-bar' }, message, el('div', { className: 'login-actions' }, button('Cancel', () => { state.streamEditor = null; state.dirty = false; renderShell(); }, 'secondary'), submit)));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    if (!draft.creatorId || (draft.enabled && !draft.alertChannelId) || (draft.uploads.enabled && !draft.uploads.channelId)) { message.textContent = 'Choose a creator profile and a destination channel for each enabled alert type.'; message.className = 'save-status error'; return; }
    if (draft.liveRoleId && !creators.find(creator => creator.id === draft.creatorId)?.discordMemberId) { message.textContent = 'Add a Discord member to this creator profile before assigning a live role.'; message.className = 'save-status error'; return; }
    if (DEMO && state.detail.streams.some(stream => stream.id !== existing.id && stream.platform === draft.platform && stream.username.toLowerCase() === draft.username.trim().toLowerCase())) { message.textContent = 'This platform account is already connected. Edit it to move it between profiles.'; message.className = 'save-status error'; return; }
    busy = true; state.saving = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    submit.textContent = editing ? 'Saving…' : 'Connecting…'; message.textContent = 'Checking creator and channel access…';
    const keys = ['creatorId', 'alertChannelId', 'pingRoleId', 'liveRoleId', 'titleFilter', 'cooldownSeconds', 'messageTemplate', 'cleanupMode', 'enabled', 'uploads'];
    const body = Object.fromEntries(keys.map(key => [key, draft[key] ?? null]));
    body.uploads = { ...draft.uploads, channelId: draft.uploads.channelId || '' };
    if (!editing) { body.platform = draft.platform; body.username = draft.username; }
    try {
      if (DEMO) { if (editing) Object.assign(state.detail.streams.find(s => s.id === existing.id), body); else state.detail.streams.push({ ...body, id: `demo-account-${crypto.randomUUID()}`, displayName: draft.username, state: 'unknown' }); syncDemoCreators(); }
      else { await api(editing ? `${guildPath()}/streams/${safeId(existing.id)}` : `${guildPath()}/streams`, editing ? 'PATCH' : 'POST', body); state.detail = await api(guildPath()); }
      state.streamEditor = null; state.dirty = false; state.saving = false; toast(editing ? 'Account settings saved.' : 'Platform account connected.'); renderShell();
    } catch (error) { message.textContent = error.message; message.className = 'save-status error'; busy = false; state.saving = false; controls.forEach(([control, wasDisabled]) => { control.disabled = wasDisabled; }); submit.textContent = editing ? 'Save account' : 'Connect account'; }
  });
  main.append(el('div', { className: 'stream-form-panel' }, panel(editing ? `Edit account · ${platformName(existing.platform)} ${existing.username}` : 'Connect a platform account', form)));
}
async function saveStream(id, patch) { if (DEMO) { Object.assign(state.detail.streams.find(s => s.id === id), patch); return; } state.saving = true; try { return await api(`${guildPath()}/streams/${safeId(id)}`, 'PATCH', patch); } finally { state.saving = false; } }
async function removeStream(stream) {
  if (!await discardStreamDraft()) return;
  const confirmed = await confirmAction('Remove this platform account?', `Stop ${platformName(stream.platform)} alerts for ${stream.username}? The creator profile and other accounts stay connected. Retained statistics remain available.`, 'Remove account', 'Keep account');
  if (!confirmed) return;
  state.saving = true;
  try { if (!DEMO) await api(`${guildPath()}/streams/${safeId(stream.id)}`, 'DELETE'); state.detail.streams = state.detail.streams.filter(s => s.id !== stream.id); if (DEMO) syncDemoCreators(); else state.detail = await api(guildPath()); renderShell(); toast('Platform account removed.'); } catch (error) { toast(error.message, true); } finally { state.saving = false; }
}
function confirmAction(title, description, confirmText = 'Discard changes', cancelText = 'Keep editing') {
  const dialog = document.getElementById('confirm-dialog');
  document.getElementById('confirm-title').textContent = title; document.getElementById('confirm-description').textContent = description;
  dialog.querySelector('[value="confirm"]').textContent = confirmText; dialog.querySelector('[value="cancel"]').textContent = cancelText;
  dialog.returnValue = '';
  return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal(); });
}

async function selectGuild(id, force = false) {
  if (state.saving) { toast('Please wait for your settings to finish saving.'); const select = document.getElementById('guild-select'); select.value = state.guildId; window.CyroSearchSelect.sync(select); return; }
  if (state.dirty && !force && !await confirmAction('Leave your unsaved changes?', 'Your changes have not been saved. Switching servers will discard them.')) { const select = document.getElementById('guild-select'); select.value = state.guildId; window.CyroSearchSelect.sync(select); return; }
  state.dirty = false; state.streamEditor = null; state.creatorEditor = null; state.guildId = id; state.detail = null; state.loadError = null;
  const sequence = ++state.loadSequence;
  const url = new URL(location.href); url.searchParams.set('guild', id); history.replaceState({}, '', url);
  if (!DEMO) { try { sessionStorage.setItem('cyro.selectedGuild', id); } catch {} }
  if (!state.guilds.find(g => g.id === id)?.installed) { renderShell(); return; }
  state.loading = true; renderShell();
  try { const detail = DEMO ? demoData() : await api(`/api/guilds/${safeId(id)}`); if (sequence !== state.loadSequence) return; state.detail = detail; } catch (error) { if (sequence !== state.loadSequence) return; state.loadError = error.message; }
  state.loading = false; renderShell();
}
async function refreshGuilds() {
  if (DEMO) return;
  try { state.guilds = (await api('/api/guilds')).guilds; await selectGuild(state.guildId, true); } catch (error) { toast(error.message, true); }
}
async function logout() {
  if (state.saving) return toast('Please wait for your settings to finish saving.');
  if (state.dirty && !await confirmAction('Sign out without saving?', 'Your unsaved changes will be discarded.', 'Sign out')) return;
  if (DEMO) { location.href = '/'; return; }
  try { await api('/auth/logout', 'POST'); state.me = null; state.dirty = false; renderLanding(); } catch (error) { toast(error.message, true); }
}
let ignoreHash = false;
window.matchMedia('(min-width: 721px)').addEventListener('change', event => { if (event.matches) closeNavigation?.(false); });
window.addEventListener('hashchange', async () => {
  if (ignoreHash) { ignoreHash = false; return; }
  if (!state.me || document.querySelector('.home-page')) return;
  if (state.saving) { ignoreHash = true; location.hash = state.page; toast('Please wait for your settings to finish saving.'); return; }
  if (state.dirty && !await confirmAction('Leave your unsaved changes?', 'You can save your settings before opening another page.')) { ignoreHash = true; location.hash = state.page; return; }
  state.dirty = false; state.streamEditor = null; state.creatorEditor = null; renderShell(); document.getElementById('main')?.focus({ preventScroll: true }); window.scrollTo({ top: 0 });
});
window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('click', event => { if (state.saving) { event.preventDefault(); event.stopPropagation(); toast('Please wait for your settings to finish saving.'); } }, true);

function demoData() {
  if (state.demoDetail) return state.demoDetail;
  const id = '100000000000000001', channel = '20000000000000000', role = '30000000000000000';
  const config = { counting: { enabled: true, channelId: `${channel}1` }, welcome: { enabled: true, channelId: `${channel}2`, message: 'Hey {user}, welcome to {server}! You’re member #{count}. Make yourself at home.', goodbyeMessage: '', autoRoleIds: [`${role}1`] }, selfRoles: { roles: [{ roleId: `${role}3`, label: 'Stream notifications' }] }, invites: { enabled: false, loggingEnabled: true, logChannelId: `${channel}4`, challengeName: 'Bring a friend', challengeTarget: 5 }, levels: { enabled: true } };
  const modConfig = { enabled: true, modLogChannelId: `${channel}4`, blockedWords: [], antiSpam: { enabled: true, maxMessages: 6, windowSeconds: 8, timeoutMinutes: 5 }, tickets: { enabled: true, visibility: 'inherit', archiveCategoryId: null, categoryId: `${channel}7`, logChannelId: `${channel}4`, staffRoleIds: [`${role}2`], maxOpenPerUser: 2 }, applications: { enabled: false, reviewChannelId: null, reviewerRoleIds: [], acceptedRoleId: null, questions: ['Why would you like to join the team?', 'What experience can you bring?'] } };
  config.verification = { enabled: false, channelId: `${channel}2`, roleId: `${role}4`, mode: 'challenge', title: 'Verify your membership', message: 'Complete the private image challenge to receive access to the community.' };
  modConfig.tickets.types = ['General support', 'Partnerships'].map((name, index) => ({ ...clone(modConfig.tickets), id: `sample-ticket-${index}`, name }));
  modConfig.applications.forms = ['Staff application', 'Creator application'].map((name, index) => ({ ...clone(modConfig.applications), id: `sample-form-${index}`, name, enabled: true, reviewChannelId: `${channel}6`, reviewerRoleIds: [`${role}2`] }));
  modConfig.panels = [
    { id: 'sample-support-panel', name: 'Support panel', kind: 'tickets', presentation: 'select', title: 'How can we help?', description: 'Choose a topic to open a ticket with our team. Ticket visibility follows this server’s settings.', options: modConfig.tickets.types.map(item => ({ id: item.id, label: item.name })) },
    { id: 'sample-application-panel', name: 'Application panel', kind: 'applications', presentation: 'buttons', title: 'Join the team', description: 'Choose an application to get started. Your answers are posted in this server’s review channel.', options: modConfig.applications.forms.map(item => ({ id: item.id, label: item.name })) }
  ];
  const staff = [{ userId: '400000000000000001', claims: 12, closes: 10, averageClaimSeconds: 164 }, { userId: '400000000000000002', claims: 9, closes: 8, averageClaimSeconds: 287 }, { userId: '400000000000000003', claims: 6, closes: 5, averageClaimSeconds: 342 }];
  state.demoDetail = { guild: { id, name: 'The Common Room', memberCount: 1284 }, channels: [['1', 'counting-club', 0], ['2', 'welcome', 0], ['3', 'live-now', 0], ['4', 'staff-log', 0], ['5', 'general', 0], ['6', 'applications', 0], ['7', 'Support', 4], ['8', 'Closed tickets', 4]].map(([suffix, name, type]) => ({ id: channel + suffix, name, type })), roles: [['1', 'Community'], ['2', 'Support team'], ['3', 'Stream alerts'], ['4', 'Creators']].map(([suffix, name]) => ({ id: role + suffix, name })), members: [{ id: staff[0].userId, displayName: 'Sam' }, { id: staff[1].userId, displayName: 'Jamie' }, { id: staff[2].userId, displayName: 'Alex' }], community: { config, snapshot: { config, counting: { current: 428, best: 612, lastUserId: staff[0].userId }, inviteTracking: { ready: true, note: 'Sample invite history. No Discord events are sent.' }, inviteLeaderboard: [{ userId: staff[0].userId, active: 7, total: 9 }, { userId: staff[1].userId, active: 5, total: 5 }], levelLeaderboard: [{ userId: staff[2].userId, xp: 1240, level: 4 }, { userId: staff[0].userId, xp: 820, level: 3 }] } }, moderation: { config: modConfig, snapshot: { config: modConfig, moderationCases: [], tickets: [{ id: 'T-0012', ownerId: staff[0].userId, channelId: `${channel}5`, status: 'open', createdAt: '2026-10-10T19:42:00Z', claimedBy: staff[1].userId }, { id: 'T-0011', ownerId: staff[2].userId, channelId: `${channel}5`, status: 'open', createdAt: '2026-10-10T18:30:00Z', claimedBy: null }, { id: 'T-0010', ownerId: staff[1].userId, channelId: `${channel}5`, status: 'closed', createdAt: '2026-10-10T15:10:00Z', closedAt: '2026-10-10T16:00:00Z' }], applications: [], staffLeaderboard: { '7d': staff, '30d': staff.map(s => ({ ...s, claims: s.claims * 3, closes: s.closes * 3 })), all: staff.map(s => ({ ...s, claims: s.claims * 7, closes: s.closes * 7 })) } } }, streams: [{ id: 'sample-1', platform: 'twitch', username: 'lunaplays', displayName: 'LunaPlays', alertChannelId: `${channel}3`, state: 'live', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }, { id: 'sample-2', platform: 'kick', username: 'afterhours', displayName: 'AfterHours', alertChannelId: `${channel}3`, state: 'offline', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }, { id: 'sample-3', platform: 'twitch', username: 'oakandember', displayName: 'Oak & Ember', alertChannelId: `${channel}3`, state: 'offline', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }] };
  state.demoDetail.community.snapshot.inviteLog = [
    { id: 'sample-log-3', event: 'joined', memberId: staff[2].userId, memberName: 'Alex', inviterId: null, inviteCode: null, inviteChannelId: null, source: 'unknown', reason: 'ambiguous', at: '2026-10-12T21:04:00Z' },
    { id: 'sample-log-2', event: 'left', memberId: staff[1].userId, memberName: 'Jamie', inviterId: staff[0].userId, inviteCode: 'community', inviteChannelId: `${channel}2`, source: 'invite', reason: 'matched', at: '2026-10-12T20:15:00Z' },
    { id: 'sample-log-1', event: 'joined', memberId: staff[1].userId, memberName: 'Jamie', inviterId: staff[0].userId, inviteCode: 'community', inviteChannelId: `${channel}2`, source: 'invite', reason: 'matched', at: '2026-10-12T19:40:00Z' }
  ];
  const now = new Date().toISOString();
  state.demoDetail.roles.push({ id: `${role}5`, name: 'Community supporter' });
  state.demoDetail.statusRoles = { config: { enabled: true, text: 'discord.gg/commonroom', roleId: `${role}5`, match: 'contains', caseSensitive: false, offlineBehavior: 'keep' }, available: true, counts: { assigned: 18, pendingAdd: 0, pendingRemove: 0 }, warnings: [] };
  state.demoDetail.channels.push({ id: `${channel}10`, name: 'The lounge', type: 2 }, { id: `${channel}11`, name: 'confessions', type: 0 });
  state.demoDetail.voice = {
    config: { musicEnabled: true, ttsEnabled: true, announceSpeaker: false, defaultVoice: 'voice1', volume: 50, maxTrackMinutes: 15 },
    voices: [
      { id: 'voice1', name: 'Daniel · British male', gender: 'male', accent: 'British' },
      { id: 'voice2', name: 'Michael · American male', gender: 'male', accent: 'American' },
      { id: 'voice3', name: 'Heart · American female', gender: 'female', accent: 'American' },
      { id: 'voice4', name: 'Bella · American female', gender: 'female', accent: 'American' },
      { id: 'voice5', name: 'Fenrir · American male', gender: 'male', accent: 'American' },
      { id: 'voice6', name: 'Puck · American male', gender: 'male', accent: 'American' },
      { id: 'voice7', name: 'George · British male', gender: 'male', accent: 'British' },
      { id: 'voice8', name: 'Fable · British male', gender: 'male', accent: 'British' },
      { id: 'voice9', name: 'Nicole · American female', gender: 'female', accent: 'American' },
      { id: 'voice10', name: 'Emma · British female', gender: 'female', accent: 'British' },
      { id: 'voice11', name: 'Aoede · American female', gender: 'female', accent: 'American' },
      { id: 'voice12', name: 'Sarah · American female', gender: 'female', accent: 'American' },
    ],
    available: { music: true, tts: true }, notes: ['Twelve free Kokoro neural voices run locally with Cyro: six male and six female. Daniel is the default; no paid voice account is needed.'],
    session: { channelId: `${channel}10`, mode: 'music', queueLength: 2, currentTitle: 'Late-night lounge radio · sample session' }
  };
  state.demoDetail.confessions = {
    config: { enabled: false, channelId: `${channel}11`, cooldownSeconds: 60 }, counts: { published: 0, pending: 0 },
    privacy: 'Your name is omitted from the public post. Cyro does not retain confession text or author IDs in its saved history. Discord receives the original command and its author. Staff can delete posts. Cooldowns reset when Cyro restarts.'
  };
  state.demoDetail.channels.push({ id: `${channel}9`, name: 'suggestions', type: 0 });
  state.demoDetail.suggestions = {
    config: { enabled: true, channelId: `${channel}9`, cooldownMinutes: 5 },
    counts: { open: 2, accepted: 1, declined: 0, closed: 0, pending: 0 }, limits: { history: 1000, votersPerSuggestion: 10000 }, displayed: 3, page: 1, totalPages: 1,
    items: [
      { id: 'demo-suggestion-3', number: 3, authorId: staff[0].userId, authorName: 'Sam', text: 'Could we have a community game night every Friday? A quick vote could pick the game each week.', status: 'open', delivery: 'sent', syncPending: false, channelId: `${channel}9`, createdAt: now, upVotes: 18, downVotes: 2, score: 16 },
      { id: 'demo-suggestion-2', number: 2, authorId: staff[2].userId, authorName: 'Alex', text: 'A channel for sharing clips and celebrating small wins would be great.', status: 'open', delivery: 'sent', syncPending: false, channelId: `${channel}9`, createdAt: '2026-10-12T18:30:00Z', upVotes: 12, downVotes: 0, score: 12 },
      { id: 'demo-suggestion-1', number: 1, authorId: staff[1].userId, authorName: 'Jamie', text: 'Please add a way to choose which streams we get notified about.', status: 'accepted', delivery: 'sent', syncPending: false, channelId: `${channel}9`, createdAt: '2026-10-11T15:00:00Z', upVotes: 24, downVotes: 1, score: 23, decision: { actorId: staff[0].userId, status: 'accepted', reason: 'Added! Choose your stream notification roles in the welcome channel.', at: '2026-10-12T16:00:00Z' } }
    ]
  };
  state.demoDetail.creators = ['LunaPlays', 'AfterHours', 'Oak & Ember', 'Nova Late', 'Pixel Corner', 'QuietQuest'].map((name, index) => ({ id: `creator-${index + 1}`, guildId: id, name, discordMemberId: index === 0 ? staff[0].userId : null, accountIds: [], createdAt: now, updatedAt: now }));
  state.demoDetail.streamStats = demoStreamStats();
  state.demoDetail.streams = state.demoDetail.streamStats.leaderboards['7d'].map(row => ({ id: row.streamerId, creatorId: ['sample-7', 'sample-8'].includes(row.streamerId) ? 'creator-1' : row.streamerId.replace('sample-', 'creator-'), platform: row.platform, username: row.username, displayName: row.displayName, alertChannelId: `${channel}3`, pingRoleId: null, liveRoleId: row.streamerId === 'sample-1' ? `${role}4` : null, state: row.active ? 'live' : 'offline', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }));
  syncDemoCreators(state.demoDetail);
  return state.demoDetail;
}

async function boot() {
  if (new URLSearchParams(location.search).get('home') === '1') {
    try { state.status = await api('/api/status'); } catch {}
    renderLanding(); return;
  }
  if (DEMO) { state.me = { user: { id: 'demo', username: 'Morgan' }, csrfToken: '' }; state.guilds = [{ id: '100000000000000001', name: 'The Common Room', installed: true }]; await selectGuild(state.guilds[0].id, true); return; }
  let requested = new URLSearchParams(location.search).get('guild');
  // Keep a command's server selection across the round trip through Discord sign-in.
  // This is a navigation preference only; every server request still checks permissions.
  try {
    if (/^\d{17,20}$/.test(requested || '')) sessionStorage.setItem('cyro.selectedGuild', requested);
    else requested = sessionStorage.getItem('cyro.selectedGuild');
  } catch {}
  try {
    const results = await Promise.allSettled([api('/api/me'), api('/api/status')]);
    if (results[1].status === 'fulfilled') state.status = results[1].value;
    if (results[0].status === 'rejected') { renderLanding(results[0].reason.status === 401 ? null : results[0].reason.message); return; }
    state.me = results[0].value;
    state.guilds = (await api('/api/guilds')).guilds || [];
    if (!state.guilds.length) { renderShell(); return; }
    const selected = state.guilds.find(g => g.id === requested) || state.guilds.find(g => g.installed) || state.guilds[0];
    await selectGuild(selected.id, true);
  } catch (error) { renderLanding(error.message); }
}
boot();




