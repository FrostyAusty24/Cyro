'use strict';

function studioReplace(node, ...children) { node.replaceChildren(...children.filter(value => value !== false && value != null)); }

const memberCardDefaults = { joinHeading: 'Welcome aboard', leaveHeading: 'Until next time', background: 'midnight', accentColor: '#63D7FF', bar: 'left', barColor: '#63D7FF', backgroundColor: '#111B31', textColor: '#F2F8FF', secondaryColor: '#A7BACD', showAvatar: true, showDivider: true, decoration: true, nameText: '{user}', subtitle: '{server}', joinFooter: '{count} members and counting', leaveFooter: '{count} members in the community', brandText: 'CYRO' };
function renderCardPreview(node, c, joining, replace) {
  node.dataset.bar = c.bar; node.dataset.divider = String(c.showDivider); node.dataset.decoration = String(c.decoration);
  for (const [key, value] of Object.entries({ '--card-bar': c.barColor, '--card-text': c.textColor, '--card-secondary': c.secondaryColor, '--card-background': c.backgroundColor })) node.style.setProperty(key, value);
  const line = value => replace(value, 'New member');
  studioReplace(node, c.showAvatar && el('div', { className: 'member-card-avatar', 'aria-hidden': 'true' }, 'N'), el('div', { className: 'member-card-copy' }, el('p', { className: 'member-card-heading' }, line(joining ? c.joinHeading : c.leaveHeading)), el('strong', { className: 'member-card-name' }, line(c.nameText)), el('p', { className: 'member-card-server' }, line(c.subtitle)), el('div', { className: 'member-card-footer' }, el('span', {}, line(joining ? c.joinFooter : c.leaveFooter)), el('b', {}, line(c.brandText)))));
}
function studioCardFields(session, refresh) {
  const color = (label, key) => textField(session, label, `welcome.card.${key}`, '', { type: 'color', onInput: refresh });
  const words = (label, key, max = 120) => textField(session, label, `welcome.card.${key}`, 'Use {user}, {server}, and {count}. Leave blank to hide this text.', { maxlength: max, onInput: refresh });
  const flag = (label, key) => el('div', { className: 'toggle-row' }, el('span', {}, label), toggleControl(label, session.config.welcome.card[key], v => { session.change(`welcome.card.${key}`, v); refresh(); }));
  return panel('Make it yours', el('div', { className: 'form-section' },
    el('p', { className: 'form-intro' }, 'Customize every line. Colours, the accent bar, avatar and divider are shared between your join and leave cards.'),
    el('div', { className: 'field-row' }, words('Large name text', 'nameText'), words('Subtitle', 'subtitle')),
    el('div', { className: 'field-row' }, words('Join footer', 'joinFooter'), words('Leave footer', 'leaveFooter')),
    words('Brand label', 'brandText', 24),
    field('Accent bar', el('select', { onChange: e => { session.change('welcome.card.bar', e.target.value); refresh(); } }, [['left', 'Left edge'], ['top', 'Top edge'], ['none', 'No bar']].map(([value, label]) => el('option', { value, selected: session.config.welcome.card.bar === value }, label)))),
    el('div', { className: 'field-row' }, color('Bar colour', 'barColor'), color('Custom background colour', 'backgroundColor')),
    el('p', { className: 'field-hint' }, 'Select Custom solid colour in Card background to use your background colour.'),
    el('div', { className: 'field-row' }, color('Large text colour', 'textColor'), color('Secondary text colour', 'secondaryColor')),
    flag('Show member avatar', 'showAvatar'), flag('Show divider line', 'showDivider'), flag('Show background decoration', 'decoration')));
}

