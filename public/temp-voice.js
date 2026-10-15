'use strict';

let tempVoiceRenderSequence = 0;

async function renderTempVoice(main) {
  const guildId = state.guildId, sequence = ++tempVoiceRenderSequence, detail = state.detail;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'temp-voice' && sequence === tempVoiceRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/temp-voice`;
  main.replaceChildren(heading('Temporary voice rooms', 'Let members make a room by joining a voice lobby. Cyro closes it when everyone leaves.'));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), 'Loading temporary rooms…'); main.append(loading);
  let snapshot;
  try { snapshot = DEMO ? clone(detail.tempVoice) : await api(endpoint); if (!active()) return; detail.tempVoice = clone(snapshot); }
  catch (error) { if (active()) loading.replaceWith(panel('Could not load temporary rooms', el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button('Try again', () => renderTempVoice(main), 'secondary')))); return; }
  let saved = clone(snapshot.config), busy = false, refreshing = false;
  const config = clone(saved), form = el('form', { className: 'settings-form' });
  const status = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, 'Your settings are up to date.');
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), 'Save changes');
  const dirty = () => JSON.stringify(config) !== JSON.stringify(saved);
  function updateDirty() { if (!active()) return; state.dirty = dirty(); save.disabled = busy || refreshing || !dirty(); }
  const session = { config, change(path, value) { putPath(config, path, value); updateDirty(); status.className = 'save-status'; status.textContent = dirty() ? 'You have unsaved settings.' : 'Your settings are up to date.'; } };
  form.append(panel('Join to create', [
    toggleSection(session, 'Enable temporary rooms', 'Members join your lobby and move into their own room. Turning this off stops new rooms; existing rooms still close when empty.', 'enabled'),
    el('div', { className: 'form-section stack' },
      channelField(session, 'Join-to-create channel', 'lobbyChannelId', 'Create a normal voice channel in Discord first, such as “Join to create”. Do not use a temporary room as the lobby.', false, 'Select a voice lobby', false, [2]),
      channelField(session, 'Room category', 'categoryId', 'New rooms inherit this category’s visibility. Members need View Channel and Connect here as well as in the lobby.', true),
      textField(session, 'Room name', 'nameTemplate', 'Use {name} for the member’s server display name, for example “{name}’s room”.', { maxlength: 80, required: true }),
      textField(session, 'Default member limit', 'userLimit', '0 means no limit. Room owners can change this with the Member limit button in their room’s chat.', { type: 'number', min: 0, max: 99, required: true }),
      textField(session, 'Maximum active rooms', 'maxRooms', 'Between 1 and 25 rooms per server. A member can own one room at a time.', { type: 'number', min: 1, max: 25, required: true }))]),
    panel('Room controls', toggleSection(session, 'Let owners manage their room', 'Each room gets a control panel in its text chat: Lock, Unlock, Rename and Member limit. Owners can also use /room to allow or block individual members. Staff with Manage Channels can manage a room they have joined.', 'ownerControls')),
    el('div', { className: 'save-bar' }, status, save));
  const rooms = el('div', { className: 'form-section stack temp-room-list' });
  const warnings = el('div', { className: 'stack', role: 'status' });
  const refresh = button('Refresh rooms', refreshRooms, 'secondary small', 'clock');
  const refreshNote = el('p', { className: 'field-hint', role: 'status' }, 'Room activity refreshes when you open this page or choose Refresh rooms.');
  function drawRooms() {
    const items = snapshot.rooms || [];
    rooms.replaceChildren(...(items.length ? items.map(room => el('div', { className: 'list-row' }, el('div', {}, el('strong', {}, detail.channels?.find(channel => channel.id === room.channelId)?.name || room.name), el('p', { className: 'field-hint' }, `Owner ID: ${room.ownerId}`)), tag(room.state === 'deleting' ? 'Closing' : room.locked ? 'Locked' : 'Open', room.locked ? 'muted' : 'green'))) : [empty('No temporary rooms open', 'Once enabled, join your lobby in Discord to create the first room.', 'voice')]));
    warnings.replaceChildren(...[...(snapshot.warnings || []).map(text => el('div', { className: 'alert info' }, text)), snapshot.pending ? el('p', { className: 'field-hint' }, `${snapshot.pending} room creation ${snapshot.pending === 1 ? 'is' : 'operations are'} waiting for confirmation. Cyro keeps the owner’s slot reserved to prevent duplicates.`) : null].filter(Boolean));
  }
  async function refreshRooms() {
    if (busy || refreshing || !active()) return; refreshing = true; refresh.disabled = true; updateDirty();
    try { const result = DEMO ? clone(detail.tempVoice) : await api(endpoint); if (!active()) return; snapshot = result; detail.tempVoice = clone(result); drawRooms(); refreshNote.textContent = 'Room activity refreshed. Your settings draft has been kept.'; }
    catch (error) { if (active()) refreshNote.textContent = `${error.message} Previous room activity is still shown.`; }
    finally { refreshing = false; if (active()) { refresh.disabled = false; updateDirty(); } }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || refreshing || !active() || !dirty() || !form.reportValidity()) return;
    if (config.enabled && (!config.lobbyChannelId || !config.categoryId)) { status.className = 'save-status error'; status.textContent = 'Choose a voice lobby and a room category before enabling temporary rooms.'; return; }
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]); controls.forEach(([control]) => { control.disabled = true; });
    save.textContent = 'Saving…'; status.className = 'save-status'; status.textContent = 'Saving temporary room settings…';
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config)); if (!active()) return;
      saved = clone(result.config); Object.assign(config, saved); snapshot.config = clone(saved); detail.tempVoice.config = clone(saved);
      status.className = 'save-status success'; status.textContent = DEMO ? 'Saved for this demo session. Discord was not changed.' : 'Temporary room settings saved.'; toast(DEMO ? 'Demo settings saved.' : 'Temporary room settings saved.');
    } catch (error) { if (active()) { status.className = 'save-status error'; status.textContent = error.message + (!error.status || error.status >= 500 ? ' Reopen this page to check whether the save completed.' : ' Your draft is still here.'); } }
    finally { busy = false; state.saving = false; if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), 'Save changes'); updateDirty(); } }
  });
  const help = contextCard('How members use rooms', 'Join the lobby, then open the text chat attached to your new voice room. Cyro’s control panel is waiting there. Joining the lobby again returns you to your existing room.', 'voice', el('div', { className: 'stack' },
    el('p', {}, el('strong', {}, 'Lock'), ' stops new members joining. ', el('strong', {}, 'Unlock'), ' restores normal access.'),
    el('p', {}, el('strong', {}, 'Rename'), ' opens a name form. ', el('strong', {}, 'Member limit'), ' lets you choose 1–99 people, or 0 for no limit.'),
    el('p', {}, el('code', {}, '/room permit'), ' lets a member into a locked room. ', el('code', {}, '/room revoke'), ' blocks future joins without disconnecting them.'),
    el('p', {}, 'Stay connected to your room to use its buttons or commands. Locks keep the channel visible according to the category settings. Discord administrators can bypass locks.'), link('Access & commands', 'access')));
  const permissions = contextCard('Before you enable it', 'Cyro needs View Channel, Connect, Manage Channels, Manage Permissions, and Move Members in the category. In the lobby it needs View Channel, Connect, and Move Members.', 'shield', el('div', { className: 'stack' }, el('p', {}, 'The control panel also needs Send Messages, Embed Links and Read Message History in the room’s text chat. Members need View Channel and Read Message History to find it.'), el('p', {}, 'Room owners do not receive server-wide management permissions. Category settings are copied when each room is created; later category edits do not automatically sync to that room.')));
  loading.replaceWith(warnings, el('div', { className: 'settings-grid' }, form, el('aside', { className: 'stack' }, help, permissions)), panel('Open rooms', [rooms, el('div', { className: 'form-section' }, refreshNote)], refresh));
  drawRooms(); updateDirty();
}
