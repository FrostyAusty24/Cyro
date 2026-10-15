'use strict';

let tempVoiceRenderSequence = 0;

async function renderTempVoice(main) {
  const guildId = state.guildId, sequence = ++tempVoiceRenderSequence, detail = state.detail;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'temp-voice' && sequence === tempVoiceRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/temp-voice`;
  main.replaceChildren(heading(ui('Temporary voice rooms'), ui('Let members make a room by joining a voice lobby. Cyro closes it when everyone leaves.')));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading temporary rooms…')); main.append(loading);
  let snapshot;
  try { snapshot = DEMO ? clone(detail.tempVoice) : await api(endpoint); if (!active()) return; detail.tempVoice = clone(snapshot); }
  catch (error) { if (active()) loading.replaceWith(panel(ui('Could not load temporary rooms'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, uiError(error)), button(ui('Try again'), () => renderTempVoice(main), 'secondary')))); return; }
  let saved = clone(snapshot.config), busy = false, refreshing = false;
  const config = clone(saved), form = el('form', { className: 'settings-form' });
  const status = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, ui('Your settings are up to date.'));
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), ui('Save changes'));
  const dirty = () => JSON.stringify(config) !== JSON.stringify(saved);
  function updateDirty() { if (!active()) return; state.dirty = dirty(); save.disabled = busy || refreshing || !dirty(); }
  const session = { config, change(path, value) { putPath(config, path, value); updateDirty(); status.className = 'save-status'; window.CyroI18n.setContent(status, dirty() ? ui('You have unsaved settings.') : ui('Your settings are up to date.')); } };
  form.append(panel(ui('Join to create'), [
    toggleSection(session, ui('Enable temporary rooms'), ui('Members join your lobby and move into their own room. Turning this off stops new rooms; existing rooms still close when empty.'), 'enabled'),
    el('div', { className: 'form-section stack' },
      channelField(session, ui('Join-to-create channel'), 'lobbyChannelId', ui('Create a normal voice channel in Discord first, such as “Join to create”. Do not use a temporary room as the lobby.'), false, ui('Select a voice lobby'), false, [2]),
      channelField(session, ui('Room category'), 'categoryId', ui('New rooms inherit this category’s visibility. Members need View Channel and Connect here as well as in the lobby.'), true),
      textField(session, ui('Room name'), 'nameTemplate', ui('Use {name} for the member’s server display name, for example “{name}’s room”.'), { maxlength: 80, required: true }),
      textField(session, ui('Default member limit'), 'userLimit', ui('0 means no limit. Room owners can change this with the Member limit button in their room’s chat.'), { type: 'number', min: 0, max: 99, required: true }),
      textField(session, ui('Maximum active rooms'), 'maxRooms', ui('Between 1 and 25 rooms per server. A member can own one room at a time.'), { type: 'number', min: 1, max: 25, required: true }))]),
    panel(ui('Room controls'), toggleSection(session, ui('Let owners manage their room'), ui('Each room gets Lock, Unlock, Rename, Member limit, Allow member and Remove member buttons in its text chat. Staff with Manage Channels can manage a room they have joined.'), 'ownerControls')),
    el('div', { className: 'save-bar' }, status, save));
  const rooms = el('div', { className: 'form-section stack temp-room-list' });
  const warnings = el('div', { className: 'stack', role: 'status' });
  const refresh = button(ui('Refresh rooms'), refreshRooms, 'secondary small', 'clock');
  const refreshNote = el('p', { className: 'field-hint', role: 'status' }, ui('Room activity refreshes when you open this page or choose Refresh rooms.'));
  function drawRooms() {
    const items = snapshot.rooms || [];
    rooms.replaceChildren(...(items.length ? items.map(room => el('div', { className: 'list-row' }, el('div', {}, el('strong', {}, detail.channels?.find(channel => channel.id === room.channelId)?.name || room.name), el('p', { className: 'field-hint' }, ui("Owner ID: {p0}", { p0: room.ownerId }))), tag(room.state === 'deleting' ? ui('Closing') : room.locked ? ui('Locked') : ui('Open'), room.locked ? 'muted' : 'green'))) : [empty(ui('No temporary rooms open'), ui('Once enabled, join your lobby in Discord to create the first room.'), 'voice')]));
    warnings.replaceChildren(...[...(snapshot.warnings || []).map(text => el('div', { className: 'alert info' }, uiServerCopy(text))), snapshot.pending ? el('p', { className: 'field-hint' }, ui('{count} room creation requests await confirmation. Cyro keeps each owner’s slot reserved to prevent duplicates.', { count: snapshot.pending })) : null].filter(Boolean));
  }
  async function refreshRooms() {
    if (busy || refreshing || !active()) return; refreshing = true; refresh.disabled = true; updateDirty();
    try { const result = DEMO ? clone(detail.tempVoice) : await api(endpoint); if (!active()) return; snapshot = result; detail.tempVoice = clone(result); drawRooms(); window.CyroI18n.setContent(refreshNote, ui('Room activity refreshed. Your settings draft has been kept.')); }
    catch (error) { if (active()) window.CyroI18n.setContent(refreshNote, ui("{p0} Previous room activity is still shown.", { p0: uiError(error) })); }
    finally { refreshing = false; if (active()) { refresh.disabled = false; updateDirty(); } }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || refreshing || !active() || !dirty() || !form.reportValidity()) return;
    if (config.enabled && (!config.lobbyChannelId || !config.categoryId)) { status.className = 'save-status error'; window.CyroI18n.setContent(status, ui('Choose a voice lobby and a room category before enabling temporary rooms.')); return; }
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]); controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(save, ui('Saving…')); status.className = 'save-status'; window.CyroI18n.setContent(status, ui('Saving temporary room settings…'));
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config)); if (!active()) return;
      saved = clone(result.config); Object.assign(config, saved); snapshot.config = clone(saved); detail.tempVoice.config = clone(saved);
      status.className = 'save-status success'; window.CyroI18n.setContent(status, DEMO ? ui('Saved for this demo session. Discord was not changed.') : ui('Temporary room settings saved.')); toast(DEMO ? ui('Demo settings saved.') : ui('Temporary room settings saved.'));
    } catch (error) { if (active()) { status.className = 'save-status error'; window.CyroI18n.setContent(status, ui(!error.status || error.status >= 500 ? '{error} Reopen this page to check whether the save completed.' : '{error} Your draft is still here.', { error: uiError(error) })); } }
    finally { busy = false; state.saving = false; if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), window.CyroI18n.node(ui('Save changes'))); updateDirty(); } }
  });
  const help = contextCard(ui('How members use rooms'), ui('Join the lobby, then open the text chat attached to your new voice room. Cyro’s control panel is waiting there. Joining the lobby again returns you to your existing room.'), 'voice', el('div', { className: 'stack' },
    el('p', {}, el('strong', {}, ui('Lock')), ui(' stops new members joining. '), el('strong', {}, ui('Unlock')), ui(' restores normal access.')),
    el('p', {}, el('strong', {}, ui('Rename')), ui(' opens a name form. '), el('strong', {}, ui('Member limit')), ui(' lets you choose 1–99 people, or 0 for no limit.')),
    el('p', {}, el('strong', {}, ui('Allow member')), ui(' opens a searchable member picker to let someone join a locked room. They still need access to the room’s category.')),
    el('p', {}, el('strong', {}, ui('Remove member')), ui(' opens a member picker to disconnect someone from this room. It does not ban them or stop them rejoining if they still have access. '), el('code', {}, '/room revoke'), ui(' blocks future joins without disconnecting them.')),
    el('p', {}, ui('Stay connected to your room to use its buttons or commands. Locks keep the channel visible according to the category settings. Discord administrators can bypass locks.')), link(ui('Access & commands'), 'access')));
  const permissions = contextCard(ui('Before you enable it'), ui('Cyro needs View Channel, Connect, Manage Channels, Manage Permissions, and Move Members in the category. In the lobby it needs View Channel, Connect, and Move Members.'), 'shield', el('div', { className: 'stack' }, el('p', {}, ui('The control panel also needs Send Messages, Embed Links and Read Message History in the room’s text chat. Members need View Channel and Read Message History to find it.')), el('p', {}, ui('Room owners do not receive server-wide management permissions. Category settings are copied when each room is created; later category edits do not automatically sync to that room.'))));
  loading.replaceWith(warnings, el('div', { className: 'settings-grid' }, form, el('aside', { className: 'stack' }, help, permissions)), panel(ui('Open rooms'), [rooms, el('div', { className: 'form-section' }, refreshNote)], refresh));
  drawRooms(); updateDirty();
}
