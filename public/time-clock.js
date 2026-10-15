'use strict';

let timeClockRenderSequence = 0;

function timeClockDuration(milliseconds) {
  const seconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  return ui('{hours}h {minutes}m {seconds}s', { hours: format(Math.floor(seconds / 3600)), minutes: format(Math.floor(seconds / 60) % 60), seconds: format(seconds % 60) });
}

async function renderTimeClock(main) {
  const guildId = state.guildId, sequence = ++timeClockRenderSequence, detail = state.detail;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'time-clock' && sequence === timeClockRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/time-clock`;
  main.replaceChildren(heading(ui('Time clock'), ui('Give members a simple clock-in button and keep a running total of their time in this server.')));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading time clock…'));
  main.append(loading);
  let snapshot;
  try { snapshot = DEMO ? clone(detail.timeClock) : await api(endpoint); if (!active()) return; detail.timeClock = clone(snapshot); }
  catch (error) { if (active()) loading.replaceWith(panel(ui('Could not load the time clock'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, uiError(error)), button(ui('Try again'), () => renderTimeClock(main), 'secondary')))); return; }

  let saved = clone(snapshot.config), busy = false, refreshing = false, page = 1, operationId = null;
  const config = clone(saved), form = el('form', { className: 'settings-form' });
  const status = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, ui('Your settings are up to date.'));
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), ui('Save changes'));
  const publish = button(ui('Publish time-clock panel'), publishPanel, 'secondary', 'message');
  const publishStatus = el('div', { className: 'field-hint', role: 'status', 'aria-live': 'polite' });
  const metrics = el('div', { className: 'metrics' }), records = el('div', {});
  const refresh = button(ui('Refresh times'), refreshTimes, 'secondary small', 'clock');
  const activityNote = el('p', { className: 'field-hint', role: 'status' });
  const query = el('input', { type: 'search', maxlength: 100, placeholder: ui('Member name or ID'), onInput: () => { page = 1; drawRecords(); } });
  const filter = el('select', { onChange: () => { page = 1; drawRecords(); } },
    el('option', { value: 'all' }, ui('All members')), el('option', { value: 'active' }, ui('Clocked in now')));
  const pageLabel = el('span', { className: 'suggestions-page-label', role: 'status' });
  const previous = button(ui('Previous'), () => { page--; drawRecords(); }, 'secondary small');
  const next = button(ui('Next'), () => { page++; drawRecords(); }, 'secondary small');
  const dirty = () => JSON.stringify(config) !== JSON.stringify(saved);
  function updateControls() {
    if (!active()) return;
    state.dirty = dirty(); save.disabled = busy || refreshing || !dirty(); refresh.disabled = busy || refreshing;
    publish.disabled = busy || refreshing || dirty() || !saved.enabled || !saved.channelId;
  }
  const session = { config, change(path, value) { putPath(config, path, value); updateControls(); status.className = 'save-status'; window.CyroI18n.setContent(status, dirty() ? ui('You have unsaved settings.') : ui('Your settings are up to date.')); } };
  form.append(panel(ui('Clock-in settings'), [
    toggleSection(session, ui('Enable time clock'), ui('Members can start one shift at a time. Turning this off stops new shifts; members can still clock out and check their saved totals.'), 'enabled'),
    el('div', { className: 'form-section stack' },
      channelField(session, ui('Time-clock panel channel'), 'channelId', ui('Choose where members will find the Clock in, Clock out and My time buttons. The channel keeps its existing visibility.')),
      roleField(session, ui('Who can clock in?'), 'roleIds', ui('Optional. Leave empty to let every server member clock in, or choose the roles that can start a shift. Members can always end their own active shift.'), true))]),
    el('div', { className: 'save-bar' }, status, save));

  const panelSetup = panel(ui('Member panel'), el('div', { className: 'form-section stack' },
    el('p', {}, ui('Save your settings, then publish a panel in the selected channel. Saving alone does not send a Discord message.')),
    el('p', { className: 'field-hint' }, ui('Cyro needs View Channel, Send Messages and Embed Links there. You decide whether the channel is public or private.')),
    el('div', { className: 'row-actions' }, publish), publishStatus));
  const guidance = contextCard(ui('Clock in, clock out, check your time'), ui('Each member’s clock-out reply shows their latest shift and total time. Records stay with this server and survive bot restarts.'), 'clock', el('div', { className: 'stack' },
    el('p', {}, el('code', {}, '/time in'), ui(' starts a shift. '), el('code', {}, '/time out'), ui(' ends your shift.')),
    el('p', {}, el('code', {}, '/time me'), ui(' shows your own total and current shift.')),
    el('p', {}, el('code', {}, '/time clock'), ui(' lets authorized staff see everyone’s totals. '), el('code', {}, '/time member'), ui(' checks one member’s record.')),
    el('p', {}, el('code', {}, '/time panel'), ui(' publishes the panel from Discord.')),
    el('p', { className: 'field-hint' }, ui('Time is self-reported. It measures the period between clocking in and out, not messages, voice activity or work completed.')), link(ui('Access & commands'), 'access')));

  function memberName(userId) { return detail.members?.find(member => member.id === userId)?.displayName || userId; }
  function drawRecords() {
    const term = query.value.trim().toLocaleLowerCase();
    const members = [...(snapshot.members || [])].filter(member => (!term || `${memberName(member.userId)} ${member.userId}`.toLocaleLowerCase().includes(term)) && (filter.value !== 'active' || member.startedAt != null)).sort((a, b) => b.totalMs - a.totalMs || String(a.userId).localeCompare(String(b.userId)));
    const pages = Math.max(1, Math.ceil(members.length / 25)); page = Math.max(1, Math.min(page, pages));
    previous.disabled = page <= 1; next.disabled = page >= pages;
    window.CyroI18n.setContent(pageLabel, ui('Page {page} of {pages} · {count} members', { page: format(page), pages: format(pages), count: format(members.length) }));
    records.replaceChildren(members.length ? el('div', { className: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': ui('Member time records') }, el('table', {},
      el('caption', { className: 'sr-only' }, ui('Sorted by total time. Totals include active shifts at the last refresh.')),
      el('thead', {}, el('tr', {}, [ui('Member'), ui('Status'), ui('Total time'), ui('Completed time'), ui('Current shift'), ui('Completed shifts'), ui('Last shift')].map(label => el('th', { scope: 'col' }, label)))),
      el('tbody', {}, members.slice((page - 1) * 25, page * 25).map(member => el('tr', {},
        el('td', {}, el('strong', {}, memberName(member.userId)), el('div', { className: 'field-hint' }, member.userId)),
        el('td', {}, tag(member.startedAt != null ? ui('Clocked in') : ui('Clocked out'), member.startedAt != null ? 'green' : 'muted')),
        el('td', {}, timeClockDuration(member.totalMs)), el('td', {}, timeClockDuration(member.completedMs)),
        el('td', {}, member.startedAt != null ? el('div', {}, timeClockDuration(member.activeMs), el('div', { className: 'field-hint' }, ui('Started {date}', { date: dateLabel(member.startedAt) }))) : '—'),
        el('td', {}, format(member.shifts)), el('td', {}, member.shifts ? timeClockDuration(member.lastShiftMs) : '—')))))) : empty(ui(term || filter.value === 'active' ? 'No matching time records' : 'No shifts recorded yet'), ui(term || filter.value === 'active' ? 'Try another member name, ID or status.' : 'Enable the time clock and publish a panel, or use /time in in Discord to start the first shift.'), 'clock'));
  }
  function drawActivity() {
    metrics.replaceChildren(metric(ui('Clocked in now'), format(snapshot.counts?.active), ui('Members with an open shift'), 'clock'), metric(ui('Total tracked time'), timeClockDuration(snapshot.counts?.totalMs), ui('Completed time plus active shifts at the last refresh'), 'chart'), metric(ui('Members with records'), format(snapshot.counts?.members), ui('Time records for this server'), 'users'));
    window.CyroI18n.setContent(activityNote, ui('Times as of {date}. Active shifts keep running in Discord; choose Refresh times to update these totals.', { date: dateLabel(snapshot.asOf) }));
    drawRecords();
  }
  async function refreshTimes() {
    if (busy || refreshing || !active()) return;
    refreshing = true; updateControls();
    try { const result = DEMO ? clone(detail.timeClock) : await api(endpoint); if (!active()) return; snapshot = result; detail.timeClock = clone(result); drawActivity(); window.CyroI18n.setContent(status, dirty() ? ui('Times refreshed. Your unsaved settings are still here.') : ui('Times refreshed.')); }
    catch (error) { if (active()) window.CyroI18n.setContent(activityNote, ui('{error} Previous time records are still shown.', { error: uiError(error) })); }
    finally { refreshing = false; updateControls(); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || refreshing || !active() || !dirty() || !form.reportValidity()) return;
    busy = true; state.saving = true; updateControls();
    const controls = [...form.elements].map(control => [control, control.disabled]); controls.forEach(([control]) => { control.disabled = true; });
    status.className = 'save-status'; window.CyroI18n.setContent(status, ui('Saving time-clock settings…'));
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config)); if (!active()) return;
      saved = clone(result.config); Object.assign(config, saved); snapshot.config = clone(saved); detail.timeClock.config = clone(saved); operationId = null;
      status.className = 'save-status success'; window.CyroI18n.setContent(status, DEMO ? ui('Saved for this demo session. Discord was not changed.') : ui('Time-clock settings saved.'));
    } catch (error) { if (active()) { status.className = 'save-status error'; window.CyroI18n.setContent(status, ui(!error.status || error.status >= 500 ? '{error} Reopen this page to check whether the save completed.' : '{error} Your draft is still here.', { error: uiError(error) })); } }
    finally { busy = false; state.saving = false; if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); updateControls(); } }
  });
  async function publishPanel() {
    if (busy || refreshing || !active() || dirty() || !saved.enabled || !saved.channelId) return;
    busy = true; state.saving = true; updateControls();
    operationId ||= crypto.randomUUID();
    window.CyroI18n.setContent(publishStatus, ui('Publishing the time-clock panel…'));
    try {
      const result = DEMO ? {} : await api(`${endpoint}/panel`, 'POST', { operationId }); if (!active()) return;
      operationId = null;
      publishStatus.replaceChildren(window.CyroI18n.node(DEMO ? ui('Demo panel preview complete. Nothing was posted to Discord.') : ui('Time-clock panel published.')),
        /^https:\/\/(?:canary\.|ptb\.)?discord\.com\/channels\/\d+\/\d+\/\d+$/.test(result.messageUrl || '') ? el('a', { className: 'text-link', href: result.messageUrl, target: '_blank', rel: 'noopener noreferrer' }, ui('Open panel in Discord'), icon('arrow')) : el('span'));
    } catch (error) { if (active()) window.CyroI18n.setContent(publishStatus, ui('{error} Check the channel before publishing again.', { error: uiError(error) })); }
    finally { busy = false; state.saving = false; updateControls(); }
  }
  loading.replaceWith(metrics, el('div', { className: 'settings-grid' }, el('div', { className: 'stack' }, form, panelSetup), el('aside', { className: 'stack' }, guidance)),
    panel(ui('Member times'), [el('div', { className: 'suggestions-toolbar' }, field(ui('Find a member'), query), field(ui('Status'), filter), refresh), el('div', { className: 'form-section' }, activityNote), records, el('nav', { className: 'suggestions-pagination', 'aria-label': ui('Member time pages') }, previous, pageLabel, next)]));
  drawActivity(); updateControls();
}