function renderAccess(main) {
  state.detail.access ||= { config: { managerAccess: true, dashboardRoleIds: [], commandRoles: {} }, isOwner: true, commands: ['dashboard', 'twitch', 'kick', 'youtube', 'tiktok', 'streamalerts', 'roles-panel', 'moderate', 'ticket', 'apply', 'counting', 'invites', 'rank', 'leaderboard', 'staff-leaderboard', 'streamer-leaderboard', 'support-recovery', 'poll', 'embed', 'suggestion'] };
  main.append(heading('Access & commands', 'Choose who can manage this server in Cyro and use its commands.'));
  if (!state.detail.access.isOwner && !DEMO) { main.append(panel('Controlled by the server owner', el('div', { className: 'form-section' }, 'Only the current Discord server owner can change dashboard access or command roles.'))); return; }
  const session = formSession('access');
  const commands = state.detail.access.commands || [];
  const commandFields = commands.map(name => {
    session.config.commandRoles[name] ||= [];
    return el('details', { className: 'setup-details' }, el('summary', {}, `/${name}`), el('div', { className: 'setup-fields' }, roleField(session, 'Allowed command roles', `commandRoles.${name}`, 'No selection uses the existing command rules. Selecting roles restricts this command to those roles and the server owner.', true)));
  });
  settingsLayout(main, session, [panel('Dashboard access', [toggleSection(session, 'Allow server managers', 'Members with Manage Server or Administrator can access the dashboard when enabled. The owner always has access.', 'managerAccess'), el('div', { className: 'form-section' }, roleField(session, 'Additional dashboard roles', 'dashboardRoleIds', 'These roles can view server records, change settings and publish messages or polls. They cannot edit access rules.', true), el('div', { className: 'alert info' }, 'Access roles must be assigned by your staff in Discord. They cannot also be welcome, verification, self-assignable, application reward, or streaming roles.'))]), panel('Command roles', el('div', { className: 'form-section' }, commandFields))], [contextCard('Your server stays yours', 'Only the server owner can save these settings. Changes apply on the next request; a removed role loses access without signing out.', 'lock'), contextCard('Discord permissions still apply', 'Moderation needs its normal Discord permissions and role hierarchy. Ticket actions still need support staff access. Discord’s Server Settings → Integrations may also hide commands; allow a role there if needed.', 'shield')]);
}

