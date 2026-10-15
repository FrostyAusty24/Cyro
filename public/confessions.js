'use strict';

let confessionsRenderSequence = 0;

async function renderConfessions(main) {
  const guildId = state.guildId;
  const sequence = ++confessionsRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'confessions' && sequence === confessionsRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/confessions`;
  const detail = state.detail;
  main.replaceChildren(heading(ui('Anonymous confessions'), ui('Give members a place to share a thought without putting their name on the post.')));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading confession settings…'));
  main.append(loading);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.confessions) : await api(endpoint);
    if (!active()) return;
    detail.confessions = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    loading.replaceWith(panel(ui('Confessions unavailable'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, uiError(error)), button(ui('Try again'), () => renderConfessions(main), 'secondary'))));
    return;
  }

  let savedConfig = clone(snapshot.config);
  const config = clone(savedConfig);
  let busy = false;
  let refreshing = false;
  const form = el('form', { className: 'settings-form' });
  const saveStatus = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, ui('Your settings are up to date.'));
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), ui('Save changes'));
  const dirty = () => JSON.stringify(config) !== JSON.stringify(savedConfig);
  const session = { config, change(path, value) {
    if (!active()) return;
    putPath(config, path, value); updateDirty();
    saveStatus.className = 'save-status';
    window.CyroI18n.setContent(saveStatus, dirty() ? ui('You have unsaved settings.') : ui('Your settings are up to date.'));
  } };
  function updateDirty() {
    if (!active()) return;
    state.dirty = dirty();
    save.disabled = busy || refreshing || !dirty();
    channelInput.required = config.enabled;
  }
  const channel = channelField(session, ui('Confessions channel'), 'channelId', ui('Use a text channel members can read. Cyro needs View Channel, Send Messages, Embed Links, and Read Message History.'), false, ui('Select a channel'), true);
  const channelInput = channel.querySelector('select');
  channelInput.required = config.enabled;
  form.append(panel(ui('Confession board'), [
    toggleSection(session, ui('Enable confessions'), ui('Members can use /confess to publish an anonymous embed in the channel you choose.'), 'enabled'),
    el('div', { className: 'form-section stack' }, channel,
      textField(session, ui('Time between confessions (seconds)'), 'cooldownSeconds', ui('Per member, from 10 to 3,600 seconds. A cooldown helps keep the board readable.'), { type: 'number', min: 10, max: 3600, required: true }))]),
    el('div', { className: 'save-bar' }, saveStatus, save));

  const counts = el('div', { className: 'metrics', 'aria-label': ui('Confession totals') });
  const refreshStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, ui('Only delivery totals appear here. Read and moderate confession posts in Discord.'));
  const refresh = button(ui('Refresh totals'), () => refreshCounts(), 'secondary small', 'clock');
  function drawCounts() {
    if (!active()) return;
    counts.replaceChildren(metric(ui('Published'), format(snapshot.counts?.published), ui('Anonymous posts sent to Discord'), 'confession'),
      metric(ui('Unconfirmed'), format(snapshot.counts?.pending), ui('Check Discord before repeating a submission'), 'clock'));
  }
  async function refreshCounts() {
    if (busy || refreshing || !active()) return;
    refreshing = true; refresh.disabled = true; window.CyroI18n.setContent(refresh, ui('Refreshing…')); updateDirty();
    try {
      const result = DEMO ? clone(detail.confessions) : await api(endpoint);
      if (!active()) return;
      snapshot = result; detail.confessions = clone(result); drawCounts();
      window.CyroI18n.setContent(refreshStatus, ui("Totals refreshed {p0}. Your settings draft has been kept.", { p0: window.CyroI18n.computedText(((at) => locale => new Date(at).toLocaleTimeString(locale === 'pt' ? 'pt-BR' : locale, { hour: 'numeric', minute: '2-digit' }))(Date.now())) }));
    } catch (error) {
      if (!active()) return;
      window.CyroI18n.setContent(refreshStatus, ui("{p0} The previous totals are still shown.", { p0: uiError(error) }));
    } finally {
      refreshing = false;
      if (active()) { refresh.disabled = false; refresh.replaceChildren(icon('clock'), window.CyroI18n.node(ui('Refresh totals'))); updateDirty(); }
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || !active() || !form.reportValidity() || !dirty()) return;
    if (config.enabled && !config.channelId) {
      saveStatus.className = 'save-status error'; window.CyroI18n.setContent(saveStatus, ui('Choose a confessions channel before enabling the board.')); channelInput.focus(); return;
    }
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(save, ui('Saving…')); saveStatus.className = 'save-status'; window.CyroI18n.setContent(saveStatus, ui('Saving confession settings…'));
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config);
      snapshot.config = clone(result.config); detail.confessions.config = clone(result.config);
      saveStatus.className = 'save-status success';
      window.CyroI18n.setContent(saveStatus, DEMO ? ui('Saved for this demo session. Discord was not changed.') : ui('Confession settings saved.'));
      toast(DEMO ? ui('Demo confession settings saved.') : ui('Confession settings saved.'));
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error';
      window.CyroI18n.setContent(saveStatus, ui(!error.status || error.status >= 500 ? '{error} The save could not be confirmed. Reopen this page to check the saved settings.' : '{error} Your draft is still here.', { error: uiError(error) }));
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), window.CyroI18n.node(ui('Save changes'))); updateDirty(); }
    }
  });
  const preview = panel(ui('What members see'), el('div', { className: 'form-section stack' },
    el('div', { className: 'discord-embed', style: '--embed-colour:#82d9f7' }, el('strong', {}, ui('Anonymous confession')), el('p', {}, ui('I joined for the game nights, but stayed for the people.')), el('small', {}, ui('No author name or profile picture'))),
    el('p', { className: 'field-hint' }, ui('Sample preview. Saving these settings does not publish a message.'))));
  const instructions = contextCard(ui('Share a thought'), ui('Members use /confess and enter their confession in Discord. Cyro confirms privately and posts an embed in your chosen channel.'), 'confession', el('p', {}, ui('Keep identifying details out of confessions. Your community rules still apply; staff can remove posts in Discord.')));
  const privacy = contextCard(ui('Anonymous to other members'), snapshot.privacy ? uiServerCopy(snapshot.privacy) : ui('Names are left off public posts. Discord still processes the command and knows which account submitted it.'), 'lock', link(ui('Access & commands'), 'access'));
  loading.replaceWith(el('div', { className: 'settings-grid' }, form, el('aside', { className: 'stack' }, preview, instructions, privacy)),
    panel(ui('Delivery totals'), el('div', { className: 'form-section stack' }, counts, refreshStatus), refresh));
  drawCounts();
}
