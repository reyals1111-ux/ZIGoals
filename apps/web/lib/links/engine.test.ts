import {describe, expect, test} from 'vitest';
import {addLink, editLink, linkHost, linkInputIssue, linksOf, moveLink, removeLink, sortedLinks, suggestedIcon} from './engine';
import {showcaseLinks} from './showcase';
import {emptyDashboardSettings, dashboardSettingsSchema} from '../dashboard-settings';

// Session W Part 19: My links in settings v3 `links`: https only, nothing added, every change stamped, settings raised to
// v3 only when a link is saved.
const T1 = '2026-10-07T10:00:00.000Z', T2 = '2026-10-07T11:00:00.000Z';
const id = (n: number) => `96000000-0000-4000-8000-00000000000${n}`;
const base = () => emptyDashboardSettings();

test('the first link raises Today\'s settings to v3; an unused feature changes nothing', () => {
  const before = base();
  expect(before.schemaVersion).toBe(2);
  expect(removeLink(before, id(1))).toBe(before);
  const after = addLink(before, {label: ' Running club ', url: ' https://www.example.com/club?ref=me ', icon: 'strava'}, id(1), T1);
  expect(after.schemaVersion).toBe(3);
  expect(dashboardSettingsSchema.parse(after)).toEqual(after);
  // The address is kept exactly as typed (trimmed): ZIGoals adds and removes nothing.
  expect(linksOf(after).items).toEqual([{id: id(1), label: 'Running club', url: 'https://www.example.com/club?ref=me', icon: 'strava', order: 0, createdAt: T1, updatedAt: T1}]);
});

describe('addresses', () => {
  test.each([
    ['http://example.com', 'Only https:// addresses can be added.'],
    ['example.com', 'Enter a full address that starts with https://'],
    ['https://localhost', 'Enter a full address, such as https://example.com'],
    ['https://me:secret@example.com', 'An address with a user name or password cannot be added.'],
    ['javascript:alert(1)', 'Only https:// addresses can be added.'],
  ])('%s is refused: %s', (url, message) => {
    expect(linkInputIssue({label: 'A', url, icon: 'monogram'})).toBe(message);
    expect(() => addLink(base(), {label: 'A', url, icon: 'monogram'}, id(1), T1)).toThrow(message);
  });
  test('a name is needed, up to 40 characters', () => {
    expect(linkInputIssue({label: '  ', url: 'https://example.com', icon: 'monogram'})).toBe('Give the link a name.');
    expect(linkInputIssue({label: 'x'.repeat(41), url: 'https://example.com', icon: 'monogram'})).toBe('A name has at most 40 characters.');
  });
});

test('edit, move and remove: each change stamps what it touches; an unchanged edit writes nothing', () => {
  let s = addLink(base(), {label: 'A', url: 'https://a.example.com', icon: 'monogram'}, id(1), T1);
  s = addLink(s, {label: 'B', url: 'https://b.example.com', icon: 'github'}, id(2), T1);
  s = addLink(s, {label: 'C', url: 'https://c.example.com', icon: 'youtube'}, id(3), T1);
  expect(editLink(s, id(2), {label: 'B', url: 'https://b.example.com', icon: 'github'}, T2)).toBe(s);
  s = editLink(s, id(2), {label: 'Code', url: 'https://b.example.com', icon: 'github'}, T2);
  expect(linksOf(s).items.find(i => i.id === id(2))).toMatchObject({label: 'Code', updatedAt: T2});
  s = moveLink(s, id(3), -1, T2);
  expect(sortedLinks(linksOf(s)).map(i => i.label)).toEqual(['A', 'C', 'Code']);
  expect(linksOf(s).items.filter(i => i.updatedAt === T2).map(i => i.id).sort()).toEqual([id(2), id(3)]);
  expect(moveLink(s, id(1), -1, T2)).toBe(s);
  s = removeLink(s, id(1));
  expect(sortedLinks(linksOf(s)).map(i => i.label)).toEqual(['C', 'Code']);
  expect(() => editLink(s, id(1), {label: 'A', url: 'https://a.example.com', icon: 'monogram'}, T2)).toThrow('That link is no longer here.');
});

test('at most 24 links', () => {
  let s = base();
  for (let n = 0; n < 24; n++) s = addLink(s, {label: `L${n}`, url: `https://l${n}.example.com`, icon: 'monogram'}, `96000000-0000-4000-8000-${String(n).padStart(12, '0')}`, T1);
  expect(() => addLink(s, {label: 'One more', url: 'https://more.example.com', icon: 'monogram'}, id(9), T1)).toThrow('You can keep up to 24 links.');
});

test('an address suggests ZIGoals\' own picture for 16 networks, the first letter otherwise; nothing is fetched', () => {
  expect(['https://www.instagram.com/me', 'https://www.tiktok.com/@me', 'https://m.youtube.com/@me', 'https://youtu.be/x', 'https://x.com/me', 'https://twitter.com/me', 'https://www.facebook.com/me', 'https://www.linkedin.com/in/me', 'https://www.reddit.com/u/me', 'https://discord.gg/abc', 'https://www.twitch.tv/me', 'https://github.com/me', 'https://open.spotify.com/user/me', 'https://wa.me/123', 'https://t.me/me', 'https://www.strava.com/athletes/1', 'https://www.chess.com/member/me', 'https://lichess.org/@/me', 'https://example.com', 'https://notinstagram.com', 'not a url'].map(suggestedIcon))
    .toEqual(['instagram', 'tiktok', 'youtube', 'youtube', 'x', 'x', 'facebook', 'linkedin', 'reddit', 'discord', 'twitch', 'github', 'spotify', 'whatsapp', 'telegram', 'strava', 'chesscom', 'lichess', 'monogram', 'monogram', 'monogram']);
  expect(linkHost('https://www.example.com/a?b=c')).toBe('example.com');
});

test('the Showcase\'s links point only at reserved example addresses', () => {
  const links = showcaseLinks('2026-10-07');
  expect(links.items).toHaveLength(4);
  for (const link of links.items) expect(new URL(link.url).hostname).toMatch(/(^|\.)example\.(com|org|net)$/);
});
