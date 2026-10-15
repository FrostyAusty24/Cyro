'use strict';

// The demo is intentionally opt-in and never sends requests or saves server data.
const DEMO = new URLSearchParams(location.search).get('demo') === '1';
const app = document.getElementById('app');
const navigation = [
  ['overview', 'Overview', 'grid'], ['help', 'Getting started', 'help'], ['streams', 'Creators & alerts', 'radio'],
  ['streamer-leaderboard', 'Streamer leaderboard', 'chart'],
  ['counting', 'Counting', 'hash'], ['suggestions', 'Suggestions', 'lightbulb'], ['polls', 'Polls', 'vote'], ['confessions', 'Anonymous confessions', 'confession'], ['voice', 'Music & TTS', 'headphones'], ['temp-voice', 'Temporary voice', 'voice'], ['welcome', 'Welcome & roles', 'wave'], ['status-roles', 'Status roles', 'sparkles'], ['verification', 'Verification', 'lock'],
  ['invites', 'Invites & levels', 'gift'], ['moderation', 'Moderation', 'shield'], ['identity', 'Bot appearance', 'paintbrush'],
  ['tickets', 'Support tickets', 'ticket'], ['applications', 'Applications', 'file'], ['bug-reports', 'Bug reports', 'bug'],
  ['staff', 'Staff leaderboard', 'award'], ['time-clock', 'Time clock', 'clock'], ['messages', 'Channel messages', 'message'], ['sticky', 'Sticky messages', 'pin'], ['access', 'Access & commands', 'key-round']
].map(([key, label, iconName]) => [key, ui(label), iconName]);
const state = { me: null, guilds: [], guildId: null, detail: null, page: 'overview', dirty: false, staffPeriod: '7d', staffSort: 'totalActions', staffQuery: '', staffActivity: 'all', streamerPeriod: '7d', streamerSort: 'trackedMilliseconds', streamerView: 'creators', status: null, streamEditor: null, creatorEditor: null, loading: false, saving: false, loadSequence: 0 };
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
    else if (window.CyroI18n.isText(value)) window.CyroI18n.setAttribute(node, key, value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : window.CyroI18n.isText(child) ? window.CyroI18n.node(child) : document.createTextNode(String(child)));
  }
  return node;
}
function icon(name, extra = '') { return window.CyroIcons.create(name, extra); }
const clone = value => JSON.parse(JSON.stringify(value));
const format = value => window.CyroI18n.computedText(locale => Number(value || 0).toLocaleString(locale === 'pt' ? 'pt-BR' : locale));
const safeId = value => encodeURIComponent(String(value));
const guildPath = () => `/api/guilds/${safeId(state.guildId)}`;
function byPath(obj, path) { return path.split('.').reduce((value, key) => value?.[key], obj); }
function putPath(obj, path, value) { const keys = path.split('.'); const key = keys.pop(); let target = obj; for (const part of keys) target = target[part] ||= {}; target[key] = value; }
function channelName(id) { return state.detail?.channels?.find(channel => channel.id === id)?.name || id || ui('No channel selected'); }
function userLabel(id) { return state.detail?.members?.find(member => member.id === id)?.displayName || ui('User {id}', { id }); }
function platformName(platform) { return ({ twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', youtube: 'YouTube' })[platform] || capitalize(platform); }
function tag(text, color = '') { return el('span', { className: `tag ${color}` }, text); }
function link(text, page) { return el('a', { className: 'text-link', href: `#${page}` }, text, icon('arrow')); }
function button(text, action, kind = '', iconName = null) { return el('button', { type: 'button', className: `button ${kind}`, onClick: action }, iconName && icon(iconName), text); }
function enabledTag(enabled) { return tag(enabled ? ui('Enabled') : ui('Not set up'), enabled ? 'green' : 'muted'); }
function toast(message, isError = false) { clearTimeout(toastTimer); const box = document.getElementById('toast'); box.className = `toast${isError ? ' error' : ''}`; window.CyroI18n.setContent(box, message); box.hidden = false; toastTimer = setTimeout(() => { box.hidden = true; }, 5000); }
async function api(path, method = 'GET', body) {
  const response = await fetch(path, { method, credentials: 'same-origin', signal: AbortSignal.timeout(25000), headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-CSRF-Token': state.me?.csrfToken || '' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  let data; try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) { const error = new Error(typeof data.error === 'string' ? data.error : data.error?.message || data.message || `Request failed (${response.status}). Please try again.`); error.status = response.status; error.i18n = data.i18n; throw error; }
  return data;
}
function brand() { return el('a', { className: 'brand', href: '#overview', 'aria-label': ui('Cyro overview') }, el('span', { className: 'brand-mark' }, el('img', { src: '/cyro-logo.png', alt: '', width: 48, height: 48 })), el('span', { className: 'brand-name' }, ui('Cyro'), el('small', {}, ui('by Headache Development')))); }
function demoBanner() { return DEMO ? el('div', { className: 'demo-banner' }, el('strong', {}, ui('Demo workspace')), ui('Sample data. Changes stay in this browser session.'), el('a', { href: '/' }, ui('Exit demo'))) : null; }
function empty(title, description, iconName = 'grid', cta = null) { return el('div', { className: 'empty-state' }, icon(iconName), el('h3', {}, title), el('p', {}, description), cta); }
function panel(title, body, action = null, description = null) { return el('section', { className: 'panel' }, el('div', { className: 'panel-header' }, el('div', {}, el('h2', {}, title), description && el('p', { className: 'panel-description' }, description)), action), body); }
function metric(label, value, detail, iconName, accent = '') { return el('div', { className: 'metric' }, icon(iconName), el('div', { className: 'metric-label' }, label), el('div', { className: `metric-value ${accent}` }, value), el('div', { className: 'metric-detail' }, detail)); }
function heading(title, description, action = null) { return el('header', { className: 'page-heading' }, el('div', {}, el('h1', {}, title), el('p', { className: 'subtitle' }, description)), action); }
function contextCard(title, text, iconName = 'help', extra = null) { return el('section', { className: 'context-card' }, el('span', { className: 'module-icon' }, icon(iconName)), el('h3', {}, title), el('p', {}, text), extra); }

function languagePicker() {
  const select = el('select', { id: 'dashboard-language', 'aria-label': ui('Dashboard language'), onChange: event => {
    window.CyroSearchSelect.close();
    window.CyroI18n.setLocale(event.target.value);
  } }, window.CyroI18n.languages.map(language => el('option', { value: language.id, selected: language.id === window.CyroI18n.locale }, language.name)));
  return el('div', { className: 'dashboard-language' }, el('label', { for: 'dashboard-language' }, ui('Dashboard language')), select);
}

function renderLanding(error = null) {
  window.CyroSearchSelect.close();
  closeNavigation?.(false);
  closeNavigation = null;
  const setup = state.status && !state.status.configured;
  const login = setup ? el('span', { className: 'button secondary' }, ui('Dashboard setup needed')) : el('a', { className: 'button', href: '/auth/login' }, icon('discord'), ui('Continue with Discord'));
  window.CyroHome.render({ app, el, icon, brand, login, setup, error });
}
function feature(iconName, color, title, copy) { return el('div', { className: 'module-row' }, el('div', { className: `module-icon ${color}` }, icon(iconName)), el('div', { className: 'module-text' }, el('div', { className: 'module-name' }, title), el('div', { className: 'module-copy' }, copy))); }

function renderShell() {
  window.CyroSearchSelect.close();
  closeNavigation?.(false);
  state.page = navigation.some(item => item[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  const active = navigation.find(item => item[0] === state.page);
  const select = el('select', { id: 'guild-select', 'data-search-kind': 'servers', onChange: event => selectGuild(event.target.value) }, state.guilds.map(g => el('option', { value: g.id, selected: g.id === state.guildId }, g.installed ? g.name : ui('{name} · Add bot', { name: g.name }))));
  const guildPicker = window.CyroSearchSelect.enhance(select, ui('Your server'));
  const nav = el('nav', { className: 'nav', 'aria-label': ui('Community settings') }, navigation.map(([key, label, iconName]) => [({ overview: ui('Workspace'), streams: ui('Creators'), counting: ui('Community'), moderation: ui('Server management') })[key] && el('p', { className: 'nav-label' }, ({ overview: ui('Workspace'), streams: ui('Creators'), counting: ui('Community'), moderation: ui('Server management') })[key]), el('a', { href: `#${key}`, ...(key === state.page ? { 'aria-current': 'page' } : {}) }, icon(iconName), label)]));
  const shell = el('div', { className: 'shell' });
  const toggleMenu = () => setMenuOpen(!shell.classList.contains('menu-open'));
  const menuButton = el('button', { type: 'button', className: 'menu-toggle', 'aria-label': ui('Toggle navigation'), 'aria-controls': 'server-navigation', 'aria-expanded': 'false', onClick: toggleMenu }, icon('menu'));
  const sidebar = el('aside', { id: 'server-navigation', className: 'sidebar', 'aria-label': ui('Server navigation') }, brand(), el('div', { className: 'guild-control' }, el('label', { for: guildPicker === select ? 'guild-select' : 'guild-select-trigger' }, ui('Your server')), guildPicker), languagePicker(), nav, el('div', { className: 'sidebar-foot' }, el('a', { className: 'install-link', href: '/invite' }, icon('plus'), ui('Add to another server')), el('a', { className: 'community-link', href: 'https://discord.gg/dAZheerkkD', target: '_blank', rel: 'noopener noreferrer', 'aria-label': ui('Headache Development community and support (opens in a new tab)') }, icon('discord'), el('span', {}, ui('Headache Development'), el('small', {}, ui('Community & support'))), icon('arrow')), el('nav', { className: 'dashboard-public-links', 'aria-label': ui('Creator and legal links') }, el('a', { href: '/?home=1' }, ui('About Cyro')), el('a', { href: '/connections' }, ui('My connections')), el('a', { href: '/privacy' }, ui('Privacy')), el('a', { href: '/terms' }, ui('Terms')))));
  const title = state.me?.user?.username || ui('Your account');
  const topbar = el('header', { className: 'topbar' }, el('div', { className: 'breadcrumb' }, menuButton, icon('grid'), el('span', { className: 'breadcrumb-context' }, state.guilds.find(g => g.id === state.guildId)?.name || ui('Your servers')), icon('chevron'), el('strong', {}, active[1])), el('div', { className: 'topbar-right' }, el('span', { className: 'status-pill' }, DEMO ? ui('Demo session') : ui('Connected to Discord')), el('div', { className: 'user-menu' }, el('span', { className: 'avatar', title }, String(title).slice(0, 2).toUpperCase()), el('button', { type: 'button', className: 'signout', onClick: logout }, ui('Sign out')))));
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
  shell.append(sidebar, el('button', { type: 'button', className: 'mobile-overlay', tabindex: '-1', 'aria-label': ui('Close navigation'), onClick: toggleMenu }), workspace);
  app.replaceChildren(shell);
  if (state.loading) { main.append(el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading server settings…'))); return; }
  if (!state.guilds.length) { main.append(el('div', { className: 'account-empty' }, heading(ui('Make yourself at home.'), ui('No servers granting you dashboard access were found. You can still connect your own creator accounts.')), el('div', { className: 'login-actions' }, el('a', { className: 'button', href: '/connections' }, ui('Open creator connections'), icon('arrow')), el('a', { className: 'button secondary', href: '/invite' }, ui('Add to Discord'))))); return; }
  const guild = state.guilds.find(g => g.id === state.guildId);
  if (guild && !guild.installed) {
    const actions = el('div', { className: 'login-actions centered-actions' }, el('a', { className: 'button', href: guild.inviteUrl || `/invite?guild_id=${safeId(guild.id)}` }, ui('Add to this server')), button(ui('Refresh connection'), refreshGuilds, 'secondary'));
    main.append(heading(guild.name, ui('Connect the bot to start setting up your community.')), panel(ui('One more step'), empty(ui('Your dashboard is ready.'), ui('Add Cyro to this server, then refresh to load its settings.'), 'discord', actions)));
    return;
  }
  if (!state.detail) { main.append(el('div', { className: 'alert' }, state.loadError || ui('Could not load this server.'), button(ui('Try again'), () => selectGuild(state.guildId, true), 'secondary small'))); return; }
  const pages = { overview: renderOverview, help: renderHelp, streams: renderStreams, 'streamer-leaderboard': renderStreamerLeaderboard, counting: renderCounting, suggestions: renderSuggestions, confessions: renderConfessions, voice: renderVoice, 'temp-voice': renderTempVoice, 'time-clock': renderTimeClock, 'bug-reports': renderBugReports, sticky: renderStickyMessages, welcome: renderWelcome, 'status-roles': renderStatusRoles, verification: renderVerification, invites: renderInvites, moderation: renderModeration, identity: renderIdentity, tickets: main => renderSupportSetup(main, 'tickets'), applications: main => renderSupportSetup(main, 'applications'), staff: renderStaff, messages: main => renderPublishing(main, 'message'), polls: main => renderPublishing(main, 'poll'), access: renderAccess };
  pages[state.page](main);
}

function renderOverview(main) {
  const { guild, community, moderation, streams = [] } = state.detail;
  const cc = community.config, mc = moderation.config, cs = community.snapshot, ms = moderation.snapshot;
  const openTickets = (ms.tickets || []).filter(t => t.status === 'open').length;
  const activeStreams = streams.filter(stream => stream.enabled);
  main.append(heading(guild.name, ui('Server overview. Keep up with your community and manage its tools.'), el('a', { className: 'button secondary', href: '#help' }, icon('help'), ui('How to use Cyro'))));
  if (ms.recoveryIssues?.length) main.append(el('div', { className: 'alert info' }, ui("{p0} interrupted operation(s) need staff review. ", { p0: ms.recoveryIssues.length }), el('a', { href: '#tickets' }, ui('Review tickets')), ui(' or '), el('a', { href: '#applications' }, ui('applications')), ui(' before repeating an action.')));
  main.append(el('div', { className: 'metrics' }, metric(ui('Community members'), guild.memberCount == null ? '—' : format(guild.memberCount), ui('Members in this server'), 'users'), metric(ui('Stream alerts'), format(activeStreams.length), ui("{p0} accounts live right now", { p0: streams.filter(s => s.state === 'live' && s.enabled).length }), 'radio'), metric(ui('Community count'), format(cs.counting?.current), ui("Personal best: {p0}", { p0: format(cs.counting?.best) }), 'hash'), metric(ui('Open tickets'), format(openTickets), openTickets ? ui('Waiting for your team') : ui('No open conversations'), 'ticket')));
  const left = el('div', { className: 'stack' });
  const right = el('div', { className: 'stack' });
  left.append(panel(ui('Community counting'), el('div', { className: 'counter-showcase' }, el('div', { className: 'counter-label' }, tag(cc.counting.channelId ? `# ${channelName(cc.counting.channelId)}` : ui('Counting channel')), enabledTag(cc.counting.enabled)), el('div', { className: 'count-big' }, format(cs.counting?.current)), el('p', { className: 'count-caption' }, cc.counting.enabled ? ui("Someone's next move is {p0}. Keep it going together.", { p0: format((cs.counting?.current || 0) + 1) }) : ui('Set a channel and let your members build something together.')), el('progress', { className: 'counter-progress', value: cs.counting?.current || 0, max: Math.max(1, cs.counting?.best || 1), 'aria-label': ui('Current count compared with server record') }), el('div', { className: 'counter-foot' }, el('span', {}, ui('CURRENT STREAK')), el('span', {}, ui("BEST · {p0}", { p0: format(cs.counting?.best) })))), link(ui('Configure'), 'counting')));
  left.append(panel(ui('Creator watchlist'), streams.length ? el('div', { className: 'stream-list' }, streams.slice(0, 4).map(stream => el('div', { className: 'module-row' }, el('div', { className: 'stream-avatar' }, (stream.displayName || stream.username).slice(0, 2).toUpperCase()), el('div', { className: 'module-text' }, el('div', { className: 'module-name' }, stream.displayName || stream.username), el('div', { className: 'module-copy' }, window.CyroI18n.computedText(() => `${capitalize(stream.platform)} · #${channelName(stream.alertChannelId)}`))), tag(!stream.enabled ? ui('Live off') : stream.state === 'live' ? ui('Live now') : ui('Watching'), !stream.enabled ? 'muted' : stream.state === 'live' ? 'green' : '')))) : empty(ui('Put your creators in the spotlight.'), ui('Connect a streamer and let the community know when they go live.'), 'radio', link(ui('Add a streamer'), 'streams')), link(ui('Manage alerts'), 'streams')));
  right.append(panel(ui('Server modules'), el('div', { className: 'module-list' }, [
    ['shield', 'green', 'Moderation', 'Filters, warnings & your mod log', 'moderation', mc.enabled],
    ['wave', 'purple', 'Welcome & roles', 'Greetings and automatic roles', 'welcome', cc.welcome.enabled],
    ['sparkles', 'purple', 'Status roles', 'A reward for showing your community', 'status-roles', state.detail.statusRoles?.config.enabled],
    ['headphones', 'purple', 'Music & TTS', 'Audio queues and a voice for your chat', 'voice', state.detail.voice?.config.musicEnabled || state.detail.voice?.config.ttsEnabled],
    ['confession', '', 'Anonymous confessions', 'A space to share without a name', 'confessions', state.detail.confessions?.config.enabled],
    ['gift', 'orange', 'Invites', cc.invites.loggingEnabled ? 'Staff invite history and join sources' : cc.invites.enabled ? cc.invites.challengeName : 'Logs and community challenges', 'invites', cc.invites.enabled || cc.invites.loggingEnabled],
    ['ticket', '', 'Support tickets', 'Support channels your way', 'tickets', mc.tickets.enabled],
    ['clock', '', 'Time clock', 'Member shifts and total time', 'time-clock', state.detail.timeClock?.config.enabled],
    ['file', '', 'Applications', 'Staff and role applications', 'applications', mc.applications.enabled]
  ].map(([ic, color, title, copy, page, enabled]) => el('a', { href: `#${page}`, className: 'module-row' }, el('span', { className: `module-icon ${color}` }, icon(ic)), el('div', { className: 'module-text' }, el('div', { className: 'module-name' }, ui(title)), el('div', { className: 'module-copy' }, page === 'invites' && cc.invites.enabled && !cc.invites.loggingEnabled ? copy : ui(copy))), tag(enabled ? ui('On') : ui('Set up'), enabled ? 'green' : 'muted'))))));
  const recent = [...(ms.moderationCases || []).map(c => ({ text: ui('{action} · {member}', { action: moderationAction(c.action), member: userLabel(c.userId) }), at: c.createdAt })), ...(ms.tickets || []).map(t => ({ text: ui(t.status === 'closed' ? 'Ticket closed · {member}' : 'Ticket opened · {member}', { member: userLabel(t.ownerId) }), at: t.closedAt || t.createdAt }))].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 3);
  right.append(panel(ui('Recent activity'), recent.length ? el('div', { className: 'activity-list' }, recent.map(item => el('div', { className: 'activity-item' }, el('span', { className: 'activity-dot' }), el('div', {}, el('p', {}, item.text), el('time', { datetime: item.at }, dateLabel(item.at)))))) : empty(ui('A fresh start.'), ui('Moderation actions and ticket activity will appear here as your community gets going.'), 'clock')));
  main.append(el('div', { className: 'dashboard-columns' }, left, right), el('footer', { className: 'overview-bottom' }, el('span', {}, icon('lock'), ui('Settings are private to your server admins.')), el('span', {}, DEMO ? ui('Sample activity · Demo workspace') : ui('Server data loaded when you opened this page'))));
}

function capitalize(value) { const text = String(value || ''); return text ? text[0].toUpperCase() + text.slice(1) : ''; }
function dateLabel(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? ui('Date unavailable') : window.CyroI18n.computedText(locale => d.toLocaleString(locale === 'pt' ? 'pt-BR' : locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })); }
function moderationAction(action) { return ui(({ warn: 'Warning', timeout: 'Timeout', kick: 'Kick', ban: 'Ban', purge: 'Message cleanup', automod: 'Automatic moderation', unban: 'Unban' })[action] || 'Moderation action'); }
function getConfig(type) { return clone(state.detail[type].config); }
function toggleControl(label, checked, onChange) { return el('label', { className: 'toggle' }, el('input', { type: 'checkbox', checked, 'aria-label': label, onChange: event => onChange(event.target.checked) }), el('span', { className: 'toggle-track' })); }
function formSession(type) {
  const config = getConfig(type); let saved = JSON.stringify(config); let busy = false; let afterSave = null;
  const message = el('span', { className: 'save-status', role: 'status' }, ui('Your settings are up to date.'));
  const save = el('button', { className: 'button', type: 'submit', disabled: true }, icon('check'), ui('Save changes'));
  const form = el('form', { className: 'settings-form' });
  function change(path, value) { putPath(config, path, value); state.dirty = saved !== JSON.stringify(config); save.disabled = busy || !state.dirty; message.className = 'save-status'; window.CyroI18n.setContent(message, state.dirty ? ui('You have unsaved changes.') : ui('Your settings are up to date.')); }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    busy = true; state.saving = true; let completed = false;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(save, ui('Saving…')); window.CyroI18n.setContent(message, ui('Saving your settings…')); message.className = 'save-status';
    try {
      const result = DEMO ? { config: clone(config) } : await api(`${guildPath()}/${type}`, 'PATCH', config);
      state.detail[type].config = result.config; if (state.detail[type].snapshot) state.detail[type].snapshot.config = result.config;
      Object.assign(config, clone(result.config)); saved = JSON.stringify(config); state.dirty = false;
      window.CyroI18n.setContent(message, DEMO ? ui('Saved for this demo session.') : ui('Changes saved. Your server is up to date.')); message.className = 'save-status success';
      toast(DEMO ? ui('Demo settings saved in this session.') : ui('Server settings saved.'));
      completed = true;
    } catch (error) { window.CyroI18n.setContent(message, uiError(error)); message.className = 'save-status error'; }
    finally { busy = false; state.saving = false; controls.forEach(([control, wasDisabled]) => { control.disabled = wasDisabled; }); save.disabled = !state.dirty; save.replaceChildren(icon('check'), window.CyroI18n.node(ui('Save changes'))); if (completed) afterSave?.(); }
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
  const entries = control => control.value.split('\n').map(value => value.trim()).filter(Boolean);
  const validate = control => {
    const values = entries(control);
    control.setCustomValidity(String(values.length > maxLines ? ui('Use at most {count} entries.', { count: maxLines }) : values.some(value => value.length > maxLength) ? ui('Each entry must be {count} characters or fewer.', { count: maxLength }) : ''));
  };
  const input = el('textarea', { rows: 4, value: (byPath(session.config, path) || []).join('\n'), onInput: event => { validate(event.target); session.change(path, entries(event.target)); }, onInvalid: event => validate(event.target) });
  // Reword validation without changing the draft or retaining discarded pages.
  const reference = new WeakRef(input);
  const unsubscribe = window.CyroI18n.subscribe(() => { const control = reference.deref(); if (!control?.isConnected) { unsubscribe(); return; } validate(control); });
  return field(label, input, hint);
}

function channelField(session, label, path, hint, category = false, emptyLabel = null, textOnly = false, allowedTypes = null) {
  const current = byPath(session.config, path);
  const typeId = value => typeof value === 'number' ? value : ({ GuildText: 0, GuildVoice: 2, GuildCategory: 4, GuildAnnouncement: 5 })[value];
  const options = (state.detail.channels || []).filter(c => allowedTypes ? allowedTypes.includes(typeId(c.type)) : category ? typeId(c.type) === 4 : typeId(c.type) === 0 || (!textOnly && typeId(c.type) === 5));
  const select = el('select', { 'data-search-kind': category ? 'categories' : 'channels', onChange: event => session.change(path, event.target.value || null) }, el('option', { value: '', selected: !current }, emptyLabel || (category ? ui('Select a category') : ui('Select a channel'))), options.map(c => el('option', { value: c.id, selected: current === c.id }, `${category || typeId(c.type) === 2 ? '' : '# '}${c.name}`)), current && !options.some(c => c.id === current) && el('option', { value: current, selected: true }, ui("Unavailable · {p0}", { p0: current })));
  return field(label, select, hint);
}
function roleField(session, label, path, hint, multiple = false) {
  const current = byPath(session.config, path);
  const roles = (state.detail.roles || []).filter(role => role.id !== state.guildId && !role.managed);
  const selectedIds = multiple ? current || [] : current ? [current] : [];
  const missing = selectedIds.filter(id => !roles.some(role => role.id === id));
  const select = el('select', { 'data-search-kind': 'roles', multiple, size: multiple ? Math.min(5, Math.max(3, roles.length)) : null, onChange: event => session.change(path, multiple ? [...event.target.selectedOptions].map(o => o.value).filter(Boolean) : event.target.value || null) }, !multiple && el('option', { value: '', selected: !current }, ui('No role')), roles.map(role => el('option', { value: role.id, selected: selectedIds.includes(role.id) }, role.name)), missing.map(id => el('option', { value: id, selected: true }, ui("Unavailable role · {p0}", { p0: id }))));
  return field(label, select, el('span', {}, hint || '', multiple && ui(' Search and select as many roles as you need.')));
}
function toggleSection(session, title, text, path) { return el('div', { className: 'form-section' }, el('div', { className: 'toggle-row' }, el('div', {}, el('h3', {}, title), el('p', {}, text)), toggleControl(title, Boolean(byPath(session.config, path)), value => session.change(path, value)))); }
function settingsLayout(main, session, sections, aside) { session.form.append(...sections); main.append(el('div', { className: 'settings-grid' }, session.finish(), el('aside', {}, aside))); }

function renderCounting(main) {
  const session = formSession('community'), count = state.detail.community.snapshot.counting || {};
  main.append(heading(ui('Counting'), ui('A simple game that gives the whole server something to build.'), null), el('div', { className: 'metrics' }, metric(ui('Current count'), format(count.current), ui("Next up: {p0}", { p0: format((count.current || 0) + 1) }), 'hash'), metric(ui('Server record'), format(count.best), ui('The highest count reached together'), 'award')));
  settingsLayout(main, session, [panel(ui('Counting channel'), [toggleSection(session, ui('Enable counting'), ui('Turn a text channel into a community counting game.'), 'counting.enabled'), el('div', { className: 'form-section' }, channelField(session, ui('Where should members count?'), 'counting.channelId', ui('The bot needs View Channel, Read Message History, Send Messages, and Add Reactions.')))])], [contextCard(ui('How it works'), ui('Members take turns posting the next whole number. The bot reacts with a check when it is correct.'), 'hash', el('ol', {}, el('li', {}, ui('Start at 1 and count up, one number per message.')), el('li', {}, ui('A different member must send each number.')), el('li', {}, ui('An incorrect number resets the count. Your record stays saved.')))), contextCard(ui('Make it a team ritual'), ui('Pin the rules in your counting channel. Members can use /counting to see the current count and the server record.'), 'spark')]);
}

function renderWelcome(main) {
  const session = formSession('community');
  const welcome = session.config.welcome;
  welcome.joinFormat ??= 'text'; welcome.goodbyeFormat ??= welcome.goodbyeMessage ? 'text' : 'off';
  welcome.card = { ...memberCardDefaults, ...welcome.card };
  main.append(heading(ui('Welcome & roles'), ui('Greet arrivals and departures with a message, a personalized image card, or both.'), null));
  let previewKind = 'join';
  const preview = el('span', {}), cardPreview = el('div', { className: 'member-card-preview' }), previewNote = el('p', { className: 'field-hint' });
  const replacePreview = (value, user = '@new-member') => String(value || '').replaceAll('{user}', user).replaceAll('{server}', state.detail.guild.name).replaceAll('{count}', format(Math.max(0, (state.detail.guild.memberCount || 0) + (previewKind === 'join' ? 1 : -1))));
  const updatePreview = () => {
    const settings = session.config.welcome, joining = previewKind === 'join';
    const mode = joining ? settings.joinFormat : settings.goodbyeFormat;
    const template = joining ? settings.message : settings.goodbyeMessage;
    window.CyroI18n.setContent(preview, mode === 'off' ? ui('Goodbye announcements are turned off.') : mode === 'card' ? ui('Your image card is sent on its own.') : mode === 'text' && !template ? ui('No goodbye message is set, so no announcement is sent.') : template ? replacePreview(template) : ui(joining ? 'Welcome {user} to {server}!' : '{user} has left {server}.', { user: '@new-member', server: state.detail.guild.name }));
    cardPreview.className = `member-card-preview theme-${settings.card.background}`;
    cardPreview.style.setProperty('--card-accent', /^#[0-9a-f]{6}$/i.test(settings.card.accentColor) ? settings.card.accentColor : '#63D7FF');
    renderCardPreview(cardPreview, settings.card, joining, replacePreview);
    window.CyroI18n.setContent(previewNote, ui('Sample member. The sent image uses their Discord name and avatar. {note}', { note: mode === 'card' || mode === 'both' ? ui(joining ? 'Image cards are selected for joins.' : 'Image cards are selected for leaves.') : ui(joining ? 'Choose an image format above to send this card on joins.' : 'Choose an image format above to send this card on leaves.') }));
  };
  const selectSetting = (label, path, choices, hint) => field(ui(label), el('select', { onChange: event => { session.change(path, event.target.value); updatePreview(); } }, choices.map(([value, text]) => el('option', { value, selected: byPath(session.config, path) === value }, ui(text)))), ui(hint));
  updatePreview();
  const rolesArea = el('div', {});
  const renderRoleRows = () => {
    const roles = session.config.selfRoles.roles;
    const availableRoles = (state.detail.roles || []).filter(role => role.id !== state.guildId && !role.managed);
    rolesArea.replaceChildren(...roles.map((entry, index) => el('div', { className: 'self-role-row' }, field(ui('Role'), el('select', { 'data-search-kind': 'roles', 'aria-label': ui("Self role {p0}", { p0: index + 1 }), onChange: e => { entry.roleId = e.target.value; session.change('selfRoles.roles', roles); } }, el('option', { value: '', selected: !entry.roleId }, ui('Select a role')), availableRoles.map(role => el('option', { value: role.id, selected: role.id === entry.roleId }, role.name)), entry.roleId && !availableRoles.some(role => role.id === entry.roleId) && el('option', { value: entry.roleId, selected: true }, ui("Unavailable role · {p0}", { p0: entry.roleId })))), field(ui('Button label'), el('input', { type: 'text', maxlength: 80, value: entry.label, placeholder: ui('Choose this role'), onInput: e => { entry.label = e.target.value; session.change('selfRoles.roles', roles); } })), el('button', { type: 'button', className: 'icon-button', 'aria-label': ui("Remove self role {p0}", { p0: index + 1 }), onClick: () => { roles.splice(index, 1); session.change('selfRoles.roles', roles); renderRoleRows(); } }, icon('trash')))));
    rolesArea.append(button(ui('Add a role'), () => { if (roles.length >= 20) return toast(ui('You can add up to 20 self roles.'), true); roles.push({ roleId: '', label: '' }); session.change('selfRoles.roles', roles); renderRoleRows(); }, 'secondary small', 'plus'));
  };
  renderRoleRows();
  const formats = [['text', 'Message only'], ['card', 'Image card only'], ['both', 'Message and image card']];
  settingsLayout(main, session, [
    panel(ui('Arrival & departure announcements'), [toggleSection(session, ui('Enable greetings & join roles'), ui('Send your chosen greetings and give new members their automatic roles.'), 'welcome.enabled'), el('div', { className: 'form-section' }, channelField(session, ui('Welcome channel'), 'welcome.channelId', ui('Join and leave announcements are sent here.')), el('div', { className: 'field-row' }, selectSetting('When someone joins', 'welcome.joinFormat', formats, 'Image cards use the member’s Discord avatar.'), selectSetting('When someone leaves', 'welcome.goodbyeFormat', [['off', 'No announcement'], ...formats], 'Choose separately from your join format.')), textField(session, ui('Welcome message'), 'welcome.message', ui('Use {user}, {server}, and {count}. Also used if an image cannot be created.'), { multiline: true, maxlength: 1000, required: true, onInput: updatePreview }), textField(session, ui('Goodbye message'), 'welcome.goodbyeMessage', ui('Use {user}, {server}, and {count}. A blank message in Message only mode stays silent; other enabled formats use a short default.'), { multiline: true, maxlength: 1000, onInput: updatePreview }), roleField(session, ui('Roles given on join'), 'welcome.autoRoleIds', ui('Choose up to 10 roles below the bot’s highest role.'), true))]),
    panel(ui('Image card style'), el('div', { className: 'form-section' }, field(ui('Preview event'), el('select', { onChange: event => { previewKind = event.target.value; updatePreview(); } }, el('option', { value: 'join' }, ui('Member joins')), el('option', { value: 'leave' }, ui('Member leaves')))), cardPreview, previewNote, el('div', { className: 'field-row' }, textField(session, ui('Join heading'), 'welcome.card.joinHeading', ui('Up to 120 characters. Leave blank to hide; supports placeholders.'), { maxlength: 120, onInput: updatePreview }), textField(session, ui('Leave heading'), 'welcome.card.leaveHeading', ui('The member’s name appears below this heading.'), { maxlength: 120, onInput: updatePreview })), el('div', { className: 'field-row' }, selectSetting('Card background', 'welcome.card.background', [['midnight', 'Midnight blue'], ['aurora', 'Deep aurora'], ['ice', 'Icy slate'], ['custom', 'Custom solid colour']], 'A dark background keeps the member’s name clear.'), textField(session, ui('Card accent'), 'welcome.card.accentColor', ui('The avatar ring and card heading color.'), { type: 'color', onInput: updatePreview })))),
    studioCardFields(session, updatePreview),
    panel(ui('Let members choose their roles'), el('div', { className: 'form-section' }, el('p', { className: 'form-intro' }, ui('Create role buttons for interests, notifications, and community groups. Up to 20 roles.')), rolesArea, el('div', { className: 'hint-box' }, ui('Save your changes, then use '), el('code', {}, '/roles-panel'), ui(' in the Discord channel where members should choose roles.'))))
  ], [contextCard(ui('Message preview'), ui('This follows the event selected in your image preview.'), 'wave', el('div', { className: 'preview-message' }, el('span', { className: 'preview-author' }, ui('Cyro')), preview)), contextCard(ui('Sending image cards'), ui('Cyro needs Attach Files in your welcome channel. If a card cannot be created or that permission is removed, Cyro sends the text greeting. Missing avatars use the member’s initial.'), 'file'), contextCard(ui('A quick permissions check'), ui('The bot needs Manage Roles, and its highest role must be above every role it assigns. Managed integration roles cannot be self-assigned.'), 'shield')]);
}

function renderInvites(main) {
  const session = formSession('community'), snapshot = state.detail.community.snapshot;
  main.append(heading(ui('Invites & levels'), ui('See where members came from, run optional challenges, and recognize their activity.'), null));
  const ready = snapshot.inviteTracking?.ready;
  if ((session.config.invites.enabled || session.config.invites.loggingEnabled) && !ready) main.append(el('div', { className: 'alert info' }, snapshot.inviteTracking?.note ? uiError({ message: snapshot.inviteTracking.note, i18n: snapshot.inviteTracking.noteI18n }) : ui('Invite tracking is waiting for a baseline. The bot needs Manage Server to read invite counts.')));
  settingsLayout(main, session, [
    panel(ui('Staff invite logger'), [toggleSection(session, ui('Log joins and departures'), ui('Keep a staff history of members and the invite used. Works with challenges switched off.'), 'invites.loggingEnabled'), el('div', { className: 'form-section' }, channelField(session, ui('Invite log channel'), 'invites.logChannelId', ui('Optional: copy future entries to a text channel. Discord permissions decide who can read it. Leave empty for dashboard-only logs.'), false, ui('Dashboard only'), true), el('p', { className: 'form-intro' }, ui('Logging begins after you save. Existing members and earlier joins are not backfilled. Cyro needs Manage Server to read invite use counts.')))]),
    panel(ui('Invite challenge'), [toggleSection(session, ui('Run an invite challenge'), ui('Count attributed joins and show members their progress with /invites. This is separate from the staff log.'), 'invites.enabled'), el('div', { className: 'form-section' }, textField(session, ui('Challenge name'), 'invites.challengeName', ui('Give your members a reason to bring someone along.'), { maxlength: 80, placeholder: ui('Bring a friend') }), textField(session, ui('Invites to reach the goal'), 'invites.challengeTarget', ui('The target shown alongside each member’s invite progress.'), { type: 'number', min: 1, max: 100000 }))]),
    panel(ui('Community levels'), [toggleSection(session, ui('Reward conversation with XP'), ui('Members gain XP through server conversation.'), 'levels.enabled'), el('div', { className: 'form-section' }, el('p', { className: 'form-intro' }, ui('Members can check their level and XP with /rank. Activity rewards use a cooldown to keep regular conversation worthwhile.')))])
  ], [contextCard(ui('What the log shows'), ui('See who joined or left, the inviter and invite code when identifiable, and the destination channel. An invite code does not reveal the website or app where somebody clicked it.'), 'gift'), contextCard(ui('When the source is unknown'), ui('Discord does not attach an invite code to a join. Cyro compares usage counts; simultaneous joins, expired links, vanity links, and missed events can leave the source unknown.'), 'shield'), contextCard(ui('Choose who can read the log'), ui('Set the log channel permissions in Discord for your preferred audience. Dashboard logs remain limited to members granted access by your server owner.'), 'lock')]);
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
    } catch { toast(ui('Settings saved. Reload the page to refresh invite history.')); }
  });
  main.append(el('div', { className: 'two-panels section-gap' }, panel(ui('Invite leaderboard'), simpleLeaderboard(snapshot.inviteLeaderboard || [], ['Active invites', 'Total joins'], row => [format(row.active), format(row.total)], 'No attributed invites yet.')), panel(ui('Community levels'), simpleLeaderboard(snapshot.levelLeaderboard || [], ['Level', 'XP'], row => [format(row.level), format(row.xp)], 'No community XP yet.'))));
}

function renderInviteHistory(container, initialRows) {
  let rows = initialRows, query = '', eventKind = '', busy = false;
  const results = el('div'), summary = el('p', { className: 'form-intro', role: 'status' });
  const reasons = { matched: 'One invite increased by one use.', 'no-baseline': 'No reliable baseline yet.', ambiguous: 'Multiple changes; source unclear.', 'deleted-invite': 'An invite disappeared before attribution.', 'no-use-change': 'No identifiable invite-use increase.', 'fetch-failed': 'Invite counts unavailable.', 'unknown-join': 'No recorded source for this member.' };
  const identity = (id, name) => el('div', { className: 'invite-identity' }, el('strong', {}, name || userLabel(id)), el('small', {}, id));
  const draw = () => {
    const filtered = rows.filter(row => (!eventKind || row.event === eventKind) && (!query || [row.memberId, row.memberName, row.inviterId, row.inviteCode, row.inviteChannelId, row.reason, row.source, row.inviterId && userLabel(row.inviterId)].join(' ').toLowerCase().includes(query)));
    window.CyroI18n.setContent(summary, ui("{p0} shown · {p1} recent entries loaded. Up to 1,000 retained per server; the newest 250 appear here. Refresh to load new events.", { p0: filtered.length, p1: rows.length }));
    results.replaceChildren(filtered.length ? table(['Event', 'Member', 'Invited by', 'Invite source', 'When'], filtered.map(row => [
      tag(row.event === 'left' ? ui('Left') : ui('Joined'), row.event === 'left' ? 'muted' : 'green'), identity(row.memberId, row.memberName), row.inviterId ? identity(row.inviterId) : ui('Unknown'),
      el('div', { className: 'invite-source' }, row.inviteCode ? el('code', {}, row.inviteCode) : el('strong', {}, ui('Unknown')), row.inviteChannelId && el('span', {}, `# ${channelName(row.inviteChannelId)}`), el('small', {}, row.event === 'left' && row.inviteCode ? ui('Last recorded join source.') : ui(reasons[row.reason] || 'Source unavailable.'))), dateLabel(row.at)
    ])) : empty(rows.length ? ui('No matching invite entries.') : ui('No invite events recorded yet.'), rows.length ? ui('Try another member, inviter or invite code.') : ui('Turn on Log joins and departures and save. Future joins and departures will appear here, even without a challenge.'), 'gift'));
  };
  const refresh = button(ui('Refresh history'), async () => {
    if (busy) return;
    if (state.dirty) { toast(ui('Save your settings before refreshing history.')); return; }
    busy = true; refresh.disabled = true;
    try { if (!DEMO) { const latest = await api(guildPath()); if (latest.guild.id !== state.guildId) return; state.detail.community.snapshot = latest.community.snapshot; state.detail.members = latest.members; rows = latest.community.snapshot.inviteLog || []; } draw(); }
    catch (error) { toast(uiError(error)); }
    finally { busy = false; refresh.disabled = false; }
  }, 'secondary');
  container.replaceChildren(panel(ui('Invite history'), [el('div', { className: 'form-section' }, el('div', { className: 'field-row' }, field(ui('Search invite history'), el('input', { type: 'search', placeholder: ui('Member, inviter or invite code'), onInput: e => { query = e.target.value.trim().toLowerCase(); draw(); } })), field(ui('Event type'), el('select', { onChange: e => { eventKind = e.target.value; draw(); } }, el('option', { value: '' }, ui('All events')), el('option', { value: 'joined' }, ui('Joins')), el('option', { value: 'left' }, ui('Departures'))))), summary), results], refresh));
  draw();
}

function renderModeration(main) {
  const session = formSession('moderation');
  main.append(heading(ui('Moderation'), ui('Set clear boundaries and keep a useful record of moderation decisions.'), null));
  settingsLayout(main, session, [panel(ui('Moderation & filters'), [toggleSection(session, ui('Enable moderation'), ui('Allow moderation tools and configured message filters.'), 'enabled'), el('div', { className: 'form-section' }, channelField(session, ui('Moderation log channel'), 'modLogChannelId', ui('Choose a text channel for moderation records. Its Discord permissions decide who can read them.')), linesField(session, ui('Blocked words & phrases'), 'blockedWords', ui('One entry per line. The filter checks new messages and edits. Keep your list specific. Up to 100 entries, 80 characters each.'), 100, 80))]), panel(ui('Anti-spam'), [toggleSection(session, ui('Automatically handle message floods'), ui('Time out members who exceed your message limit.'), 'antiSpam.enabled'), el('div', { className: 'form-section' }, el('div', { className: 'field-row' }, textField(session, ui('Message limit'), 'antiSpam.maxMessages', ui('Messages in one time window.'), { type: 'number', min: 3, max: 30 }), textField(session, ui('Time window (seconds)'), 'antiSpam.windowSeconds', ui('How long to watch for a flood.'), { type: 'number', min: 3, max: 60 })), textField(session, ui('Timeout length (minutes)'), 'antiSpam.timeoutMinutes', ui('How long a spam timeout lasts.'), { type: 'number', min: 1, max: 1440 }))])], [contextCard(ui('Tools for your moderators'), ui('Use /moderate warn, /moderate timeout, /moderate kick, /moderate ban, and /moderate purge in Discord. Actions require the corresponding Discord permission and respect role hierarchy.'), 'shield'), contextCard(ui('Give the bot the right access'), ui('Filters need Message Content intent. Timeouts need Moderate Members. Logging needs access to the selected channel.'), 'lock')]);
  const cases = state.detail.moderation.snapshot.moderationCases || [];
  main.append(el('div', { className: 'section-gap' }, panel(ui('Recent moderation cases'), cases.length ? table(['Action', 'Member', 'Reason', 'Date'], cases.slice(0, 15).map(c => [tag(moderationAction(c.action), 'muted'), el('span', { className: 'leaderboard-identity' }, userLabel(c.userId)), c.reason || ui('No reason recorded'), dateLabel(c.createdAt)])) : empty(ui('No moderation cases yet.'), ui('Actions handled by the bot will appear here.'), 'shield'))));
}

function recoveryKind(kind) { return ui(({ 'ticket-create': 'Ticket creation', 'ticket-close': 'Ticket closure', 'application-submit': 'Application submission', 'application-accept': 'Application acceptance' })[kind] || 'Interrupted operation'); }
function recoveryStage(stage) { return ui(({ prepared: 'Prepared', sending: 'Sending', 'transcript-saved': 'Transcript saved', archiving: 'Archiving', deleting: 'Deleting', 'role-changing': 'Changing role', 'needs-review': 'Needs review' })[stage] || 'Needs review'); }

function renderRecoveryIssues(main, recordType) {
  const issues = (state.detail.moderation.snapshot.recoveryIssues || []).filter(issue => issue.recordType === recordType);
  if (!issues.length) return;
  main.append(el('section', { className: 'recovery-notice', 'aria-label': ui('Interrupted operations') }, panel(ui('Needs staff review'), el('div', { className: 'panel-body' }, el('p', { className: 'form-intro' }, ui('An operation was interrupted. Check the Discord channel or review message and the bot log before repeating it; a step may already have completed.')), el('ul', { className: 'recovery-list' }, issues.map(issue => el('li', {}, el('strong', {}, ui('{kind} · {id}', { kind: recoveryKind(issue.kind), id: issue.id })), el('span', {}, ui("Stage: {p0}", { p0: recoveryStage(issue.stage) })), issue.operationId && el('p', {}, ui('Operation: '), el('code', {}, issue.operationId)), el('p', {}, uiError({ message: issue.detail, i18n: issue.detailI18n }))))), el('div', { className: 'hint-box' }, ui('Use '), el('code', {}, '/support-recovery list'), ui(' in Discord to recheck. After inspecting the outcome, an administrator can use '), el('code', {}, '/support-recovery release'), ui(' with the operation ID and a review reason. Releasing clears stalled local state; it does not change or delete anything in Discord.'))), tag(ui("{p0} to review", { p0: issues.length }), 'orange'))));
}
function table(headers, rows) { return el('div', { className: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, headers.map(header => el('th', { scope: 'col' }, ui(header))))), el('tbody', {}, rows.map(row => el('tr', {}, row.map(cell => el('td', {}, cell))))))); }
function simpleLeaderboard(rows, headings, cells, emptyCopy) {
  return rows.length ? table(['#', 'Member', ...headings], rows.slice(0, 10).map((row, i) => [el('span', { className: `rank${i === 0 ? ' first' : ''}` }, String(i + 1).padStart(2, '0')), el('span', { className: 'leaderboard-identity' }, userLabel(row.userId)), ...cells(row)])) : empty(ui('The leaderboard starts with your members.'), ui(emptyCopy), 'award');
}
function staffLeaderboardRows(rows, sort, query, activity, labelForId = userLabel) {
  const number = value => Number.isFinite(value) ? value : 0;
  const normalized = rows.map(row => ({ ...row, claims: number(row.claims), closes: number(row.closes), openAssigned: number(row.openAssigned), moderationActions: number(row.moderationActions), applicationsReviewed: number(row.applicationsReviewed), totalActions: Number.isFinite(row.totalActions) ? row.totalActions : number(row.claims) + number(row.closes) + number(row.moderationActions) + number(row.applicationsReviewed) }));
  const timeSort = sort === 'averageClaimSeconds' || sort === 'averageCloseSeconds';
  const sorted = normalized.sort((a, b) => {
    const left = timeSort ? a[sort] ?? Infinity : number(a[sort]);
    const right = timeSort ? b[sort] ?? Infinity : number(b[sort]);
    const difference = timeSort ? left - right : right - left;
    return (Number.isNaN(difference) ? 0 : difference) || b.totalActions - a.totalActions || String(a.userId).localeCompare(String(b.userId));
  });
  const needle = query.trim().toLocaleLowerCase();
  return sorted.map((row, index) => ({ ...row, rank: index + 1 })).filter(row => {
    const matchesName = !needle || `${labelForId(row.userId)} ${row.userId}`.toLocaleLowerCase().includes(needle);
    const matchesActivity = activity === 'tickets' ? row.claims + row.closes > 0 : activity === 'moderation' ? row.moderationActions > 0 : activity === 'applications' ? row.applicationsReviewed > 0 : true;
    return matchesName && matchesActivity;
  });
}
function renderStaff(main) {
  const rows = state.detail.moderation.snapshot.staffLeaderboard?.[state.staffPeriod] || [];
  const allRows = staffLeaderboardRows(rows, 'totalActions', '', 'all');
  const total = key => allRows.reduce((sum, row) => sum + row[key], 0);
  main.append(heading(ui('Staff leaderboard'), ui('Tickets, moderation and application reviews handled through Cyro.'), link(ui('Staff commands'), 'help')),
    el('div', { className: 'metrics staff-metrics' }, metric(ui('Active staff'), format(allRows.filter(row => row.totalActions > 0).length), ui('With recorded actions in this period'), 'users'), metric(ui('Tickets closed'), format(total('closes')), ui('Completed during this period'), 'ticket'), metric(ui('Total actions'), format(total('totalActions')), ui('Claims, closes, moderation and reviews'), 'check'), metric(ui('Assigned now'), format(total('openAssigned')), ui('Open tickets currently claimed by staff'), 'clock')));
  const tabs = el('div', { className: 'tabs', 'aria-label': ui('Leaderboard time period') }, [['7d', '7 days'], ['30d', '30 days'], ['all', 'Retained history']].map(([key, title]) => el('button', { type: 'button', 'aria-pressed': state.staffPeriod === key ? 'true' : 'false', onClick: () => { state.staffPeriod = key; renderShell(); } }, ui(title))));
  const ranking = el('div', { className: 'staff-ranking' });
  const summary = el('p', { className: 'staff-results', role: 'status', 'aria-live': 'polite' });
  const search = el('input', { type: 'search', value: state.staffQuery, placeholder: ui('Name or Discord ID'), autocomplete: 'off', onInput: event => { state.staffQuery = event.target.value; drawRows(); } });
  const sorts = [['totalActions', 'Most total actions'], ['closes', 'Most tickets closed'], ['claims', 'Most tickets claimed'], ['moderationActions', 'Most moderation actions'], ['applicationsReviewed', 'Most applications reviewed'], ['openAssigned', 'Most tickets assigned now'], ['averageClaimSeconds', 'Fastest average claim'], ['averageCloseSeconds', 'Fastest average close']];
  const sort = el('select', { onChange: event => { state.staffSort = event.target.value; drawRows(); } }, sorts.map(([value, label]) => el('option', { value, selected: value === state.staffSort }, ui(label))));
  const activity = el('select', { onChange: event => { state.staffActivity = event.target.value; drawRows(); } }, [['all', 'All staff activity'], ['tickets', 'Ticket activity'], ['moderation', 'Moderation activity'], ['applications', 'Application reviews']].map(([value, label]) => el('option', { value, selected: value === state.staffActivity }, ui(label))));
  const toolbar = el('div', { className: 'staff-toolbar' }, field(ui('Find a staff member'), search), field(ui('Sort by'), sort), field(ui('Show staff with'), activity));
  const headers = ['Rank', 'Staff member', 'Total actions', 'Claims', 'Closes', 'Moderation', 'Applications', 'Assigned now', 'Avg. claim', 'Avg. close'];
  const time = value => value == null ? '—' : duration(value);
  function drawRows() {
    const visible = staffLeaderboardRows(rows, state.staffSort, state.staffQuery, state.staffActivity);
    window.CyroI18n.setContent(summary, ui("{p0} of {p1} staff shown · {p2}.", { p0: visible.length, p1: allRows.length, p2: ui(sorts.find(([value]) => value === state.staffSort)?.[1] || 'Most total actions') }));
    if (!visible.length) {
      ranking.replaceChildren(empty(allRows.length ? ui('No staff match these filters.') : ui('No staff activity recorded yet.'), allRows.length ? ui('Try a different name or choose All staff activity.') : ui('Claim or close a ticket, take a moderation action, or review an application through Cyro to start recording activity.'), 'award', allRows.length ? button(ui('Clear filters'), () => { search.value = ''; activity.value = 'all'; state.staffQuery = ''; state.staffActivity = 'all'; drawRows(); }, 'secondary') : link(ui('Set up support tickets'), 'tickets')));
      return;
    }
    ranking.replaceChildren(el('div', { className: 'table-wrap staff-table-wrap', tabindex: '0', role: 'region', 'aria-label': ui('Staff activity table') }, el('table', { className: 'staff-table' },
      el('caption', { className: 'sr-only' }, ui('Staff activity in the selected period. Assigned now is the current workload. Missing averages are shown as a dash. Rank uses the selected sort before filtering.')),
      el('thead', {}, el('tr', {}, headers.map(label => el('th', { scope: 'col' }, ui(label))))),
      el('tbody', {}, visible.map(row => {
        const name = userLabel(row.userId);
        const cells = [el('span', { className: 'rank' }, String(row.rank)), el('div', { className: 'table-name' }, el('span', { className: 'avatar', 'aria-hidden': 'true' }, String(name).slice(0, 2).toUpperCase()), el('span', { className: 'staff-name' }, name)), el('strong', {}, format(row.totalActions)), format(row.claims), format(row.closes), format(row.moderationActions), format(row.applicationsReviewed), format(row.openAssigned), time(row.averageClaimSeconds), time(row.averageCloseSeconds)];
        return el('tr', {}, cells.map((cell, index) => el('td', { 'data-label': ui(headers[index]) }, cell)));
      })))));
  }
  main.append(panel(ui('Team activity'), el('div', {}, toolbar, summary, ranking), tabs, ui('Use a period, activity filter or staff name to find the work you want to review.')),
    el('details', { className: 'staff-explainer' }, el('summary', {}, icon('help'), ui('What these numbers mean')), el('div', {},
      el('p', {}, el('strong', {}, ui('Total actions')), ui(' counts ticket claims, ticket closes, moderation actions and application reviews equally. It is an activity count, not a rating of staff quality.')),
      el('p', {}, el('strong', {}, ui('Average claim / close')), ui(' measures time from a ticket being created to that staff member claiming or closing it. A dash means no timed action is available.')),
      el('p', {}, el('strong', {}, ui('Assigned now')), ui(' is the current number of open tickets claimed by each staff member, regardless of the selected period.')),
      el('p', {}, el('strong', {}, ui('Retained history')), ui(' includes records still stored by Cyro. Actions taken outside Cyro and deleted historical records are not included. The summary totals cover the whole selected period, before filtering.')))));
  drawRows();
}

function duration(seconds) { if (seconds < 60) return ui('{value} sec', { value: format(Math.round(seconds)) }); if (seconds < 3600) return ui('{value} min', { value: format(Math.round(seconds / 60)) }); return ui('{value} hr', { value: window.CyroI18n.computedText(locale => (seconds / 3600).toLocaleString(locale === 'pt' ? 'pt-BR' : locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })) }); }

function trackedTime(milliseconds) {
  const minutes = Math.floor(Math.max(0, Number(milliseconds) || 0) / 60000);
  if (minutes === 0) return milliseconds > 0 ? ui('<1 min') : ui('{value} min', { value: format(0) });
  if (minutes < 60) return ui('{value} min', { value: format(minutes) });
  return minutes % 60 ? ui('{hours} hr {minutes} min', { hours: format(Math.floor(minutes / 60)), minutes: format(minutes % 60) }) : ui('{value} hr', { value: format(Math.floor(minutes / 60)) });
}
function streamMetric(value, signed = false) {
  if (!Number.isFinite(value)) return ui('Unavailable');
  return window.CyroI18n.computedText(locale => value.toLocaleString(locale === 'pt' ? 'pt-BR' : locale, { maximumFractionDigits: 1, signDisplay: signed && value > 0 ? 'always' : 'auto' }));
}
function streamCoverage(row, key) {
  const covered = Math.max(0, Number(row[key]) || 0), total = Math.max(0, Number(row.trackedMilliseconds) || 0);
  const percent = total > 0 ? Math.min(100, Math.round(covered / total * 100)) : 0;
  return el('small', { className: 'stream-metric-note', title: ui('{covered} of {total} confirmed time has this metric.', { covered: trackedTime(covered), total: trackedTime(total) }) }, ui("{p0}% coverage", { p0: percent }));
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
  const rangeNote = state.streamerPeriod === '7d' ? ui('Today and the previous 6 calendar days, in UTC.') : state.streamerPeriod === '30d' ? ui('Today and the previous 29 calendar days, in UTC.') : ui('Up to {days} days of retained history.', { days: format(retentionDays) });
  main.append(heading(ui('Streamer leaderboard'), ui('One creator, every connected platform. Explore the accounts behind their activity.'), el('a', { className: 'button secondary', href: '#streams' }, icon('radio'), ui('Manage alerts'))));
  const viewSelect = el('select', { id: 'streamer-view', onChange: event => { state.streamerView = event.target.value; renderShell(); document.getElementById('streamer-view')?.focus(); } }, [['creators', 'Creator profiles'], ['accounts', 'Platform accounts']].map(([value, name]) => el('option', { value, selected: state.streamerView === value }, ui(name))));
  const periodSelect = el('select', { id: 'streamer-period', onChange: event => { state.streamerPeriod = event.target.value; renderShell(); document.getElementById('streamer-period')?.focus(); } }, [['7d', 'Past 7 days'], ['30d', 'Past 30 days'], ['all', ui('Retained history · {days} days', { days: format(retentionDays) })]].map(([value, name]) => el('option', { value, selected: state.streamerPeriod === value }, ui(name))));
  const sortSelect = el('select', { id: 'streamer-sort', onChange: event => { state.streamerSort = event.target.value; renderShell(); document.getElementById('streamer-sort')?.focus(); } }, [['trackedMilliseconds', 'Tracked time'], ['averageViewers', 'Average concurrent viewers'], ['followersGained', 'Net followers']].map(([value, name]) => el('option', { value, selected: state.streamerSort === value }, ui(name))));
  main.append(el('div', { className: 'stream-stats-toolbar' }, el('div', { className: 'stream-stats-controls' }, el('div', { className: 'field' }, el('label', { className: 'field-label', for: 'streamer-view' }, ui('Leaderboard view')), viewSelect), el('div', { className: 'field' }, el('label', { className: 'field-label', for: 'streamer-period' }, ui('Leaderboard period')), periodSelect), el('div', { className: 'field' }, el('label', { className: 'field-label', for: 'streamer-sort' }, ui('Sort by')), sortSelect)), el('p', { className: 'stream-period-note' }, rangeNote)));
  if (!stats || (grouped && !stats.creatorLeaderboards)) {
    main.append(panel(ui('Stream activity'), empty(grouped ? ui('Creator statistics are not available yet.') : ui('Stream stats are not available yet.'), ui('This view needs a bot version that supplies these statistics. Your existing stream alerts can continue to run.'), 'chart', link(ui('Manage stream alerts'), 'streams'))));
  } else {
    main.append(el('div', { className: 'metrics' }, metric(grouped ? ui('Combined platform time') : ui('Tracked account time'), trackedTime(entries.reduce((sum, row) => sum + (row.trackedMilliseconds || 0), 0)), ui('Simulcasting counts on each platform'), 'clock'), metric(grouped ? ui('Creators ranked') : ui('Accounts ranked'), format(entries.length), ui('With activity in this period'), 'users'), metric(ui('Account sessions'), format(entries.reduce((sum, row) => sum + (row.sessions || 0), 0)), ui('Sessions across connected accounts'), 'radio'), metric(ui('Confirmed active'), format(entries.filter(row => row.active).length), grouped ? ui('Creators with an active account sample') : ui('At their most recent saved sample'), 'check', 'green')));
    const headers = ['Rank', grouped ? 'Creator' : 'Platform account', grouped ? 'Platform time' : 'Tracked time', 'Avg. viewers', grouped ? 'Highest platform peak' : 'Peak viewers', 'Net followers', 'Sessions', 'Status'];
    const ranking = entries.length ? el('div', { className: 'table-wrap stream-stats-table-wrap' }, el('table', { className: 'stream-stats-table' }, el('caption', { className: 'sr-only' }, ui("{p0} leaderboard. {p1} Sorted by {p2}. Unavailable metrics appear last.", { p0: ui(grouped ? 'Creator' : 'Account'), p1: rangeNote, p2: ui(({ trackedMilliseconds: 'Tracked time', averageViewers: 'Average concurrent viewers', followersGained: 'Net followers' })[state.streamerSort] || 'Tracked time') })), el('thead', {}, el('tr', {}, headers.map(name => el('th', { scope: 'col' }, ui(name))))), el('tbody', {}, entries.map((row, index) => {
      const identity = row.displayName || row.username || ui('Unknown creator');
      const platformLabel = grouped ? (row.platforms || []).map(platformName).join(' · ') : `${platformName(row.platform)} · ${row.username || ''}`;
      const cells = [el('span', { className: `rank${index === 0 ? ' first' : ''}` }, String(index + 1).padStart(2, '0')), el('div', { className: 'table-name' }, el('div', { className: 'stream-avatar' }, String(identity).slice(0, 2).toUpperCase()), el('div', {}, el('strong', {}, identity), el('small', {}, platformLabel), grouped && el('small', { className: 'stream-metric-note' }, ui("{p0} platform account(s)", { p0: row.accounts?.length || 0 })), row.discordMemberId && el('small', { className: 'stream-metric-note' }, userLabel(row.discordMemberId)))), el('strong', { className: 'stream-number' }, trackedTime(row.trackedMilliseconds)), el('div', {}, el('span', { className: Number.isFinite(row.averageViewers) ? 'stream-number' : 'stream-unavailable' }, streamMetric(row.averageViewers)), Number.isFinite(row.averageViewers) && streamCoverage(row, 'viewerTrackedMilliseconds')), el('span', { className: Number.isFinite(row.peakViewers) ? 'stream-number' : 'stream-unavailable' }, streamMetric(row.peakViewers)), el('div', {}, el('span', { className: Number.isFinite(row.followersGained) ? 'stream-number' : 'stream-unavailable' }, streamMetric(row.followersGained, true)), Number.isFinite(row.followersGained) && streamCoverage(row, 'followerTrackedMilliseconds')), el('span', { className: 'stream-number' }, format(row.sessions)), el('div', {}, tag(row.active ? ui('Confirmed active') : ui('Not active'), row.active ? 'green' : 'muted'), el('small', { className: 'stream-metric-note' }, row.lastTrackedAt ? ui("Last tracked {p0}", { p0: dateLabel(row.lastTrackedAt) }) : ui('No saved sample')))];
      return el('tr', {}, cells.map((cell, column) => el('td', { 'data-label': ui(headers[column]) }, cell)));
    })))) : empty(ui('The next live announcement starts the story.'), ui('No confirmed stream activity was tracked in this period. Add a creator in Stream alerts; counting begins when the bot posts a live announcement.'), 'radio', link(ui('Manage stream alerts'), 'streams'));
    main.append(panel(grouped ? ui('Creator standings') : ui('Platform account standings'), ranking, tag(DEMO ? ui('Sample statistics') : ui("{p0}-day retention", { p0: retentionDays }), 'muted'), grouped ? ui('Platform time is summed. The peak is the highest single-platform sample.') : ui('Unavailable metrics are never treated as zero.')));
  }
  main.append(el('div', { className: 'stream-stats-explainer' }, contextCard(ui('Every platform contributes its own time'), ui('Time starts at the bot’s live announcement and stops when the stream ends, alerts pause, or the announcement is deleted. Unconfirmed gaps are excluded. Creator totals add account time: one hour on Twitch and YouTube contributes two platform hours, even when broadcast together.'), 'clock'), contextCard(ui('Read the metrics in context'), ui('Viewer averages are weighted by each account’s covered time; peaks show the highest single-platform sample, not a combined audience. These are sampled concurrent viewers, not total views. Net followers sums supported Twitch gains minus losses; Kick, TikTok, and YouTube are unavailable. Its baseline begins at the first confirmed poll after the announcement. Coverage shows the platform time with that metric.'), 'chart')));
  main.append(el('footer', { className: 'overview-bottom' }, el('span', {}, icon('clock'), stats?.updatedAt ? ui(DEMO ? 'Sample updated {date}' : 'Last updated {date}', { date: dateLabel(stats.updatedAt) }) : ui('No saved samples yet')), el('span', {}, ui('Periods follow UTC calendar days. Refresh to load new samples.'))));
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

function creatorAccountCount(count) { return ui(count === 1 ? '{count} account' : '{count} accounts', { count: format(count) }); }

function renderStreams(main) {
  const streams = state.detail.streams || [];
  const creators = state.detail.creators || [];
  main.append(heading(ui('Creators & alerts'), ui('One profile for each creator, with separate live and uploaded-video announcements.'), button(ui('Create profile'), () => openStreamEditor('creator', {}), '', 'plus')));
  if (state.creatorEditor) renderCreatorEditor(main, state.creatorEditor);
  if (state.streamEditor) renderStreamEditor(main, state.streamEditor);
  main.append(el('div', { className: 'creator-list-summary' }, el('span', {}, ui("{p0} creator profile(s) · {p1} connected account(s)", { p0: creators.length, p1: streams.length })), link(ui('View streamer leaderboard'), 'streamer-leaderboard')));
  if (!creators.length) main.append(panel(ui('Your creators'), empty(ui('Start with the person behind the stream.'), ui('Create a profile, then connect their Twitch, Kick, TikTok, or YouTube accounts. Existing accounts are never merged automatically.'), 'users', button(ui('Create your first profile'), () => openStreamEditor('creator', {}), 'secondary', 'plus'))));
  for (const creator of creators) {
    const accounts = streams.filter(stream => stream.creatorId === creator.id);
    const retainedCount = Math.max(0, (creator.accountIds || []).length - accounts.length);
    const actions = el('div', { className: 'creator-actions' }, button(ui('Add platform'), () => openStreamEditor('account', { creatorId: creator.id }), 'secondary small', 'plus'), el('button', { type: 'button', className: 'icon-button', 'aria-label': ui("Edit profile {p0}", { p0: creator.name }), onClick: () => openStreamEditor('creator', creator) }, icon('edit')), !accounts.length && el('button', { type: 'button', className: 'icon-button', 'aria-label': ui("Delete empty profile {p0}", { p0: creator.name }), onClick: () => removeCreator(creator) }, icon('trash')));
    const header = el('div', { className: 'creator-header' }, el('div', { className: 'creator-identity' }, el('span', { className: 'stream-avatar' }, String(creator.name).slice(0, 2).toUpperCase()), el('div', {}, el('h2', {}, creator.name), el('p', {}, creator.discordMemberId ? ui("Discord member: {p0}", { p0: userLabel(creator.discordMemberId) }) : ui('No Discord member linked'), ' · ', creatorAccountCount(accounts.length)))), actions);
    const rows = accounts.map(stream => {
      const accountLabel = `${platformName(stream.platform)} ${stream.username}`;
      return el('li', { className: 'creator-account' }, el('div', { className: 'account-identity' }, tag(platformName(stream.platform)), el('div', {}, el('strong', {}, stream.username), el('small', {}, ui("Live: {p0}", { p0: stream.enabled ? ui('# {channel}', { channel: channelName(stream.alertChannelId) }) : ui('Off') })), stream.uploads?.enabled && el('small', {}, ui("Uploads: # {p0}", { p0: channelName(stream.uploads.channelId) })), stream.platform === 'tiktok' && !DEMO && el('a', { className: 'creator-connection-link', href: `/connections?guild=${encodeURIComponent(state.guildId)}&record=${encodeURIComponent(stream.id)}`, target: '_blank', rel: 'noopener noreferrer' }, stream.tiktokConnection?.connected ? ui('TikTok connection') : ui('Creator sign-in')))), el('div', { className: 'account-status' }, tag(!stream.enabled ? ui('Live off') : stream.state === 'live' ? ui('Live now') : ui('Watching'), stream.enabled && stream.state === 'live' ? 'green' : 'muted')), el('div', { className: 'table-actions' }, toggleControl(ui("Enable live alerts for {p0}", { p0: accountLabel }), stream.enabled, async enabled => { if (!await discardStreamDraft()) { renderShell(); return; } try { await saveStream(stream.id, { enabled }); stream.enabled = enabled; if (DEMO) syncDemoCreators(); toast(enabled ? ui('Live alerts enabled.') : ui('Live alerts paused. Upload settings are unchanged.')); renderShell(); } catch (error) { toast(uiError(error), true); renderShell(); } }), el('button', { type: 'button', className: 'icon-button', 'aria-label': ui("Edit account {p0}", { p0: accountLabel }), onClick: () => openStreamEditor('account', stream) }, icon('edit')), el('button', { type: 'button', className: 'icon-button', 'aria-label': ui("Remove account {p0}", { p0: accountLabel }), onClick: () => removeStream(stream) }, icon('trash'))));
    });
    main.append(el('section', { className: 'panel creator-card' }, header, accounts.length ? el('ul', { className: 'creator-accounts', 'aria-label': ui("{p0} platform accounts", { p0: creator.name }) }, rows) : el('div', { className: 'creator-empty' }, ui('No connected accounts. Add a platform to start announcing this creator.')), retainedCount > 0 && el('p', { className: 'panel-footer' }, ui("{p0} removed account(s) remain grouped here to preserve any history. Deleting an empty profile keeps past account statistics available individually.", { p0: retainedCount }))));
  }
  const unassigned = streams.filter(stream => !creators.some(creator => creator.id === stream.creatorId));
  if (unassigned.length) main.append(panel(ui('Accounts awaiting a profile'), el('div', { className: 'panel-body' }, el('p', { className: 'form-intro' }, ui('These accounts were not matched to a profile. Choose a profile explicitly to keep them separate until you decide.')), unassigned.map(stream => button(ui("Assign {p0} {p1}", { p0: platformName(stream.platform), p1: stream.username }), () => openStreamEditor('account', stream), 'secondary small')))));
  main.append(el('div', { className: 'integration-note' }, icon('help'), ui('Each account has its own alert settings. Multiple accounts on the same platform are supported. YouTube discovery slows as more channels are tracked (about 15 minutes per distinct channel by default). Provider availability depends on your host.')));
}

async function discardStreamDraft() {
  if (state.saving) return false;
  if (state.dirty && !await confirmAction(ui('Leave your unsaved changes?'), ui('Save your profile or account settings first, or discard them to continue.'))) return false;
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
  const message = el('span', { className: 'save-status', role: 'status' }, ui('A profile groups only the accounts you choose.'));
  const submit = el('button', { type: 'submit', className: 'button' }, editing ? ui('Save profile') : ui('Create profile'));
  form.append(el('div', { className: 'form-section' }, textField(session, ui('Creator name'), 'name', ui('The shared name displayed above this creator’s platform accounts.'), { required: true, maxlength: 80, placeholder: ui('Creator name') }), textField(session, ui('Discord member ID'), 'discordMemberId', ui('Optional. All linked accounts use this member when assigning their live roles.'), { maxlength: 20, placeholder: ui('Discord member ID') })), el('div', { className: 'save-bar' }, message, el('div', { className: 'login-actions' }, button(ui('Cancel'), () => { state.creatorEditor = null; state.dirty = false; renderShell(); }, 'secondary'), submit)));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    const body = { name: draft.name.trim(), discordMemberId: draft.discordMemberId?.trim() || null };
    if (!body.name || (body.discordMemberId && !/^\d{17,20}$/.test(body.discordMemberId))) { window.CyroI18n.setContent(message, !body.name ? ui('Enter a creator name.') : ui('Enter a valid Discord member ID, or leave it blank.')); message.className = 'save-status error'; return; }
    busy = true; state.saving = true; [...form.elements].forEach(control => { control.disabled = true; }); window.CyroI18n.setContent(submit, ui('Saving…'));
    try {
      if (DEMO) { if (editing) Object.assign(state.detail.creators.find(creator => creator.id === existing.id), body, { updatedAt: new Date().toISOString() }); else state.detail.creators.push({ ...body, id: `demo-creator-${crypto.randomUUID()}`, guildId: state.guildId, accountIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); syncDemoCreators(); }
      else { await api(editing ? `${guildPath()}/creators/${safeId(existing.id)}` : `${guildPath()}/creators`, editing ? 'PATCH' : 'POST', body); state.detail = await api(guildPath()); }
      state.creatorEditor = null; state.dirty = false; state.saving = false; renderShell(); toast(editing ? ui('Creator profile saved.') : ui('Profile created. Add a platform account when ready.'));
    } catch (error) { busy = false; state.saving = false; [...form.elements].forEach(control => { control.disabled = false; }); window.CyroI18n.setContent(message, uiError(error)); message.className = 'save-status error'; window.CyroI18n.setContent(submit, editing ? ui('Save profile') : ui('Create profile')); }
  });
  main.append(el('div', { className: 'stream-form-panel' }, panel(editing ? ui("Edit profile · {p0}", { p0: existing.name }) : ui('Create a creator profile'), form)));
}
async function removeCreator(creator) {
  if (!await discardStreamDraft()) return;
  if (state.detail.streams.some(stream => stream.creatorId === creator.id)) return toast(ui('Move or remove the connected accounts before deleting this profile.'), true);
  if (!await confirmAction(ui('Delete this empty profile?'), ui("Remove {p0}? This removes the profile grouping. Past account statistics are retained and remain available individually.", { p0: creator.name }), ui('Delete profile'), ui('Keep profile'))) return;
  state.saving = true;
  try { if (!DEMO) await api(`${guildPath()}/creators/${safeId(creator.id)}`, 'DELETE'); state.detail.creators = state.detail.creators.filter(item => item.id !== creator.id); if (DEMO) syncDemoCreators(); else state.detail = await api(guildPath()); renderShell(); toast(ui('Empty profile deleted. Past account statistics are retained.')); } catch (error) { toast(uiError(error), true); } finally { state.saving = false; }
}

function renderStreamEditor(main, existing) {
  const editing = Boolean(existing.id);
  const draft = { creatorId: '', platform: 'twitch', username: '', alertChannelId: '', pingRoleId: null, liveRoleId: null, titleFilter: '', cooldownSeconds: 300, messageTemplate: '', cleanupMode: 'offline', enabled: true, ...clone(existing) };
  draft.uploads = { enabled: false, channelId: existing.alertChannelId || '', pingRoleId: null, titleFilter: '', messageTemplate: '', ...clone(existing.uploads || {}) };
  let busy = false;
  const form = el('form', { className: 'stream-editor' });
  const session = { config: draft, change: (path, value) => { putPath(draft, path, value); state.streamEditor = draft; state.dirty = true; } };
  const message = el('span', { className: 'save-status', role: 'status' }, editing ? ui('Settings apply only to this platform account.') : ui('Connect another account to the selected profile.'));
  const submit = el('button', { type: 'submit', className: 'button' }, editing ? ui('Save account') : ui('Connect account'));
  const creators = state.detail.creators || [];
  const memberNote = el('div', { className: 'hint-box' });
  const updateMemberNote = () => { const creator = creators.find(item => item.id === draft.creatorId); window.CyroI18n.setContent(memberNote, creator?.discordMemberId ? ui("Live roles use {p0} from {p1}’s profile. Edit the profile to change this member.", { p0: userLabel(creator.discordMemberId), p1: creator.name }) : ui('The selected profile has no Discord member linked. Add one to the profile before using a role while live.')); };
  updateMemberNote();
  const creatorSelect = el('select', { required: true, onChange: event => { session.change('creatorId', event.target.value); updateMemberNote(); } }, el('option', { value: '', selected: !draft.creatorId }, ui('Choose a creator profile')), creators.map(creator => el('option', { value: creator.id, selected: draft.creatorId === creator.id }, creator.name)));
  const uploadSection = el('div', { className: 'form-section' });
  const drawUploadSettings = () => uploadSection.replaceChildren(uploadSettingsFields(session, existing));
  const platformSelect = el('select', { disabled: editing, onChange: event => { session.change('platform', event.target.value); if (!['youtube', 'tiktok'].includes(draft.platform)) session.change('uploads.enabled', false); drawUploadSettings(); } }, ['twitch', 'kick', 'tiktok', 'youtube'].map(platform => el('option', { value: platform, selected: draft.platform === platform }, platformName(platform))));
  const username = textField(session, ui('Account username or YouTube channel'), 'username', ui('Twitch, Kick, TikTok: account username. YouTube: @handle, channel ID, or a youtube.com/@handle or /channel/ID URL.'), { required: true, maxlength: 100, placeholder: ui('creatorname or @YouTubeHandle') });
  if (editing) username.querySelector('input').disabled = true;
  form.append(el('div', { className: 'form-section' }, field(ui('Creator profile'), creatorSelect, editing ? ui('Choose another profile to move this account and its retained history. Accounts are never merged automatically.') : ui('You can link multiple different accounts from the same platform.')), el('div', { className: 'field-row' }, field(ui('Streaming platform'), platformSelect), username), channelField(session, ui('Alert channel'), 'alertChannelId', ui('The bot needs permission to send messages and embed links here.')), el('div', { className: 'field-row' }, roleField(session, ui('Role to notify'), 'pingRoleId', ui('Optional role mention in announcements.')), roleField(session, ui('Role while live'), 'liveRoleId', ui('Optional role given to the member on the creator profile.'))), memberNote, el('div', { className: 'field-row section-gap' }, textField(session, ui('Title filter'), 'titleFilter', ui('Optional text the stream title must contain.')), textField(session, ui('Alert cooldown (seconds)'), 'cooldownSeconds', ui('Minimum time between announcements.'), { type: 'number', min: 0, max: 86400 })), textField(session, ui('Announcement message'), 'messageTemplate', ui('Leave blank for the default. Placeholders: {streamer}, {username}, {platform}, {url}, {title}, {category}, {viewers}, {mention}.'), { multiline: true, maxlength: 1800 }), field(ui('When the stream ends'), el('select', { onChange: event => session.change('cleanupMode', event.target.value) }, [['offline', 'Update the message to offline'], ['delete', 'Delete the announcement'], ['keep', 'Keep the announcement']].map(([value, text]) => el('option', { value, selected: value === draft.cleanupMode }, ui(text)))))));
  form.prepend(toggleSection(session, ui('Announce when live'), ui('Watch this account for live streams. Upload alerts can run separately.'), 'enabled'));
  if (existing.liveCapability?.reason) form.append(el('div', { className: 'form-section provider-note' }, uiError({ message: existing.liveCapability.reason, i18n: existing.liveCapability.i18n })));
  drawUploadSettings(); form.append(uploadSection);
  form.append(el('div', { className: 'save-bar' }, message, el('div', { className: 'login-actions' }, button(ui('Cancel'), () => { state.streamEditor = null; state.dirty = false; renderShell(); }, 'secondary'), submit)));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !form.reportValidity()) return;
    if (!draft.creatorId || (draft.enabled && !draft.alertChannelId) || (draft.uploads.enabled && !draft.uploads.channelId)) { window.CyroI18n.setContent(message, ui('Choose a creator profile and a destination channel for each enabled alert type.')); message.className = 'save-status error'; return; }
    if (draft.liveRoleId && !creators.find(creator => creator.id === draft.creatorId)?.discordMemberId) { window.CyroI18n.setContent(message, ui('Add a Discord member to this creator profile before assigning a live role.')); message.className = 'save-status error'; return; }
    if (DEMO && state.detail.streams.some(stream => stream.id !== existing.id && stream.platform === draft.platform && stream.username.toLowerCase() === draft.username.trim().toLowerCase())) { window.CyroI18n.setContent(message, ui('This platform account is already connected. Edit it to move it between profiles.')); message.className = 'save-status error'; return; }
    busy = true; state.saving = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(submit, editing ? ui('Saving…') : ui('Connecting…')); window.CyroI18n.setContent(message, ui('Checking creator and channel access…'));
    const keys = ['creatorId', 'alertChannelId', 'pingRoleId', 'liveRoleId', 'titleFilter', 'cooldownSeconds', 'messageTemplate', 'cleanupMode', 'enabled', 'uploads'];
    const body = Object.fromEntries(keys.map(key => [key, draft[key] ?? null]));
    body.uploads = { ...draft.uploads, channelId: draft.uploads.channelId || '' };
    if (!editing) { body.platform = draft.platform; body.username = draft.username; }
    try {
      if (DEMO) { if (editing) Object.assign(state.detail.streams.find(s => s.id === existing.id), body); else state.detail.streams.push({ ...body, id: `demo-account-${crypto.randomUUID()}`, displayName: draft.username, state: 'unknown' }); syncDemoCreators(); }
      else { await api(editing ? `${guildPath()}/streams/${safeId(existing.id)}` : `${guildPath()}/streams`, editing ? 'PATCH' : 'POST', body); state.detail = await api(guildPath()); }
      state.streamEditor = null; state.dirty = false; state.saving = false; toast(editing ? ui('Account settings saved.') : ui('Platform account connected.')); renderShell();
    } catch (error) { window.CyroI18n.setContent(message, uiError(error)); message.className = 'save-status error'; busy = false; state.saving = false; controls.forEach(([control, wasDisabled]) => { control.disabled = wasDisabled; }); window.CyroI18n.setContent(submit, editing ? ui('Save account') : ui('Connect account')); }
  });
  main.append(el('div', { className: 'stream-form-panel' }, panel(editing ? ui("Edit account · {p0} {p1}", { p0: platformName(existing.platform), p1: existing.username }) : ui('Connect a platform account'), form)));
}
async function saveStream(id, patch) { if (DEMO) { Object.assign(state.detail.streams.find(s => s.id === id), patch); return; } state.saving = true; try { return await api(`${guildPath()}/streams/${safeId(id)}`, 'PATCH', patch); } finally { state.saving = false; } }
async function removeStream(stream) {
  if (!await discardStreamDraft()) return;
  const confirmed = await confirmAction(ui('Remove this platform account?'), ui("Stop {p0} alerts for {p1}? The creator profile and other accounts stay connected. Retained statistics remain available.", { p0: platformName(stream.platform), p1: stream.username }), ui('Remove account'), ui('Keep account'));
  if (!confirmed) return;
  state.saving = true;
  try { if (!DEMO) await api(`${guildPath()}/streams/${safeId(stream.id)}`, 'DELETE'); state.detail.streams = state.detail.streams.filter(s => s.id !== stream.id); if (DEMO) syncDemoCreators(); else state.detail = await api(guildPath()); renderShell(); toast(ui('Platform account removed.')); } catch (error) { toast(uiError(error), true); } finally { state.saving = false; }
}
function confirmAction(title, description, confirmText = ui('Discard changes'), cancelText = ui('Keep editing')) {
  const dialog = document.getElementById('confirm-dialog');
  window.CyroI18n.setContent(document.getElementById('confirm-title'), title); window.CyroI18n.setContent(document.getElementById('confirm-description'), description);
  window.CyroI18n.setContent(dialog.querySelector('[value="confirm"]'), confirmText); window.CyroI18n.setContent(dialog.querySelector('[value="cancel"]'), cancelText);
  dialog.returnValue = '';
  return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal(); });
}

