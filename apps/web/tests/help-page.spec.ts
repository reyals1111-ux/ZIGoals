import {LOGO_INTRO_KEY} from '../components/logo-intro-decision';
import {expect, test} from '@playwright/test';

// Help (Session L): structure, wording that follows the owner principle, keyboard, motion, phones, and no requests or
// writes on view.
const SECTIONS: [id: string, title: string][] = [
  ['getting-started', 'Three small first steps'], ['data-and-sync', 'Where your data lives'], ['recovery-secret', 'The one thing to keep safe'],
  ['install', 'Install ZIGoals on your iPhone'], ['backups', 'An extra safety net, never a chore'], ['your-ai', 'Your own AI, page by page'], ['questions', 'Good to know about the Alpha'],
  ['whats-new-alpha', 'New in this Alpha, in your own words'], ['feedback', 'Tell us what you think'],
];
const TOPICS = ['Getting started', 'Your data and sync', 'Your recovery secret', 'Install on iPhone', 'Optional backups', 'ZIGi · your AI', 'Questions', 'What\'s new', 'Send feedback'];

test('Help has one title and nine topics, listed before them, each linking to its section', async ({page}) => {
  await page.goto('/app/help');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Help.');
  const nav = page.getByRole('navigation', {name: 'Help topics'}), topics = nav.getByRole('link');
  await expect(topics).toHaveText(TOPICS);
  for (const [index, [id, title]] of SECTIONS.entries()) {
    await expect(page.getByRole('region', {name: title, exact: true})).toBeVisible();
    await expect(topics.nth(index)).toHaveAttribute('href', `#${id}`);
  }
  // The topic list stays above the first section at every size.
  const firstSection = page.getByRole('region', {name: 'Three small first steps', exact: true});
  expect((await nav.boundingBox())!.y).toBeLessThan((await firstSection.boundingBox())!.y);
  await topics.nth(6).click();
  await expect(page).toHaveURL(/#questions$/);
});

test("What's new (Session P): eleven linkable questions; a hash opens its answer and writes nothing", async ({page}) => {
  await page.goto('/app/help');
  const section = page.getByRole('region', {name: 'New in this Alpha, in your own words', exact: true});
  const questions = ['Can a habit tick itself off from my Health journal?', 'What is a health goal, and where does its progress come from?', 'I’m away for a week. Will my streak break?', 'What is the weekly review?', 'How does the fasting timer work, and is it right for me?', 'What are the “Something you might notice” cards?', 'Can I import a CSV from another app?', 'Can I get all my data out?', 'What can I type into Quick add?', 'Can a reminder reach me when ZIGoals is closed?', 'What is the Guide, and what does it read?'];
  for (const question of questions) await expect(section.getByText(question, {exact: true})).toBeVisible();
  await expect(section.locator('details[open]')).toHaveCount(0);
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  await page.goto('/app/help#help-imports');
  const imports = page.locator('#help-imports');
  await expect(imports).toHaveAttribute('open', '');
  await expect(imports).toContainText('The file is read on this device and never uploaded');
  await expect(section.locator('details[open]')).toHaveCount(1);
  await page.evaluate(() => { window.location.hash = '#help-fasting'; });
  await expect(page.locator('#help-fasting')).toHaveAttribute('open', '');
  await expect(page.locator('#help-fasting')).toContainText('talk to a doctor first');
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)))).toBe(before);
});

test('the wording follows the owner principle: sync once, backups optional, login is not recovery', async ({page}) => {
  await page.goto('/app/help');
  const data = page.getByRole('region', {name: 'Where your data lives'});
  await expect(data).toContainText('turn on encrypted sync once');
  await expect(data).toContainText('No backups or transfers by hand.');
  await expect(data).toContainText('It cannot unlock your data: only your recovery secret can.');
  await expect(data).toContainText('Browser storage is not encrypted');
  await expect(page.getByRole('region', {name: 'The one thing to keep safe'})).toContainText('Keep it in a password manager');
  await expect(page.getByRole('region', {name: 'An extra safety net, never a chore'})).toContainText('You don’t need backups to stay up to date');
  const questions = page.getByRole('region', {name: 'Good to know about the Alpha'});
  for (const question of ['Is any of this real money?', 'Are my Goals on the blockchain?', 'Where do prices come from?', 'Can I look up a food by its barcode?'])
    await expect(questions.getByText(question, {exact: true})).toBeVisible();
  // True whether or not the providers are switched on: what is sent, and what still works without them.
  await questions.getByText('Where do prices come from?', {exact: true}).click();
  await expect(questions.getByText('ZIGoals asks only about the public assets you choose, never your amounts, Goals or wallet.')).toBeVisible();
  await questions.getByText('Can I look up a food by its barcode?', {exact: true}).click();
  await expect(questions.getByText('Only the barcode number is sent, through ZIGoals to Open Food Facts; the camera picture stays on your device.')).toBeVisible();
});

