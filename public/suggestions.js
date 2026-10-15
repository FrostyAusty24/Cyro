'use strict';

let suggestionsRenderSequence = 0;

function suggestionStatus(item) {
  if (item.delivery === 'pending') return tag(ui('Delivery unconfirmed'), 'orange');
  return tag(({ open: ui('Voting open'), accepted: ui('Accepted'), declined: ui('Declined'), closed: ui('Closed') })[item.status] || ui('Unavailable'), ({ open: '', accepted: 'green', declined: 'red', closed: 'muted' })[item.status]);
}

async function renderSuggestions(main) {
  const guildId = state.guildId;
  const sequence = ++suggestionsRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'suggestions' && sequence === suggestionsRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/suggestions`;
  const detail = state.detail;
  main.replaceChildren(heading(ui('Suggestions'), ui('Members submit ideas with /suggestion. Let them vote, then share your team’s decision.'), link(ui('Getting started'), 'help')));
  const surface = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading suggestions…'));
  main.append(surface);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.suggestions) : await api(endpoint);
    if (!active()) return;
    detail.suggestions = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    surface.replaceWith(panel(ui('Suggestions unavailable'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, uiError(error)), button(ui('Try again'), () => renderSuggestions(main), 'secondary'))));
    return;
  }

  let savedConfig = clone(snapshot.config);
  const config = clone(savedConfig);
  const decisionDrafts = new Map();
  const uncertain = new Map();
  let busy = false;
  let refreshing = false;
  let confirming = false;
  let filter = 'all';
  const form = el('form', { className: 'settings-form suggestions-settings' });
  const saveStatus = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, ui('Your settings are up to date.'));
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), ui('Save changes'));
  const configDirty = () => JSON.stringify(config) !== JSON.stringify(savedConfig);
  function updateDirty() {
    if (!active()) return;
    state.dirty = configDirty() || [...decisionDrafts.values()].some(draft => draft.reason.trim());
    save.disabled = busy || refreshing || confirming || !configDirty();
  }
  const session = { config, change(path, value) {
    putPath(config, path, value); updateDirty();
    saveStatus.className = 'save-status';
    window.CyroI18n.setContent(saveStatus, configDirty() ? ui('You have unsaved settings.') : ui('Your settings are up to date.'));
  } };

  form.append(panel(ui('Suggestion board'), [toggleSection(session, ui('Enable suggestions'), ui('Members can use /suggestion to write an idea and open it for voting.'), 'enabled'),
    el('div', { className: 'form-section stack' },
      channelField(session, ui('Suggestions channel'), 'channelId', ui('Choose a text channel members can see. Cyro needs View Channel, Send Messages, Embed Links, and Read Message History.'), false, ui('Select a channel'), true),
      textField(session, ui('Time between suggestions (minutes)'), 'cooldownMinutes', ui('Per member. Use 0 for no cooldown, up to 1440 minutes (one day).'), { type: 'number', min: 0, max: 1440, required: true }))]),
    el('div', { className: 'save-bar' }, saveStatus, save));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || confirming || !active() || !form.reportValidity() || !configDirty()) return;
    if (config.enabled && !config.channelId) {
      saveStatus.className = 'save-status error'; window.CyroI18n.setContent(saveStatus, ui('Choose a suggestions channel before enabling the board.'));
      form.querySelector('select')?.focus(); return;
    }
    busy = true; state.saving = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(save, ui('Saving…')); saveStatus.className = 'save-status'; window.CyroI18n.setContent(saveStatus, ui('Saving suggestion settings…'));
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config);
      snapshot.config = clone(result.config); detail.suggestions.config = clone(result.config);
      saveStatus.className = 'save-status success'; window.CyroI18n.setContent(saveStatus, DEMO ? ui('Saved for this demo session.') : ui('Suggestion settings saved.'));
      toast(DEMO ? ui('Demo suggestion settings saved.') : ui('Suggestion settings saved.'));
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error'; window.CyroI18n.setContent(saveStatus, ui(!error.status || error.status >= 500 ? '{error} The save could not be confirmed. Reopen this page to check the saved settings.' : '{error}', { error: uiError(error) }));
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); save.replaceChildren(icon('check'), window.CyroI18n.node(ui('Save changes'))); updateDirty(); }
    }
  });

  const counts = el('div', { className: 'suggestions-counts', 'aria-label': ui('Suggestion totals') });
  const history = el('div', { className: 'suggestions-list', tabindex: '-1' });
  const historyStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, ui('Votes are refreshed when you open this page or choose Refresh votes.'));
  const selection = el('select', { 'aria-label': ui('Filter suggestions'), onChange: event => { filter = event.target.value; drawHistory(); } },
    [['all', 'All suggestions'], ['open', 'Voting open'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['closed', 'Closed'], ['pending', 'Delivery unconfirmed']].map(([value, label]) => el('option', { value }, ui(label))));
  const reload = button(ui('Refresh votes'), () => refreshHistory(), 'secondary small', 'clock');
  const previous = button(ui('Previous page'), () => refreshHistory((snapshot.page || 1) - 1), 'secondary small');
  const next = button(ui('Next page'), () => refreshHistory((snapshot.page || 1) + 1), 'secondary small');
  const pageLabel = el('span', { className: 'suggestions-page-label', role: 'status', 'aria-live': 'polite' });
  const pagination = el('nav', { className: 'suggestions-pagination', 'aria-label': ui('Suggestion history pages') }, previous, pageLabel, next);

  function drawPagination() {
    const page = snapshot.page || 1, totalPages = Math.max(1, snapshot.totalPages || 1);
    previous.disabled = refreshing || page <= 1;
    next.disabled = refreshing || page >= totalPages;
    window.CyroI18n.setContent(pageLabel, ui("Page {p0} of {p1}", { p0: page, p1: totalPages }));
  }

  function drawCounts() {
    const totals = snapshot.counts || {};
    counts.replaceChildren(...[['open', 'Open'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['closed', 'Closed']].map(([key, name]) => el('div', { className: `suggestion-count suggestion-count-${key}` }, el('strong', {}, format(totals[key])), el('span', {}, ui(name)))));
    if (totals.pending) counts.append(el('div', { className: 'suggestion-count' }, el('strong', {}, format(totals.pending)), el('span', {}, ui('Unconfirmed'))));
  }
  function messageLink(item) {
    // Construct Discord links from IDs rather than trusting arbitrary saved URLs.
    if (!/^\d{17,20}$/.test(String(item.channelId)) || !/^\d{17,20}$/.test(String(item.messageId))) return null;
    return el('a', { className: 'text-link', href: `https://discord.com/channels/${safeId(guildId)}/${safeId(item.channelId)}/${safeId(item.messageId)}`, target: '_blank', rel: 'noopener noreferrer' }, ui('Open in Discord'), icon('arrow'));
  }
  function drawHistory() {
    if (!active()) return;
    drawCounts();
    drawPagination();
    const items = (snapshot.items || []).filter(item => filter === 'all' || (filter === 'pending' ? item.delivery === 'pending' : item.delivery === 'sent' && item.status === filter));
    const content = items.length ? items.map(renderItem) : [empty(filter === 'all' ? ui('No suggestions yet.') : ui('No matching suggestions on this page.'), filter === 'all' ? ui('Choose a channel, enable suggestions and save. Members can then use /suggestion in Discord to post their first idea.') : ui('Choose another status or page, or refresh to check for new ideas.'), 'spark')];
    history.replaceChildren(...content);
  }
  function renderItem(item) {
    const row = el('article', { className: 'suggestion-item', 'aria-label': ui("Suggestion {p0}", { p0: item.number }) });
    const info = el('div', { className: 'suggestion-meta' }, el('strong', {}, `#${item.number}`), suggestionStatus(item), el('span', {}, window.CyroI18n.computedText(() => `${item.authorName || userLabel(item.authorId)} · ${dateLabel(item.createdAt)}`)));
    const votes = el('div', { className: 'suggestion-votes', 'aria-label': ui('Votes') }, el('span', { className: 'suggestion-up' }, ui("{p0} upvotes", { p0: format(item.upVotes) })), el('span', {}, ui("{p0} downvotes", { p0: format(item.downVotes) })), el('strong', {}, ui("Score {p0}{p1}", { p0: item.score > 0 ? '+' : '', p1: format(item.score) })));
    row.append(info, el('p', { className: 'suggestion-content' }, item.text), el('div', { className: 'suggestion-footer' }, votes, messageLink(item)));
    if (item.delivery === 'pending') row.append(el('p', { className: 'suggestion-notice' }, ui('Delivery could not be confirmed. Check the suggestions channel before posting the idea again. Voting and staff decisions are unavailable until delivery is confirmed.')));
    if (item.syncPending) row.append(el('p', { className: 'suggestion-notice' }, ui('The result is saved here, but the Discord message update is still pending.')));
    if (item.decision) row.append(el('div', { className: 'suggestion-response' }, el('strong', {}, ui('Staff response')), el('p', {}, item.decision.reason || ui('No note added.')), el('small', {}, window.CyroI18n.computedText(() => `${userLabel(item.decision.actorId)} · ${dateLabel(item.decision.at)}`))));
    if (item.status !== 'open' || item.delivery !== 'sent') return row;
    const draft = decisionDrafts.get(item.id) || { status: 'accepted', reason: '' };
    decisionDrafts.set(item.id, draft);
    const review = el('details', { className: 'suggestion-review', open: Boolean(uncertain.get(item.id) || draft.reason.trim()) }, el('summary', {}, ui('Respond to this suggestion')));
    const reviewForm = el('form', { className: 'suggestion-review-form' });
    const statusInput = el('select', { onChange: event => { draft.status = event.target.value; } }, [['accepted', 'Accept'], ['declined', 'Decline'], ['closed', 'Close without a decision']].map(([value, label]) => el('option', { value, selected: value === draft.status }, ui(label))));
    const reason = el('textarea', { maxlength: 1000, rows: 2, value: draft.reason, onInput: event => { draft.reason = event.target.value; updateDirty(); } });
    const feedback = el('p', { className: uncertain.has(item.id) ? 'save-status error' : 'save-status', role: 'status', 'aria-live': 'polite' }, uncertain.get(item.id) || ui('A final response closes voting and is shown on the Discord message.'));
    const submit = el('button', { type: 'submit', className: 'button secondary', disabled: uncertain.has(item.id) }, ui('Save response'));
    reviewForm.append(field(ui('Decision'), statusInput), field(ui('Staff note (optional)'), reason, ui('Up to 1,000 characters. Visible to everyone who can see the suggestion.')), el('div', { className: 'suggestion-decision-footer' }, feedback, submit));
    reviewForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || refreshing || confirming || !active() || uncertain.has(item.id) || !reviewForm.reportValidity()) return;
      const status = draft.status, note = draft.reason.trim();
      const action = ({ accepted: ui('Accept'), declined: ui('Decline'), closed: ui('Close') })[status];
      confirming = true; updateDirty();
      let approved;
      try { approved = await confirmAction(ui("{p0} suggestion #{p1}?", { p0: action, p1: item.number }), ui('This closes voting and posts your response on the suggestion. The final decision cannot be changed.'), ui("{p0} suggestion", { p0: action }), ui('Keep reviewing')); }
      finally { confirming = false; updateDirty(); }
      if (!approved) return;
      if (busy || refreshing || !active()) return;
      busy = true; state.saving = true;
      const controls = [...reviewForm.elements]; controls.forEach(control => { control.disabled = true; });
      feedback.className = 'save-status'; window.CyroI18n.setContent(feedback, ui('Saving your response…')); window.CyroI18n.setContent(submit, ui('Saving…'));
      try {
        const result = DEMO ? { suggestion: { ...item, status, decision: { status, reason: note, actorId: state.me.user.id, at: new Date().toISOString() } } } : await api(`${endpoint}/${safeId(item.id)}`, 'POST', { status, reason: note });
        if (!active()) return;
        const updated = result.suggestion;
        snapshot.items = snapshot.items.map(entry => entry.id === item.id ? updated : entry);
        if (updated.status !== item.status) { snapshot.counts[item.status] = Math.max(0, (snapshot.counts[item.status] || 0) - 1); snapshot.counts[updated.status] = (snapshot.counts[updated.status] || 0) + 1; }
        detail.suggestions = clone(snapshot); decisionDrafts.delete(item.id); uncertain.delete(item.id);
        updateDirty(); drawHistory(); toast(DEMO ? ui('Demo response saved. Discord was not changed.') : ui('Suggestion response saved.'));
      } catch (error) {
        if (!active()) return;
        const ambiguous = !error.status || error.status >= 500;
        const message = ui(ambiguous ? '{error} The response could not be confirmed. Refresh votes to check the saved result before trying again.' : '{error}', { error: uiError(error) });
        if (ambiguous) uncertain.set(item.id, message);
        feedback.className = 'save-status error'; window.CyroI18n.setContent(feedback, message);
      } finally {
        busy = false; state.saving = false;
        if (active()) { controls.forEach(control => { control.disabled = false; }); submit.disabled = uncertain.has(item.id); window.CyroI18n.setContent(submit, ui('Save response')); updateDirty(); }
      }
    });
    review.append(reviewForm); row.append(review); return row;
  }
  async function refreshHistory(requestedPage = snapshot.page || 1) {
    if (busy || refreshing || confirming || !active()) return;
    if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > Math.max(1, snapshot.totalPages || 1)) return;
    const changingPage = requestedPage !== (snapshot.page || 1);
    refreshing = true; updateDirty(); drawPagination(); reload.disabled = true; window.CyroI18n.setContent(reload, ui('Refreshing…')); window.CyroI18n.setContent(historyStatus, ui('Checking the latest suggestions and votes…'));
    try {
      const result = DEMO ? clone(detail.suggestions) : await api(`${endpoint}?page=${requestedPage}`);
      if (!active()) return;
      snapshot = result;
      detail.suggestions = clone(result);
      // Keep drafts and uncertain outcomes on other pages until those records are read again.
      for (const item of result.items) {
        uncertain.delete(item.id);
        if (item.status !== 'open') decisionDrafts.delete(item.id);
      }
      // A vote refresh leaves the settings form and its unsaved draft intact.
      historyStatus.className = 'field-hint'; window.CyroI18n.setContent(historyStatus, ui("Page {p0} refreshed {p1}. Draft notes are kept when you change pages.", { p0: snapshot.page || 1, p1: window.CyroI18n.computedText(((at) => locale => new Date(at).toLocaleTimeString(locale === 'pt' ? 'pt-BR' : locale, { hour: 'numeric', minute: '2-digit' }))(Date.now())) }));
      drawHistory(); updateDirty();
      if (changingPage) { history.focus({ preventScroll: true }); history.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    } catch (error) {
      if (!active()) return;
      historyStatus.className = 'field-hint suggestions-error'; window.CyroI18n.setContent(historyStatus, ui("{p0} The previous results are still shown. Choose Refresh votes to try again.", { p0: uiError(error) }));
    } finally {
      refreshing = false;
      if (active()) { reload.disabled = false; reload.replaceChildren(icon('clock'), window.CyroI18n.node(ui('Refresh votes'))); drawPagination(); updateDirty(); }
    }
  }
  const guide = contextCard(ui('From idea to decision'), ui('Members use /suggestion in Discord. Each idea gets its own numbered post with Upvote, Downvote, and Remove vote buttons.'), 'spark', el('ol', {}, el('li', {}, ui('One vote per member. Choose the other button to change it.')), el('li', {}, ui('Staff review the ideas below and leave a final response.')), el('li', {}, ui('Accepting, declining, or closing an idea ends voting.'))));
  const accessNote = contextCard(ui('Set the right access'), ui('Members need access to the suggestions channel to vote. Dashboard staff can review suggestions here. The server owner can restrict /suggestion to selected roles in Access & commands.'), 'lock', link(ui('Access & commands'), 'access'));
  surface.replaceWith(el('div', { className: 'settings-grid suggestions-grid' }, form, el('aside', { className: 'stack' }, guide, accessNote)));
  main.append(panel(ui('Community ideas'), el('div', {}, counts, el('div', { className: 'suggestions-toolbar' }, field(ui('Show suggestions on this page'), selection, ui('Up to 100 ideas per page, newest first. Totals above include all retained ideas.')), reload), el('div', { className: 'suggestions-history-note' }, historyStatus), history, pagination), null, ui('Ideas and staff responses. Members cast their votes in Discord.')));
  drawHistory();
}