async function selectGuild(id, force = false) {
  if (state.saving) { toast(ui('Please wait for your settings to finish saving.')); const select = document.getElementById('guild-select'); select.value = state.guildId; window.CyroSearchSelect.sync(select); return; }
  if (state.dirty && !force && !await confirmAction(ui('Leave your unsaved changes?'), ui('Your changes have not been saved. Switching servers will discard them.'))) { const select = document.getElementById('guild-select'); select.value = state.guildId; window.CyroSearchSelect.sync(select); return; }
  state.dirty = false; state.streamEditor = null; state.creatorEditor = null; state.guildId = id; state.detail = null; state.loadError = null;
  const sequence = ++state.loadSequence;
  const url = new URL(location.href); url.searchParams.set('guild', id); history.replaceState({}, '', url);
  if (!DEMO) { try { sessionStorage.setItem('cyro.selectedGuild', id); } catch {} }
  if (!state.guilds.find(g => g.id === id)?.installed) { renderShell(); return; }
  state.loading = true; renderShell();
  try { const detail = DEMO ? demoData() : await api(`/api/guilds/${safeId(id)}`); if (sequence !== state.loadSequence) return; state.detail = detail; } catch (error) { if (sequence !== state.loadSequence) return; state.loadError = uiError(error); }
  state.loading = false; renderShell();
}
async function refreshGuilds() {
  if (DEMO) return;
  try { state.guilds = (await api('/api/guilds')).guilds; await selectGuild(state.guildId, true); } catch (error) { toast(uiError(error), true); }
}
async function logout() {
  if (state.saving) return toast(ui('Please wait for your settings to finish saving.'));
  if (state.dirty && !await confirmAction(ui('Sign out without saving?'), ui('Your unsaved changes will be discarded.'), ui('Sign out'))) return;
  if (DEMO) { location.href = '/'; return; }
  try { await api('/auth/logout', 'POST'); state.me = null; state.dirty = false; renderLanding(); } catch (error) { toast(uiError(error), true); }
}
let ignoreHash = false;
window.matchMedia('(min-width: 721px)').addEventListener('change', event => { if (event.matches) closeNavigation?.(false); });
window.addEventListener('hashchange', async () => {
  if (ignoreHash) { ignoreHash = false; return; }
  if (!state.me || document.querySelector('.home-page')) return;
  if (state.saving) { ignoreHash = true; location.hash = state.page; toast(ui('Please wait for your settings to finish saving.')); return; }
  if (state.dirty && !await confirmAction(ui('Leave your unsaved changes?'), ui('You can save your settings before opening another page.'))) { ignoreHash = true; location.hash = state.page; return; }
  state.dirty = false; state.streamEditor = null; state.creatorEditor = null; renderShell(); document.getElementById('main')?.focus({ preventScroll: true }); window.scrollTo({ top: 0 });
});
window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('click', event => { if (state.saving) { event.preventDefault(); event.stopPropagation(); toast(ui('Please wait for your settings to finish saving.')); } }, true);

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
  const staff = [{ userId: '400000000000000001', claims: 12, closes: 10, averageClaimSeconds: 164, averageCloseSeconds: 1840, openAssigned: 0, moderationActions: 4, applicationsReviewed: 3 }, { userId: '400000000000000002', claims: 9, closes: 8, averageClaimSeconds: 287, averageCloseSeconds: 2460, openAssigned: 1, moderationActions: 2, applicationsReviewed: 5 }, { userId: '400000000000000003', claims: 6, closes: 5, averageClaimSeconds: 342, averageCloseSeconds: 3210, openAssigned: 0, moderationActions: 0, applicationsReviewed: 2 }];
  state.demoDetail = { guild: { id, name: 'The Common Room', memberCount: 1284 }, channels: [['1', 'counting-club', 0], ['2', 'welcome', 0], ['3', 'live-now', 0], ['4', 'staff-log', 0], ['5', 'general', 0], ['6', 'applications', 0], ['7', 'Support', 4], ['8', 'Closed tickets', 4]].map(([suffix, name, type]) => ({ id: channel + suffix, name, type })), roles: [['1', 'Community'], ['2', 'Support team'], ['3', 'Stream alerts'], ['4', 'Creators']].map(([suffix, name]) => ({ id: role + suffix, name })), members: [{ id: staff[0].userId, displayName: 'Sam' }, { id: staff[1].userId, displayName: 'Jamie' }, { id: staff[2].userId, displayName: 'Alex' }], community: { config, snapshot: { config, counting: { current: 428, best: 612, lastUserId: staff[0].userId }, inviteTracking: { ready: true, note: 'Sample invite history. No Discord events are sent.' }, inviteLeaderboard: [{ userId: staff[0].userId, active: 7, total: 9 }, { userId: staff[1].userId, active: 5, total: 5 }], levelLeaderboard: [{ userId: staff[2].userId, xp: 1240, level: 4 }, { userId: staff[0].userId, xp: 820, level: 3 }] } }, moderation: { config: modConfig, snapshot: { config: modConfig, moderationCases: [], tickets: [{ id: 'T-0012', ownerId: staff[0].userId, channelId: `${channel}5`, status: 'open', createdAt: '2026-10-10T19:42:00Z', claimedBy: staff[1].userId }, { id: 'T-0011', ownerId: staff[2].userId, channelId: `${channel}5`, status: 'open', createdAt: '2026-10-10T18:30:00Z', claimedBy: null }, { id: 'T-0010', ownerId: staff[1].userId, channelId: `${channel}5`, status: 'closed', createdAt: '2026-10-10T15:10:00Z', closedAt: '2026-10-10T16:00:00Z' }], applications: [], staffLeaderboard: { '7d': staff, '30d': staff.map(s => ({ ...s, claims: s.claims * 3, closes: s.closes * 3 })), all: staff.map(s => ({ ...s, claims: s.claims * 7, closes: s.closes * 7 })) } } }, streams: [{ id: 'sample-1', platform: 'twitch', username: 'lunaplays', displayName: 'LunaPlays', alertChannelId: `${channel}3`, state: 'live', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }, { id: 'sample-2', platform: 'kick', username: 'afterhours', displayName: 'AfterHours', alertChannelId: `${channel}3`, state: 'offline', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }, { id: 'sample-3', platform: 'twitch', username: 'oakandember', displayName: 'Oak & Ember', alertChannelId: `${channel}3`, state: 'offline', enabled: true, cooldownSeconds: 300, cleanupMode: 'offline', messageTemplate: '' }] };
  state.demoDetail.community.snapshot.inviteLog = [
    { id: 'sample-log-3', event: 'joined', memberId: staff[2].userId, memberName: 'Alex', inviterId: null, inviteCode: null, inviteChannelId: null, source: 'unknown', reason: 'ambiguous', at: '2026-10-12T21:04:00Z' },
    { id: 'sample-log-2', event: 'left', memberId: staff[1].userId, memberName: 'Jamie', inviterId: staff[0].userId, inviteCode: 'community', inviteChannelId: `${channel}2`, source: 'invite', reason: 'matched', at: '2026-10-12T20:15:00Z' },
    { id: 'sample-log-1', event: 'joined', memberId: staff[1].userId, memberName: 'Jamie', inviterId: staff[0].userId, inviteCode: 'community', inviteChannelId: `${channel}2`, source: 'invite', reason: 'matched', at: '2026-10-12T19:40:00Z' }
  ];
  const now = new Date().toISOString();
  state.demoDetail.roles.push({ id: `${role}5`, name: 'Community supporter' });
  state.demoDetail.statusRoles = { config: { enabled: true, text: 'discord.gg/commonroom', roleId: `${role}5`, match: 'contains', caseSensitive: false, offlineBehavior: 'keep' }, available: true, counts: { assigned: 18, pendingAdd: 0, pendingRemove: 0 }, warnings: [] };
  state.demoDetail.tempVoice = { config: { enabled: false, lobbyChannelId: null, categoryId: null, nameTemplate: "{name}'s room", userLimit: 0, maxRooms: 10, ownerControls: true }, rooms: [], pending: 0, warnings: [] };
  const clockAsOf = Date.now();
  state.demoDetail.timeClock = {
    config: { enabled: true, channelId: `${channel}4`, roleIds: [`${role}2`] },
    members: [
      { userId: staff[0].userId, totalMs: 41400000, completedMs: 36000000, activeMs: 5400000, startedAt: clockAsOf - 5400000, shifts: 4, lastShiftMs: 9000000 },
      { userId: staff[1].userId, totalMs: 25200000, completedMs: 25200000, activeMs: 0, startedAt: null, shifts: 3, lastShiftMs: 7200000 },
      { userId: staff[2].userId, totalMs: 12600000, completedMs: 10800000, activeMs: 1800000, startedAt: clockAsOf - 1800000, shifts: 2, lastShiftMs: 5400000 }
    ], counts: { members: 3, active: 2, totalMs: 79200000 }, asOf: clockAsOf
  };
  state.demoDetail.communityTools = { config: { bugs: { enabled: false, cooldownMinutes: 5, categories: [] }, stickies: [] }, reports: [], counts: { open: 0, in_progress: 0, resolved: 0, dismissed: 0, pending: 0 }, stickyStates: [], page: 1, totalPages: 1 };
  state.demoDetail.channels.push({ id: `${channel}10`, name: 'The lounge', type: 2 }, { id: `${channel}11`, name: 'confessions', type: 0 });
  state.demoDetail.voice = {
    config: { musicEnabled: true, ttsEnabled: true, announceSpeaker: false, defaultVoice: 'voice1', volume: 50, maxTrackMinutes: 15 },
    voices: [
      { id: 'voice1', name: 'Daniel · British male', gender: 'male', accent: 'British', language: 'en' },
      { id: 'voice2', name: 'Michael · American male', gender: 'male', accent: 'American', language: 'en' },
      { id: 'voice3', name: 'Heart · American female', gender: 'female', accent: 'American', language: 'en' },
      { id: 'voice4', name: 'Bella · American female', gender: 'female', accent: 'American', language: 'en' },
      { id: 'voice5', name: 'Fenrir · American male', gender: 'male', accent: 'American', language: 'en' },
      { id: 'voice6', name: 'Puck · American male', gender: 'male', accent: 'American', language: 'en' },
      { id: 'voice7', name: 'George · British male', gender: 'male', accent: 'British', language: 'en' },
      { id: 'voice8', name: 'Fable · British male', gender: 'male', accent: 'British', language: 'en' },
      { id: 'voice9', name: 'Nicole · American female', gender: 'female', accent: 'American', language: 'en' },
      { id: 'voice10', name: 'Emma · British female', gender: 'female', accent: 'British', language: 'en' },
      { id: 'voice11', name: 'Aoede · American female', gender: 'female', accent: 'American', language: 'en' },
      { id: 'voice12', name: 'Sarah · American female', gender: 'female', accent: 'American', language: 'en' },
      { id: 'fr-siwis', name: 'Siwis · French female', gender: 'female', accent: 'French', language: 'fr' },
      { id: 'es-dora', name: 'Dora · Spanish female', gender: 'female', accent: 'Spanish', language: 'es' },
      { id: 'es-alex', name: 'Alex · Spanish male', gender: 'male', accent: 'Spanish', language: 'es' },
      { id: 'es-santa', name: 'Santa · Spanish male', gender: 'male', accent: 'Spanish', language: 'es' },
      { id: 'de-thorsten', name: 'Thorsten · German male', gender: 'male', accent: 'German', language: 'de', available: true },
      { id: 'de-kerstin', name: 'Kerstin · German female', gender: 'female', accent: 'German', language: 'de', available: true },
      { id: 'it-sara', name: 'Sara · Italian female', gender: 'female', accent: 'Italian', language: 'it' },
      { id: 'it-nicola', name: 'Nicola · Italian male', gender: 'male', accent: 'Italian', language: 'it' },
      { id: 'pt-dora', name: 'Dora · Brazilian Portuguese female', gender: 'female', accent: 'Brazilian', language: 'pt-BR' },
      { id: 'pt-alex', name: 'Alex · Brazilian Portuguese male', gender: 'male', accent: 'Brazilian', language: 'pt-BR' },
      { id: 'pt-santa', name: 'Santa · Brazilian Portuguese male', gender: 'male', accent: 'Brazilian', language: 'pt-BR' },
      { id: 'hi-alpha', name: 'Alpha · Hindi female', gender: 'female', accent: 'Hindi', language: 'hi' },
      { id: 'hi-beta', name: 'Beta · Hindi female', gender: 'female', accent: 'Hindi', language: 'hi' },
      { id: 'hi-omega', name: 'Omega · Hindi male', gender: 'male', accent: 'Hindi', language: 'hi' },
      { id: 'hi-psi', name: 'Psi · Hindi male', gender: 'male', accent: 'Hindi', language: 'hi' },
    ],
    available: { music: true, tts: true }, notes: ['Free local voices cover English, French, Spanish, German, Brazilian Portuguese, Italian and Hindi when their host runtimes are installed. Search /ttsvoice by voice name or language. Speech reads the original text; it does not translate it. Each server uses one voice channel and one mode at a time.'],
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
    if (results[0].status === 'rejected') { renderLanding(results[0].reason.status === 401 ? null : uiError(results[0].reason)); return; }
    state.me = results[0].value;
    state.guilds = (await api('/api/guilds')).guilds || [];
    if (!state.guilds.length) { renderShell(); return; }
    const selected = state.guilds.find(g => g.id === requested) || state.guilds.find(g => g.installed) || state.guilds[0];
    await selectGuild(selected.id, true);
  } catch (error) { renderLanding(uiError(error)); }
}
boot();
