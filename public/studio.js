'use strict';

function studioReplace(node, ...children) { node.replaceChildren(...children.filter(value => value !== false && value != null)); }

const memberCardDefaults = { joinHeading: 'Welcome aboard', leaveHeading: 'Until next time', background: 'midnight', accentColor: '#63D7FF', bar: 'left', barColor: '#63D7FF', backgroundColor: '#111B31', textColor: '#F2F8FF', secondaryColor: '#A7BACD', showAvatar: true, showDivider: true, decoration: true, nameText: '{user}', subtitle: '{server}', joinFooter: '{count} members and counting', leaveFooter: '{count} members in the community', brandText: 'CYRO' };
function renderCardPreview(node, c, joining, replace) {
  node.dataset.bar = c.bar; node.dataset.divider = String(c.showDivider); node.dataset.decoration = String(c.decoration);
  for (const [key, value] of Object.entries({ '--card-bar': c.barColor, '--card-text': c.textColor, '--card-secondary': c.secondaryColor, '--card-background': c.backgroundColor })) node.style.setProperty(key, value);
  const line = value => replace(value, 'New member');
  studioReplace(node, c.showAvatar && el('div', { className: 'member-card-avatar', 'aria-hidden': 'true' }, ui('N')), el('div', { className: 'member-card-copy' }, el('p', { className: 'member-card-heading' }, line(joining ? c.joinHeading : c.leaveHeading)), el('strong', { className: 'member-card-name' }, line(c.nameText)), el('p', { className: 'member-card-server' }, line(c.subtitle)), el('div', { className: 'member-card-footer' }, el('span', {}, line(joining ? c.joinFooter : c.leaveFooter)), el('b', {}, line(c.brandText)))));
}
function studioCardFields(session, refresh) {
  const color = (label, key) => textField(session, label, `welcome.card.${key}`, '', { type: 'color', onInput: refresh });
  const words = (label, key, max = 120) => textField(session, label, `welcome.card.${key}`, ui('Use {user}, {server}, and {count}. Leave blank to hide this text.'), { maxlength: max, onInput: refresh });
  const flag = (label, key) => el('div', { className: 'toggle-row' }, el('span', {}, label), toggleControl(label, session.config.welcome.card[key], v => { session.change(`welcome.card.${key}`, v); refresh(); }));
  return panel(ui('Make it yours'), el('div', { className: 'form-section' },
    el('p', { className: 'form-intro' }, ui('Customize every line. Colours, the accent bar, avatar and divider are shared between your join and leave cards.')),
    el('div', { className: 'field-row' }, words(ui('Large name text'), 'nameText'), words(ui('Subtitle'), 'subtitle')),
    el('div', { className: 'field-row' }, words(ui('Join footer'), 'joinFooter'), words(ui('Leave footer'), 'leaveFooter')),
    words(ui('Brand label'), 'brandText', 24),
    field(ui('Accent bar'), el('select', { onChange: e => { session.change('welcome.card.bar', e.target.value); refresh(); } }, [['left', 'Left edge'], ['top', 'Top edge'], ['none', 'No bar']].map(([value, label]) => el('option', { value, selected: session.config.welcome.card.bar === value }, ui(label))))),
    el('div', { className: 'field-row' }, color(ui('Bar colour'), 'barColor'), color(ui('Custom background colour'), 'backgroundColor')),
    el('p', { className: 'field-hint' }, ui('Select Custom solid colour in Card background to use your background colour.')),
    el('div', { className: 'field-row' }, color(ui('Large text colour'), 'textColor'), color(ui('Secondary text colour'), 'secondaryColor')),
    flag(ui('Show member avatar'), 'showAvatar'), flag(ui('Show divider line'), 'showDivider'), flag(ui('Show background decoration'), 'decoration')));
}

