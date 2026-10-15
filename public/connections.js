'use strict';

(() => {
  const container = document.getElementById('connection-content');
  const parameters = new URLSearchParams(location.search);
  const guildId = /^\d{17,20}$/.test(parameters.get('guild') || '') ? parameters.get('guild') : '';
  const recordId = /^[a-zA-Z0-9-]{1,64}$/.test(parameters.get('record') || '') ? parameters.get('record') : '';
  let me;
  let loading = false;
  const I18n = window.CyroI18n;
  const labels = new WeakMap();

  function node(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'className') element.className = value;
      else if (name.startsWith('on')) element.addEventListener(name.slice(2).toLowerCase(), value);
      else if (I18n.isText(value)) I18n.setAttribute(element, name, value);
      else if (value === true) element.setAttribute(name, '');
      else if (value !== false && value != null) element.setAttribute(name, String(value));
    }
    for (const child of children.flat(Infinity)) if (child != null && child !== false) element.append(child instanceof Node ? child : I18n.isText(child) ? I18n.node(child) : document.createTextNode(String(child)));
    return element;
  }
  function action(label, handler, style = 'secondary') {
    const button = node('button', { type: 'button', className: `button ${style}`, onClick: handler }, label);
    labels.set(button, label);
    return button;
  }
  function relabel(button, label) { labels.set(button, label); I18n.setContent(button, label); }
  function notice(message, kind = '', live = true) {
    return node('div', { className: `connection-notice ${kind}`, ...(live ? { role: kind === 'error' ? 'alert' : 'status' } : {}) }, message);
  }
  async function request(path, method = 'GET', body) {
    const response = await fetch(path, {
      method, credentials: 'same-origin', signal: AbortSignal.timeout(25000),
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-CSRF-Token': me?.csrfToken || '' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data; try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      const error = new Error(typeof data.error === 'string' ? data.error : data.error?.message || data.message || `Request failed (${response.status}). Please try again.`);
      error.status = response.status; error.i18n = data.i18n; throw error;
    }
    return data;
  }
  function readableError(error) {
    if (error.status === 401) return ui('Your Discord session expired. Sign in again to manage this connection.');
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return ui('The request took too long. Refresh your connections before trying again.');
    return uiError(error);
  }
  function signIn(message) {
    me = undefined;
    const target = '/connections' + (guildId ? `?guild=${encodeURIComponent(guildId)}${recordId ? `&record=${encodeURIComponent(recordId)}` : ''}` : '');
    container.replaceChildren(
      ...(message ? [notice(message, 'error')] : []),
      node('section', { className: 'panel connection-intro' }, node('h2', {}, ui('Start with your Discord account')),
        node('p', {}, ui('Sign in as the Discord member linked to your creator profile. You do not need server management permissions to connect your own TikTok account.')),
        node('a', { className: 'button', href: `/auth/login?returnTo=${encodeURIComponent(target)}` }, ui('Continue with Discord')),
        node('p', { className: 'connection-video-note' }, ui('By using Cyro, you agree to the '), node('a', { href: '/terms' }, ui('Terms of Service')), ui('. Read the '), node('a', { href: '/privacy' }, ui('Privacy Policy')), ui(' before connecting.'))),
    );
  }
  function callbackMessage() {
    const status = parameters.get('tiktok') || parameters.get('status');
    if (status === 'connected' || status === 'success') return notice(ui('TikTok connected. Review the account below. Your server manager can now enable new-video announcements.'), 'success');
    if (status === 'cancelled' || status === 'denied') return notice(ui('TikTok connection was cancelled. Your existing settings have not changed.'));
    if (status === 'session-expired') return notice(ui('Your Discord session expired before TikTok finished connecting. Start the connection again from this page.'), 'error');
    if (status === 'connection-failed' || status === 'error' || parameters.has('error')) return notice(ui('TikTok could not be connected. Try again, and approve both basic profile and public video access. If it continues, contact Cyro support.'), 'error');
    return null;
  }
  async function confirmDisconnect(record) {
    return new Promise(resolve => {
      const dialog = node('dialog', { className: 'connection-dialog', 'aria-labelledby': 'disconnect-title', 'aria-describedby': 'disconnect-description' },
        node('h2', { id: 'disconnect-title' }, ui('Disconnect TikTok?')),
        node('p', { id: 'disconnect-description' }, ui('Stop public video access for {creator} in {server}? Existing Discord announcements remain. Connections you approved for other servers stay active. Cyro revokes the TikTok authorization when its last connection is removed.', { creator: record.creatorName || record.username || ui('this creator'), server: record.guildName || ui('this server') })));
      const keep = action(ui('Keep connected'), () => dialog.close('keep'));
      dialog.append(node('div', { className: 'connection-actions' }, keep, action(ui('Disconnect TikTok'), () => dialog.close('disconnect'), 'danger')));
      dialog.addEventListener('close', () => { const confirmed = dialog.returnValue === 'disconnect'; dialog.remove(); resolve(confirmed); }, { once: true });
      document.body.append(dialog); dialog.showModal(); keep.focus();
    });
  }
  function videoUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'tiktok.com' || url.hostname.endsWith('.tiktok.com')) && !url.username && !url.password ? url.href : null; }
    catch { return null; }
  }
  function recordView(record, configured) {
    const connected = record.connected === true;
    const reconnect = record.needsReconnect === true;
    const selected = record.recordId === recordId && record.guildId === guildId;
    const statusText = reconnect ? ui('Reconnect needed') : connected ? ui('Connected') : ui('Not connected');
    const result = node('p', { className: 'connection-result', role: 'status' });
    const videos = node('div');
    const controls = node('div', { className: 'connection-actions' });
    const article = node('article', { className: `connection-record${selected ? ' selected' : ''}` },
      node('div', { className: 'connection-record-head' }, node('div', {}, node('h2', {}, record.creatorName || record.username || ui('Creator profile')), node('p', {}, ui('{server} · @{creator}', { server: record.guildName || ui('Discord server'), creator: record.username || ui('TikTok creator') }))), node('span', { className: `tag connection-status ${connected && !reconnect ? 'green' : 'muted'}` }, statusText)),
      connected && node('p', { className: 'connection-identity' }, ui('Connected TikTok account: '), node('strong', {}, record.displayName || ui('Authorized account'))),
      node('p', {}, record.reason ? uiError({ message: record.reason, i18n: record.reasonI18n }) : (connected && !reconnect ? ui('Only this server’s configured public-video alerts use this connection.') : ui('Connect the TikTok account that belongs to this creator profile. You will review the permissions on TikTok.'))),
      controls, result, videos);
    async function perform(button, operation) {
      const previous = labels.get(button);
      const buttons = [...controls.querySelectorAll('button')].map(item => [item, item.disabled]); buttons.forEach(([item]) => { item.disabled = true; });
      I18n.setText(button, 'Please wait…'); result.replaceChildren(); result.className = 'connection-result';
      try { await operation(); }
      catch (error) {
        if (error.status === 401) { signIn(readableError(error)); return; }
        I18n.setContent(result, readableError(error)); result.className = 'connection-result error';
      } finally { buttons.forEach(([item, disabled]) => { item.disabled = disabled; }); I18n.setContent(button, previous); }
    }
    const payload = { guildId: record.guildId, recordId: record.recordId };
    if (!connected || reconnect) {
      const connect = action(reconnect ? ui('Reconnect with TikTok') : ui('Continue with TikTok'), () => perform(connect, async () => {
        const response = await request('/api/tiktok/connect', 'POST', payload);
        const url = new URL(response.url);
        if (url.protocol !== 'https:' || url.hostname !== 'www.tiktok.com' || !url.pathname.startsWith('/v2/auth/authorize') || url.username || url.password) throw new Error('TikTok returned an unexpected sign-in address. Contact Cyro support.');
        location.assign(url.href);
      }), '');
      connect.disabled = !configured; controls.append(connect);
    }
    if (connected) {
      const list = action(ui('Show recent public videos'), async () => {
        if (videos.childElementCount) { videos.replaceChildren(); relabel(list, ui('Show recent public videos')); return; }
        await perform(list, async () => {
        const data = await request(`/api/tiktok/videos?guildId=${encodeURIComponent(record.guildId)}&recordId=${encodeURIComponent(record.recordId)}`);
        const items = (Array.isArray(data.videos) ? data.videos : []).filter(item => videoUrl(item.url || item.share_url));
        videos.replaceChildren(node('p', { className: 'connection-video-note' }, ui('A preview of your recent public videos. Opening a video takes you to TikTok. Existing videos are recorded as a baseline when alerts start; they are not announced as new.')),
          items.length ? node('ul', { className: 'connection-video-list' }, items.map(item => {
            const timestamp = item.publishedAt || (item.create_time ? new Date(item.create_time * 1000).toISOString() : '');
            const date = new Date(timestamp);
            return node('li', {}, node('a', { href: videoUrl(item.url || item.share_url), target: '_blank', rel: 'noopener noreferrer' }, item.title || item.video_description || ui('Open video on TikTok')), Number.isFinite(date.getTime()) && node('time', { datetime: date.toISOString() }, I18n.computedText(locale => date.toLocaleDateString(locale === 'pt' ? 'pt-BR' : locale, { year: 'numeric', month: 'short', day: 'numeric' }))));
          })) : node('p', {}, ui('No public videos were returned for this account. Your account can stay connected.')));
        });
        if (videos.childElementCount) relabel(list, ui('Hide public videos'));
      });
      list.disabled = reconnect; controls.append(list);
      const disconnect = action(ui('Disconnect'), async () => {
        if (!await confirmDisconnect(record)) return;
        await perform(disconnect, async () => {
          const result = await request('/api/tiktok/disconnect', 'POST', payload);
          await load(result.remainingConnections ? ui('This TikTok connection was removed. Your other approved server connections remain active.') : result.revoked === false ? ui('This TikTok connection was removed locally. To finish revoking access, remove Cyro in TikTok’s connected-app settings.') : ui('TikTok disconnected. Future video checks for this connection have stopped.'));
        });
      }, 'secondary');
      controls.append(disconnect);
    }
    return article;
  }
  async function load(message) {
    if (loading) return;
    loading = true;
    try {
      me = await request('/api/me');
      const [eligible, existing] = await Promise.all([request(`/api/tiktok/records${guildId ? `?guildId=${encodeURIComponent(guildId)}` : ''}`), request('/api/tiktok/connections')]);
      const records = new Map();
      for (const record of [...(Array.isArray(eligible.records) ? eligible.records : []), ...(Array.isArray(existing.connections) ? existing.connections : [])]) {
        if (record && typeof record.guildId === 'string' && typeof record.recordId === 'string' && (!guildId || record.guildId === guildId)) records.set(`${record.guildId}:${record.recordId}`, { ...records.get(`${record.guildId}:${record.recordId}`), ...record });
      }
      const configured = eligible.configured === true;
      const signOut = action(ui('Sign out'), async () => { signOut.disabled = true; try { await request('/auth/logout', 'POST', {}); signIn(); } catch (error) { signOut.disabled = false; container.prepend(notice(readableError(error), 'error')); } });
      const account = node('div', { className: 'connection-account' }, node('span', {}, ui('Signed in as '), node('strong', {}, me.user?.username || ui('Discord member'))), signOut);
      const introduction = node('p', { className: 'connection-video-note' }, ui('These profiles are linked to your Discord member ID. Choose which server may use your public TikTok videos.'));
      const list = [...records.values()].sort((a, b) => Number(b.recordId === recordId) - Number(a.recordId === recordId));
      container.replaceChildren(account, ...(message ? [notice(message, 'success')] : [callbackMessage()].filter(Boolean)),
        ...(!configured ? [notice(ui('TikTok sign-in is not available yet. Cyro’s operator needs to finish the TikTok app setup. Existing creator profiles and live alerts are unaffected.'))] : []),
        ...(guildId ? [node('p', { className: 'connection-video-note' }, node('a', { href: '/connections' }, ui('View connections across all your servers')))] : []),
        ...(list.length ? [introduction, node('div', { className: 'connection-records' }, list.map(record => recordView(record, configured)))] : [node('section', { className: 'panel connection-intro' }, node('h2', {}, ui('No creator profiles linked yet')), node('p', {}, ui('Ask a server manager to add your Discord member to your creator profile, then add a TikTok account. Sign in here with that same Discord account.')), action(ui('Refresh connections'), () => load()))]),
      );
      if (recordId && !list.some(item => item.recordId === recordId)) container.prepend(notice(ui('This creator profile is not linked to your signed-in Discord member, or it is no longer available. Ask the server manager to check the profile.')));
    } catch (error) {
      if (error.status === 401) {
        const status = parameters.get('tiktok');
        signIn(status === 'session-expired' ? ui('Your Discord session expired before TikTok finished connecting. Sign in again, then restart the TikTok connection.') : status === 'cancelled' ? ui('TikTok connection was cancelled. Sign in when you want to manage your connections.') : undefined);
      }
      else container.replaceChildren(notice(readableError(error), 'error'), action(ui('Try again'), () => load()));
    } finally { loading = false; }
  }
  const language = document.getElementById('connection-language');
  if (language) {
    for (const item of I18n.languages) language.append(node('option', { value: item.id }, item.name));
    language.value = I18n.locale;
    language.addEventListener('change', () => I18n.setLocale(language.value));
    I18n.subscribe(locale => { language.value = locale; });
  }
  void load();
})();
