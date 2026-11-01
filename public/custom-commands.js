'use strict';

function messageTabs(current) {
  return el('nav', { className: 'custom-command-tabs', 'aria-label': ui('Messages') },
    [['messages', 'Channel messages'], ['custom-commands', 'Custom commands']].map(([page, label]) => el('a', { className: `button ${current === page ? '' : 'secondary'}`, href: `#${page}`, ...(current === page ? { 'aria-current': 'page' } : {}) }, ui(label))));
}

let customCommandSequence = 0;
async function renderCustomCommands(main) {
  const guildId = state.guildId, detail = state.detail, sequence = ++customCommandSequence;
  const active = () => main.isConnected && state.guildId === guildId && state.page === 'custom-commands' && sequence === customCommandSequence;
  const endpoint = `/api/guilds/${safeId(guildId)}/custom-commands`;
  main.replaceChildren(heading(ui('Custom commands'), ui('Make shortcuts like /rules, /server or /links for your community.')), messageTabs('custom-commands'));
  const loading = el('p', { role: 'status' }, ui('Loading custom commands…')); main.append(loading);
  let snapshot;
  try { snapshot = DEMO ? (detail.customCommands ||= { commands: [], limit: 25, reservedNames: ['help','dashboard','ping','time','room','playmusic','tts','suggestion','poll','embed'] }) : await api(endpoint); }
  catch (error) { if (active()) loading.replaceWith(el('div', { className: 'alert', role: 'alert' }, uiError(error), button(ui('Try again'), () => renderCustomCommands(main), 'secondary'))); return; }
  if (!active()) return;
  let draft, saved, busy = false;
  const list = el('div', { className: 'stack' }), editor = el('div', {});
  const add = button(ui('New command'), async () => { if (await canDiscard()) edit(null); }, '', 'plus');
  const refresh = button(ui('Refresh'), async () => { if (await canDiscard()) { state.dirty = false; renderCustomCommands(main); } }, 'secondary');
  const status = el('p', { className: 'field-hint', role: 'status', 'aria-live': 'polite' });
  loading.replaceWith(el('div', { className: 'custom-command-toolbar' }, el('p', { className: 'field-hint' }, ui('Up to 25 commands per server. Saving registers the command directly with Discord.')), el('div', { className: 'row-actions' }, refresh, add)), status, list, editor);
  async function canDiscard() { if (busy) return false; return !state.dirty || await confirmAction(ui('Leave your unsaved changes?'), ui('Your changes have not been saved.')); }
  const configOf = record => { const { status: _status, discordId: _id, ...config } = record; return clone(config); };
  function drawList() {
    add.disabled = busy || snapshot.commands.length >= snapshot.limit; refresh.disabled = busy;
    list.replaceChildren(snapshot.commands.length ? panel(ui('Your commands'), el('div', { className: 'custom-command-list' }, snapshot.commands.map(record => el('div', { className: 'custom-command-row' },
      el('div', {}, el('code', { className: 'custom-command-name' }, `/${record.name}`), el('p', { className: 'field-hint' }, record.description),
        el('div', { className: 'row-actions' }, tag(record.status === 'synced' ? ui('Ready in Discord') : record.status === 'deleting' ? ui('Removal pending') : ui('Needs sync'), record.status === 'synced' ? 'green' : 'muted'),
          tag(record.ephemeral ? ui('Private reply') : ui('Visible to the channel')), tag(record.channelIds.length ? ui('{count} selected channels', { count: record.channelIds.length }) : ui('Everywhere')))),
      el('div', { className: 'row-actions' }, button(ui('Edit'), async () => { if (await canDiscard()) edit(record); }, 'secondary small', 'edit'),
        record.status !== 'synced' && button(ui('Retry sync'), () => act('sync', record), 'secondary small'),
        button(ui('Delete'), async () => { if (await canDiscard() && await confirmAction(ui('Delete custom command?'), ui('Remove /{name} from this server’s command menu?', { name: record.name }), ui('Delete'), ui('Cancel'))) await act('delete', record); }, 'danger small', 'trash')))))) : empty(ui('Your first shortcut starts here'), ui('Create /rules, /server or /links, then write the reply members will see.'), 'message'));
    list.querySelectorAll('button').forEach(control => { control.disabled = busy; });
  }
  async function act(action, record, form) {
    if (busy || !active()) return;
    busy = true; state.saving = true; drawList();
    const controls = [...(form?.elements || [])].map(control => [control, control.disabled]); controls.forEach(([control]) => { control.disabled = true; });
    window.CyroI18n.setContent(status, ui('Syncing with Discord…'));
    try {
      const input = action === 'save' ? { action, command: clone(draft) } : { action, id: record.id, revision: record.revision };
      let next;
      if (DEMO) {
        const rows = clone(snapshot.commands), index = rows.findIndex(c => c.id === (draft?.id || record?.id));
        if (action === 'save') { const c = { ...clone(draft), revision: draft.revision + 1, status: 'synced', discordId: '100000000000000001' }; if (index < 0) rows.push(c); else rows[index] = c; }
        else if (action === 'delete') { const i = rows.findIndex(c => c.id === record.id); if (i >= 0) rows.splice(i, 1); }
        next = { ...snapshot, commands: rows }; detail.customCommands = clone(next);
      } else next = await api(endpoint, 'POST', input);
      if (!active()) return;
      snapshot = next; state.dirty = false;
      const changed = snapshot.commands.find(c => c.id === (action === 'save' ? draft.id : record.id));
      editor.replaceChildren(); draft = saved = null;
      window.CyroI18n.setContent(status, DEMO ? ui('Saved for this demo session. Discord was not changed.') : changed && changed.status !== 'synced' ? ui('Saved, but Discord has not confirmed the change. Choose Retry sync to finish.') : action === 'delete' ? ui('Command removed from Discord.') : ui('Command ready in Discord. Type / to find it.'));
    } catch (error) {
      if (active()) window.CyroI18n.setContent(status, ui('{error} Your draft is still here. Refresh to check the saved state before retrying.', { error: uiError(error) }));
    } finally { busy = false; state.saving = false; if (active()) { controls.forEach(([control, disabled]) => { control.disabled = disabled; }); drawList(); } }
  }
  function edit(record) {
    if (record?.status === 'deleting') { window.CyroI18n.setContent(status, ui('Removal pending. Choose Retry sync to finish.')); return; }
    draft = record ? configOf(record) : { id: crypto.randomUUID(), revision: 0, name: '', description: '', mode: 'text', content: '', title: '', color: '#0771e3', channelIds: [], ephemeral: false };
    saved = clone(draft); state.dirty = false;
    const form = el('form', { className: 'settings-form' }), preview = el('div', { className: 'custom-command-preview' });
    const save = el('button', { type: 'submit', className: 'button', disabled: true }, icon('check'), ui('Save command'));
    const name = el('input', { value: draft.name, maxlength: 32, required: true, autocomplete: 'off', spellcheck: 'false', placeholder: 'rules', onInput: event => { draft.name = event.target.value; changed(); } });
    const content = el('textarea', { value: draft.content, rows: 7, required: true, onInput: event => { draft.content = event.target.value; changed(); } });
    const count = el('span', { className: 'field-hint' });
    const embedFields = el('div', { className: 'field-row custom-command-embed-fields' });
    const session = { config: draft, change(key, value) { draft[key] = value; changed(); } };
    embedFields.append(textField(session, ui('Embed title'), 'title', '', { maxlength: 256 }), textField(session, ui('Embed color'), 'color', '', { type: 'color' }));
    const channels = (detail.channels || []).filter(c => [0,2,5,13,15,16].includes(c.type));
    const selected = el('select', { multiple: true, 'data-search-kind': 'channels', onChange: event => { draft.channelIds = [...event.target.selectedOptions].map(o => o.value); changed(); } },
      channels.map(c => el('option', { value: c.id, selected: draft.channelIds.includes(c.id) }, `# ${c.name}`)),
      draft.channelIds.filter(id => !channels.some(c => c.id === id)).map(id => el('option', { value: id, selected: true }, ui('Unavailable · {p0}', { p0: id }))));
    const cancel = button(ui('Cancel'), async () => { if (await canDiscard()) { editor.replaceChildren(); state.dirty = false; draft = saved = null; } }, 'secondary');
    form.append(panel(record ? ui('Edit command') : ui('New command'), el('div', { className: 'form-section stack' },
      el('div', { className: 'field-row' }, field(ui('Command name'), name, ui('No slash or spaces. Use lowercase letters, numbers, hyphens or underscores.')), textField(session, ui('Command description'), 'description', ui('Shown in Discord’s command menu.'), { maxlength: 100, required: true })),
      field(ui('Reply type'), el('select', { onChange: event => session.change('mode', event.target.value) }, el('option', { value: 'text', selected: draft.mode === 'text' }, ui('Plain text')), el('option', { value: 'embed', selected: draft.mode === 'embed' }, ui('Embed')))), embedFields,
      field(ui('Reply message'), content, el('span', {}, ui('Placeholders: {mention}, {server}, {user}, {channel}.'), ' ', count)),
      field(ui('Allowed channels'), selected, ui('Leave empty for everywhere. Selecting a channel also includes its threads. Members using another channel get a private directions message.')),
      toggleSection(session, ui('Only the person who uses it sees the reply'), ui('Private replies are visible only to the member who runs the command. Command content is shared by the server; do not store passwords or private records here.'), 'ephemeral'))),
      el('div', { className: 'save-bar' }, cancel, save));
    function changed() {
      const invalidName = !/^[\p{Ll}\p{Lo}\p{N}_-]{1,32}$/u.test(draft.name);
      name.setCustomValidity(String(invalidName ? ui('Use 1–32 lowercase letters, numbers, hyphens or underscores.') : snapshot.reservedNames.includes(draft.name) ? ui('That name is reserved for a built-in Cyro command.') : snapshot.commands.some(c => c.id !== draft.id && c.name === draft.name) ? ui('A command with that name already exists in this server.') : ''));
      content.maxLength = draft.mode === 'text' ? 2000 : 4000;
      content.setCustomValidity(draft.content.length > content.maxLength || !draft.content.trim() ? String(ui('Write a reply within the character limit.')) : '');
      window.CyroI18n.setContent(count, ui('{used} / {limit} characters', { used: draft.content.length, limit: content.maxLength }));
      embedFields.hidden = draft.mode !== 'embed';
      state.dirty = JSON.stringify(draft) !== JSON.stringify(saved); save.disabled = busy || !state.dirty;
      const values = { mention: `@${state.me?.user?.username || 'member'}`, server: detail.guild.name, user: state.me?.user?.username || 'member', channel: '#channel' };
      const replace = text => String(text).replace(/\{(mention|server|user|channel)\}/g, (_, key) => values[key]);
      const reply = el('div', { className: draft.mode === 'embed' ? 'custom-command-embed' : 'custom-command-text' }, draft.mode === 'embed' && draft.title && el('strong', {}, replace(draft.title)), el('p', {}, replace(draft.content) || ui('Your reply will appear here.')));
      if (draft.mode === 'embed') reply.style.borderLeftColor = /^#[0-9a-f]{6}$/i.test(draft.color) ? draft.color : '#0771e3';
      preview.replaceChildren(el('div', { className: 'custom-command-preview-user' }, el('img', { src: '/cyro-logo.png', width: 32, height: 32, alt: '' }), el('strong', {}, 'Cyro'), tag('APP')), reply,
        el('small', { className: 'field-hint' }, draft.ephemeral ? ui('Only you can see this reply.') : ui('Visible to everyone who can view the channel.')));
    }
    form.addEventListener('submit', event => { event.preventDefault(); changed(); if (!busy && form.reportValidity() && state.dirty) act('save', null, form); });
    editor.replaceChildren(el('div', { className: 'settings-grid section-gap' }, form, el('aside', { className: 'stack' }, panel(ui('Reply preview'), preview), contextCard(ui('How members use it'), ui('After saving, type / and choose your command in Discord. There are no extra arguments. Your reply keeps the wording you write here.'), 'message'), contextCard(ui('A shortcut, not a private database'), ui('A private reply changes who can see that reply. Every member who can use the command gets the same template. Placeholders personalise it without looking up private data.'), 'lock'))));
    changed(); name.focus({ preventScroll: true });
  }
  drawList();
}
