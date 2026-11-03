import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';

// Release review R12: an installed app's shortcuts and bottom bar open pages kept at install, so they work offline before
// each page was visited online.
const PUBLIC = join(__dirname, '..', '..', 'public');
test('every manifest shortcut and every bottom-bar page is kept at install', () => {
  const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
  const list = JSON.parse(/const INSTALL_PAGES = (\[[^\]]*\])/.exec(sw)![1]!.replaceAll("'", '"')) as string[];
  const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8')) as {shortcuts: {url: string}[]; start_url: string};
  for (const url of [manifest.start_url, ...manifest.shortcuts.map(s => s.url)]) expect(list, url).toContain(new URL(url, 'https://x.test').pathname);
  for (const page of ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth']) expect(list).toContain(page);
  expect(sw).toMatch(/response\.redirected\) return/);
});
