import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import {phoneRoute} from '../components/phone/phone-chrome';

/**
 * Session AJ (A8; LA9, N-177/M-075): the phone top bar's screen-reader title (visually hidden since AH Part 18) named
 * Journey, and every other page reached from cards rather than the navigation, "ZIGoals". Each now names itself in the
 * same words as its tab title (the page's own metadata), and the navigation's pages keep their names.
 */
const APP = join(__dirname, '..', 'app', 'app');
const metadataTitle = (route: string) => {
  const source = readFileSync(join(APP, route, 'page.tsx'), 'utf8');
  return /title:\s*['"]([^'"]+)['"]/.exec(source)?.[1];
};

test.each(['journey', 'review', 'journal', 'guided', 'zigi/memory', 'share'])('/app/%s names itself as its tab title does', route => {
  const title = metadataTitle(route);
  expect(title).toBeTruthy();
  expect(phoneRoute(`/app/${route}`).title).toBe(title);
});

test('navigation pages and the earlier special cases keep their titles', () => {
  expect(phoneRoute('/app/habits').title).toBe('Habits');
  expect(phoneRoute('/app/settings/reminders').title).toBe('Settings');
  expect(phoneRoute('/app/help')).toEqual({title: 'Help', back: {href: '/app/settings', label: 'Settings'}});
  expect(phoneRoute('/app/zigi').title).toBe('Meet ZIGi');
  expect(phoneRoute('/app/journey').back).toBeUndefined();
});