function renderAccess(main) {
  state.detail.access ||= { config: { managerAccess: true, dashboardRoleIds: [], commandRoles: {} }, isOwner: true, commands: ['dashboard', 'twitch', 'kick', 'youtube', 'tiktok', 'streamalerts', 'roles-panel', 'moderate', 'ticket', 'apply', 'counting', 'invites', 'rank', 'leaderboard', 'staff-leaderboard', 'streamer-leaderboard', 'support-recovery', 'poll', 'embed', 'suggestion'] };
  main.append(heading(ui('Access & commands'), ui('Choose who can manage this server in Cyro and use its commands.')));
  if (!state.detail.access.isOwner && !DEMO) { main.append(panel(ui('Controlled by the server owner'), el('div', { className: 'form-section' }, ui('Only the current Discord server owner can change dashboard access or command roles.')))); return; }
  const session = formSession('access');
  const commands = state.detail.access.commands || [];
  const commandFields = commands.map(name => {
    session.config.commandRoles[name] ||= [];
    return el('details', { className: 'setup-details' }, el('summary', {}, `/${name}`), el('div', { className: 'setup-fields' }, roleField(session, ui('Allowed command roles'), `commandRoles.${name}`, ui('No selection uses the existing command rules. Selecting roles restricts this command to those roles and the server owner.'), true)));
  });
  settingsLayout(main, session, [panel(ui('Dashboard access'), [toggleSection(session, ui('Allow server managers'), ui('Members with Manage Server or Administrator can access the dashboard when enabled. The owner always has access.'), 'managerAccess'), el('div', { className: 'form-section' }, roleField(session, ui('Additional dashboard roles'), 'dashboardRoleIds', ui('These roles can view server records, change settings and publish messages or polls. They cannot edit access rules.'), true), el('div', { className: 'alert info' }, ui('Access roles must be assigned by your staff in Discord. They cannot also be welcome, verification, self-assignable, application reward, or streaming roles.')))]), panel(ui('Command roles'), el('div', { className: 'form-section' }, commandFields))], [contextCard(ui('Your server stays yours'), ui('Only the server owner can save these settings. Changes apply on the next request; a removed role loses access without signing out.'), 'lock'), contextCard(ui('Discord permissions still apply'), ui('Moderation needs its normal Discord permissions and role hierarchy. Ticket actions still need support staff access. Discord’s Server Settings → Integrations may also hide commands; allow a role there if needed.'), 'shield')]);
}

