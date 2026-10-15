'use strict';

// Settings extensions share the dashboard's authenticated, guild-scoped save flow.
function choiceField(session, label, path, choices, hint = '') {
  // This helper is for the built-in setting enumerations below, never server data.
  return field(ui(label), el('select', { onChange: event => session.change(path, event.target.value) },
    choices.map(([value, text]) => el('option', { value, selected: byPath(session.config, path) === value }, ui(text)))), ui(hint));
}
function scopedSession(session, prefix) {
  return { get config() { return byPath(session.config, prefix); }, change(path, value) { session.change(`${prefix}.${path}`, value); } };
}
function newSettingId(prefix) { return `${prefix}-${crypto.randomUUID().slice(0, 12)}`; }

function renderSupportSetup(main, kind) {
  const tickets = kind === 'tickets';
  const session = formSession('moderation');
  session.onSaved(() => renderShell());
  const definitionKey = tickets ? 'types' : 'forms';
  const noun = tickets ? 'category' : 'form';
  session.config[kind][definitionKey] ||= [];
  if (tickets) {
    session.config.tickets.closeAction ||= 'archive';
    session.config.tickets.visibility ??= 'private';
    session.config.tickets.types.forEach(type => { type.closeAction ||= 'archive'; type.visibility ??= 'private'; });
  }
  session.config.panels ||= [];
  const definitions = () => session.config[kind][definitionKey];
  const definitionList = el('div', { className: 'definition-list' });
  const panelList = el('div', { className: 'definition-list' });
  let availabilityUpdates = [];
  const changeSetting = session.change.bind(session);
  session.change = (path, value) => {
    changeSetting(path, value);
    if (path === `${kind}.enabled` || path.endsWith('.enabled')) availabilityUpdates.forEach(update => update());
  };
  const legacy = () => ({ id: 'default', name: tickets ? 'General support' : 'General application', ...session.config[kind] });
  const choices = () => definitions().length ? definitions() : [legacy()];
  function settingsFields(sub, legacyMode = false) {
    return [!legacyMode && textField(sub, tickets ? ui('Category name') : ui('Form name'), 'name', ui('Shown to members when they choose an option.'), { required: true, maxlength: 80 }),
      !legacyMode && toggleSection(sub, ui('Accept new requests'), ui('Pause this option without removing existing records.'), 'enabled'),
      ...(tickets ? [
        channelField(sub, ui('New ticket category'), 'categoryId', ui('Discord category where new ticket channels are created.'), true),
        choiceField(sub, 'Ticket visibility', 'visibility', [['inherit', 'Use Discord category permissions'], ['private', 'Private ticket']], 'Category permissions: copy its access rules when a ticket opens, then add the opener and Cyro. Later category changes do not sync to the ticket. Private: restrict access to the opener, support staff and Discord administrators. Applies to new tickets only.'),
        choiceField(sub, 'After saving the transcript', 'closeAction', [['archive', 'Keep a read-only channel'], ['delete', 'Delete the ticket channel']], 'Every close saves a downloadable transcript automatically. Delete mode removes the channel only after the complete export is confirmed; Cyro needs Manage Threads and Manage Webhooks to check for unsaved content.'),
        channelField(sub, ui('Closed-ticket archive'), 'archiveCategoryId', ui('Used when keeping a read-only channel. Ignored when deleting after export.'), true, ui('Keep in current category')),
        roleField(sub, ui('Support staff roles'), 'staffRoleIds', ui('Who can manage tickets. With category permissions, give these roles channel access in Discord; private tickets grant them access automatically.'), true),
        channelField(sub, ui('Transcript channel'), 'logChannelId', ui('Saved HTML transcripts appear here automatically. Anyone who can read this channel can read the transcripts; choose its permissions in Discord. Large exports are compressed, and original attachment links can expire.')),
        textField(sub, ui('Open tickets per member'), 'maxOpenPerUser', ui('Applies to this ticket category.'), { type: 'number', min: 1, max: 5, required: true })
      ] : [
        channelField(sub, ui('Review channel'), 'reviewChannelId', ui('Application answers and decision buttons appear here. Discord channel permissions decide who can read the answers; reviewer roles decide who can act on them.')),
        roleField(sub, ui('Reviewer roles'), 'reviewerRoleIds', ui('Who can accept or deny this application.'), true),
        roleField(sub, ui('Role on acceptance'), 'acceptedRoleId', ui('Optional. Must be below Cyro and safe to assign.')),
        linesField(sub, ui('Questions'), 'questions', ui('One question per line. Up to five questions, 100 characters each.'), 5, 100)
      ])];
  }
  function drawDefinitions(openId = null) {
    definitionList.replaceChildren();
    availabilityUpdates = [];
    if (!definitions().length) {
      definitionList.append(el('div', { className: 'hint-box' }, ui("Your existing {p0} is the default option. Add named {p1} to offer more choices.", { p0: tickets ? 'support setup' : 'application', p1: tickets ? 'categories' : 'forms' })),
        el('details', { className: 'setup-details', open: true }, el('summary', {}, tickets ? ui('General support') : ui('General application')), el('div', { className: 'setup-fields' }, settingsFields(scopedSession(session, kind), true))));
    }
    definitions().forEach((item, index) => {
      const sub = scopedSession(session, `${kind}.${definitionKey}.${index}`);
      const label = el('span', {}, item.name || ui("New {p0}", { p0: noun }));
      const availability = tag('');
      const updateAvailability = () => {
        const masterEnabled = session.config[kind].enabled;
        window.CyroI18n.setContent(availability, !masterEnabled ? ui('All requests paused') : item.enabled ? ui('Open') : ui('Paused'));
        availability.className = `tag ${masterEnabled && item.enabled ? 'green' : 'muted'}`;
      };
      availabilityUpdates.push(updateAvailability); updateAvailability();
      const details = el('details', { className: 'setup-details', open: item.id === openId },
        el('summary', {}, label, availability),
        el('div', { className: 'setup-fields' }, settingsFields(sub), button(ui("Remove {p0}", { p0: noun }), async () => {
          if (!await confirmAction(ui("Remove {p0}?", { p0: item.name || noun }), ui('Existing tickets and applications keep their saved staff access and settings. This also removes the option from saved panels. Panels with no remaining options are removed.'), ui("Remove {p0}", { p0: noun }), ui('Keep it'))) return;
          session.change(`${kind}.${definitionKey}`, definitions().filter(value => value.id !== item.id));
          session.change('panels', session.config.panels.map(value => value.kind === kind ? { ...value, options: value.options.filter(option => option.id !== item.id) } : value).filter(value => value.options.length));
          drawDefinitions(); drawPanels();
        }, 'danger small', 'trash')));
      details.addEventListener('input', () => { window.CyroI18n.setContent(label, item.name || ui("New {p0}", { p0: noun })); });
      definitionList.append(details);
    });
  }
  function addDefinition() {
    if (definitions().length >= 25) return toast(ui("Use up to 25 {p0}.", { p0: tickets ? 'categories' : 'forms' }), true);
    const base = clone(session.config[kind]); delete base.types; delete base.forms;
    // Promote an existing configured default so adding an option does not hide it.
    if (!definitions().length && (tickets ? base.categoryId : base.reviewChannelId)) {
      const retained = { ...base, id: newSettingId(tickets ? 'ticket' : 'form'), name: tickets ? 'General support' : 'General application' };
      session.change(`${kind}.${definitionKey}`, [retained]);
      session.change('panels', session.config.panels.map(value => value.kind === kind ? { ...value, options: value.options.map(option => option.id === 'default' ? { ...option, id: retained.id } : option) } : value));
    }
    const item = { ...base, enabled: true, id: newSettingId(tickets ? 'ticket' : 'form'), name: tickets ? 'New ticket category' : 'New application form' };
    if (tickets) { item.closeAction = 'delete'; item.visibility = 'inherit'; }
    session.change(`${kind}.${definitionKey}`, [...definitions(), item]); drawDefinitions(item.id); drawPanels();
  }
  function drawPanels(openId = null) {
    panelList.replaceChildren();
    const ownPanels = session.config.panels.filter(value => value.kind === kind);
    if (!ownPanels.length) panelList.append(el('p', { className: 'form-intro' }, ui('Create a panel, choose its options, then publish it to a Discord channel. You can make separate panels for different places in your server.')));
    ownPanels.forEach(item => {
      const index = session.config.panels.findIndex(value => value.id === item.id);
      const sub = scopedSession(session, `panels.${index}`);
      const preview = el('div', { className: 'discord-panel-preview', 'aria-label': ui('Discord panel preview') });
      const label = el('span', {}, item.name);
      const presentation = tag('');
      const renderPreview = () => {
        window.CyroI18n.setContent(label, item.name || ui('Untitled panel'));
        window.CyroI18n.setContent(presentation, item.presentation === 'select' ? ui('Dropdown') : ui('Buttons'));
        preview.replaceChildren(el('span', { className: 'preview-author' }, ui('Cyro')), el('strong', {}, item.title || ui('Panel title')), el('p', {}, item.description || ui('Your panel message')),
          item.presentation === 'select' ? el('div', { className: 'preview-select' }, ui('Choose an option'), icon('chevron')) : el('div', { className: 'preview-buttons' }, item.options.map(option => el('span', {}, option.label))),
          el('small', {}, ui('Preview · save before publishing')));
      };
      const optionRows = el('div', { className: 'panel-option-list' });
      choices().forEach(definition => {
        const selected = item.options.find(option => option.id === definition.id);
        const input = el('input', { type: 'text', value: selected?.label || definition.name, maxlength: 80, disabled: !selected, 'aria-label': ui("Panel label for {p0}", { p0: definition.name }), onInput: event => {
          const option = item.options.find(value => value.id === definition.id); if (option) option.label = event.target.value;
          session.change(`panels.${index}.options`, item.options); renderPreview();
        } });
        optionRows.append(el('div', { className: 'panel-option-row' }, el('label', { className: 'option-check' }, el('input', { type: 'checkbox', checked: Boolean(selected), onChange: event => {
          item.options = event.target.checked ? [...item.options, { id: definition.id, label: input.value || definition.name }] : item.options.filter(option => option.id !== definition.id);
          input.disabled = !event.target.checked; session.change(`panels.${index}.options`, item.options); renderPreview();
        } }), el('span', {}, definition.name)), el('div', { className: 'field' }, input)));
      });
      const publishTarget = { config: { channelId: null }, change(_key, value) { this.config.channelId = value; } };
      const published = el('div', { className: 'publish-result', role: 'status' });
      const publish = button(ui('Publish to Discord'), async () => {
        if (state.dirty) return toast(ui('Save your changes before publishing this panel.'), true);
        if (!publishTarget.config.channelId) return toast(ui('Choose the Discord channel to publish in.'), true);
        if (state.saving) return;
        if (DEMO) { window.CyroI18n.setContent(published, ui('Demo preview only. No message was sent to Discord.')); return; }
        state.saving = true; publish.disabled = true; window.CyroI18n.setContent(published, ui('Publishing…'));
        try {
          const result = await api(`${guildPath()}/moderation/panel`, 'POST', { panelId: item.id, channelId: publishTarget.config.channelId });
          published.replaceChildren(window.CyroI18n.node(ui('Panel published. ')), el('a', { href: result.url, target: '_blank', rel: 'noopener noreferrer' }, ui('Open in Discord'))); toast(ui('Panel published to Discord.'));
        } catch (error) { window.CyroI18n.setContent(published, ui("{p0} Check the channel before retrying if the request timed out.", { p0: error.message })); }
        finally { state.saving = false; publish.disabled = false; }
      }, 'secondary', 'discord');
      const details = el('details', { className: 'setup-details', open: item.id === openId }, el('summary', {}, label, presentation),
        el('div', { className: 'setup-fields' }, textField(sub, ui('Panel name'), 'name', ui('An internal name to find this panel in the dashboard.'), { required: true, maxlength: 80 }),
          choiceField(sub, 'Member chooses with', 'presentation', [['buttons', 'Buttons'], ['select', 'Dropdown menu']]),
          textField(sub, ui('Panel title'), 'title', '', { required: true, maxlength: 120 }),
          textField(sub, ui('Panel message'), 'description', ui('Explain which option a member should choose.'), { multiline: true, maxlength: 1500 }),
          el('div', {}, el('h3', {}, ui('Options on this panel')), el('p', { className: 'field-hint' }, ui("Select the {p0} to include. Edit the labels members see.", { p0: tickets ? 'categories' : 'forms' })), optionRows), preview,
          channelField(publishTarget, ui('Publish in channel'), 'channelId', ui('Publishes a new message using the saved panel settings.')),
          el('div', { className: 'setup-actions' }, publish, button(ui('Remove panel'), async () => {
            if (!await confirmAction(ui('Remove this panel configuration?'), ui('Previously posted messages remain in Discord. Remove those messages manually if they are no longer needed.'), ui('Remove panel'), ui('Keep panel'))) return;
            session.change('panels', session.config.panels.filter(value => value.id !== item.id)); drawPanels();
          }, 'danger small', 'trash')), published));
      details.addEventListener('input', renderPreview); details.addEventListener('change', renderPreview); renderPreview(); panelList.append(details);
    });
  }
  const addPanel = () => {
    if (session.config.panels.length >= 25) return toast(ui('Use up to 25 saved support and application panels per server.'), true);
    const first = choices()[0];
    const item = { id: newSettingId('panel'), name: tickets ? 'Support panel' : 'Application panel', kind, presentation: 'buttons', title: tickets ? 'How can we help?' : 'Join the team', description: tickets ? 'Choose a topic to open a ticket with our team. Ticket visibility follows this server\'s settings.' : 'Choose an application to get started. Your answers are posted in this server\'s review channel.', options: first ? [{ id: first.id, label: first.name }] : [] };
    session.change('panels', [...session.config.panels, item]); drawPanels(item.id);
  };
  drawDefinitions(); drawPanels();
  main.append(heading(tickets ? ui('Support tickets') : ui('Applications'), tickets ? ui('Different topics, the right staff, and one clear place to ask for help.') : ui('Build separate forms for staff, creators, partnerships, and community roles.')));
  renderRecoveryIssues(main, tickets ? 'ticket' : 'application');
  settingsLayout(main, session, [panel(tickets ? ui('Ticket categories') : ui('Application forms'), [toggleSection(session, tickets ? ui('Enable support tickets') : ui('Accept applications'), ui('Turn off new requests while retaining existing records.'), `${kind}.enabled`), definitionList], button(tickets ? ui('Add category') : ui('Add form'), addDefinition, 'secondary small', 'plus')),
    panel(ui('Member panels'), panelList, button(ui('Add panel'), addPanel, 'secondary small', 'plus'))],
    [contextCard(ui('Set up, save, publish'), ui('Configure your options and staff access. Save changes, then publish a button or dropdown panel to any suitable Discord channel.'), tickets ? 'ticket' : 'file'),
      contextCard(ui('Existing requests keep their settings'), ui('Changing these options applies to new requests. Existing ticket channels keep their Discord permissions, and submitted applications keep their saved reviewer roles.'), 'lock')]);
  const records = state.detail.moderation.snapshot[kind] || [];
  main.append(el('div', { className: 'section-gap' }, panel(tickets ? ui('Recent tickets') : ui('Recent applications'), records.length ? table([tickets ? 'Ticket' : 'Form', 'Member', 'Status', 'Created', ...(tickets ? ['Transcript'] : [])], records.slice(0, 20).map(record => [tickets ? record.ticketType?.name || record.id : record.applicationForm?.name || 'General application', userLabel(tickets ? record.ownerId : record.userId), tag(capitalize(record.status), record.status === 'open' || record.status === 'accepted' ? 'green' : 'muted'), dateLabel(record.createdAt), ...(tickets ? [record.transcript?.channelId && record.transcript?.messageId ? el('a', { href: `https://discord.com/channels/${encodeURIComponent(state.guildId)}/${encodeURIComponent(record.transcript.channelId)}/${encodeURIComponent(record.transcript.messageId)}`, target: '_blank', rel: 'noopener noreferrer' }, ui('Open saved transcript')) : '—'] : [])])) : empty(ui('No requests yet.'), ui('Published panels give members a place to get started.'), tickets ? 'ticket' : 'file'))));
}

