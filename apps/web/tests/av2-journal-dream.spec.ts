import {expect, test} from '@playwright/test';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (r3-notes; LEDGER #278, Stoic's dream journal): Health → Sleep → Recent nights: the latest night offers
 * "Write down a dream"; the Journal opens with a dream entry for that night; saving it makes the Dreams journal and links
 * the entry to the night; the sleep log then says "1 dream written" with a link to it. At 390 and 1440, Nebula, Light and
 * Dark, axe-clean, no sideways scroll at 320. Fictional nights; the API offline.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-01T10:00:00.000Z';
const night = (d: string, prev: string) => ({id: `health_sleep-fictional-${d}`, kind: 'night', source: 'manual', start: `${prev}T23:00:00.000Z`, end: `${d}T07:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT, latencyMin: 0, awakeMin: 0});
for (const theme of THEMES) test(`${theme}: write down a dream from the sleep log`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T08:00:00Z')});
  const health = withHealthGroup(createEmptyHealth(), 'sleep', {version: 1, nights: [night('2026-11-21', '2026-11-20'), night('2026-11-22', '2026-11-21')]} as Sleep, false);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v, j]) => { localStorage.setItem(k, v); localStorage.setItem(j, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: []})); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health), JOURNAL_KEY] as const);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const recent = page.getByRole('region', {name: 'Recent nights and naps'});
  await expect(recent.getByRole('link', {name: /^Write down a dream from the night ending/})).toHaveCount(1); // the latest night only
  let findings = await axe(page, recent);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await recent.getByRole('link', {name: 'Write down a dream from the night ending Nov 22, 2026'}).click();
  await expect(page).toHaveURL(/\/app\/journal\?dream=2026-11-22$/); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await expect(form.locator('.journal-dream-line')).toContainText('A dream from the night ending');
  await expect(form.locator('.journal-dream-line')).toContainText('Dreams journal (made when you save)');
  await form.getByRole('textbox', {name: 'Your dream'}).fill('A fictional dream about a lighthouse.');
  findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}') as {journals?: {name: string}[]; entries: {night?: string; journal?: string}[]}, JOURNAL_KEY)).toMatchObject({journals: [{name: 'Dreams'}], entries: [{night: '2026-11-22', journal: expect.stringMatching(/^j-/)}]});
  await expect(page.locator('ol.journal-entries > li').first().locator('.journal-entry-night')).toContainText('a dream, the night ending Nov 22');
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  await expect(recent.getByRole('link', {name: /^1 dream written for the night ending Nov 22, 2026/})).toHaveAttribute('href', '/app/journal?day=2026-11-22');
  await expect(recent.getByRole('link', {name: /^Write down a dream from the night ending/})).toHaveCount(0);
  await expect(recent.getByRole('link', {name: 'Write down another dream from the night ending Nov 22, 2026'})).toHaveAttribute('href', '/app/journal?dream=2026-11-22');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
