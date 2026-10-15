'use strict';

// Appearance is fetched from Discord for this guild. Draft uploads never become
// settings, and only explicitly changed fields are sent back to Discord.
let identityRenderSequence = 0;
const identityDemoData = new Map();
const identityMaxImageBytes = 2 * 1024 * 1024;

async function identityReadImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (!file.size || file.size > identityMaxImageBytes) throw new Error('Choose an image smaller than 2 MB.');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('This image could not be read. Please choose it again.'));
    reader.onabort = () => reject(new Error('The image upload was cancelled.'));
    reader.readAsDataURL(file);
  });
  try {
    const image = new Image();
    // Data URLs are allowed by the dashboard's CSP; object URLs are not.
    image.src = data;
    let timer;
    try {
      await Promise.race([image.decode(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('This image took too long to open. Try another file.')), 10000); })]);
    } finally { clearTimeout(timer); }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This image could not be opened. Try another file.');
    if (image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error('Choose an image no larger than 4096 × 4096 pixels.');
  } catch (error) {
    throw new Error(error.message?.includes('too long') || error.message?.includes('4096') ? error.message : 'This image could not be opened. Choose a valid PNG, JPEG or WebP file.');
  }
  return data;
}

async function renderIdentity(main) {
  const guildId = state.guildId;
  const sequence = ++identityRenderSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'identity' && sequence === identityRenderSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/identity`;
  const guildName = state.guilds.find(guild => guild.id === guildId)?.name || 'this server';
  main.replaceChildren(heading(ui('Bot appearance'), ui('Give Cyro a name and picture that fit your community. These changes apply only in this Discord server.')));
  const surface = el('div', { className: 'loading-surface', role: 'status' }, el('span', { className: 'loader' }), ui('Loading the bot’s current Discord appearance…'));
  main.append(surface);
  let saved;
  try {
    if (DEMO) {
      if (!identityDemoData.has(guildId)) identityDemoData.set(guildId, { nickname: null, displayName: 'Cyro', avatarUrl: '/cyro-logo.png', customAvatar: false, defaultName: 'Cyro', defaultAvatarUrl: '/cyro-logo.png', canChangeNickname: true });
      saved = clone(identityDemoData.get(guildId));
    } else saved = await api(endpoint);
    if (!active()) return;
  } catch (error) {
    if (!active()) return;
    surface.replaceWith(panel(ui('Appearance unavailable'), el('div', { className: 'form-section stack' }, el('p', { role: 'alert' }, error.message), button(ui('Try again'), () => renderIdentity(main), 'secondary'))));
    return;
  }

  let avatarDraft;
  let fileSequence = 0;
  let checkingImage = false;
  let busy = false;
  const form = el('form', { className: 'settings-form identity-form' });
  const status = el('span', { className: 'save-status', role: 'status', 'aria-live': 'polite' }, ui('Showing the current appearance in this server.'));
  const fileStatus = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' });
  const current = el('p', { className: 'identity-current' });
  const preview = el('div', { className: 'identity-preview' });
  const previewNote = el('p', { className: 'field-hint identity-preview-note' });
  const nickname = el('input', { type: 'text', maxlength: 32, value: saved.nickname || '', placeholder: saved.defaultName, autocomplete: 'off', disabled: !saved.canChangeNickname, onInput: () => refreshDraft() });
  const upload = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', onChange: async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy || !active()) return;
    const fileRequest = ++fileSequence;
    checkingImage = true;
    fileStatus.className = 'field-hint'; window.CyroI18n.setContent(fileStatus, ui('Checking your image…'));
    refreshDraft();
    try {
      const data = await identityReadImage(file);
      if (!active() || fileRequest !== fileSequence) return;
      avatarDraft = data;
      window.CyroI18n.setContent(fileStatus, ui("{p0} · Ready to save", { p0: file.name }));
    } catch (error) {
      if (!active() || fileRequest !== fileSequence) return;
      fileStatus.className = 'field-hint identity-error'; window.CyroI18n.setContent(fileStatus, error.message);
    } finally {
      if (active() && fileRequest === fileSequence) { checkingImage = false; refreshDraft(); }
    }
  } });
  const resetName = button(ui('Use default name'), () => { nickname.value = ''; refreshDraft(); }, 'secondary small');
  const resetAvatar = button(ui('Use default picture'), () => {
    ++fileSequence; checkingImage = false; avatarDraft = saved.customAvatar ? null : undefined;
    fileStatus.className = 'field-hint'; window.CyroI18n.setContent(fileStatus, avatarDraft === null ? ui('The default picture will be restored when you save.') : '');
    refreshDraft();
  }, 'secondary small');
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), DEMO ? ui('Save demo appearance') : ui('Save to Discord'));
  const reload = button(ui('Reload from Discord'), async () => {
    if (busy || !active()) return;
    if (state.dirty && !await confirmAction(ui('Reload the saved appearance?'), ui('Your unsaved name and picture changes will be discarded.'), ui('Reload appearance'), ui('Keep editing'))) return;
    if (!active() || busy) return;
    state.dirty = false;
    await renderIdentity(main);
  }, 'secondary small');
  if (DEMO) window.CyroI18n.setContent(reload, ui('Reload demo appearance'));

  function patch() {
    const result = {};
    const name = nickname.value.trim() || null;
    if (saved.canChangeNickname && name !== saved.nickname) result.nickname = name;
    if (avatarDraft !== undefined) result.avatar = avatarDraft;
    return result;
  }
  function refreshDraft(updateStatus = true) {
    if (!active()) return;
    const dirty = Object.keys(patch()).length > 0;
    state.dirty = dirty || checkingImage;
    save.disabled = busy || checkingImage || !dirty;
    resetName.disabled = busy || !saved.canChangeNickname || !nickname.value;
    resetAvatar.disabled = busy || (!saved.customAvatar && avatarDraft === undefined && !checkingImage);
    window.CyroI18n.setContent(current, ui("Saved in {p0}: {p1} · {p2}", { p0: guildName, p1: saved.displayName, p2: saved.customAvatar ? 'Custom server picture' : 'Default picture' }));
    if (updateStatus) {
      status.className = 'save-status';
      window.CyroI18n.setContent(status, checkingImage ? ui('Checking the image before saving…') : dirty ? ui('Your changes are a preview until you save.') : ui('Showing the current appearance in this server.'));
    }
    const name = nickname.value.trim() || saved.defaultName;
    const src = avatarDraft === null ? saved.defaultAvatarUrl : avatarDraft || saved.avatarUrl;
    const avatar = el('div', { className: 'identity-avatar', 'aria-label': ui('Bot picture preview') });
    const image = el('img', { src, alt: '', width: 56, height: 56, onError: () => { avatar.replaceChildren(el('span', {}, name.slice(0, 1).toUpperCase())); avatar.setAttribute('aria-label', 'Bot picture unavailable'); } });
    avatar.append(image);
    preview.replaceChildren(avatar, el('div', { className: 'identity-preview-copy' }, el('div', { className: 'identity-author' }, el('strong', {}, name), el('span', { className: 'identity-app-tag' }, ui('APP'))), el('p', {}, ui('Your community, made yours.')), el('small', {}, ui("Preview in {p0}", { p0: guildName }))));
    window.CyroI18n.setContent(previewNote, dirty ? ui('Draft preview. Discord will show this appearance after you save.') : ui('Current server appearance. The message above is only a preview.'));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || checkingImage || !active() || !form.reportValidity()) return;
    const payload = patch();
    if (!Object.keys(payload).length) return;
    busy = true; state.saving = true;
    const controls = [...form.elements].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    reload.disabled = true; window.CyroI18n.setContent(save, DEMO ? ui('Saving demo…') : ui('Saving to Discord…'));
    status.className = 'save-status'; window.CyroI18n.setContent(status, DEMO ? ui('Saving this browser demo…') : ui('Updating this server’s bot appearance…'));
    try {
      let result;
      if (DEMO) {
        result = { ...saved };
        if (Object.hasOwn(payload, 'nickname')) { result.nickname = payload.nickname; result.displayName = payload.nickname || saved.defaultName; }
        if (Object.hasOwn(payload, 'avatar')) { result.customAvatar = payload.avatar !== null; result.avatarUrl = payload.avatar || saved.defaultAvatarUrl; }
        identityDemoData.set(guildId, clone(result));
      } else result = await api(endpoint, 'PATCH', payload);
      if (!active()) return;
      saved = result; avatarDraft = undefined; nickname.value = saved.nickname || '';
      fileStatus.className = 'field-hint'; window.CyroI18n.setContent(fileStatus, '');
      state.dirty = false;
      status.className = 'save-status success'; window.CyroI18n.setContent(status, DEMO ? ui('Saved in this demo session. Discord was not changed.') : ui('Appearance saved to Discord for this server.'));
      toast(DEMO ? ui('Demo appearance saved.') : ui('This server’s bot appearance has been saved.'));
    } catch (error) {
      if (!active()) return;
      status.className = 'save-status error';
      window.CyroI18n.setContent(status, error.message + (!error.status || error.status >= 500 ? ' The update could not be confirmed. Reload from Discord to check before trying again.' : ' Your draft is still here.'));
    } finally {
      busy = false; state.saving = false;
      if (active()) {
        controls.forEach(([control, disabled]) => { control.disabled = disabled; });
        nickname.disabled = !saved.canChangeNickname; reload.disabled = false;
        save.replaceChildren(icon('check'), DEMO ? window.CyroI18n.node(ui('Save demo appearance')) : window.CyroI18n.node(ui('Save to Discord')));
        refreshDraft(false);
      }
    }
  });

  form.append(panel(ui('Server profile'), el('div', { className: 'form-section stack' },
    field(ui('Bot nickname'), nickname, ui('Up to 32 characters. Leave blank to use the bot’s default name.')),
    el('div', { className: 'setup-actions' }, resetName),
    !saved.canChangeNickname && el('div', { className: 'alert info' }, ui('Cyro needs the Change Nickname permission in this server to update its name. You can still change its picture.')),
    el('div', { className: 'identity-upload-section' }, field(ui('Server picture'), upload, ui('PNG, JPEG or WebP · Up to 2 MB and 4096 × 4096 pixels. A square image works best; Discord displays it in a circle.')), fileStatus, el('div', { className: 'setup-actions' }, resetAvatar)),
    el('p', { className: 'field-hint' }, ui('Reset buttons prepare a change. The saved name and picture stay in place until you save.')))),
    el('div', { className: 'save-bar' }, status, save));
  surface.replaceWith(el('div', { className: 'settings-grid identity-grid' }, form,
    el('aside', { className: 'stack' }, panel(ui('Discord preview'), el('div', { className: 'form-section stack' }, preview, previewNote, current, reload)),
      contextCard(ui('Made for this server'), ui('Your custom name and picture appear on this bot’s messages and member profile in this server. Other servers keep their own settings. Cyro’s dashboard and application branding stay the same.'), 'edit'))));
  refreshDraft();
}
