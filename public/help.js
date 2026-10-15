'use strict';

function renderHelp(main) {
  const link = (page, label) => el('a', { href: `#${page}`, className: 'button secondary small' }, label);
  const guide = (title, description, page, label) => el('div', { className: 'form-section stack' }, el('h3', {}, title), el('p', { className: 'field-hint' }, description), link(page, label));
  main.replaceChildren(heading(ui('Getting started'), ui('Choose what your community needs, then give members a simple way to use it.')));
  main.append(serverLanguagePanel());
  main.append(panel(ui('Start with /dashboard'), el('div', { className: 'form-section stack' },
    el('p', {}, ui('Run /dashboard in Discord to open this server’s settings. Run /help for a quick command guide that anyone in the server can read.')),
    el('ol', { className: 'help-steps' },
      el('li', {}, ui('Check the selected server in the sidebar.')),
      el('li', {}, ui('Open a feature, choose its channels and roles, then save your settings.')),
      el('li', {}, ui('If the feature uses a panel, publish it to the channel where members should start. Saving settings alone does not post a panel.'))),
    el('p', { className: 'field-hint' }, ui('Server owners control dashboard access. If a channel or role is missing, check Cyro’s Discord permissions and role position.')), link('access', ui('Manage dashboard access')))));

  const sections = [
    ['Support tickets & applications', 'Create the categories or forms your server needs, choose the staff roles and destination channels, then publish a button or dropdown panel. Ticket closure saves a transcript before the configured archive or deletion.', 'tickets', 'Set up tickets'],
    ['Temporary voice rooms', 'Choose a voice lobby and destination category. Joining the lobby creates a room and moves the member into it. Open the room’s text chat to lock, unlock, rename or set a member limit. Allow member lets someone into a locked room; Remove member disconnects someone from that room. Both open searchable member pickers. Empty rooms close automatically; new rooms follow the category’s visibility.', 'temp-voice', 'Set up temporary voice'],
    ['Bug reports', 'Create a category for each kind of problem, such as Bot issues, Server issues or a game resource. Members use /bugreport and choose a category. Reports include their author and go to the chosen channel; staff can mark them in progress, resolved or dismissed.', 'bug-reports', 'Set up bug reports'],
    ['Sticky messages', 'Choose a channel, write an embed and set how many messages and how much time should pass before it is refreshed. Cyro replaces its previous sticky after new chat activity. It does not remove members’ messages.', 'sticky', 'Set up sticky messages'],
    ['Suggestions & polls', 'Enable a suggestions channel so members can use /suggestion. People vote on its buttons and staff record a decision. For a specific question with answer choices, use the poll builder; Discord handles the votes and closing time.', 'suggestions', 'Set up suggestions'],
    ['Music & text-to-speech', 'Enable voice features, then join a call and use /playmusic with a supported link, or /addtts to read new messages in that call’s chat. Each member chooses /ttsvoice. The speaker-name switch adds “Frosty said” before messages. /stoptts or /stopmusic disconnects Cyro.', 'voice', 'Set up music & TTS'],
    ['Creator alerts', 'Make one profile per creator, link their Discord member and add platform accounts. Choose announcement channels, title filters and roles for each account. Available live and upload features depend on the platform connection.', 'streams', 'Manage creators'],
    ['Staff activity', 'Compare ticket claims, closures, manual moderation and application reviews over 7 days, 30 days or retained history. Assigned tickets show current workload. Average claim and close times begin when the ticket was created; counts alone are not a measure of service quality.', 'staff', 'View staff activity'],
    ['Time clock', 'Enable the time clock, optionally choose participant roles and publish a member panel. Clock in starts a shift; Clock out saves its duration. Members use /time me for their own time. Authorized staff use /time clock for server totals or /time member for one person. Open shifts survive restarts and continue until the member clocks out.', 'time-clock', 'Set up time clock'],
  ];
  main.append(panel(ui('Set up a feature'), el('div', {}, sections.map(([title, description, page, label]) => guide(ui(title), ui(description), page, ui(label))))));
  main.append(panel(ui('A few useful shortcuts'), el('div', { className: 'form-section stack' },
    el('p', {}, ui('/poll opens the poll builder. /embed opens the message composer. /confess posts to the configured confession channel. /ping checks Cyro’s connection.')),
    el('p', { className: 'field-hint' }, ui('Commands only work when the feature is enabled and your roles have access. If Discord has not refreshed a new command yet, reload the app and check the server’s integration permissions.')),
    el('div', { className: 'row-actions' }, link('polls', ui('Create a poll')), link('messages', ui('Compose a message')), el('a', { href: 'https://discord.gg/dAZheerkkD', target: '_blank', rel: 'noopener noreferrer', className: 'button secondary small' }, ui('Get support'))))));
}

function serverLanguagePanel() {
  const guildId = state.guildId;
  const current = state.detail.language || { locale: 'en' };
  let saved = current.locale, busy = false;
  const form = el('form', { className: 'form-section stack' });
  const status = el('span', { className: 'save-status', role: 'status' }, ui('Your settings are up to date.'));
  const save = el('button', { type: 'submit', className: 'button', disabled: true }, ui('Save server language'));
  const input = el('select', { onChange: () => {
    state.dirty = input.value !== saved;
    save.disabled = busy || !state.dirty;
    window.CyroI18n.setContent(status, ui(state.dirty ? 'You have unsaved changes.' : 'Your settings are up to date.'));
  } }, [...window.CyroI18n.languages, { id: 'auto', name: ui('Automatic · Discord language') }].map(language => el('option', { value: language.id, selected: saved === language.id }, language.name)));
  form.append(field(ui('Server language'), input, ui('Choose the language for bot messages. This is separate from your dashboard language and each member’s TTS voice.')),
    el('p', { className: 'field-hint' }, ui('Automatic uses each member’s Discord language for private replies and the server’s preferred language for shared messages.')),
    el('p', { className: 'field-hint' }, ui('Custom messages and member-written content stay in their original language.')),
    el('div', { className: 'save-bar' }, status, save));
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || saved === input.value) return;
    busy = true; state.saving = true; input.disabled = true; save.disabled = true;
    window.CyroI18n.setContent(status, ui('Saving your settings…'));
    try {
      const result = DEMO ? { ...current, locale: input.value } : await api(`/api/guilds/${safeId(guildId)}/language`, 'PATCH', { locale: input.value });
      if (!form.isConnected || guildId !== state.guildId) return;
      saved = result.locale; state.detail.language = result; state.dirty = false;
      window.CyroI18n.setContent(status, ui(DEMO ? 'Saved for this demo session. Discord was not changed.' : 'Server language saved.'));
      status.className = 'save-status success';
    } catch (error) { if (form.isConnected && guildId === state.guildId) { window.CyroI18n.setContent(status, uiError(error)); status.className = 'save-status error'; } }
    finally { busy = false; state.saving = false; if (form.isConnected) { input.disabled = false; save.disabled = input.value === saved; } }
  });
  return panel(ui('Server language'), form);
}
