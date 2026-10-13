'use strict';

let voiceRenderSequence = 0;

async function renderVoice(main) {
  const guildId = state.guildId;
  const sequence = ++voiceRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'voice' && sequence === voiceRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/voice`;
  const detail = state.detail;
  main.replaceChildren(heading('Music & TTS', 'Give your voice channels a soundtrack, or let members join the conversation through text.'));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), 'Loading voice settings…');
  main.append(loading);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.voice) : await api(endpoint);
    if (!active()) return;
    detail.voice = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    loading.replaceWith(panel('Voice settings unavailable', el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button('Try again', () => renderVoice(main), 'secondary'))));
    return;
  }

  let savedConfig = clone(snapshot.config);
  const config = clone(savedConfig);
  let busy = false;
  let refreshing = false;
  const form = el('form', { className: 'settings-form' });
  const saveStatus = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, 'Your settings are up to date.');
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), 'Save changes');
  const dirty = () => JSON.stringify(config) !== JSON.stringify(savedConfig);
  const session = { config, change(path, value) {
    if (!active()) return;
    putPath(config, path, value); updateDirty();
    saveStatus.className = 'save-status';
    saveStatus.textContent = dirty() ? 'You have unsaved settings.' : 'Your settings are up to date.';
  } };
  function updateDirty() {
    if (!active()) return;
    state.dirty = dirty();
    save.disabled = busy || refreshing || !dirty();
  }
  const voiceOptions = snapshot.voices || [];
  const voiceInput = el('select', { required: true, onChange: event => session.change('defaultVoice', event.target.value) },
    voiceOptions.map(voice => el('option', { value: voice.id, selected: config.defaultVoice === voice.id }, voice.name)),
    !voiceOptions.some(voice => voice.id === config.defaultVoice) && el('option', { value: config.defaultVoice, selected: true }, config.defaultVoice || 'No voices available'));
  form.append(panel('Music playback', [
    toggleSection(session, 'Enable music', 'Members can add supported audio links to the queue in their current voice channel.', 'musicEnabled'),
    el('div', { className: 'form-section stack' },
      textField(session, 'Playback volume (%)', 'volume', 'The server’s playback volume. Start low so people can still hear one another.', { type: 'number', min: 5, max: 100, required: true }),
      textField(session, 'Maximum time per track (minutes)', 'maxTrackMinutes', 'Between 1 and 30 minutes. Radio streams also stop at this limit so the queue can move on.', { type: 'number', min: 1, max: 30, required: true }))]),
    panel('Text to speech', [
      toggleSection(session, 'Enable text to speech', 'Read new messages from the active voice channel’s text chat, when their author is also in that call.', 'ttsEnabled'),
      el('div', { className: 'form-section stack' }, field('Default voice', voiceInput, 'Members can choose a different voice for their own messages with /ttsvoice.'))]),
    el('div', { className: 'save-bar' }, saveStatus, save));

  const activity = el('div', { className: 'form-section stack' });
  const availability = el('div', { className: 'stack', role: 'status' });
  const refreshStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, 'Open this page or refresh to see the current voice session.');
  const refresh = button('Refresh session', () => refreshSession(), 'secondary small', 'clock');
  function drawActivity() {
    if (!active()) return;
    const current = snapshot.session;
    const channel = detail.channels?.find(item => item.id === current?.channelId);
    activity.replaceChildren(current
      ? el('div', { className: 'stack' }, tag(current.mode === 'tts' ? 'Reading chat' : 'Music session', 'green'), el('h3', {}, channel ? channel.name : 'Connected to a voice channel'),
        el('p', { className: 'form-intro' }, current.mode === 'tts' ? 'New eligible messages in this call’s chat are read aloud.' : current.currentTitle || 'Waiting for a track.'),
        el('p', { className: 'field-hint' }, `${format(current.queueLength)} ${current.mode === 'tts' ? 'messages' : 'tracks'} waiting in the queue.`))
      : empty('No active voice session', 'Join a voice channel in Discord, then use /playmusic or /addtts to bring Cyro in.', 'music'));
    availability.replaceChildren(...[
      !snapshot.available?.music && el('div', { className: 'alert info' }, 'Music is unavailable on this host. The bot operator needs to finish the audio setup.'),
      !snapshot.available?.tts && el('div', { className: 'alert info' }, 'Text to speech is unavailable on this host. The bot operator needs to install the free voices.'),
      ...(snapshot.notes || []).map(note => el('p', { className: 'field-hint' }, note))
    ].filter(Boolean));
  }
  async function refreshSession() {
    if (busy || refreshing || !active()) return;
    refreshing = true; refresh.disabled = true; refresh.textContent = 'Refreshing…'; updateDirty();
    try {
      const result = DEMO ? clone(detail.voice) : await api(endpoint);
      if (!active()) return;
      snapshot = result; detail.voice = clone(result);
      drawActivity();
      refreshStatus.textContent = `Session refreshed ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Your settings draft has been kept.`;
    } catch (error) {
      if (!active()) return;
      refreshStatus.textContent = `${error.message} The previous session information is still shown.`;
    } finally {
      refreshing = false;
      if (active()) { refresh.disabled = false; refresh.replaceChildren(icon('clock'), 'Refresh session'); updateDirty(); }
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || !active() || !form.reportValidity() || !dirty()) return;
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    save.textContent = 'Saving…'; saveStatus.className = 'save-status'; saveStatus.textContent = 'Saving voice settings…';
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config);
      snapshot.config = clone(result.config); detail.voice.config = clone(result.config);
      saveStatus.className = 'save-status success';
      saveStatus.textContent = DEMO ? 'Saved for this demo session. Discord was not changed.' : 'Voice settings saved.';
      toast(DEMO ? 'Demo voice settings saved.' : 'Voice settings saved.');
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error';
      saveStatus.textContent = error.message + (!error.status || error.status >= 500 ? ' The save could not be confirmed. Reopen this page to check the saved settings.' : ' Your draft is still here.');
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), 'Save changes'); updateDirty(); }
    }
  });
  const commands = contextCard('Bring Cyro into a call', 'Join a normal voice channel first. Commands use the call you are in, even when sent from another text channel.', 'music', el('div', { className: 'stack' },
    el('p', {}, el('code', {}, '/playmusic link'), ' adds audio to the queue. Use ', el('code', {}, '/musicqueue'), ' to see what’s next.'),
    el('p', {}, el('code', {}, '/skipmusic'), ' skips a track. ', el('code', {}, '/stopmusic'), ' clears music and leaves the call.'),
    el('p', {}, el('code', {}, '/addtts'), ' starts reading this call’s chat. ', el('code', {}, '/stoptts'), ' stops it.'),
    el('p', {}, el('code', {}, '/ttsvoice'), ' chooses your voice. Shortcuts ', el('code', {}, '/ttsvoice1'), ' through ', el('code', {}, '/ttsvoice4'), ' do the same.'),
    link('Access & commands', 'access')));
  const sources = contextCard('Supported music links', 'Use direct audio files or supported radio streams you have permission to play. YouTube and Spotify page links are not playable in this release.', 'link');
  const privacy = contextCard('One call at a time', 'Each server can have one Cyro voice session. Music and text to speech run separately; stop the current session before starting the other.', 'lock', el('p', {}, 'TTS uses free voices hosted with Cyro. It reads new eligible messages only, without fetching chat history or sending text to a cloud voice service.'));
  loading.replaceWith(availability, el('div', { className: 'settings-grid' }, form, el('aside', { className: 'stack' }, commands, sources, privacy)),
    panel('Current voice session', [activity, el('div', { className: 'form-section' }, refreshStatus)], refresh));
  drawActivity();
}
