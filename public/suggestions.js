'use strict';

let suggestionsRenderSequence = 0;

function suggestionStatus(item) {
  if (item.delivery === 'pending') return tag('Delivery unconfirmed', 'orange');
  return tag(({ open: 'Voting open', accepted: 'Accepted', declined: 'Declined', closed: 'Closed' })[item.status] || 'Unavailable', ({ open: '', accepted: 'green', declined: 'red', closed: 'muted' })[item.status]);
}

async function renderSuggestions(main) {
  const guildId = state.guildId;
  const sequence = ++suggestionsRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'suggestions' && sequence === suggestionsRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/suggestions`;
  const detail = state.detail;
  main.replaceChildren(heading('Suggestions', 'Members submit ideas with /suggestion. Let them vote, then share your team’s decision.', link('Getting started', 'help')));
  const surface = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), 'Loading suggestions…');
  main.append(surface);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.suggestions) : await api(endpoint);
    if (!active()) return;
    detail.suggestions = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    surface.replaceWith(panel('Suggestions unavailable', el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button('Try again', () => renderSuggestions(main), 'secondary'))));
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
  const saveStatus = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, 'Your settings are up to date.');
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), 'Save changes');
  const configDirty = () => JSON.stringify(config) !== JSON.stringify(savedConfig);
  function updateDirty() {
    if (!active()) return;
    state.dirty = configDirty() || [...decisionDrafts.values()].some(draft => draft.reason.trim());
    save.disabled = busy || refreshing || confirming || !configDirty();
  }
  const session = { config, change(path, value) {
    putPath(config, path, value); updateDirty();
    saveStatus.className = 'save-status';
    saveStatus.textContent = configDirty() ? 'You have unsaved settings.' : 'Your settings are up to date.';
  } };

  form.append(panel('Suggestion board', [toggleSection(session, 'Enable suggestions', 'Members can use /suggestion to write an idea and open it for voting.', 'enabled'),
    el('div', { className: 'form-section stack' },
      channelField(session, 'Suggestions channel', 'channelId', 'Choose a text channel members can see. Cyro needs View Channel, Send Messages, Embed Links, and Read Message History.', false, 'Select a channel', true),
      textField(session, 'Time between suggestions (minutes)', 'cooldownMinutes', 'Per member. Use 0 for no cooldown, up to 1440 minutes (one day).', { type: 'number', min: 0, max: 1440, required: true }))]),
    el('div', { className: 'save-bar' }, saveStatus, save));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || confirming || !active() || !form.reportValidity() || !configDirty()) return;
    if (config.enabled && !config.channelId) {
      saveStatus.className = 'save-status error'; saveStatus.textContent = 'Choose a suggestions channel before enabling the board.';
      form.querySelector('select')?.focus(); return;
    }
    busy = true; state.saving = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    save.textContent = 'Saving…'; saveStatus.className = 'save-status'; saveStatus.textContent = 'Saving suggestion settings…';
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config);
      snapshot.config = clone(result.config); detail.suggestions.config = clone(result.config);
      saveStatus.className = 'save-status success'; saveStatus.textContent = DEMO ? 'Saved for this demo session.' : 'Suggestion settings saved.';
      toast(DEMO ? 'Demo suggestion settings saved.' : 'Suggestion settings saved.');
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error'; saveStatus.textContent = error.message + (!error.status || error.status >= 500 ? ' The save could not be confirmed. Reopen this page to check the saved settings.' : '');
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); save.replaceChildren(icon('check'), 'Save changes'); updateDirty(); }
    }
  });

  const counts = el('div', { className: 'suggestions-counts', 'aria-label': 'Suggestion totals' });
  const history = el('div', { className: 'suggestions-list', tabindex: '-1' });
  const historyStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, 'Votes are refreshed when you open this page or choose Refresh votes.');
  const selection = el('select', { 'aria-label': 'Filter suggestions', onChange: event => { filter = event.target.value; drawHistory(); } },
    [['all', 'All suggestions'], ['open', 'Voting open'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['closed', 'Closed'], ['pending', 'Delivery unconfirmed']].map(([value, label]) => el('option', { value }, label)));
  const reload = button('Refresh votes', () => refreshHistory(), 'secondary small', 'clock');
  const previous = button('Previous page', () => refreshHistory((snapshot.page || 1) - 1), 'secondary small');
  const next = button('Next page', () => refreshHistory((snapshot.page || 1) + 1), 'secondary small');
  const pageLabel = el('span', { className: 'suggestions-page-label', role: 'status', 'aria-live': 'polite' });
  const pagination = el('nav', { className: 'suggestions-pagination', 'aria-label': 'Suggestion history pages' }, previous, pageLabel, next);

  function drawPagination() {
    const page = snapshot.page || 1, totalPages = Math.max(1, snapshot.totalPages || 1);
    previous.disabled = refreshing || page <= 1;
    next.disabled = refreshing || page >= totalPages;
    pageLabel.textContent = `Page ${page} of ${totalPages}`;
  }

  function drawCounts() {
    const totals = snapshot.counts || {};
    counts.replaceChildren(...[['open', 'Open'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['closed', 'Closed']].map(([key, name]) => el('div', { className: `suggestion-count suggestion-count-${key}` }, el('strong', {}, format(totals[key])), el('span', {}, name))));
    if (totals.pending) counts.append(el('div', { className: 'suggestion-count' }, el('strong', {}, format(totals.pending)), el('span', {}, 'Unconfirmed')));
  }
  function messageLink(item) {
    // Construct Discord links from IDs rather than trusting arbitrary saved URLs.
    if (!/^\d{17,20}$/.test(String(item.channelId)) || !/^\d{17,20}$/.test(String(item.messageId))) return null;
    return el('a', { className: 'text-link', href: `https://discord.com/channels/${safeId(guildId)}/${safeId(item.channelId)}/${safeId(item.messageId)}`, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Discord', icon('arrow'));
  }
  function drawHistory() {
    if (!active()) return;
    drawCounts();
    drawPagination();
    const items = (snapshot.items || []).filter(item => filter === 'all' || (filter === 'pending' ? item.delivery === 'pending' : item.delivery === 'sent' && item.status === filter));
    const content = items.length ? items.map(renderItem) : [empty(filter === 'all' ? 'No suggestions yet.' : 'No matching suggestions on this page.', filter === 'all' ? 'Choose a channel, enable suggestions and save. Members can then use /suggestion in Discord to post their first idea.' : 'Choose another status or page, or refresh to check for new ideas.', 'spark')];
    history.replaceChildren(...content);
  }
  function renderItem(item) {
    const row = el('article', { className: 'suggestion-item', 'aria-label': `Suggestion ${item.number}` });
    const info = el('div', { className: 'suggestion-meta' }, el('strong', {}, `#${item.number}`), suggestionStatus(item), el('span', {}, `${item.authorName || userLabel(item.authorId)} · ${dateLabel(item.createdAt)}`));
    const votes = el('div', { className: 'suggestion-votes', 'aria-label': 'Votes' }, el('span', { className: 'suggestion-up' }, `${format(item.upVotes)} upvotes`), el('span', {}, `${format(item.downVotes)} downvotes`), el('strong', {}, `Score ${item.score > 0 ? '+' : ''}${format(item.score)}`));
    row.append(info, el('p', { className: 'suggestion-content' }, item.text), el('div', { className: 'suggestion-footer' }, votes, messageLink(item)));
    if (item.delivery === 'pending') row.append(el('p', { className: 'suggestion-notice' }, 'Delivery could not be confirmed. Check the suggestions channel before posting the idea again. Voting and staff decisions are unavailable until delivery is confirmed.'));
    if (item.syncPending) row.append(el('p', { className: 'suggestion-notice' }, 'The result is saved here, but the Discord message update is still pending.'));
    if (item.decision) row.append(el('div', { className: 'suggestion-response' }, el('strong', {}, 'Staff response'), el('p', {}, item.decision.reason || 'No note added.'), el('small', {}, `${userLabel(item.decision.actorId)} · ${dateLabel(item.decision.at)}`)));
    if (item.status !== 'open' || item.delivery !== 'sent') return row;
    const draft = decisionDrafts.get(item.id) || { status: 'accepted', reason: '' };
    decisionDrafts.set(item.id, draft);
    const review = el('details', { className: 'suggestion-review', open: Boolean(uncertain.get(item.id) || draft.reason.trim()) }, el('summary', {}, 'Respond to this suggestion'));
    const reviewForm = el('form', { className: 'suggestion-review-form' });
    const statusInput = el('select', { onChange: event => { draft.status = event.target.value; } }, [['accepted', 'Accept'], ['declined', 'Decline'], ['closed', 'Close without a decision']].map(([value, label]) => el('option', { value, selected: value === draft.status }, label)));
    const reason = el('textarea', { maxlength: 1000, rows: 2, value: draft.reason, onInput: event => { draft.reason = event.target.value; updateDirty(); } });
    const feedback = el('p', { className: uncertain.has(item.id) ? 'save-status error' : 'save-status', role: 'status', 'aria-live': 'polite' }, uncertain.get(item.id) || 'A final response closes voting and is shown on the Discord message.');
    const submit = el('button', { type: 'submit', className: 'button secondary', disabled: uncertain.has(item.id) }, 'Save response');
    reviewForm.append(field('Decision', statusInput), field('Staff note (optional)', reason, 'Up to 1,000 characters. Visible to everyone who can see the suggestion.'), el('div', { className: 'suggestion-decision-footer' }, feedback, submit));
    reviewForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || refreshing || confirming || !active() || uncertain.has(item.id) || !reviewForm.reportValidity()) return;
      const status = draft.status, note = draft.reason.trim();
      const action = ({ accepted: 'Accept', declined: 'Decline', closed: 'Close' })[status];
      confirming = true; updateDirty();
      let approved;
      try { approved = await confirmAction(`${action} suggestion #${item.number}?`, 'This closes voting and posts your response on the suggestion. The final decision cannot be changed.', `${action} suggestion`, 'Keep reviewing'); }
      finally { confirming = false; updateDirty(); }
      if (!approved) return;
      if (busy || refreshing || !active()) return;
      busy = true; state.saving = true;
      const controls = [...reviewForm.elements]; controls.forEach(control => { control.disabled = true; });
      feedback.className = 'save-status'; feedback.textContent = 'Saving your response…'; submit.textContent = 'Saving…';
      try {
        const result = DEMO ? { suggestion: { ...item, status, decision: { status, reason: note, actorId: state.me.user.id, at: new Date().toISOString() } } } : await api(`${endpoint}/${safeId(item.id)}`, 'POST', { status, reason: note });
        if (!active()) return;
        const updated = result.suggestion;
        snapshot.items = snapshot.items.map(entry => entry.id === item.id ? updated : entry);
        if (updated.status !== item.status) { snapshot.counts[item.status] = Math.max(0, (snapshot.counts[item.status] || 0) - 1); snapshot.counts[updated.status] = (snapshot.counts[updated.status] || 0) + 1; }
        detail.suggestions = clone(snapshot); decisionDrafts.delete(item.id); uncertain.delete(item.id);
        updateDirty(); drawHistory(); toast(DEMO ? 'Demo response saved. Discord was not changed.' : 'Suggestion response saved.');
      } catch (error) {
        if (!active()) return;
        const ambiguous = !error.status || error.status >= 500;
        const message = error.message + (ambiguous ? ' The response could not be confirmed. Refresh votes to check the saved result before trying again.' : '');
        if (ambiguous) uncertain.set(item.id, message);
        feedback.className = 'save-status error'; feedback.textContent = message;
      } finally {
        busy = false; state.saving = false;
        if (active()) { controls.forEach(control => { control.disabled = false; }); submit.disabled = uncertain.has(item.id); submit.textContent = 'Save response'; updateDirty(); }
      }
    });
    review.append(reviewForm); row.append(review); return row;
  }
  async function refreshHistory(requestedPage = snapshot.page || 1) {
    if (busy || refreshing || confirming || !active()) return;
    if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > Math.max(1, snapshot.totalPages || 1)) return;
    const changingPage = requestedPage !== (snapshot.page || 1);
    refreshing = true; updateDirty(); drawPagination(); reload.disabled = true; reload.textContent = 'Refreshing…'; historyStatus.textContent = 'Checking the latest suggestions and votes…';
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
      historyStatus.className = 'field-hint'; historyStatus.textContent = `Page ${snapshot.page || 1} refreshed ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Draft notes are kept when you change pages.`;
      drawHistory(); updateDirty();
      if (changingPage) { history.focus({ preventScroll: true }); history.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    } catch (error) {
      if (!active()) return;
      historyStatus.className = 'field-hint suggestions-error'; historyStatus.textContent = `${error.message} The previous results are still shown. Choose Refresh votes to try again.`;
    } finally {
      refreshing = false;
      if (active()) { reload.disabled = false; reload.replaceChildren(icon('clock'), 'Refresh votes'); drawPagination(); updateDirty(); }
    }
  }
  const guide = contextCard('From idea to decision', 'Members use /suggestion in Discord. Each idea gets its own numbered post with Upvote, Downvote, and Remove vote buttons.', 'spark', el('ol', {}, el('li', {}, 'One vote per member. Choose the other button to change it.'), el('li', {}, 'Staff review the ideas below and leave a final response.'), el('li', {}, 'Accepting, declining, or closing an idea ends voting.')));
  const accessNote = contextCard('Set the right access', 'Members need access to the suggestions channel to vote. Dashboard staff can review suggestions here. The server owner can restrict /suggestion to selected roles in Access & commands.', 'lock', link('Access & commands', 'access'));
  surface.replaceWith(el('div', { className: 'settings-grid suggestions-grid' }, form, el('aside', { className: 'stack' }, guide, accessNote)));
  main.append(panel('Community ideas', el('div', {}, counts, el('div', { className: 'suggestions-toolbar' }, field('Show suggestions on this page', selection, 'Up to 100 ideas per page, newest first. Totals above include all retained ideas.'), reload), el('div', { className: 'suggestions-history-note' }, historyStatus), history, pagination), null, 'Ideas and staff responses. Members cast their votes in Discord.'));
  drawHistory();
}
