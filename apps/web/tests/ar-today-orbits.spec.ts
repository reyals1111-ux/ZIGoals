import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {openSettings} from './settings-open';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {AT, back, health} from './ap/ap-health-fixtures';

/**
 * Session AR (6b; ADR-041 P1, ADR-040 D16 (a)): "Your orbits" as a Today card, kept on this device in its own record
 * (`zigoals:today-orbits:v1`, never the synced settings). Off by default; turned on and off from Today's own chooser
 * while arranging the page; one orbit per goal the person set, each with its value and target in words and its source;
 * one keyboard stop (the link to Health's orbits); it survives a reload, and Export everything and a restore carry it.
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1440, height: 900}});
test.setTimeout(120_000);
const KEY = 'zigoals:today-orbits:v1';
const devices = (page: Page) => page.getByRole('region', {name: 'Cards kept on this device'});
const orbitsCard = (page: Page) => page.locator('.today-device-card[data-card="orbits"]');
/** The record as this tab holds it (the Showcase keeps its own copy in the tab's storage under a prefix). */
const record = (page: Page) => page.evaluate(k => {
  const hit = [...Object.entries(localStorage), ...Object.entries(sessionStorage)].find(([name]) => name === k || name.endsWith(`:${k}`) || name.endsWith(k));
  return hit ? JSON.parse(hit[1]) : null;
}, KEY);
const tabbable = (page: Page) => orbitsCard(page).evaluate(root => [...root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex]')]
  .filter(e => e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && e.getClientRects().length).map(e => e.textContent?.trim()));

async function chooser(page: Page) {
  await page.getByRole('button', {name: /Customize Today/}).first().click();
  return page.getByRole('group', {name: 'Cards kept on this device'}).getByRole('button', {name: /^Your orbits/});
}

test('Showcase Today: off by default; turned on from the chooser it shows the Showcase\'s orbits in words with one Tab stop; it survives a reload; off again', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'Today folds its device cards on a phone; the card itself is the same');
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app'); await hydrated(page);
  await expect(devices(page).locator('[data-card]').first()).toBeVisible({timeout: 20_000});
  // Off by default: no card, no record.
  await expect(orbitsCard(page)).toHaveCount(0);
  expect(await record(page)).toBeNull();

  const choice = await chooser(page);
  await expect(choice).toHaveAttribute('aria-pressed', 'false');
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  expect(await record(page)).toEqual({version: 1, shown: true});
  await page.getByRole('button', {name: 'Finish customizing', exact: true}).click();

  const card = orbitsCard(page).getByRole('region', {name: 'Your orbits'});
  await expect(card).toBeVisible();
  // The Showcase sets a daily step target (8,000) and walks every day: the steps orbit, in words, with its source.
  const steps = card.locator('.today-orbit[data-orbit="steps"]');
  await expect(steps.getByRole('heading', {name: 'Steps'})).toBeVisible();
  await expect(steps).toContainText(/[\d,]+ of 8,000 steps today/);
  await expect(steps).toContainText(/Reached|\d+% of the way/);
  await expect(steps).toContainText('Your daily step target (Health → Targets)');
  await expect(card.getByRole('link', {name: 'Your orbits in Health'})).toHaveAttribute('href', '/app/health?view=activity');
  // ZIGoals' own figure, one per orbit, side by side: never nested rings or another app's names.
  expect(await card.locator('.today-orbit svg').count()).toBe(await card.locator('.today-orbit').count());
  await expect(card).not.toContainText(/\b(Move|Exercise|Stand|rings?)\b/);
  await expect(card).not.toContainText(/\d[\d,.]*\s*(kcal|cal\b|calories)/i);
  // The whole card is one keyboard stop.
  expect(await tabbable(page)).toEqual(['Your orbits in Health']);
  // Readable: words at 14 px or more, the link a 44 px target.
  const sizes = await card.locator('p, h3, h4, a').evaluateAll(list => list.map(e => parseFloat(getComputedStyle(e).fontSize)));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14);
  expect((await card.getByRole('link', {name: 'Your orbits in Health'}).boundingBox())!.height).toBeGreaterThanOrEqual(44);

  // A reload keeps it.
  await page.reload(); await hydrated(page);
  await expect(orbitsCard(page).getByRole('region', {name: 'Your orbits'})).toBeVisible({timeout: 20_000});

  // Off again, the same way.
  const again = await chooser(page);
  await expect(again).toHaveAttribute('aria-pressed', 'true');
  await again.click();
  await expect(again).toHaveAttribute('aria-pressed', 'false');
  await expect(orbitsCard(page)).toHaveCount(0);
  expect(await record(page)).toEqual({version: 1, shown: false});
});

test('a device without goals: the empty card says how to add one; nothing recorded is not a zero; Export everything and a restore carry the choice', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'Today folds its device cards on a phone; the card itself is the same');
  await page.clock.install({time: new Date('2026-11-14T09:00:00Z')});
  await offlineApi(page);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(k => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, JSON.stringify({version: 1, shown: true})); }, KEY);
  await page.goto('/app'); await hydrated(page);
  const card = orbitsCard(page).getByRole('region', {name: 'Your orbits'});
  await expect(card).toBeVisible({timeout: 20_000});
  await expect(card).toContainText('No orbit yet: each one follows a goal you set yourself. To add one:');
  await expect(card).toContainText('Set a daily step target in Health → Targets.');
  expect(await tabbable(page)).toEqual(['Your orbits in Health']);

  // A step target with nothing walked today (only yesterday): the target in words, "Not known yet", never "0 of".
  const h = health({targets: {...health().targets, steps: 8000}, activity: [{id: 'health_activity-ar-0001', date: back(1), name: 'Walk', steps: 9000, minutes: 50, createdAt: AT, updatedAt: AT}]});
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HEALTH_STORAGE_KEY, JSON.stringify(h)]);
  await page.reload(); await hydrated(page);
  const steps = card.locator('.today-orbit[data-orbit="steps"]');
  await expect(steps).toContainText('Nothing recorded today yet · target 8,000 steps', {timeout: 20_000});
  await expect(steps).toContainText('Not known yet');
  await expect(steps).not.toContainText(/\b0 of/);
  await expect(card).toContainText('More orbits you can add:');

  // Export everything holds the record; remove it; a restore brings it back.
  await openSettings(page);
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel(/I understand this file is readable/).check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const file = await waiting, chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(Buffer.from(chunk));
  const zip = Buffer.concat(chunks);
  expect(zip.length).toBeGreaterThan(0);
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  await page.goto('/app/settings/data'); await hydrated(page);
  const region = page.getByRole('region', {name: 'Restore from a backup'});
  await region.getByLabel('Export everything ZIP').setInputFiles({name: 'zigoals-export-2026-11-14.zip', mimeType: 'application/zip', buffer: zip});
  const preview = region.getByLabel('What this backup holds');
  await preview.getByRole('combobox', {name: 'Your orbits on Today: what to do'}).selectOption('replace');
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  await expect(region.locator('.restore-backup').getByRole('status')).toContainText('Your orbits on Today');
  expect(await record(page)).toEqual({version: 1, shown: true});
  await page.goto('/app'); await hydrated(page);
  await expect(orbitsCard(page).getByRole('region', {name: 'Your orbits'})).toBeVisible({timeout: 20_000});
});