function renderVerification(main) {
  const session = formSession('community');
  session.onSaved(() => renderShell());
  session.config.verification ||= { enabled: false, channelId: null, roleId: null, mode: 'challenge', title: 'Verify your membership', message: 'Verify to receive access to the server.' };
  const embedPreview = el('div', { className: 'discord-embed' });
  embedPreview.style.setProperty('--embed-colour', '#82d9f7');
  const updateEmbedPreview = () => embedPreview.replaceChildren(
    el('strong', {}, session.config.verification.title || ui('Panel title')),
    el('p', { className: 'preserve-lines' }, session.config.verification.message || ui('Your verification message')));
  updateEmbedPreview();
  const result = el('div', { className: 'publish-result', role: 'status' });
  const currentVerificationPanel = state.detail.community.snapshot?.verificationPanel;
  if (!DEMO && currentVerificationPanel) result.append(el('a', {
    href: `https://discord.com/channels/${safeId(state.guildId)}/${safeId(currentVerificationPanel.channelId)}/${safeId(currentVerificationPanel.messageId)}`,
    target: '_blank', rel: 'noopener noreferrer'
  }, ui('Open current panel in Discord')));
  const publish = button(ui('Publish verification panel'), async () => {
    if (state.dirty) return toast(ui('Save your verification settings before publishing.'), true);
    if (!session.config.verification.enabled) return toast(ui('Enable verification and save your settings first.'), true);
    if (DEMO) { window.CyroI18n.setContent(result, ui('Demo preview only. No Discord message was sent.')); return; }
    if (state.saving) return;
    state.saving = true; publish.disabled = true; window.CyroI18n.setContent(result, ui('Publishing…'));
    try {
      const response = await api(`${guildPath()}/community/verification-panel`, 'POST', {});
      result.replaceChildren(window.CyroI18n.node(ui('Verification panel published. ')), el('a', { href: response.url, target: '_blank', rel: 'noopener noreferrer' }, ui('Open in Discord'))); toast(ui('Verification panel published.'));
    } catch (error) { window.CyroI18n.setContent(result, ui("{p0} Check the channel before retrying if the request timed out.", { p0: error.message })); }
    finally { publish.disabled = false; state.saving = false; }
  }, 'secondary', 'discord');
  main.append(heading(ui('Member verification'), ui('Let new members earn an access role with a reaction or a private image challenge.')));
  settingsLayout(main, session, [panel(ui('Verification settings'), [toggleSection(session, ui('Enable verification'), ui('Members receive the selected role after completing your verification method.'), 'verification.enabled'),
    el('div', { className: 'form-section' }, channelField(session, ui('Verification channel'), 'verification.channelId', ui('New members must be able to see this channel.')),
      roleField(session, ui('Verified member role'), 'verification.roleId', ui('Use a regular access role below Cyro. Do not assign it automatically on join or through self-role buttons.')),
      choiceField(session, 'Verification method', 'verification.mode', [['challenge', 'Image challenge + button'], ['reaction', 'React with a check mark']], 'Image challenge: private code, five-minute expiry, three attempts. A reaction alone is a simple opt-in, without a CAPTCHA.'),
      textField(session, ui('Panel title'), 'verification.title', '', { required: true, maxlength: 100, onInput: updateEmbedPreview }),
      textField(session, ui('Panel message'), 'verification.message', ui('This is the embed description. Include the reaction or button instructions you want members to see.'), { required: true, multiline: true, maxlength: 1500, onInput: updateEmbedPreview }),
      el('div', { className: 'setup-actions' }, publish), result)])],
    [panel(ui('Panel preview'), el('div', { className: 'form-section stack' }, embedPreview, el('p', { className: 'field-hint' }, ui('Your title and message appear together in an embed. Discord renders formatting; the selected reaction or Verify button appears underneath.')))),
      contextCard(ui('Connect the role to server access'), ui('In Discord channel permissions, deny View Channel to @everyone on your normal member channels and allow your verified role. Keep the verification channel visible. Cyro does not rewrite existing channel permissions.'), 'lock'),
      contextCard(ui('Before publishing'), ui('Cyro needs Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History, and Add Reactions. Its role must sit above the verified role.'), 'shield'),
      contextCard(ui('A useful hurdle'), ui('The image challenge adds friction for automated joins. It does not guarantee protection from determined bots or manual abuse.'), 'help')]);
}

