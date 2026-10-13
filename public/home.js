'use strict';

window.CyroHome = (() => {
  const support = 'https://discord.gg/dAZheerkkD';
  const features = [
    ['radio', 'purple', 'Creator alerts & leaderboards', 'One creator, all their accounts.', [
      'Bring Twitch, Kick, YouTube and TikTok accounts together and link them to a Discord member.',
      'Choose channels, messages and title filters for live alerts and supported video uploads.',
      'Track time streamed while Cyro’s announcement is active, with viewer and follower statistics where available.'
    ]],
    ['shield', 'green', 'Moderation & verification', 'Give your staff a helping hand.', [
      'Warnings, timeouts, kicks, bans, message cleanup and moderation records.',
      'Blocked-word filters and configurable spam controls.',
      'Let members verify with a reaction or a private image challenge to receive a role.'
    ]],
    ['wave', 'purple', 'Welcomes & member roles', 'Make the first hello your own.', [
      'Custom welcome and goodbye messages or image cards, with editable wording, colours and an optional accent bar.',
      'Automatic welcome roles and self-selected role menus.',
      'Give a dedicated role for matching custom status text, and remove it when the match ends.'
    ]],
    ['ticket', 'yellow', 'Tickets, applications & staff', 'Keep support organised.', [
      'Multiple ticket categories and application forms, with buttons or dropdowns.',
      'Staff claims, application reviews and saved ticket transcripts before optional channel deletion.',
      'Staff leaderboards for ticket claims, closures and average time to claim.'
    ]],
    ['gift', 'yellow', 'Counting, invites & levels', 'Give people a reason to join in.', [
      'A shared counting game with correct-number reactions and a server best streak.',
      'Chat XP, levels and invite challenges with leaderboards.',
      'Optional staff logs for joins, departures and known invite sources, even outside a challenge.'
    ]],
    ['spark', 'purple', 'Messages, polls & suggestions', 'Let the community have a say.', [
      'Compose rich embeds for your channels and create native Discord polls.',
      'Members use /suggestion to post ideas for others to vote on.',
      'Staff can accept, decline or close suggestions with a public response.'
    ]],
    ['music', 'green', 'Music & text to speech', 'Something for the voice lounge.', [
      'Use /playmusic to queue supported music links in your current voice call.',
      'Use /addtts to read new messages from people in that call’s chat.',
      'Choose from four free Kokoro voices with /ttsvoice. Speech is generated on Cyro’s host.'
    ]],
    ['confession', '', 'Confessions & server personality', 'A space that feels like yours.', [
      'Send /confess submissions to a chosen channel as numbered posts without public author names.',
      'Personalise Cyro’s nickname and picture separately in each server.',
      'Owners choose dashboard access roles and command restrictions. Each server keeps its own settings.'
    ]]
  ];

  function render({ app, el, icon, brand, login, setup, error }) {
    const brandLink = brand();
    brandLink.href = '/?home=1';
    brandLink.setAttribute('aria-label', 'Cyro home');
    brandLink.querySelector('small').textContent = 'Your community bot';
    const count = el('strong', { className: 'home-server-number' }, '—');
    const countLabel = el('span', { className: 'home-server-label' }, 'Discord servers connected');
    const countStatus = el('span', { className: 'home-server-status' }, 'Checking the live count…');
    const sectionHead = (eyebrow, title, copy) => el('header', { className: 'home-section-heading' },
      el('span', { className: 'home-eyebrow' }, eyebrow), el('h2', {}, title), copy && el('p', {}, copy));
    const faq = (question, ...answer) => el('details', { className: 'home-faq' }, el('summary', {}, question, icon('plus')), el('div', {}, ...answer.map(part => typeof part === 'string' ? el('p', {}, part) : part)));
    const helpLink = () => el('a', { href: support, target: '_blank', rel: 'noopener noreferrer' }, 'Headache Development Discord', icon('arrow'));

    app.replaceChildren(el('div', { className: 'login-screen home-page' },
      el('nav', { className: 'login-nav home-nav', 'aria-label': 'Main navigation' }, brandLink,
        el('div', { className: 'home-nav-links' }, el('a', { href: '#included' }, 'Features'), el('a', { href: '#free' }, 'Free to use'), el('a', { href: '#questions' }, 'Questions'), el('a', { className: 'button secondary', href: '/invite' }, icon('plus'), 'Add to Discord'))),
      el('main', { id: 'main', tabindex: '-1', className: 'home-content' },
        el('section', { className: 'home-hero', 'aria-labelledby': 'home-title' },
          el('div', { className: 'login-copy' }, el('span', { className: 'home-eyebrow' }, 'A little more connected'),
            el('h1', { id: 'home-title' }, 'Your community.', el('br'), el('span', {}, 'In good hands.')),
            el('p', {}, 'Celebrate your creators, welcome new faces and keep the conversation going. Cyro brings community activities and useful staff tools together in one Discord bot.'),
            el('div', { className: 'login-actions' }, login, el('a', { className: 'button secondary', href: '/?demo=1' }, 'Explore the dashboard', icon('arrow'))),
            el('small', {}, 'Free to use. Hosted for you. Set up in your browser.'),
            setup && el('div', { className: 'alert info login-error' }, 'Dashboard sign-in is not configured on this host yet. You can still explore the demo.'),
            error && el('div', { className: 'alert login-error' }, error)),
          el('div', { className: 'home-community' },
            el('img', { className: 'home-logo', src: '/cyro-logo.png', alt: 'Cyro icy blue C logo', width: 210, height: 210 }),
            el('div', { className: 'home-server-count', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, icon('discord'),
              el('div', {}, el('div', { className: 'home-server-total' }, count, countLabel), countStatus)))),
        el('div', { className: 'home-principles' },
          el('p', {}, icon('grid'), 'One dashboard, all your servers'),
          el('p', {}, icon('lock'), 'Access controlled by your server owner'),
          el('p', {}, icon('edit'), 'Features you can make your own')),
        el('section', { id: 'included', className: 'home-section', 'aria-labelledby': 'home-features-title' },
          el('header', { className: 'home-section-heading' }, el('span', { className: 'home-eyebrow' }, 'What’s included'), el('h2', { id: 'home-features-title' }, 'For the people who make your server.'), el('p', {}, 'From the first welcome to the next community night. Choose the features you want, then make them fit your server.')),
          el('div', { className: 'home-feature-grid' }, features.map(([symbol, color, title, intro, items]) =>
            el('article', { className: 'home-feature' }, el('div', { className: 'home-feature-heading' }, el('span', { className: `module-icon ${color}` }, icon(symbol)), el('div', {}, el('h3', {}, title), el('p', {}, intro))), el('ul', {}, items.map(item => el('li', {}, item)))))),
          el('p', { className: 'home-provider-note' }, icon('help'), 'Platform features vary. TikTok connections need approved access and creator consent; TikTok LIVE is best effort. Music link support depends on the source and host; Spotify full-track playback is unavailable. ', el('a', { href: '#questions' }, 'More below.'))),
        el('section', { id: 'free', className: 'home-free', 'aria-labelledby': 'home-free-title' },
          el('div', {}, el('span', { className: 'home-eyebrow' }, 'Our approach'), el('h2', { id: 'home-free-title' }, 'Free to use.', el('br'), 'That’s the plan.')),
          el('div', {}, el('p', { className: 'home-free-lead' }, 'All current Cyro features are free.'), el('p', {}, 'We plan to keep it that way. We’d only consider paid options if hosting costs became too expensive to sustain.'), el('span', { className: 'home-free-signature' }, 'Headache Development · The people behind Cyro'))),
        el('section', { className: 'home-section home-start', 'aria-label': 'Getting started' },
          sectionHead('Getting started', 'Your community, set up your way.', 'Cyro runs on our hosting. You don’t need to keep your computer on.'),
          el('ol', { className: 'home-steps' },
            el('li', {}, el('span', { className: 'home-step-number' }, '01'), el('h3', {}, 'Add Cyro'), el('p', {}, 'Choose a server you manage and complete Discord’s installation flow.'), el('a', { href: '/invite' }, 'Add to Discord', icon('arrow'))),
            el('li', {}, el('span', { className: 'home-step-number' }, '02'), el('h3', {}, 'Make it yours'), el('p', {}, 'Sign in with Discord, pick your channels and roles, and enable the features your community needs.'), el('a', { href: '/' }, 'Open the dashboard', icon('arrow'))),
            el('li', {}, el('span', { className: 'home-step-number' }, '03'), el('h3', {}, 'Bring your creators'), el('p', {}, 'Link creator profiles and share the separate connections page. Creators can connect their own TikTok account without staff access.'), el('a', { href: '/connections' }, 'Creator connections', icon('arrow'))))),
        el('section', { id: 'questions', className: 'home-section home-questions', 'aria-labelledby': 'home-questions-title' },
          el('div', {}, el('span', { className: 'home-eyebrow' }, 'A few useful details'), el('h2', { id: 'home-questions-title' }, 'Good to know.'), el('p', {}, 'Need help setting something up? Come say hello.'), helpLink()),
          el('div', {},
            faq('Who can open my server’s dashboard?', 'Your server owner controls dashboard access. Owners can grant it to selected roles and set command restrictions separately. Dashboard access gives staff management tools; it should go to people you trust. Each server has its own settings and access rules.'),
            faq('Can creators connect without seeing server settings?', 'Yes. Creator connections is a separate page. For TikTok, creators sign in with Discord, review TikTok’s permissions and connect the account they control. They can see recent public videos and disconnect there. They do not need dashboard access.', el('a', { href: '/connections' }, 'Open creator connections', icon('arrow'))),
            faq('Which streaming and video platforms work?', 'Creator profiles support Twitch, Kick, YouTube and TikTok. Available alerts depend on the platform and its API access. YouTube alerts require an API key configured by the bot operator. TikTok public-video connections require approved access and creator consent; sandbox access is limited to approved test accounts. TikTok LIVE uses an unofficial connection and may be interrupted by platform changes.', 'Streamer leaderboards only cover time tracked while Cyro’s announcement is active. Viewer and follower figures appear where a provider makes them available; they are not full-account lifetime analytics.'),
            faq('What can music and text to speech play?', 'Music supports compatible direct audio files and radio streams, plus public YouTube videos when YouTube permits access from our host. Playlists, restricted videos and Spotify full-track playback are unavailable. Join a regular voice channel, then use /playmusic. YouTube access is best effort and can be interrupted by platform changes.', 'For speech, use /addtts and type in that call’s chat. Only new messages from people in the call are spoken. Choose Daniel, Michael, Heart or Bella with /ttsvoice. These free Kokoro voices run locally on Cyro’s host. Cyro uses one voice channel and one mode at a time per server; it does not listen to microphones.'),
            faq('Are confessions and invite logs private?', 'Confessions hide the author from the public post. Discord still receives the original command and its author. Cyro does not keep confession text or author IDs in its saved confession history.', 'Optional invite history is visible to staff with dashboard access, plus any log channel your staff select. Some invite sources will be unknown; Cyro cannot tell which external website someone clicked an invite on.', el('a', { href: '/privacy' }, 'Read the privacy policy', icon('arrow'))))),
        el('section', { className: 'home-help', 'aria-label': 'Community support' }, el('div', {}, el('h2', {}, 'Built by Headache Development.'), el('p', {}, 'Have an idea for Cyro, or need a hand with your server?')), helpLink())),
      el('footer', { className: 'login-footer home-footer' }, el('span', {}, 'Cyro · Headache Development'), el('nav', { className: 'public-links', 'aria-label': 'Legal and creator links' }, el('a', { href: 'https://github.com/FrostyAusty24/Cyro', target: '_blank', rel: 'noopener noreferrer' }, 'Open source on GitHub'), el('a', { href: '/connections' }, 'Creator connections'), el('a', { href: '/privacy' }, 'Privacy Policy'), el('a', { href: '/terms' }, 'Terms of Service')))));

    // Only the aggregate count is public. Never substitute demo or last-known server data.
    fetch('/api/public/stats', { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000) })
      .then(response => { if (!response.ok) throw new Error('Count unavailable'); return response.json(); })
      .then(data => {
        if (!count.isConnected) return;
        if (!Number.isSafeInteger(data.serverCount) || data.serverCount < 0) throw new Error('Count unavailable');
        count.textContent = data.serverCount.toLocaleString();
        countLabel.textContent = data.serverCount === 1 ? 'Discord server connected' : 'Discord servers connected';
        countStatus.textContent = 'Live count from Cyro';
        countStatus.classList.add('available');
      }).catch(() => {
        if (!count.isConnected) return;
        count.textContent = '—';
        countStatus.textContent = 'Live count temporarily unavailable';
      });
  }
  return { render };
})();