test('questions open and close from the keyboard', async ({page}) => {
  await page.goto('/app/help');
  const answer = page.getByText('Automatic prices come from CoinGecko and are labelled with their source.', {exact: false});
  await expect(answer).toBeHidden();
  // Focus must have landed before Enter is pressed: CI once saw the key go nowhere (PR #70, 2026-10-04, phone project).
  const question = page.getByText('Where do prices come from?', {exact: true});
  await question.focus(); await expect(question).toBeFocused();
  await page.keyboard.press('Enter');await expect(answer).toBeVisible();
  await page.keyboard.press('Enter');await expect(answer).toBeHidden();
});

test('feedback opens an email to the Alpha address with a short template, and security has its own address', async ({page}) => {
  await page.goto('/app/help');
  const href = (await page.getByRole('link', {name: 'Email feedback to contact@zigoals.app', exact: true}).getAttribute('href'))!;
  expect(href).toMatch(/^mailto:contact@zigoals\.app\?subject=ZIGoals%20Alpha%20feedback&body=/);
  const body = decodeURIComponent(href.split('&body=')[1] ?? '');
  for (const line of ['What happened:', 'What you expected:', 'Device and browser:', 'App version: ', 'leave out codes, your recovery secret']) expect(body).toContain(line);
  await expect(page.getByRole('link', {name: 'hello@zigoals.app', exact: true})).toHaveAttribute('href', 'mailto:hello@zigoals.app');
});

test('viewing Help asks no server and writes nothing', async ({page}) => {
  // Reduced motion keeps the shell's once-per-session logo intro (and its sessionStorage flag) out of the comparison,
  // and so does its session flag, set up front (Session P, as in install-guide.spec.ts: a media emulation the browser
  // applies late once let the intro write that flag under reduced motion in CI).
  // The baseline is a static same-origin file, so no other page's requests can land in the list.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.addInitScript(key => { try { sessionStorage.setItem(key, 'played'); } catch { /* storage denied */ } }, LOGO_INTRO_KEY);
  await page.goto('/robots.txt');
  const snapshot = () => page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}}));
  const before = await snapshot(), requests: string[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/')) requests.push(url.pathname); });
  await page.goto('/app/help');await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-logo-intro', /^(reduced-motion|played|hidden)$/);
  for (const summary of await page.locator('.help-question > summary').all()) await summary.click();
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  expect(await snapshot()).toEqual(before);
});

test('the title sweeps once, and stays still under reduced motion', async ({page}) => {
  await page.goto('/app/help');
  await expect(page.locator('#help-title .nebula-flow')).toHaveAttribute('data-entrance', 'once');
  await page.emulateMedia({reducedMotion: 'reduce'});await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator('#help-title .nebula-flow')).not.toHaveAttribute('data-entrance', 'once');
});

for (const width of [320, 390]) test(`Help fits a ${width} px phone, with links, buttons and questions at least 44 px tall`, async ({page}) => {
  await page.setViewportSize({width, height: 844});
  await page.goto('/app/help');await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const small = await page.locator('.help-page').evaluate(root => [...root.querySelectorAll('a, button, summary')]
    .filter(el => { const box = el.getBoundingClientRect(); return box.width > 0 && box.height < 44; })
    .map(el => el.textContent?.trim()));
  expect(small).toEqual([]);
});

test('at phone width the top bar names Help and steps back to Settings', async ({page}) => {
  // Any window narrower than 768 px gets the phone layout, so both projects run this.
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/help');await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('.phone-title')).toHaveText('Help');
  const back = page.getByRole('link', {name: 'Back to Settings', exact: true});
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});
