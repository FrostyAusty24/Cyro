import { expect, it } from 'vitest';
import { renderTranscript } from '../src/moderation/transcript.js';

it('renders message text and attachment links without executable HTML', () => {
  const html = renderTranscript('Support <script>', [{ author: '<img onerror=alert(1)>', createdAt: '2026-10-11', content: '<script>alert(1)</script> & secret', attachments: ['javascript:alert(1)', 'https://cdn.discordapp.com/example.png'] }], false);
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('Content-Security-Policy');
  expect(html).toContain('https://cdn.discordapp.com/example.png');
});