function uploadSettingsFields(session, existing) {
  const draft = session.config;
  const supported = ['youtube', 'tiktok'].includes(draft.platform);
  const ready = supported && existing.uploadsCapability?.available !== false && (draft.platform !== 'tiktok' || existing.tiktokConnection?.connected === true && !existing.tiktokConnection?.needsReconnect);
  const note = draft.platform === 'youtube' ? (existing.uploadsCapability?.reason || 'YouTube uploads need the bot owner’s YouTube Data API key. Only new public uploads are announced; current live streams and archived live broadcasts are excluded.')
    : draft.platform === 'tiktok' ? (existing.uploadsCapability?.reason || 'Each creator must connect their own TikTok account and approve access to public videos before upload alerts can run. TikTok LIVE uses a separate, unofficial connection.')
    : 'Uploaded-video alerts support YouTube and authorized TikTok accounts. Live announcements for this platform continue independently.';
  const enable = toggleControl(ui('Announce new uploaded videos'), draft.uploads.enabled, value => session.change('uploads.enabled', value));
  enable.querySelector('input').disabled = !ready;
  return el('section', { className: 'stream-feature-section', 'aria-label': ui('Uploaded video alerts') }, el('h3', {}, ui('Uploaded videos')),
    el('div', { className: 'toggle-row' }, el('div', {}, el('h3', {}, ui('Announce new uploaded videos')), el('p', {}, ui('Independent of live announcements. Uses the Discord member linked to this creator.'))), enable),
    el('p', { className: 'provider-note' }, note),
    draft.platform === 'tiktok' && tiktokConnectionControl(existing),
    supported && el('div', { className: 'setup-fields' }, channelField(session, ui('Upload announcement channel'), 'uploads.channelId', ui('Can be different from the live announcement channel.')),
      roleField(session, ui('Role to notify for uploads'), 'uploads.pingRoleId', ui('Optional. Included with the {role} placeholder.')),
      textField(session, ui('Video title filter'), 'uploads.titleFilter', ui('Optional text the video title must contain, ignoring case. Separate from the live title filter.'), { maxlength: 100 }),
      textField(session, ui('Upload announcement message'), 'uploads.messageTemplate', ui('Leave blank for the default. Placeholders: {creator}, {member}, {username}, {platform}, {title}, {url}, {publishedAt}, {role}.'), { multiline: true, maxlength: 1800 }),
      el('div', { className: 'hint-box' }, ui('The first successful check records existing uploads without announcing them. Only newer videos are announced afterward. Changing a title filter does not repost old videos.'))),
    existing.uploadState?.lastCheckedAt && el('p', { className: 'upload-state' }, ui("Last upload check: {p0}", { p0: dateLabel(existing.uploadState.lastCheckedAt) })),
    existing.uploadState?.lastError && el('div', { className: 'alert info' }, existing.uploadState.lastError),
    existing.uploadState?.deliveries?.some(item => item.status !== 'sent') && el('div', { className: 'alert info' }, ui('An earlier upload announcement has an unconfirmed result. Check the Discord channel; Cyro will not send it again automatically and risk a duplicate.')));
}

