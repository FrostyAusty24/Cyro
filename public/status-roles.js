'use strict';

let statusRolesRenderSequence = 0;

async function renderStatusRoles(main) {
  const guildId = state.guildId;
  const sequence = ++statusRolesRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'status-roles' && sequence === statusRolesRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/status-roles`;
  const detail = state.detail;
  main.replaceChildren(heading(ui('Status roles'), ui('Reward members who put your community’s text in their Discord custom status.')));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading status role settings…'));
  main.append(loading);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.statusRoles) : await api(endpoint);
    if (!active()) return;
    detail.statusRoles = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    loading.replaceWith(panel(ui('Status roles unavailable'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button(ui('Try again'), () => renderStatusRoles(main), 'secondary'))));
    return;
  }

  let savedConfig = clone(snapshot.config);
  const config = clone(savedConfig);
  let busy = false;
  let refreshing = false;
  const form = el('form', { className: 'settings-form status-roles-form' });
  const saveStatus = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, ui('Your settings are up to date.'));
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), ui('Save changes'));
  const availability = el('div', { className: 'alert info status-roles-availability', role: 'status' });
  const counts = el('div', { className: 'status-roles-counts', 'aria-label': ui('Status role assignments') });
  const warnings = el('div', { className: 'status-roles-warnings' });
  const activityStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, ui('Assignments update as Cyro receives member statuses. Refresh to check the latest totals.'));
  const refresh = button(ui('Refresh status'), () => refreshStatus(), 'secondary small', 'clock');
  const dirty = () => JSON.stringify(config) !== JSON.stringify(savedConfig);
  const session = { config, change(path, value) {
    putPath(config, path, value);
    updateDraft();
    saveStatus.className = 'save-status';
    window.CyroI18n.setContent(saveStatus, dirty() ? ui('You have unsaved settings.') : ui('Your settings are up to date.'));
  } };
  const enableSection = toggleSection(session, ui('Enable status roles'), ui('Give the selected role when a custom status matches. Remove it when that status no longer matches.'), 'enabled');
  const enableInput = enableSection.querySelector('input');
  const statusText = textField(session, ui('Status text to match'), 'text', ui('A phrase, your server name, or an invite link. Up to 128 characters; spaces at the ends are trimmed when saved.'), { maxlength: 128, placeholder: ui('discord.gg/your-community') });
  const textInput = statusText.querySelector('input');
  const roles = (detail.roles || []).filter(role => role.id !== guildId && !role.managed);
  const roleInput = el('select', { 'data-search-kind': 'roles', onChange: event => session.change('roleId', event.target.value || null) },
    el('option', { value: '', selected: !config.roleId }, ui('Select a reward role')),
    roles.map(role => el('option', { value: role.id, selected: role.id === config.roleId }, role.name)),
    config.roleId && !roles.some(role => role.id === config.roleId) && el('option', { value: config.roleId, selected: true }, ui("Unavailable role · {p0}", { p0: config.roleId })));
  const matching = el('select', { onChange: event => session.change('match', event.target.value) },
    [['contains', 'Contains this text'], ['exact', 'Exactly this text']].map(([value, label]) => el('option', { value, selected: config.match === value }, ui(label))));
  const caseSection = toggleSection(session, ui('Match capital letters'), ui('Require the same uppercase and lowercase letters. Leave off to match either.'), 'caseSensitive');
  const offlineInput = el('select', { onChange: event => session.change('offlineBehavior', event.target.value) },
    [['keep', 'Keep the role until their next visible status'], ['remove', 'Remove the role while offline or invisible']].map(([value, label]) => el('option', { value, selected: config.offlineBehavior === value }, ui(label))));

  const sampleInput = el('input', { type: 'text', maxlength: 128, value: config.text || '', placeholder: ui('Try a sample custom status'), autocomplete: 'off', onInput: () => drawPreview() });
  const preview = el('div', { className: 'status-role-preview' });
  const previewResult = el('p', { className: 'status-role-result', role: 'status', 'aria-live': 'polite' });
  const previewNote = el('p', { className: 'field-hint' }, ui('A sample only. This does not change anyone’s status or roles.'));

  function drawPreview() {
    const needle = config.text.trim();
    const example = sampleInput.value;
    const expected = config.caseSensitive ? needle : needle.toLocaleLowerCase('en-US');
    const actual = config.caseSensitive ? example : example.toLocaleLowerCase('en-US');
    const matches = Boolean(needle && (config.match === 'exact' ? actual === expected : actual.includes(expected)));
    const role = roles.find(item => item.id === config.roleId)?.name || 'Reward role';
    preview.replaceChildren(el('div', { className: 'status-role-person' }, el('span', { className: 'status-role-avatar', 'aria-hidden': 'true' }, ui('CM')),
      el('div', {}, el('strong', {}, ui('Community member')), el('p', {}, example || ui('No custom status')))),
      el('div', { className: 'status-role-outcome' }, matches && config.roleId ? tag(role, 'green') : tag(ui('No status role'), 'muted')));
    previewResult.replaceChildren(icon(matches ? 'check' : 'help'), el('span', {}, !needle ? ui('Enter your status text to try the rule.') : matches ? config.roleId ? ui('Matches your rule. This member would qualify.') : ui('Text matches. Choose a reward role to finish setup.') : ui('Does not match. A role given by this rule would be removed.')));
    previewResult.classList.toggle('matches', matches);
    window.CyroI18n.setContent(previewNote, 'Sample of a visible member’s custom status. ' + (config.enabled ? 'This preview does not change anyone’s roles.' : 'The rule is disabled until you enable it and save.'));
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
    window.CyroI18n.setContent(availability, snapshot.available ? '' : ui('Status tracking is not enabled for this bot yet. The bot operator needs to enable Discord’s Presence Intent and restart Cyro. You can save your rule while it is switched off.'));
    counts.replaceChildren(...[['assigned', 'Roles assigned'], ['pendingAdd', 'Waiting to add'], ['pendingRemove', 'Waiting to remove']].map(([key, label]) => el('div', { className: 'status-role-count' }, el('strong', {}, format(snapshot.counts?.[key])), el('span', {}, ui(label)))));
    warnings.replaceChildren(...(snapshot.warnings || []).map(warning => el('p', { className: 'status-role-warning' }, icon('help'), el('span', {}, warning))));
    updateDraft();
  }
  async function refreshStatus() {
    if (busy || refreshing || !active()) return;
    refreshing = true; refresh.disabled = true; window.CyroI18n.setContent(refresh, ui('Refreshing…')); updateDraft();
    activityStatus.className = 'field-hint'; window.CyroI18n.setContent(activityStatus, ui('Checking the latest role assignments…'));
    try {
      const result = DEMO ? clone(detail.statusRoles) : await api(endpoint);
      if (!active()) return;
      snapshot = result; detail.statusRoles = clone(result);
      // A status refresh leaves any unsaved rule edits intact.
      window.CyroI18n.setContent(activityStatus, ui("Status refreshed {p0}. Your rule draft has been kept.", { p0: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }));
      drawStatus();
    } catch (error) {
      if (!active()) return;
      activityStatus.className = 'field-hint status-role-error'; window.CyroI18n.setContent(activityStatus, ui("{p0} The previous totals are still shown.", { p0: error.message }));
    } finally {
      refreshing = false;
      if (active()) { refresh.disabled = false; refresh.replaceChildren(icon('clock'), window.CyroI18n.node(ui('Refresh status'))); updateDraft(); }
    }
  }

  form.append(panel(ui('Your community’s status reward'), [enableSection,
    el('div', { className: 'form-section stack' }, statusText,
      field(ui('Reward role'), roleInput, ui('Use a dedicated role below Cyro’s highest role. Staff roles, dashboard access roles, and managed integration roles cannot be rewards.')),
      field(ui('Matching rule'), matching, ui('Contains allows other words around your text. Exactly requires the whole custom status to match.'))),
    caseSection]),
    panel(ui('When their status is hidden'), el('div', { className: 'form-section stack' },
      field(ui('Offline or invisible members'), offlineInput, ui('Discord does not reveal their custom status. Keeping the role avoids removing it just because someone goes offline.')),
      el('p', { className: 'form-intro' }, ui('For online members, clearing the custom status or hiding it from the bot is treated as no match. Only Discord custom statuses count; games, music, and the About Me profile text do not.')))),
    el('div', { className: 'save-bar' }, saveStatus, save));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || !active() || !form.reportValidity() || !dirty()) return;
    if (config.enabled && (!config.text.trim() || !config.roleId || !snapshot.available)) {
      saveStatus.className = 'save-status error';
      window.CyroI18n.setContent(saveStatus, !snapshot.available ? ui('Switch this rule off to save it until the bot operator enables status tracking.') : ui('Enter status text and choose a reward role before enabling this rule.'));
      if (!config.text.trim()) textInput.focus(); else if (!config.roleId) roleInput.focus();
      return;
    }
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(save, ui('Saving…')); saveStatus.className = 'save-status'; window.CyroI18n.setContent(saveStatus, ui('Saving status role settings…'));
    try {
      const result = DEMO ? { config: { ...clone(config), text: config.text.trim() } } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config); textInput.value = config.text;
      snapshot.config = clone(result.config); detail.statusRoles.config = clone(result.config);
      saveStatus.className = 'save-status success';
      window.CyroI18n.setContent(saveStatus, DEMO ? ui('Saved for this demo session. Discord was not changed.') : ui('Settings saved. Role updates run in the background; refresh status to check progress.'));
      toast(DEMO ? ui('Demo status role settings saved.') : ui('Status role settings saved.'));
      drawPreview();
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error';
      window.CyroI18n.setContent(saveStatus, error.message + (!error.status || error.status >= 500 ? ' The save could not be confirmed. Reopen this page to check the saved rule.' : ' Your draft is still here.'));
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), window.CyroI18n.node(ui('Save changes'))); updateDraft(); }
    }
  });

  const previewPanel = panel(ui('Try your rule'), el('div', { className: 'form-section stack' }, field(ui('Example custom status'), sampleInput, ui('Try the text a member might use.')), preview, previewResult, previewNote));
  const ownership = contextCard(ui('A role for supporters'), ui('Create a role just for this reward. Cyro removes only roles that this feature gave out. Roles members already had are left alone.'), 'sparkles', el('p', {}, ui('Disabling the rule or choosing a different role removes its earlier assignments in the background.')));
  const activity = panel(ui('Role activity'), el('div', {}, counts, warnings, el('div', { className: 'status-role-activity-footer' }, activityStatus, refresh)), null, ui('Totals for roles managed by this feature in this server.'));
  loading.replaceWith(availability, el('div', { className: 'settings-grid status-roles-grid' }, form, el('aside', { className: 'stack' }, previewPanel, ownership)), activity);
  drawStatus();
}
