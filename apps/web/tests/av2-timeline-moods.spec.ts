import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {presetSettings} from '../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, createEmptyHealth} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';

/**
 * Session AV lane 2 (r5-body; LEDGER #370, Tiimo's moods on the day): the day's mood, energy and feeling words are small
 * marks at their times on the Day Timeline, in words as well as colour, each a link to Health; no Done and no move. With
 * Health hidden none shows. 320 / 390 / 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll. Fictional data.
 */
test.use({timezoneId: 'UTC'});
const DAY = '2026-11-20';
const health = JSON.stringify(withHealthGroup(createEmptyHealth(), 'moods', {version: 1, days: {[DAY]: {mood: 4, at: `${DAY}T20:10:00.000Z`}}} as never, false));
const energy = JSON.stringify({version: 1, days: {[DAY]: {energy: 2, at: `${DAY}T07:45:00.000Z`}}, words: {[DAY]: {energy: 'low', pleasantness: 'pleasant', word: 'calm', strength: 'quite', at: `${DAY}T20:11:00.000Z`}}});

for (const theme of THEMES) for (const width of [320, 390, 1440]) test(`${theme} ${width}: moods on the Day Timeline`, async ({page}) => {
  await applyTheme(page, theme);
  await offline(page);
  await page.setViewportSize({width, height: 900});
  await page.clock.install({time: new Date(`${DAY}T21:00:00.000Z`)});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, h, e]) => { localStorage.setItem(k!, h!); localStorage.setItem('zigoals:energy:v1', e!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, health, energy]);
  await page.goto('/app/timeline'); await settle(page);
  await expect(page.locator('.timeline-page')).toHaveAttribute('data-timeline', 'ready');
  const marks = page.locator('[data-kind=mark]');
  await expect(marks).toHaveCount(3);
  const evening = page.getByRole('region', {name: /^Evening/}), morning = page.getByRole('region', {name: /^Morning/});
  await expect(morning.locator('[data-kind=mark]')).toContainText('Energy: 2 of 5');
  await expect(evening.locator('[data-kind=mark]').first()).toContainText('Mood: Good (4 of 5)');
  await expect(evening.locator('[data-kind=mark]').first()).toContainText('Mood check-in');
  await expect(evening.locator('[data-kind=mark]').nth(1)).toContainText('Feeling: calm (quite)');
  await expect(marks.getByRole('button')).toHaveCount(0);
  await expect(evening.getByRole('link', {name: 'Mood: Good (4 of 5)'})).toHaveAttribute('href', `/app/health?date=${DAY}`);
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('with Health hidden, no mood shows on the Day Timeline', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date(`${DAY}T21:00:00.000Z`)});
  const AT = '2026-10-07T09:00:00.000Z', settings = {...presetSettings('balanced'), onboarded: true, schemaVersion: 3, pages: {version: 1, items: {health: {v: 'hidden', at: AT}}}};
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, h, e, s]) => { localStorage.setItem(k!, h!); localStorage.setItem('zigoals:energy:v1', e!); localStorage.setItem('zigoals:settings:v1', s!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, health, energy, JSON.stringify(settings)]);
  await page.goto('/app/timeline'); await settle(page);
  // Session AV lane 2 (fixb5; deliberate): the day holds only Health's mood and energy, so with Health hidden nothing is on it
  // and the timeline is read and "quiet" (day-timeline.tsx: no block, no any-time row). "quiet" is the stricter check: a
  // single mark would make it "ready", as the test above shows.
  await expect(page.locator('.timeline-page')).toHaveAttribute('data-timeline', 'quiet');
  await expect(page.locator('[data-kind=mark]')).toHaveCount(0);
});