function tiktokConnectionControl(existing) {
  const connection = existing.tiktokConnection;
  const box = el('div', { className: 'hint-box tiktok-link-help' });
  if (!existing.id) { box.append(el('p', {}, ui('Save this TikTok account first. Then send its creator sign-in link to the Discord member linked to this profile.'))); return box; }
  if (DEMO) { box.append(el('p', {}, ui('Demo workspace: TikTok authorization is available for real creator profiles after Discord sign-in.'))); return box; }
  if (!existing.discordMemberId) { box.append(el('p', {}, ui('Link a Discord member to this creator profile before connecting TikTok. That member must sign in and authorize their own TikTok account.'))); return box; }
  const href = `/connections?guild=${encodeURIComponent(state.guildId)}&record=${encodeURIComponent(existing.id)}`;
  const own = existing.discordMemberId === state.me?.user?.id;
  box.append(el('p', {}, connection?.connected ? ui("TikTok connected{p0}{p1}", { p0: connection.displayName ? ' as ' + connection.displayName : '', p1: connection.needsReconnect ? '; the creator needs to reconnect.' : '.' }) : ui('This creator has not connected TikTok for public video alerts.')),
    el('p', {}, ui('The linked Discord member opens this link, signs in with Discord, and approves their TikTok account. Server management permission is not required.')),
    el('a', { className: 'creator-connection-link', href, target: '_blank', rel: 'noopener noreferrer' }, own ? ui('Manage my TikTok connection') : ui('Open creator sign-in page')),
    el('label', { className: 'connection-share-label' }, ui('Send this link to the creator'), el('input', { className: 'connection-link-field', type: 'text', value: new URL(href, location.origin).href, readonly: true, onFocus: event => event.target.select() })));
  return box;
}
