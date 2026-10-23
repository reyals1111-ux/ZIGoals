import {test, expect} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
const SHORT: [string, string][] = [['Water', 'morning'], ['Weigh in', 'morning'], ['Log breakfast', 'morning'], ['Read', 'morning'], ['Walk', 'morning'], ['Stretch', 'morning'], ['Piano', 'evening'], ['Journal', 'evening']];
const NAMES: [string, string][] = [
  ['Take Vitamins & Creatine', 'morning'], ['Water', 'morning'], ['Read ten pages', 'morning'], ['Meditate ten minutes', 'morning'], ['Exercise', 'morning'],
  ['Walk 8,000 steps', 'afternoon'], ['Play Piano', 'afternoon'], ['Cold shower', 'afternoon'],
  ['Journal three lines before bed', 'evening'], ['Stretch', 'evening'], ['No sugar today', 'evening'],
  ['Learn Spanish', 'anytime'], ['Save €10 for the trip', 'anytime'],
];
const S = '/tmp/claude-0/-home-user-ZIGoals/e2fd4f0a-d8b6-5c94-93b4-99dade54296d/scratchpad';
test.use({hasTouch: true, isMobile: true});
for (const [w, h, name] of (process.env.SHOTS ?? '390,844,c01').split(';').map(x => x.split(',')) as [string, string, string][]) test(`shot ${name}`, async ({page}) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(String(e)));
  await page.setViewportSize({width: Number(w), height: Number(h)});
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of (process.env.SHORT ? SHORT : NAMES)) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_phone2-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  await seedChecklist(page, {path: r, extra: process.env.THEME ? {[UI_PREFS_KEY]: JSON.stringify({version: 1, theme: process.env.THEME})} : {}});
  await page.goto('/app/checklist'); await settled(page);
  await page.locator('.path-stage[data-ready]').waitFor({timeout: 30_000});
  await page.locator('.path-stage[data-settled]').waitFor({timeout: 30_000});
  await page.waitForTimeout(600);
  await page.screenshot({path: `${S}/${name}.png`});
  const full = await page.locator('.path-stage').boundingBox();
  await page.locator('dialog.checklist-overlay').evaluate(el => el.scrollTo(0, 0));
  console.log('ERR', errors.join(' | '));
  expect(full).not.toBeNull();
});
