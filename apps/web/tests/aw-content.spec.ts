import {expect, test, type Page} from '@playwright/test';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {GUIDED_JOURNEYS_KEY} from '../lib/guided/schema';
import {health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AW (content; owner decision 1d, ADR-046; LEDGER #82 Calm's Lifestyle hub, its written collections; #278 Stoic's
 * insomnia lessons): "Collections" on Guided journeys, four themed folds below the programmes and journeys, and the seven
 * short sleep lessons inside "Sleep better", each with the care line and Read aloud in the device's own voice. At 390 (the
 * phone project) and 1440, in Nebula, Light and Dark, axe clean, no sideways scroll at 320; reached from Sleep's quiet
 * link (the fold opens, focused); a programme's link moves to it on the page; nothing moves under Motion Off; Read aloud
 * only with a local voice. Nothing is stored. Fictional data; every request to the server is answered offline.
 */
type Voice = {name: string; lang: string; localService: boolean; default?: boolean; voiceURI: string};
const NETWORK: Voice = {name: 'Google US English', lang: 'en-US', localService: false, default: true, voiceURI: 'Google US English'};
const LOCAL: Voice = {name: 'Fictional Local Voice', lang: 'en-US', localService: true, voiceURI: 'fictional-local'};
/** A stand-in for the browser's speech synthesis (as in aw-programmes.spec.ts); what `speak` got is in `window.__spoken`. */
async function mockSpeech(page: Page, voices: Voice[]) {
  await page.addInitScript((list: Voice[]) => {
    const spoken: {text: string; voice: string | null; local: boolean | null}[] = [];
    (window as unknown as {__spoken: typeof spoken}).__spoken = spoken;
    const synth = {
      speaking: false, paused: false, pending: false, onvoiceschanged: null,
      getVoices: () => list,
      speak(u: {text: string; voice: Voice | null}) { spoken.push({text: u.text, voice: u.voice ? u.voice.name : null, local: u.voice ? u.voice.localService : null}); },
      cancel() { /* nothing is spoken for real */ }, pause() { /* as cancel */ }, resume() { /* as cancel */ },
      addEventListener() { /* the list never changes here */ }, removeEventListener() { /* as above */ },
    };
    Object.defineProperty(window, 'speechSynthesis', {configurable: true, get: () => synth});
    class Utterance { text: string; voice: Voice | null = null; lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable: true, writable: true, value: Utterance});
  }, voices);
}
const spoken = (page: Page) => page.evaluate(() => (window as unknown as {__spoken: {text: string; voice: string | null; local: boolean | null}[]}).__spoken);
const fold = (page: Page, id: string) => page.locator(`#guided-collection-${id}-summary`);

async function openSleepBetter(page: Page) {
  const region = page.getByRole('region', {name: 'Collections'});
  await expect(region).toBeVisible();
  await fold(page, 'sleep-better').click();
  const lessons = region.getByRole('region', {name: 'Seven short lessons on sleeping better'});
  await expect(lessons).toBeVisible();
  return {region, lessons};
}