function renderPublishing(main, kind) {
  const poll = kind === 'poll'; const section = poll ? 'polls' : 'messages';
  main.append(heading(poll ? 'Polls' : 'Channel messages', poll ? 'Publish a question with answer choices. Members vote on the poll in Discord.' : 'Write an announcement, rules post or update with a styled embed.', link('Getting started', 'help')));
  const draft = poll ? { channelId: null, question: '', answers: ['Yes', 'No'], duration: 24, multiple: false } : { channelId: null, content: '', useEmbed: true, embed: { title: '', description: '', author: '', footer: '', color: '#63D7FF', url: '', image: '', thumbnail: '', fields: [] } };
  let operationId = crypto.randomUUID(), busy = false, uncertain = false;
  const preview = el('div', { className: 'publish-preview' });
  const status = el('p', { role: 'status', className: 'save-status' }, 'Nothing is posted until you review and publish.');
  const session = { config: draft, change(path, value) { putPath(draft, path, value); state.dirty = true; if (!uncertain) operationId = crypto.randomUUID(); updatePreview(); } };
  function updatePreview() {
    if (poll) {
      studioReplace(preview, el('strong', {}, draft.question || 'Your poll question'), el('div', { className: 'poll-answers' }, draft.answers.map(answer => el('div', {}, el('span', { className: 'poll-dot' }), answer || 'Answer'))), el('small', {}, `${draft.duration || 24} hours · ${draft.multiple ? 'Multiple answers' : 'One answer per person'}`));
      return;
    }
    const c = draft.embed;
    const embed = el('div', { className: `discord-embed ${c.color ? '' : 'no-bar'}` }, c.author && el('small', {}, c.author), c.title && el('strong', {}, c.title), c.description && el('p', { className: 'preserve-lines' }, c.description), el('div', { className: 'embed-fields' }, c.fields.map(f => el('div', { className: f.inline ? '' : 'wide' }, el('b', {}, f.name || 'Field name'), el('p', { className: 'preserve-lines' }, f.value || 'Field value')))), c.thumbnail && el('small', {}, 'Thumbnail: ' + c.thumbnail), c.image && el('small', {}, 'Image: ' + c.image), c.footer && el('small', {}, c.footer));
    embed.style.setProperty('--embed-colour', c.color || 'transparent');
    studioReplace(preview, el('span', { className: 'preview-author' }, 'Cyro'), draft.content && el('p', { className: 'preserve-lines' }, draft.content), draft.useEmbed && embed);
  }
  const form = el('form', { className: 'settings-form' });
  const fields = el('div', { className: 'form-section' }, channelField(session, 'Post in channel', 'channelId', poll ? 'Cyro needs Send Polls here. Polls use regular text channels.' : 'You need View Channel and Send Messages here; Cyro also needs Embed Links.'));
  if (poll) fields.append(textField(session, 'Question', 'question', 'Up to 300 characters.', { required: true, maxlength: 300 }), linesField(session, 'Answers', 'answers', 'One answer per line. Between 2 and 10 different answers, up to 55 characters each.', 10, 55), textField(session, 'Duration in hours', 'duration', 'From 1 hour to 32 days. You can end a poll early.', { type: 'number', min: 1, max: 768, required: true }), el('div', { className: 'toggle-row' }, el('span', {}, 'Allow multiple answers'), toggleControl('Allow multiple answers', false, v => session.change('multiple', v))));
  else {
    fields.append(textField(session, 'Message text', 'content', 'Optional text above the embed. Mentions never notify anyone.', { multiline: true, maxlength: 2000 }), el('div', { className: 'toggle-row' }, el('span', {}, 'Include an embed'), toggleControl('Include an embed', true, v => { session.change('useEmbed', v); fields.querySelector('fieldset').disabled = !v; })));
    const embedded = el('fieldset', { className: 'stack embed-editor' });
    embedded.append(textField(session, 'Embed title', 'embed.title', '', { maxlength: 256 }), textField(session, 'Description', 'embed.description', 'Discord markdown is supported in the posted message. Preview displays literal text.', { multiline: true, maxlength: 4096, rows: 5 }), el('div', { className: 'field-row' }, textField(session, 'Author label', 'embed.author', '', { maxlength: 256 }), textField(session, 'Footer', 'embed.footer', '', { maxlength: 2048 })), textField(session, 'Title link', 'embed.url', 'Optional HTTPS link.', { type: 'url', maxlength: 2000 }), el('div', { className: 'field-row' }, textField(session, 'Image URL', 'embed.image', 'Public HTTPS image. Discord loads it when posted.', { type: 'url', maxlength: 2000 }), textField(session, 'Thumbnail URL', 'embed.thumbnail', '', { type: 'url', maxlength: 2000 })), field('Embed colour bar', el('input', { type: 'color', value: draft.embed.color, onInput: e => session.change('embed.color', e.target.value) })), el('div', { className: 'toggle-row' }, el('span', {}, 'Show colour bar'), toggleControl('Show colour bar', true, v => session.change('embed.color', v ? '#63D7FF' : null))));
    const rows = el('div', { className: 'stack' });
    function drawFields() {
      rows.replaceChildren(...draft.embed.fields.map((entry, index) => el('div', { className: 'setup-fields' }, textField(session, `Field ${index + 1} name`, `embed.fields.${index}.name`, '', { required: true, maxlength: 256 }), textField(session, `Field ${index + 1} value`, `embed.fields.${index}.value`, '', { required: true, multiline: true, maxlength: 1024 }), el('div', { className: 'toggle-row' }, el('span', {}, 'Display inline'), toggleControl(`Field ${index + 1} inline`, entry.inline, v => session.change(`embed.fields.${index}.inline`, v))), button('Remove field', () => { session.change('embed.fields', draft.embed.fields.filter((_, i) => i !== index)); drawFields(); }, 'secondary small'))));
    }
    embedded.append(rows, button('Add field', () => { if (draft.embed.fields.length >= 25) return toast('An embed can have up to 25 fields.', true); session.change('embed.fields', [...draft.embed.fields, { name: '', value: '', inline: false }]); drawFields(); }, 'secondary small', 'plus'));
    fields.append(embedded);
  }
  const publish = el('button', { className: 'button', type: 'submit' }, icon('arrow'), poll ? 'Review poll' : 'Review message');
  form.append(panel(poll ? 'Build a poll' : 'Compose a message', fields), el('div', { className: 'save-bar' }, status, publish));
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || !form.reportValidity()) return;
    if (!draft.channelId) return toast('Choose a channel first.', true);
    const channel = (state.detail.channels || []).find(c => c.id === draft.channelId);
    if (!await confirmAction(`Publish to #${channel?.name || draft.channelId}?`, poll ? 'Members who can see this channel can vote. The question and answers cannot be edited after publishing.' : 'Cyro will post the message shown in your preview. This will not ping users or roles.', poll ? 'Publish poll' : 'Publish message', 'Keep editing')) return;
    busy = true; state.saving = true; publish.disabled = true; status.textContent = 'Publishing…';
    const controls = [...form.elements].map(c => [c, c.disabled]); controls.forEach(([c]) => c.disabled = true);
    try {
      const payload = { ...clone(draft), operationId }; delete payload.useEmbed; if (!poll && !draft.useEmbed) delete payload.embed;
      if (DEMO) { toast('Preview only. No Discord message was sent.'); status.textContent = 'Demo preview complete; nothing was sent.'; return; }
      const result = await api(`${guildPath()}/${section}`, 'POST', payload);
      state.detail.posts ||= []; if (!state.detail.posts.some(p => p.id === result.post.id)) state.detail.posts.push(result.post);
      uncertain = false; operationId = crypto.randomUUID(); state.dirty = false;
      status.replaceChildren('Published. ', postLink(result.post)); toast(poll ? 'Poll published.' : 'Message published.'); drawHistory();
    } catch (error) { uncertain = true; status.textContent = error.message + ' Check the channel before starting another post.'; status.className = 'save-status error'; }
    finally { busy = false; state.saving = false; controls.forEach(([c, disabled]) => c.disabled = disabled); publish.disabled = false; }
  });
  const history = el('div', {});
  function postLink(p) { return p.messageId ? el('a', { href: `https://discord.com/channels/${safeId(state.guildId)}/${safeId(p.channelId)}/${safeId(p.messageId)}`, target: '_blank', rel: 'noopener noreferrer' }, 'Open in Discord') : el('span', {}, 'Unconfirmed — check channel'); }
  function drawHistory() {
    const posts = (state.detail.posts || []).filter(p => p.kind === kind).slice(-30).reverse();
    history.replaceChildren(posts.length ? el('div', { className: 'stack' }, posts.map(p => el('div', { className: 'publish-history-row' }, el('div', {}, el('strong', {}, p.title), el('small', {}, `#${channelName(p.channelId)} · ${dateLabel(p.createdAt)}`)), postLink(p), poll && p.status === 'sent' && button('End poll', async () => {
      if (DEMO || !await confirmAction('End this poll?', 'Discord will stop accepting votes and finalize the results.', 'End poll', 'Keep running')) return;
      try { await api(`${guildPath()}/polls/${p.id}`, 'POST', {}); toast('Poll ended. Results are in Discord.'); } catch (error) { toast(error.message, true); }
    }, 'secondary small')))) : el('p', { className: 'form-intro' }, 'Your published posts will appear here.'));
  }
  updatePreview(); drawHistory();
  const guidance = poll
    ? contextCard('How to run a poll', 'Choose a channel, write your question and add at least two answers. Review the preview before publishing.', 'chart', el('div', {}, el('ol', {}, el('li', {}, 'Anyone who can see the channel can vote in Discord.'), el('li', {}, 'Allow multiple answers if members can choose more than one.'), el('li', {}, 'Voting closes after your chosen duration. Use End poll below to finish early.')), el('p', {}, 'You can also start a poll with ', el('code', {}, '/poll'), ' in Discord. The question and answers cannot be edited after publishing.')))
    : contextCard('One post or a reminder?', 'Channel messages publish once. Use Sticky messages for a notice that returns after new conversation.', 'pin', link('Set up a sticky message', 'sticky'));
  main.append(el('div', { className: 'settings-grid' }, form, el('aside', {}, contextCard('Preview', poll ? 'Results remain on the original Discord poll.' : 'Text and layout preview. Linked images and markdown are rendered by Discord after posting.', poll ? 'chart' : 'file', preview), guidance)), panel(poll ? 'Published polls' : 'Published messages', el('div', { className: 'form-section' }, history)));
}

