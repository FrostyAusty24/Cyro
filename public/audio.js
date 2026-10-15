'use strict';

let voiceRenderSequence = 0;

// These exact descriptions are emitted by Cyro, not member-authored messages.
const voiceInterfaceNotes = new Set([
  'Music accepts direct audio, internet radio and supported public YouTube video links. YouTube playback is best effort and requires the host source installer; playlists, live or restricted videos are not supported. Spotify does not provide full-track audio for this player.',
  '25 free local Kokoro voices cover English, French, Spanish, Italian, Brazilian Portuguese and Hindi. Select a voice matching the message language; speech does not translate text. Each server uses one voice channel and one mode at a time.',
  '25 free local Kokoro voices cover English, French, Spanish, Italian, Brazilian Portuguese and Hindi. Select a voice matching the message language; speech does not translate text.',
]);

async function renderVoice(main) {
  const guildId = state.guildId;
  const sequence = ++voiceRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'voice' && sequence === voiceRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/voice`;
  const detail = state.detail;
  main.replaceChildren(heading(ui('Music & TTS'), ui('Give your voice channels a soundtrack, or let members join the conversation through text.')));
  const loading = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading voice settings…'));
  main.append(loading);
  let snapshot;
  try {
    snapshot = DEMO ? clone(detail.voice) : await api(endpoint);
    if (!active()) return;
    detail.voice = clone(snapshot);
  } catch (error) {
    if (!active()) return;
    loading.replaceWith(panel(ui('Voice settings unavailable'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button(ui('Try again'), () => renderVoice(main), 'secondary'))));
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
  }
  const voiceOptions = snapshot.voices || [];
  const languageNames = { en: ui('English'), fr: ui('French'), es: ui('Spanish'), it: ui('Italian'), 'pt-BR': ui('Brazilian Portuguese'), hi: ui('Hindi') };
  const selectedLanguage = voiceOptions.find(voice => voice.id === config.defaultVoice)?.language || 'en';
  const languageInput = el('select', { 'aria-label': ui('Voice language') },
    [...new Set(voiceOptions.map(voice => voice.language || 'en'))].map(language =>
      el('option', { value: language, selected: language === selectedLanguage }, languageNames[language] || language)));
  const voiceOption = voice => el('option', { value: voice.id, selected: config.defaultVoice === voice.id }, ui('{name} · {language} · {gender}', {
    name: String(voice.name || voice.id).split(' · ')[0],
    language: voice.language === 'en' && voice.accent === 'British' ? ui('British English') : voice.language === 'en' && voice.accent === 'American' ? ui('American English') : languageNames[voice.language] || voice.language || ui('English'),
    gender: voice.gender === 'male' ? ui('Male voice') : voice.gender === 'female' ? ui('Female voice') : voice.gender || '',
  }));
  const voiceInput = el('select', { required: true, onChange: event => session.change('defaultVoice', event.target.value) });
  function drawVoiceOptions() {
    const choices = voiceOptions.filter(voice => (voice.language || 'en') === languageInput.value);
    voiceInput.replaceChildren(...['male', 'female'].map(gender => {
      const voices = choices.filter(voice => voice.gender === gender);
      return voices.length ? el('optgroup', { label: gender === 'male' ? ui('Male voices') : ui('Female voices') }, voices.map(voiceOption)) : null;
    }).filter(Boolean), ...choices.filter(voice => !['male', 'female'].includes(voice.gender)).map(voiceOption));
    if (!voiceOptions.some(voice => voice.id === config.defaultVoice)) voiceInput.append(el('option', { value: config.defaultVoice, selected: true }, config.defaultVoice || ui('No voices available')));
  }
  languageInput.addEventListener('change', () => {
    const first = voiceOptions.find(voice => (voice.language || 'en') === languageInput.value);
    if (first) session.change('defaultVoice', first.id);
    drawVoiceOptions();
  });
  drawVoiceOptions();
  form.append(panel(ui('Music playback'), [
    toggleSection(session, ui('Enable music'), ui('Members can add supported audio links to the queue in their current voice channel.'), 'musicEnabled'),
    el('div', { className: 'form-section stack' },
      textField(session, ui('Playback volume (%)'), 'volume', ui('The server’s playback volume. Start low so people can still hear one another.'), { type: 'number', min: 5, max: 100, required: true }),
      textField(session, ui('Maximum time per track (minutes)'), 'maxTrackMinutes', ui('Between 1 and 30 minutes. Radio streams also stop at this limit so the queue can move on.'), { type: 'number', min: 1, max: 30, required: true }))]),
    panel(ui('Text to speech'), [
      toggleSection(session, ui('Enable text to speech'), ui('Read new messages from the active voice channel’s text chat, when their author is also in that call.'), 'ttsEnabled'),
      toggleSection(session, ui('Say the speaker’s name'), ui('Add the member’s server display name before each new message, for example: “Frosty said: Hello everyone.” Turn this off to read only their message.'), 'announceSpeaker'),
      el('div', { className: 'form-section stack' },
        field(ui('Voice language'), languageInput, ui('Language chooses how text is pronounced; it does not translate messages.')),
        field(ui('Default voice'), voiceInput, ui('25 voices across six languages. Members can choose their own with /ttsvoice.')))]),
    el('div', { className: 'save-bar' }, saveStatus, save));

  const activity = el('div', { className: 'form-section stack' });
  const availability = el('div', { className: 'stack', role: 'status' });
  const refreshStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' }, ui('Open this page or refresh to see the current voice session.'));
  const refresh = button(ui('Refresh session'), () => refreshSession(), 'secondary small', 'clock');
  function drawActivity() {
    if (!active()) return;
    const current = snapshot.session;
    const channel = detail.channels?.find(item => item.id === current?.channelId);
    activity.replaceChildren(current
      ? el('div', { className: 'stack' }, tag(current.mode === 'tts' ? ui('Reading chat') : ui('Music session'), 'green'), el('h3', {}, channel ? channel.name : ui('Connected to a voice channel')),
        el('p', { className: 'form-intro' }, current.mode === 'tts' ? ui('New eligible messages in this call’s chat are read aloud.') : current.currentTitle || ui('Waiting for a track.')),
        el('p', { className: 'field-hint' }, ui(current.mode === 'tts' ? '{count} messages waiting in the queue.' : '{count} tracks waiting in the queue.', { count: format(current.queueLength) })))
      : empty(ui('No active voice session'), ui('Join a voice channel in Discord, then use /playmusic or /addtts to bring Cyro in.'), 'headphones'));
    availability.replaceChildren(...[
      !snapshot.available?.music && el('div', { className: 'alert info' }, ui('Music is unavailable on this host. The bot operator needs to finish the audio setup.')),
      snapshot.available?.youtube === false && el('div', { className: 'alert info' }, ui('YouTube links are unavailable on this host. Direct audio and radio links can still be used.')),
      !snapshot.available?.tts && el('div', { className: 'alert info' }, ui('Text to speech is unavailable on this host. The bot operator needs to install the free voices.')),
      ...(snapshot.notes || []).map(note => el('p', { className: 'field-hint' }, voiceInterfaceNotes.has(note) ? ui(note) : note))
    ].filter(Boolean));
  }
  async function refreshSession() {
    if (busy || refreshing || !active()) return;
    refreshing = true; refresh.disabled = true; window.CyroI18n.setContent(refresh, ui('Refreshing…')); updateDirty();
    try {
      const result = DEMO ? clone(detail.voice) : await api(endpoint);
      if (!active()) return;
      snapshot = result; detail.voice = clone(result);
      drawActivity();
      window.CyroI18n.setContent(refreshStatus, ui("Session refreshed {p0}. Your settings draft has been kept.", { p0: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }));
    } catch (error) {
      if (!active()) return;
      window.CyroI18n.setContent(refreshStatus, ui("{p0} The previous session information is still shown.", { p0: error.message }));
    } finally {
      refreshing = false;
      if (active()) { refresh.disabled = false; refresh.replaceChildren(icon('clock'), window.CyroI18n.node(ui('Refresh session'))); updateDirty(); }
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || refreshing || !active() || !form.reportValidity() || !dirty()) return;
    busy = true; state.saving = true; refresh.disabled = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(save, ui('Saving…')); saveStatus.className = 'save-status'; window.CyroI18n.setContent(saveStatus, ui('Saving voice settings…'));
    try {
      const result = DEMO ? { config: clone(config) } : await api(endpoint, 'PATCH', clone(config));
      if (!active()) return;
      savedConfig = clone(result.config); Object.assign(config, result.config);
      snapshot.config = clone(result.config); detail.voice.config = clone(result.config);
      saveStatus.className = 'save-status success';
      window.CyroI18n.setContent(saveStatus, DEMO ? ui('Saved for this demo session. Discord was not changed.') : ui('Voice settings saved.'));
      toast(DEMO ? ui('Demo voice settings saved.') : ui('Voice settings saved.'));
    } catch (error) {
      if (!active()) return;
      saveStatus.className = 'save-status error';
      window.CyroI18n.setContent(saveStatus, ui(!error.status || error.status >= 500 ? '{error} The save could not be confirmed. Reopen this page to check the saved settings.' : '{error} Your draft is still here.', { error: error.message }));
    } finally {
      busy = false; state.saving = false;
      if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); refresh.disabled = false; save.replaceChildren(icon('check'), window.CyroI18n.node(ui('Save changes'))); updateDirty(); }
    }
  });
  const commands = contextCard(ui('Bring Cyro into a call'), ui('Join a normal voice channel first. Commands use the call you are in, even when sent from another text channel.'), 'headphones', el('div', { className: 'stack' },
    el('p', {}, el('code', {}, '/playmusic link'), ui(' adds audio to the queue. Use '), el('code', {}, '/musicqueue'), ui(' to see what’s next.')),
    el('p', {}, el('code', {}, '/skipmusic'), ui(' skips a track. '), el('code', {}, '/stopmusic'), ui(' clears music and leaves the call.')),
    el('p', {}, el('code', {}, '/addtts'), ui(' starts reading this call’s chat. '), el('code', {}, '/stoptts'), ui(' stops it.')),
    el('p', {}, el('code', {}, '/ttsvoice'), ui(' offers voices in six languages. The numbered shortcuts '), el('code', {}, '/ttsvoice1'), ui(' through '), el('code', {}, '/ttsvoice12'), ui(' keep the twelve English voices.')),
    link(ui('Access & commands'), 'access')));
  const sources = contextCard(ui('Supported music links'), ui('Use direct audio, supported radio streams, or a public YouTube video you have permission to play. YouTube support depends on access from this host; playlists and restricted videos are unavailable. Spotify does not provide full-track audio for this bot.'), 'link');
  const privacy = contextCard(ui('One call at a time'), ui('Each server can have one Cyro voice session. Music and text to speech run separately; stop the current session before starting the other.'), 'lock', el('p', {}, ui('TTS uses 25 free Kokoro voices on Cyro’s host, with Daniel as the default. It reads new eligible messages only, without fetching chat history or sending text to a cloud voice service.')));
  loading.replaceWith(availability, el('div', { className: 'settings-grid' }, form, el('aside', { className: 'stack' }, commands, sources, privacy)),
    panel(ui('Current voice session'), [activity, el('div', { className: 'form-section' }, refreshStatus)], refresh));
  drawActivity();
}
