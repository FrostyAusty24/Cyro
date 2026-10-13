'use strict';

let statusRolesRenderSequence = 0;

async function renderStatusRoles(main) {
  const guildId = state.guildId;
  const sequence = ++statusRolesRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'status-roles' && sequence === statusRolesRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/status-roles`;
  const detail = state.detail;
  main.replaceChildren(heading('Status roles', 'Reward members who put your community’s text in their Discord custom status.'));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), 'Loading status role settings…');
  main.append(loading);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.statusRoles) : await api(endpoint);
    if (!active()) return;
    detail.statusRoles = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    loading.replaceWith(panel('Status roles unavailable', el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button('Try again', () => renderStatusRoles(main), 'secondary'))));
    return;
  }

  let savedConfig = clone(snapshot.config);
  const config = clone(savedConfig);
  let busy = false;
  let refreshing = false;
  const form = el('form', { className: 'settings-form status-roles-form' });
  const saveStatus = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, 'Your settings are up to date.');
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), 'Save changes');
  const availability = el('div', { className: 'alert info status-roles-availability', role: 'status' });
  const counts = el('div', { className: 'status-roles-counts', 'aria-label': 'Status role assignments' });
  const warnings = el('div', { className: 'status-roles-warnings' });
  const activityStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, 'Assignments update as Cyro receives member statuses. Refresh to check the latest totals.');
  const refresh = button('Refresh status', () => refreshStatus(), 'secondary small', 'clock');
  const dirty = () => JSON.stringify(config) !== JSON.stringify(savedConfig);
  const session = { config, change(path, value) {
    putPath(config, path, value);
    updateDraft();
    saveStatus.className = 'save-status';
    saveStatus.textContent = dirty() ? 'You have unsaved settings.' : 'Your settings are up to date.';
  } };
  const enableSection = toggleSection(session, 'Enable status roles', 'Give the selected role when a custom status matches. Remove it when that status no longer matches.', 'enabled');
  const enableInput = enableSection.querySelector('input');
  const statusText = textField(session, 'Status text to match', 'text', 'A phrase, your server name, or an invite link. Up to 128 characters; spaces at the ends are trimmed when saved.', { maxlength: 128, placeholder: 'discord.gg/your-community' });
  const textInput = statusText.querySelector('input');
  const roles = (detail.roles || []).filter(role => role.id !== guildId && !role.managed);
  const roleInput = el('select', { onChange: event => session.change('roleId', event.target.value || null) },
    el('option', { value: '', selected: !config.roleId }, 'Select a reward role'),
    roles.map(role => el('option', { value: role.id, selected: role.id === config.roleId }, role.name)),
    config.roleId && !roles.some(role => role.id === config.roleId) && el('option', { value: config.roleId, selected: true }, `Unavailable role · ${config.roleId}`));
  const matching = el('select', { onChange: event => session.change('match', event.target.value) },
    [['contains', 'Contains this text'], ['exact', 'Exactly this text']].map(([value, label]) => el('option', { value, selected: config.match === value }, label)));
  const caseSection = toggleSection(session, 'Match capital letters', 'Require the same uppercase and lowercase letters. Leave off to match either.', 'caseSensitive');
  const offlineInput = el('select', { onChange: event => session.change('offlineBehavior', event.target.value) },
    [['keep', 'Keep the role until their next visible status'], ['remove', 'Remove the role while offline or invisible']].map(([value, label]) => el('option', { value, selected: config.offlineBehavior === value }, label)));

  const sampleInput = el('input', { type: 'text', maxlength: 128, value: config.text || '', placeholder: 'Try a sample custom status', autocomplete: 'off', onInput: () => drawPreview() });
  const preview = el('div', { className: 'status-role-preview' });
  const previewResult = el('p', { className: 'status-role-result', role: 'status', 'aria-live': 'polite' });
  const previewNote = el('p', { className: 'field-hint' }, 'A sample only. This does not change anyone’s status or roles.');

  function drawPreview() {
    const needle = config.text.trim();
    const example = sampleInput.value;
    const expected = config.caseSensitive ? needle : needle.toLocaleLowerCase('en-US');
    const actual = config.caseSensitive ? example : example.toLocaleLowerCase('en-US');
    const matches = Boolean(needle && (config.match === 'exact' ? actual === expected : actual.includes(expected)));
    const role = roles.find(item => item.id === config.roleId)?.name || 'Reward role';
    preview.replaceChildren(el('div', { className: 'status-role-person' }, el('span', { className: 'status-role-avatar', 'aria-hidden': 'true' }, 'CM'),
      el('div', {}, el('strong', {}, 'Community member'), el('p', {}, example || 'No custom status'))),
      el('div', { className: 'status-role-outcome' }, matches && config.roleId ? tag(role, 'green') : tag('No status role', 'muted')));
    previewResult.replaceChildren(icon(matches ? 'check' : 'help'), el('span', {}, !needle ? 'Enter your status text to try the rule.' : matches ? config.roleId ? 'Matches your rule. This member would qualify.' : 'Text matches. Choose a reward role to finish setup.' : 'Does not match. A role given by this rule would be removed.'));
    previewResult.classList.toggle('matches', matches);
    previewNote.textContent = 'Sample of a visible member’s custom status. ' + (config.enabled ? 'This preview does not change anyone’s roles.' : 'The rule is disabled until you enable it and save.');
  }
  function updateDraft() {
    if (!active()) return;
    state.dirty = dirty();
    save.disabled = busy || refreshing || !dirty();
    enableInput.disabled = busy || (!snapshot.available && !config.enabled);
    textInput.required = config.enabled;
    roleInput.required = config.enabled;
    drawPreview();
  }
  function drawStatus() {
    if (!active()) return;
    availability.hidden = snapshot.available;
    availability.textContent = snapshot.available ? '' : 'Status tracking is not enabled for this bot yet. The bot operator needs to enable Discord’s Presence Intent and restart Cyro. You can save your rule while it is switched off.';
    counts.replaceChildren(...[['assigned', 'Roles assigned'], ['pendingAdd', 'Waiting to add'], ['pendingRemove', 'Waiting to remove']].map(([key, label]) => el('div', { className: 'status-role-count' }, el('strong', {}, format(snapshot.counts?.[key])), el('span', {}, label))));
    warnings.replaceChildren(...(snapshot.warnings || []).map(warning => el('p', { className: 'status-role-warning' }, icon('help'), el('span', {}, warning))));
    updateDraft();
  }
  async function refreshStatus() {
    if (busy || refreshing || !active()) return;
    refreshing = true; refresh.disabled = true; refresh.textContent = 'Refreshing…'; updateDraft();
    activityStatus.className = 'field-hint'; activityStatus.textContent = 'Checking the latest role assignments…';
    try {
      const result = DEMO ? clone(detail.statusRoles) : await api(endpoint);
      if (!active()) return;
      snapshot = result; detail.statusRoles = clone(result);
      // A status refresh leaves any unsaved rule edits intact.
      activityStatus.textContent = `Status refreshed ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Your rule draft has been kept.`;
      drawStatus();
    } catch (error) {
      if (!active()) return;
      activityStatus.className = 'field-hint status-role-error'; activityStatus.textContent = `${error.message} The previous totals are still shown.`;
    } finally {
      refreshing = false;
      if (active()) { refresh.disabled = false; refresh.replaceChildren(icon('clock'), 'Refresh status'); updateDraft(); }
    }
  }

  form.append(panel('Your community’s status reward', [enableSection,
    el('div', { className: 'form-section stack' }, statusText,
      field('Reward role', roleInput, 'Use a dedicated role below Cyro’s highest role. Staff roles, dashboard access roles, and managed integration roles cannot be rewards.'),
      field('Matching rule', matching, 'Contains allows other words around your text. Exactly requires the whole custom status to match.')),
    caseSection]),
    panel('When their status is hidden', el('div', { className: 'form-section stack' },
      field('Offline or invisible members', offlineInput, 'Discord does not reveal their custom status. Keeping the role avoids removing it just because someone goes offline.'),
      el('p', { className: 'form-intro' }, 'For online members, clearing the custom status or hiding it from the bot is treated as no match. Only Discord custom statuses count; games, music, and the About Me profile text do not.'))),
    el('div', { className: 'save-bar' }, saveStatus, save));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || !active() || !form.reportValidity() || !dirty()) return;
    if (config.enabled && (!config.text.trim() || !config.roleId || !snapshot.available)) {
      saveStatus.className = 'save-status error';
      saveStatus.textContent = !snapshot.available ? 'Switch this rule off to save it until the bot operator enables status tracking.' : 'Enter status text and choose a reward role before enabling this rule.';
      if (!config.text.trim()) textInput.focus(); else if (!config.roleId) roleInput.focus();
      return;
    }
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    save.textContent = 'Saving…'; saveStatus.className = 'save-status'; saveStatus.textContent = 'Saving status role settings…';
    try {
      const result = DEMO ? { config: { ...clone(config), text: config.text.trim() } } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config); textInput.value = config.text;
      snapshot.config = clone(result.config); detail.statusRoles.config = clone(result.config);
      saveStatus.className = 'save-status success';
      saveStatus.textContent = DEMO ? 'Saved for this demo session. Discord was not changed.' : 'Settings saved. Role updates run in the background; refresh status to check progress.';
      toast(DEMO ? 'Demo status role settings saved.' : 'Status role settings saved.');
      drawPreview();
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error';
      saveStatus.textContent = error.message + (!error.status || error.status >= 500 ? ' The save could not be confirmed. Reopen this page to check the saved rule.' : ' Your draft is still here.');
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), 'Save changes'); updateDraft(); }
    }
  });

  const previewPanel = panel('Try your rule', el('div', { className: 'form-section stack' }, field('Example custom status', sampleInput, 'Try the text a member might use.'), preview, previewResult, previewNote));
  const ownership = contextCard('A role for supporters', 'Create a role just for this reward. Cyro removes only roles that this feature gave out. Roles members already had are left alone.', 'award', el('p', {}, 'Disabling the rule or choosing a different role removes its earlier assignments in the background.'));
  const activity = panel('Role activity', el('div', {}, counts, warnings, el('div', { className: 'status-role-activity-footer' }, activityStatus, refresh)), null, 'Totals for roles managed by this feature in this server.');
  loading.replaceWith(availability, el('div', { className: 'settings-grid status-roles-grid' }, form, el('aside', { className: 'stack' }, previewPanel, ownership)), activity);
  drawStatus();
}
