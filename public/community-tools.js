'use strict';

let communityToolsRenderSequence = 0;
const bugStatusLabels = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', dismissed: 'Dismissed' };
const communityToolsDefaults = () => ({ config: { bugs: { enabled: false, cooldownMinutes: 5, categories: [] }, stickies: [] }, reports: [], counts: { open: 0, in_progress: 0, resolved: 0, dismissed: 0, pending: 0 }, stickyStates: [], page: 1, totalPages: 1 });
function renderBugReports(main) { return renderCommunityTools(main, 'bug-reports'); }
function renderStickyMessages(main) { return renderCommunityTools(main, 'sticky'); }

async function renderCommunityTools(main, mode) {
  const guildId = state.guildId, sequence = ++communityToolsRenderSequence, detail = state.detail;
  const active = () => main.isConnected && state.guildId === guildId && state.page === mode && sequence === communityToolsRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/community-tools`, bugs = mode === 'bug-reports';
  main.replaceChildren(heading(bugs ? 'Bug reports' : 'Sticky messages', bugs ? 'Give members a clear place to report problems, and keep track of the fix.' : 'Keep the useful information close to the latest conversation.'));
  const surface = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), 'Loading settings…'); main.append(surface);
  let snapshot;
  try { snapshot = DEMO ? clone(detail.communityTools || communityToolsDefaults()) : await api(endpoint); if (!active()) return; detail.communityTools = clone(snapshot); }
  catch (error) { if (active()) surface.replaceWith(panel('Settings unavailable', el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button('Try again', () => renderCommunityTools(main, mode), 'secondary')))); return; }
  let saved = clone(snapshot.config), config = clone(saved), busy = false, filter = 'all', reportFilter = '';
  const form = el('form', { className: 'settings-form' }), entries = el('div', { className: 'stack' });
  const status = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, 'Your settings are up to date.');
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), 'Save changes');
  const dirty = () => JSON.stringify(config) !== JSON.stringify(saved);
  const update = () => { if (!active()) return; state.dirty = dirty(); save.disabled = busy || !dirty(); status.className = 'save-status'; status.textContent = dirty() ? 'You have unsaved changes.' : 'Your settings are up to date.'; };
  const session = { config, change(path, value) { putPath(config, path, value); update(); } };
  const newId = () => `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const add = button(bugs ? 'Add a category' : 'Add a sticky message', () => {
    if (busy) return; const list = bugs ? config.bugs.categories : config.stickies; if (list.length >= 10) return;
    list.push(bugs ? { id: newId(), name: '', channelId: null } : { id: newId(), enabled: true, channelId: null, title: '', body: '', everyMessages: 5, delaySeconds: 30 }); update(); drawEntries();
  }, 'secondary', 'plus');
  function drawEntries() {
    const list = bugs ? config.bugs.categories : config.stickies;
    add.disabled = busy || list.length >= 10;
    if (!list.length) { entries.replaceChildren(empty(bugs ? 'Start with a report category' : 'Add your first channel reminder', bugs ? 'Try “Bot bugs”, “Server issues”, or a category for each game or script. Each can use its own channel.' : 'Choose a channel, write the message, and decide how often it should return.', bugs ? 'bug' : 'pin')); return; }
    entries.replaceChildren(...list.map((entry, index) => {
      const prefix = bugs ? `bugs.categories.${index}` : `stickies.${index}`;
      const remove = button('Remove', async () => { if (busy) return; const approved = await confirmAction(bugs ? 'Remove this report category?' : 'Remove this sticky message?', bugs ? 'Existing bug reports stay in the history. Members will no longer see this category after you save.' : 'Saving removes Cyro’s tracked reminder from this channel. Other messages are left alone.', 'Remove', 'Keep it'); if (!approved || !active() || busy) return; list.splice(index, 1); update(); drawEntries(); }, 'secondary small');
      const fields = el('div', { className: 'form-section stack' });
      if (bugs) fields.append(textField(session, 'Category name', `${prefix}.name`, 'Members choose this with /bugreport category. Keep names distinct.', { maxlength: 60, required: true, placeholder: 'For example, Server issues' }), channelField(session, 'Reports channel', `${prefix}.channelId`, 'Reports include the member’s name. Choose who can read this channel in Discord; public and private channels both work.'));
      else {
        fields.append(toggleSection(session, 'Enable this reminder', 'Starts after new member messages reach the threshold below.', `${prefix}.enabled`), channelField(session, 'Channel', `${prefix}.channelId`, 'Use one sticky message per channel.'), textField(session, 'Title', `${prefix}.title`, '', { maxlength: 200, required: true, placeholder: 'A quick reminder' }), textField(session, 'Message', `${prefix}.body`, 'Discord formatting is supported. Mentions will not notify members or roles.', { multiline: true, rows: 5, maxlength: 3000, required: true, placeholder: 'The information people should see in this channel.' }), textField(session, 'New messages before reposting', `${prefix}.everyMessages`, 'Counts member messages only, from 1 to 100.', { type: 'number', min: 1, max: 100, required: true }), textField(session, 'Wait before reposting (seconds)', `${prefix}.delaySeconds`, 'From 30 to 3,600 seconds after reaching the message threshold. Saving does not post immediately.', { type: 'number', min: 30, max: 3600, required: true }));
        const receipt = snapshot.stickyStates?.find(r => r.id === entry.id);
        if (receipt?.pending) fields.append(el('p', { className: 'save-status error', role: 'status' }, 'Delivery is unconfirmed. Cyro has paused this reminder to avoid duplicates. Check the channel; it will recover if the matching message is found among the latest 100 messages.'));
        else if (receipt?.cleanupPending) fields.append(el('p', { className: 'field-hint' }, 'The new reminder was posted. Removing the previous tracked reminder is still pending.'));
        else if (receipt?.messageId) fields.append(el('p', { className: 'field-hint' }, `Last posted ${dateLabel(new Date(receipt.lastPostedAt).toISOString())}.`));
      }
      fields.append(remove);
      return panel(bugs ? `Category ${index + 1}` : `Reminder ${index + 1}`, fields);
    }));
  }
  if (bugs) form.append(panel('Report intake', [toggleSection(session, 'Enable bug reports', 'Members use /bugreport, pick a category, and fill in a short report. Their Discord name is included.', 'bugs.enabled'), el('div', { className: 'form-section stack' }, textField(session, 'Time between reports (minutes)', 'bugs.cooldownMinutes', 'Per member. Use 0 for no cooldown, up to 1,440 minutes.', { type: 'number', min: 0, max: 1440, required: true }))]));
  form.append(entries, add, el('div', { className: 'save-bar' }, status, save));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !active() || !dirty() || !form.reportValidity()) return;
    const list = bugs ? config.bugs.categories : config.stickies;
    if (list.some(entry => !entry.channelId) || (bugs && config.bugs.enabled && !list.length)) { status.className = 'save-status error'; status.textContent = bugs ? 'Add at least one category when reports are enabled, and choose a channel for each category.' : 'Choose a channel for every sticky message.'; return; }
    busy = true; state.saving = true; const controls = [...form.elements].map(c => [c, c.disabled]); controls.forEach(([c]) => { c.disabled = true; }); save.textContent = 'Saving…'; status.textContent = 'Saving settings…';
    try { const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config)); if (!active()) return; saved = clone(result.config); Object.assign(config, result.config); snapshot.config = clone(result.config); detail.communityTools.config = clone(result.config); update(); drawEntries(); status.className = 'save-status success'; status.textContent = DEMO ? 'Saved for this demo session.' : 'Settings saved.'; toast(status.textContent); }
    catch (error) { if (active()) { status.className = 'save-status error'; status.textContent = error.message + (!error.status || error.status >= 500 ? ' Reopen this page to check whether the save completed.' : ''); } }
    finally { busy = false; state.saving = false; if (active()) { controls.forEach(([c, disabled]) => { c.disabled = disabled; }); save.replaceChildren(icon('check'), 'Save changes'); save.disabled = !dirty(); add.disabled = (bugs ? config.bugs.categories : config.stickies).length >= 10; } }
  });
  const aside = bugs ? [contextCard('How members report a problem', 'Use /bugreport in Discord and pick a category. The form asks for a title, what happened, and optional steps to reproduce it.', 'bug', el('ol', {}, el('li', {}, 'Reports include the author’s Discord name; they are not anonymous.'), el('li', {}, 'Ask members to leave out passwords, tokens, and personal information.'), el('li', {}, 'Dashboard staff can move a report between Open, In progress, Resolved, and Dismissed.'))), contextCard('Your channels, your choice', 'A private reports channel lets members send reports without reading other people’s reports. A public channel lets the community follow progress. Set its permissions in Discord.', 'lock', link('Access & commands', 'access'))] : [contextCard('How reminders stay visible', 'After enough new member messages arrive, Cyro waits for your chosen delay, posts the reminder, and removes its previous reminder.', 'pin', el('ol', {}, el('li', {}, 'Bot and webhook messages never count toward the threshold.'), el('li', {}, 'Only Cyro’s exact tracked reminder is removed.'), el('li', {}, 'Disable or remove a reminder and save to remove its tracked post.'))), contextCard('Give the conversation room', 'Start with 5 messages and a 30-second delay. Use a longer delay or a higher message threshold in busy channels.', 'clock')];
  surface.replaceWith(el('div', { className: 'settings-grid' }, form, el('aside', { className: 'stack' }, ...aside))); drawEntries();
  if (!bugs) return;
  const history = el('div', { className: 'suggestions-list' }), counts = el('div', { className: 'suggestions-counts' });
  const feedback = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, 'Up to 1,000 reports are retained. Completed reports may be replaced when the history is full.');
  const select = el('select', { 'aria-label': 'Report status', onChange: e => { filter = e.target.value; drawReports(); } }, [['all', 'All statuses'], ...Object.entries(bugStatusLabels), ['pending', 'Unconfirmed delivery']].map(([value, name]) => el('option', { value }, name)));
  const search = el('input', { type: 'search', placeholder: 'Title, category, or reporter', onInput: e => { reportFilter = e.target.value.trim().toLowerCase(); drawReports(); } });
  const refresh = button('Refresh reports', () => loadReports(snapshot.page || 1), 'secondary small', 'clock');
  const previous = button('Previous page', () => loadReports((snapshot.page || 1) - 1), 'secondary small'), next = button('Next page', () => loadReports((snapshot.page || 1) + 1), 'secondary small');
  const pageLabel = el('span', { className: 'suggestions-page-label', role: 'status' });
  function drawReports() {
    counts.replaceChildren(...Object.entries(bugStatusLabels).map(([key, label]) => el('div', { className: 'suggestion-count' }, el('strong', {}, format(snapshot.counts?.[key])), el('span', {}, label))));
    const reports = (snapshot.reports || []).filter(r => (filter === 'all' || (filter === 'pending' ? r.delivery === 'pending' : r.status === filter)) && `${r.title} ${r.categoryName} ${r.authorName} ${r.number}`.toLowerCase().includes(reportFilter));
    history.replaceChildren(...(reports.length ? reports.map(report => {
      const item = el('article', { className: 'suggestion-item' }, el('div', { className: 'suggestion-meta' }, el('strong', {}, `#${report.number} · ${report.title}`), tag(report.delivery === 'pending' ? 'Delivery unconfirmed' : bugStatusLabels[report.status], report.status === 'resolved' ? 'green' : 'muted')), el('small', { className: 'muted' }, `${report.categoryName} · ${report.authorName} · ${dateLabel(report.createdAt)}`), el('p', { className: 'suggestion-content' }, report.details));
      if (report.steps) item.append(el('details', {}, el('summary', {}, 'Steps to reproduce'), el('p', { className: 'suggestion-content' }, report.steps)));
      if (report.messageId && /^\d{17,20}$/.test(report.messageId) && /^\d{17,20}$/.test(report.channelId)) item.append(el('a', { className: 'text-link', href: `https://discord.com/channels/${safeId(guildId)}/${safeId(report.channelId)}/${safeId(report.messageId)}`, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Discord', icon('arrow')));
      if (report.delivery === 'pending') item.append(el('p', { className: 'field-hint' }, 'The report was saved, but its send was not confirmed. Check the selected channel before asking the member to submit again.'));
      else {
        const statusSelect = el('select', { 'aria-label': `Status for report ${report.number}` }, Object.entries(bugStatusLabels).map(([value, label]) => el('option', { value, selected: report.status === value }, label)));
        const action = button('Update status', async () => { if (busy || !active() || statusSelect.value === report.status) return; busy = true; state.saving = true; action.disabled = true; statusSelect.disabled = true; feedback.textContent = 'Updating report…';
          try { const result = DEMO ? { report: { ...report, status: statusSelect.value, decision: { actorId: state.me.user.id, at: new Date().toISOString(), status: statusSelect.value } } } : await api(`/api/guilds/${safeId(guildId)}/bug-reports/${safeId(report.id)}/status`, 'POST', { status: statusSelect.value }); if (!active()) return; const updated = result.report; snapshot.reports = snapshot.reports.map(r => r.id === report.id ? updated : r); if (updated.status !== report.status) { snapshot.counts[report.status] = Math.max(0, snapshot.counts[report.status] - 1); snapshot.counts[updated.status]++; } detail.communityTools = { ...clone(snapshot), config: clone(saved) }; feedback.textContent = updated.syncPending ? 'Status saved. Discord message refresh is pending.' : 'Report status updated.'; drawReports(); }
          catch (error) { if (active()) { feedback.textContent = error.message + ' Refresh reports to check the saved status before retrying.'; feedback.className = 'save-status error'; } }
          finally { busy = false; state.saving = false; if (active()) { action.disabled = false; statusSelect.disabled = false; } }
        }, 'secondary small'); item.append(el('div', { className: 'suggestion-footer' }, field('Report status', statusSelect), action));
      }
      return item;
    }) : [empty('No reports to show', filter === 'all' && !reportFilter ? 'When a member submits /bugreport, it appears here and in its category’s channel.' : 'Try another status or search on this page.', 'bug')]));
    previous.disabled = busy || (snapshot.page || 1) <= 1; next.disabled = busy || (snapshot.page || 1) >= (snapshot.totalPages || 1); pageLabel.textContent = `Page ${snapshot.page || 1} of ${snapshot.totalPages || 1}`;
  }
  async function loadReports(page) {
    if (busy || !active() || page < 1 || page > (snapshot.totalPages || 1)) return; busy = true; refresh.disabled = true; previous.disabled = true; next.disabled = true;
    try { const result = DEMO ? clone(detail.communityTools) : await api(`${endpoint}?page=${page}`); if (!active()) return; snapshot = result; detail.communityTools = clone(result); feedback.className = 'field-hint'; feedback.textContent = 'Reports refreshed. Unsaved settings above are kept.'; }
    catch (error) { if (active()) { feedback.className = 'save-status error'; feedback.textContent = error.message; } }
    finally { busy = false; if (active()) { refresh.disabled = false; drawReports(); } }
  }
  main.append(panel('Report history', el('div', {}, counts, el('div', { className: 'suggestions-toolbar' }, field('Status', select), field('Search this page', search), refresh), el('div', { className: 'form-section' }, feedback), history, el('nav', { className: 'suggestions-pagination', 'aria-label': 'Report history pages' }, previous, pageLabel, next)))); drawReports();
}