function renderPublishing(main, kind) {
  const poll = kind === 'poll'; const section = poll ? 'polls' : 'messages';
  main.append(heading(poll ? ui('Polls') : ui('Channel messages'), poll ? ui('Publish a question with answer choices. Members vote on the poll in Discord.') : ui('Write an announcement, rules post or update with a styled embed.'), link(ui('Getting started'), 'help')));
  const draft = poll ? { channelId: null, question: '', answers: ['Yes', 'No'], duration: 24, multiple: false } : { channelId: null, content: '', useEmbed: true, embed: { title: '', description: '', author: '', footer: '', color: '#63D7FF', url: '', image: '', thumbnail: '', fields: [] } };
  let operationId = crypto.randomUUID(), busy = false, uncertain = false;
  const preview = el('div', { className: 'publish-preview' });
  const status = el('p', { role: 'status', className: 'save-status' }, ui('Nothing is posted until you review and publish.'));
  const session = { config: draft, change(path, value) { putPath(draft, path, value); state.dirty = true; if (!uncertain) operationId = crypto.randomUUID(); updatePreview(); } };
  function updatePreview() {
    if (poll) {
      studioReplace(preview, el('strong', {}, draft.question || ui('Your poll question')), el('div', { className: 'poll-answers' }, draft.answers.map(answer => el('div', {}, el('span', { className: 'poll-dot' }), answer || ui('Answer')))), el('small', {}, ui("{p0} hours · {p1}", { p0: draft.duration || 24, p1: draft.multiple ? 'Multiple answers' : 'One answer per person' })));
      return;
    }
    const c = draft.embed;
    const embed = el('div', { className: `discord-embed ${c.color ? '' : 'no-bar'}` }, c.author && el('small', {}, c.author), c.title && el('strong', {}, c.title), c.description && el('p', { className: 'preserve-lines' }, c.description), el('div', { className: 'embed-fields' }, c.fields.map(f => el('div', { className: f.inline ? '' : 'wide' }, el('b', {}, f.name || ui('Field name')), el('p', { className: 'preserve-lines' }, f.value || ui('Field value'))))), c.thumbnail && el('small', {}, 'Thumbnail: ' + c.thumbnail), c.image && el('small', {}, 'Image: ' + c.image), c.footer && el('small', {}, c.footer));
    embed.style.setProperty('--embed-colour', c.color || 'transparent');
    studioReplace(preview, el('span', { className: 'preview-author' }, ui('Cyro')), draft.content && el('p', { className: 'preserve-lines' }, draft.content), draft.useEmbed && embed);
  }
  const form = el('form', { className: 'settings-form' });
  const fields = el('div', { className: 'form-section' }, channelField(session, ui('Post in channel'), 'channelId', poll ? ui('Cyro needs Send Polls here. Polls use regular text channels.') : ui('You need View Channel and Send Messages here; Cyro also needs Embed Links.')));
  if (poll) fields.append(textField(session, ui('Question'), 'question', ui('Up to 300 characters.'), { required: true, maxlength: 300 }), linesField(session, ui('Answers'), 'answers', ui('One answer per line. Between 2 and 10 different answers, up to 55 characters each.'), 10, 55), textField(session, ui('Duration in hours'), 'duration', ui('From 1 hour to 32 days. You can end a poll early.'), { type: 'number', min: 1, max: 768, required: true }), el('div', { className: 'toggle-row' }, el('span', {}, ui('Allow multiple answers')), toggleControl(ui('Allow multiple answers'), false, v => session.change('multiple', v))));
  else {
    fields.append(textField(session, ui('Message text'), 'content', ui('Optional text above the embed. Mentions never notify anyone.'), { multiline: true, maxlength: 2000 }), el('div', { className: 'toggle-row' }, el('span', {}, ui('Include an embed')), toggleControl(ui('Include an embed'), true, v => { session.change('useEmbed', v); fields.querySelector('fieldset').disabled = !v; })));
    const embedded = el('fieldset', { className: 'stack embed-editor' });
    embedded.append(textField(session, ui('Embed title'), 'embed.title', '', { maxlength: 256 }), textField(session, ui('Description'), 'embed.description', ui('Discord markdown is supported in the posted message. Preview displays literal text.'), { multiline: true, maxlength: 4096, rows: 5 }), el('div', { className: 'field-row' }, textField(session, ui('Author label'), 'embed.author', '', { maxlength: 256 }), textField(session, ui('Footer'), 'embed.footer', '', { maxlength: 2048 })), textField(session, ui('Title link'), 'embed.url', ui('Optional HTTPS link.'), { type: 'url', maxlength: 2000 }), el('div', { className: 'field-row' }, textField(session, ui('Image URL'), 'embed.image', ui('Public HTTPS image. Discord loads it when posted.'), { type: 'url', maxlength: 2000 }), textField(session, ui('Thumbnail URL'), 'embed.thumbnail', '', { type: 'url', maxlength: 2000 })), field(ui('Embed colour bar'), el('input', { type: 'color', value: draft.embed.color, onInput: e => session.change('embed.color', e.target.value) })), el('div', { className: 'toggle-row' }, el('span', {}, ui('Show colour bar')), toggleControl(ui('Show colour bar'), true, v => session.change('embed.color', v ? '#63D7FF' : null))));
    const rows = el('div', { className: 'stack' });
    function drawFields() {
      rows.replaceChildren(...draft.embed.fields.map((entry, index) => el('div', { className: 'setup-fields' }, textField(session, ui("Field {p0} name", { p0: index + 1 }), `embed.fields.${index}.name`, '', { required: true, maxlength: 256 }), textField(session, ui("Field {p0} value", { p0: index + 1 }), `embed.fields.${index}.value`, '', { required: true, multiline: true, maxlength: 1024 }), el('div', { className: 'toggle-row' }, el('span', {}, ui('Display inline')), toggleControl(ui("Field {p0} inline", { p0: index + 1 }), entry.inline, v => session.change(`embed.fields.${index}.inline`, v))), button(ui('Remove field'), () => { session.change('embed.fields', draft.embed.fields.filter((_, i) => i !== index)); drawFields(); }, 'secondary small'))));
    }
    embedded.append(rows, button(ui('Add field'), () => { if (draft.embed.fields.length >= 25) return toast(ui('An embed can have up to 25 fields.'), true); session.change('embed.fields', [...draft.embed.fields, { name: '', value: '', inline: false }]); drawFields(); }, 'secondary small', 'plus'));
    fields.append(embedded);
  }
  const publish = el('button', { className: 'button', type: 'submit' }, icon('arrow'), poll ? ui('Review poll') : ui('Review message'));
  form.append(panel(poll ? ui('Build a poll') : ui('Compose a message'), fields), el('div', { className: 'save-bar' }, status, publish));
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || !form.reportValidity()) return;
    if (!draft.channelId) return toast(ui('Choose a channel first.'), true);
    const channel = (state.detail.channels || []).find(c => c.id === draft.channelId);
    if (!await confirmAction(ui("Publish to #{p0}?", { p0: channel?.name || draft.channelId }), poll ? ui('Members who can see this channel can vote. The question and answers cannot be edited after publishing.') : ui('Cyro will post the message shown in your preview. This will not ping users or roles.'), poll ? ui('Publish poll') : ui('Publish message'), ui('Keep editing'))) return;
    busy = true; state.saving = true; publish.disabled = true; window.CyroI18n.setContent(status, ui('Publishing…'));
    const controls = [...form.elements].map(c => [c, c.disabled]); controls.forEach(([c]) => c.disabled = true);
    try {
      const payload = { ...clone(draft), operationId }; delete payload.useEmbed; if (!poll && !draft.useEmbed) delete payload.embed;
      if (DEMO) { toast(ui('Preview only. No Discord message was sent.')); window.CyroI18n.setContent(status, ui('Demo preview complete; nothing was sent.')); return; }
      const result = await api(`${guildPath()}/${section}`, 'POST', payload);
      state.detail.posts ||= []; if (!state.detail.posts.some(p => p.id === result.post.id)) state.detail.posts.push(result.post);
      uncertain = false; operationId = crypto.randomUUID(); state.dirty = false;
      status.replaceChildren(window.CyroI18n.node(ui('Published. ')), postLink(result.post)); toast(poll ? ui('Poll published.') : ui('Message published.')); drawHistory();
    } catch (error) { uncertain = true; window.CyroI18n.setContent(status, error.message + ' Check the channel before starting another post.'); status.className = 'save-status error'; }
    finally { busy = false; state.saving = false; controls.forEach(([c, disabled]) => c.disabled = disabled); publish.disabled = false; }
  });
  const history = el('div', {});
  function postLink(p) { return p.messageId ? el('a', { href: `https://discord.com/channels/${safeId(state.guildId)}/${safeId(p.channelId)}/${safeId(p.messageId)}`, target: '_blank', rel: 'noopener noreferrer' }, ui('Open in Discord')) : el('span', {}, ui('Unconfirmed — check channel')); }
  function drawHistory() {
    const posts = (state.detail.posts || []).filter(p => p.kind === kind).slice(-30).reverse();
    history.replaceChildren(posts.length ? el('div', { className: 'stack' }, posts.map(p => el('div', { className: 'publish-history-row' }, el('div', {}, el('strong', {}, p.title), el('small', {}, `#${channelName(p.channelId)} · ${dateLabel(p.createdAt)}`)), postLink(p), poll && p.status === 'sent' && button(ui('End poll'), async () => {
      if (DEMO || !await confirmAction(ui('End this poll?'), ui('Discord will stop accepting votes and finalize the results.'), ui('End poll'), ui('Keep running'))) return;
      try { await api(`${guildPath()}/polls/${p.id}`, 'POST', {}); toast(ui('Poll ended. Results are in Discord.')); } catch (error) { toast(error.message, true); }
    }, 'secondary small')))) : el('p', { className: 'form-intro' }, ui('Your published posts will appear here.')));
  }
  updatePreview(); drawHistory();
  const guidance = poll
    ? contextCard(ui('How to run a poll'), ui('Choose a channel, write your question and add at least two answers. Review the preview before publishing.'), 'chart', el('div', {}, el('ol', {}, el('li', {}, ui('Anyone who can see the channel can vote in Discord.')), el('li', {}, ui('Allow multiple answers if members can choose more than one.')), el('li', {}, ui('Voting closes after your chosen duration. Use End poll below to finish early.'))), el('p', {}, ui('You can also start a poll with '), el('code', {}, '/poll'), ui(' in Discord. The question and answers cannot be edited after publishing.'))))
    : contextCard(ui('One post or a reminder?'), ui('Channel messages publish once. Use Sticky messages for a notice that returns after new conversation.'), 'pin', link(ui('Set up a sticky message'), 'sticky'));
  main.append(el('div', { className: 'settings-grid' }, form, el('aside', {}, contextCard(ui('Preview'), poll ? ui('Results remain on the original Discord poll.') : ui('Text and layout preview. Linked images and markdown are rendered by Discord after posting.'), poll ? 'chart' : 'file', preview), guidance)), panel(poll ? ui('Published polls') : ui('Published messages'), el('div', { className: 'form-section' }, history)));
}

