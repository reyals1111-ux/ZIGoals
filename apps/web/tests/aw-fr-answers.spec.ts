import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings, type DashboardPreset} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {openZigi, sendToZigi, zigiPanel} from './zigi-open';
import {axe, applyTheme, offline, THEMES} from './p6-helpers';

/**
 * Session AW (fr-answers; the fresh-eyes persona walks, FRIEND_READINESS-aw): the captions this group changed, at 390 (the
 * phone project) and 1440, in Nebula, Light and Dark, axe clean.
 * - FR-AW-9: NOVA → Permissions says, where Allow Health would be, when it cannot show (Health off this device's Today),
 *   now that the replies no longer carry "(the button is there once Health is on your Today page)".
 * - FR-AW-10: a Dutch question in ZIGi gets the chart's caption, its figures' table and the follow-up chips in Dutch.
 * Fictional Showcase data; nothing leaves the browser. (FR-AW-19's agenda clock words are pinned by lib/nova/holo/aw-fr-agenda.test.ts.)
 */
const DAY = '2026-11-17', EVENING = '2026-11-17T19:00:00.000Z';
async function seed(page: Page, preset: DashboardPreset, healthShared: boolean) {
  await offline(page);
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  const defaults = defaultAiSettings(), ai = healthShared ? {...defaults, includeHealth: true, pageShare: {...defaults.pageShare, health: true}} : defaults;
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings(preset), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai)});
  await page.waitForLoadState('networkidle');
}
const size = (isMobile: boolean) => isMobile ? {width: 390, height: 844} : {width: 1440, height: 900};

for (const theme of THEMES) test(`${theme}: NOVA → Permissions says why Allow Health is not there when Health is off Today; with Health on Today the button, no note; axe clean`, async ({page, isMobile}) => {
  test.setTimeout(120_000);
  await applyTheme(page, theme);
  await page.setViewportSize(size(isMobile));
  await seed(page, 'wealth', false);
  await page.goto('/app/nova#nova-permissions'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  const note = page.getByTestId('nova-allow-health-later');
  await expect(note).toHaveText('Allow Health shows here once Health is on your Today page. It is not on your Today layout on this device, so nothing from Health can be shared yet: add it to Today first.', {timeout: 20_000});
  await expect(page.getByRole('button', {name: 'Allow Health', exact: true})).toHaveCount(0);
  expect(await note.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await axe(page, page.locator('.nova-permissions'))).toEqual([]);
  await seed(page, 'balanced', false);
  await page.goto('/app/nova#nova-permissions'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await expect(page.getByRole('button', {name: 'Allow Health', exact: true})).toBeVisible({timeout: 20_000});
  await expect(note).toHaveCount(0);
});

for (const theme of THEMES) test(`${theme}: a Dutch question in ZIGi: the chart's caption, its table and the follow-up chips in Dutch; English stays English; Motion Off still`, async ({page, isMobile}) => {
  test.setTimeout(120_000);
  await applyTheme(page, theme);
  await page.setViewportSize(size(isMobile));
  await seed(page, 'habits-health', true);
  await page.evaluate(key => localStorage.setItem(key, 'off'), MOTION_PREFERENCE_KEY);
  await page.goto('/app');
  await openZigi(page);
  await sendToZigi(page, 'Hoeveel water heb ik deze week gedronken?');
  const nl = zigiPanel(page).locator('.ai-turn-local').last();
  await expect(nl).toContainText('Je logde deze week');
  const chart = nl.getByRole('img', {name: /^Water per dag: \d+ dagen met een registratie van \d+ nov 2026 tot \d+ nov 2026, [\d.]+ mL in totaal, het meest [\d.]+ mL op \d+ nov 2026\.$/});
  await expect(chart).toBeVisible();
  await expect(nl.locator('figcaption')).not.toContainText(/per day|with a record|in all/);
  await nl.getByText('Toon de cijfers').click();
  await expect(nl.getByRole('columnheader', {name: 'Dag'})).toBeVisible();
  await expect(nl.getByRole('group', {name: 'Follow-up questions'}).getByRole('button')).toHaveText(['Hoeveel water heb ik gisteren gedronken?']);
  expect(await axe(page, zigiPanel(page))).toEqual([]);
  // The same question in English keeps its English caption and chips, word for word.
  await sendToZigi(page, 'How much water did I drink this week?');
  const en = zigiPanel(page).locator('.ai-turn-local').last();
  await expect(en.getByRole('img', {name: /^Water per day: \d+ days with a record from /})).toBeVisible();
  await expect(en.getByRole('group', {name: 'Follow-up questions'}).getByRole('button')).toHaveText(['How much water did I drink yesterday?']);
  // Motion Off: nothing in the answer animates.
  expect(await en.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
});