for (const theme of THEMES) test(`${theme}: the collections fold below what is there; Sleep better holds seven lessons with the care line; axe clean`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/guided');
  // Below the programmes and journeys: no new card on the first screen, four closed folds.
  // Session AW (integration, deliberate): the page's body arrives in its own chunk since speed2, so its headings are read
  // once the last one is drawn; the same order check follows.
  await expect(page.locator('.guided-page > section > h2', {hasText: 'Collections'})).toBeVisible();
  const sections = await page.locator('.guided-page > section > h2').allTextContents();
  expect(sections.slice(-1)).toEqual(['Collections']);
  for (const [id, title] of [['sleep-better', 'Sleep better'], ['calm-down', 'Calm down'], ['move-gently', 'Move gently'], ['start-a-habit', 'Start a habit']] as const) {
    await expect(fold(page, id)).toContainText(title);
    await expect(page.locator(`#guided-collection-${id} > details`)).not.toHaveAttribute('open', /.*/);
  }
  const {region, lessons} = await openSleepBetter(page);
  await expect(region).toContainText('Small, steady changes around the evening and the morning.');
  await expect(region).toContainText('General guidance, not medical advice; stop if something hurts. If sleep stays hard, talk to a doctor.');
  const titles = ['A steady wake time', 'Wind down before bed', 'Keep the bed for sleep', 'The 20-minute rule', 'Light and caffeine', 'Worry time', 'When to see a doctor'];
  await expect(lessons.locator('summary')).toHaveCount(7);
  for (const [i, t] of titles.entries()) {
    await expect(lessons.locator('summary').nth(i)).toContainText(`Lesson ${i + 1}`);
    await expect(lessons.locator('summary').nth(i)).toContainText(t);
  }
  // Open the 20-minute rule: its text and the care line.
  await lessons.locator('summary', {hasText: 'The 20-minute rule'}).click();
  const lesson4 = lessons.locator('li', {hasText: 'The 20-minute rule'});
  await expect(lesson4).toContainText('If you lie awake for what feels like about twenty minutes, get up');
  await expect(lesson4).toContainText('General guidance, not medical advice.');
  // The last says to see a doctor if sleep stays hard.
  await lessons.locator('summary', {hasText: 'When to see a doctor'}).click();
  await expect(lessons.locator('li', {hasText: 'When to see a doctor'})).toContainText('If sleep stays hard for a few weeks or more, or it makes your days hard, see a doctor.');
  // The items link to where each is done; a written guide reads in place.
  await expect(region.getByRole('link', {name: 'Open Sleep', exact: true})).toHaveAttribute('href', '/app/health?view=sleep');
  await expect(region.getByRole('heading', {name: 'Letting the day go, 10 minutes', level: 4})).toBeVisible();
  await region.locator('summary', {hasText: 'Read it here: Letting the day go'}).click();
  await expect(region).toContainText('Let the day pass by in your mind, from morning to now, without judging it.');
  for (const box of await region.locator('summary, a, button').evaluateAll(els => els.filter(e => (e as HTMLElement).offsetParent !== null).map(e => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
  // Reading stores nothing: no journey was started.
  expect(await stored(page, GUIDED_JOURNEYS_KEY)).toBeNull();
  const findings = await axe(page, page.locator('.guided-collections'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Every fold open at 320: no sideways scroll.
  for (const id of ['calm-down', 'move-gently', 'start-a-habit']) await fold(page, id).click();
  await expect(page.getByRole('heading', {name: /^Hips and lower back, about \d+ minutes$/, level: 4})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'A 14-day habit starter', level: 4})).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('a collection’s programme link moves to the programme on this page, focused; Sleep’s quiet link opens Sleep better', async ({page}) => {
  await openHealth(page, healthRecord(health()), '/app/guided');
  const {region} = await openSleepBetter(page);
  await region.getByRole('link', {name: 'See it on this page: A sleep reset'}).click();
  await expect(page.getByRole('region', {name: 'Written programmes'}).getByRole('heading', {name: 'A sleep reset', level: 3})).toBeFocused();
  await fold(page, 'calm-down').click();
  await region.getByRole('link', {name: 'See it on this page: A calmer mind'}).click();
  await expect(page.getByRole('region', {name: 'Choose a journey'}).getByRole('heading', {name: 'A calmer mind', level: 3})).toBeFocused();
  // From Health → Sleep, one quiet text line under the sleep goal, beside the sleep reset's.
  await page.goto('/app/health?view=sleep');
  const link = page.getByRole('link', {name: 'Collection: Sleep better →'});
  await expect(link).toHaveAttribute('href', '/app/guided?collection=sleep-better');
  await link.click();
  await expect(page).toHaveURL(/\/app\/guided\?collection=sleep-better$/);
  await expect(fold(page, 'sleep-better')).toBeFocused();
  await expect(page.getByRole('region', {name: 'Seven short lessons on sleeping better'})).toBeVisible();
});

test('Motion Off: an open collection and lesson stand still', async ({page}) => {
  await openHealth(page, healthRecord(health()), '/app/guided');
  await page.evaluate(k => localStorage.setItem(k, 'off'), MOTION_PREFERENCE_KEY);
  await page.reload();
  const {region, lessons} = await openSleepBetter(page);
  await lessons.locator('summary', {hasText: 'A steady wake time'}).click();
  expect(await region.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
});

test('Read aloud: none with only a network voice; with a local one, a lesson is read in the local voice, care line included', async ({page}) => {
  await mockSpeech(page, [NETWORK]);
  await openHealth(page, healthRecord(health()), '/app/guided');
  let {lessons} = await openSleepBetter(page);
  await lessons.locator('summary', {hasText: 'A steady wake time'}).click();
  await expect(lessons).toContainText('gives your body clock a steady anchor');
  await expect(page.getByRole('button', {name: /^Read aloud/})).toHaveCount(0);
  expect(await spoken(page)).toEqual([]);

  const local = await page.context().newPage();
  await mockSpeech(local, [NETWORK, LOCAL]);
  await openHealth(local, healthRecord(health()), '/app/guided');
  ({lessons} = await openSleepBetter(local));
  await lessons.locator('summary', {hasText: 'Worry time'}).click();
  const read = local.getByRole('button', {name: 'Read aloud: Lesson 6, Worry time'});
  await expect(read).toBeVisible();
  expect((await read.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await read.click();
  const group = local.getByRole('group', {name: 'Read aloud: Lesson 6, Worry time'});
  await expect(group.getByRole('status')).toHaveText('Reading aloud with this device’s voice.');
  const said = await spoken(local);
  expect(said.length).toBeGreaterThan(0);
  for (const s of said) expect(s).toMatchObject({voice: 'Fictional Local Voice', local: true});
  const words = said.map(s => s.text).join(' ');
  expect(words).toContain('Lesson 6. Worry time.');
  expect(words).toContain('General guidance, not medical advice.');
  await group.getByRole('button', {name: /^Stop: /}).click();
  await expect(read).toBeVisible();
});
