import {expect, test, type Page} from '@playwright/test';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {GUIDED_JOURNEYS_KEY} from '../lib/guided/schema';
import {health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AW (programmes; owner decision 1d and amendment 3, ADR-046): the written programmes in Guided journeys and
 * Read aloud. Open a programme day and tick a step, at 390 (the phone project) and 1440, in Nebula, Light and Dark, axe
 * clean, no sideways scroll at 320, the focus kept on the step; reached from its pillar's quiet link; nothing moves under
 * Motion Off. Read aloud with a mocked `speechSynthesis`: with only a network voice ("Google …", localService false) there
 * is no Read aloud button anywhere; with a local voice beside it, the button shows and `speak` gets the local voice only.
 * Fictional data; every request to the server is answered offline by the fixtures.
 */
type Voice = {name: string; lang: string; localService: boolean; default?: boolean; voiceURI: string};
const NETWORK: Voice = {name: 'Google US English', lang: 'en-US', localService: false, default: true, voiceURI: 'Google US English'};
const LOCAL: Voice = {name: 'Fictional Local Voice', lang: 'en-US', localService: true, voiceURI: 'fictional-local'};
/** A stand-in for the browser's speech synthesis, holding only `voices`; what `speak` received is kept in `window.__spoken`. */
async function mockSpeech(page: Page, voices: Voice[]) {
  await page.addInitScript((list: Voice[]) => {
    const spoken: {text: string; voice: string | null; local: boolean | null}[] = [];
    (window as unknown as {__spoken: typeof spoken}).__spoken = spoken;
    const listeners = new Set<() => void>();
    const synth = {
      speaking: false, paused: false, pending: false, onvoiceschanged: null,
      getVoices: () => list,
      speak(u: {text: string; voice: Voice | null}) { spoken.push({text: u.text, voice: u.voice ? u.voice.name : null, local: u.voice ? u.voice.localService : null}); },
      cancel() { /* nothing is spoken for real */ }, pause() { /* as cancel */ }, resume() { /* as cancel */ },
      addEventListener(type: string, f: () => void) { if (type === 'voiceschanged') listeners.add(f); },
      removeEventListener(_type: string, f: () => void) { listeners.delete(f); },
    };
    Object.defineProperty(window, 'speechSynthesis', {configurable: true, get: () => synth});
    class Utterance { text: string; voice: Voice | null = null; lang = ''; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable: true, writable: true, value: Utterance});
  }, voices);
}
const spoken = (page: Page) => page.evaluate(() => (window as unknown as {__spoken: {text: string; voice: string | null; local: boolean | null}[]}).__spoken);
async function startRun(page: Page) {
  await page.getByRole('region', {name: 'Written programmes'}).getByRole('button', {name: 'Start: 0 to 5 km in 8 weeks'}).click();
  const mine = page.getByRole('region', {name: 'Your journeys'});
  await expect(mine.getByRole('article', {name: '0 to 5 km in 8 weeks'})).toBeVisible();
  return mine;
}

for (const theme of THEMES) test(`${theme}: open a programme day and tick a step; the care line; axe clean`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()), '/app/guided');
  // The empty state teaches what a programme is.
  const mine = page.getByRole('region', {name: 'Your journeys'});
  await expect(mine).toContainText('No journey or programme yet.');
  await expect(mine).toContainText('A programme is a written plan: each day has a few steps');
  const programmes = page.getByRole('region', {name: 'Written programmes'});
  for (const title of ['Beginner strength in 4 weeks', '0 to 5 km in 8 weeks', 'A 14-day habit starter', 'A sleep reset', 'A 10-day meditation starter']) await expect(programmes.getByRole('heading', {name: title, level: 3})).toBeVisible();
  await expect(programmes).toContainText('24 runs over 8 weeks · three a week, a rest day after each');
  await startRun(page);
  const card = mine.getByRole('article', {name: '0 to 5 km in 8 weeks'});
  await expect(card).toContainText('General guidance, not medical advice; stop if something hurts.');
  await expect(card).toContainText('Today: Run 1, Run 60 seconds, walk 90 seconds: 8 times.');
  await expect(card).toContainText('Week 1 of 8 · 0 of 24 runs done');
  await expect(card).toContainText(/Unlocks on /);
  // Today's day is open; tick its first step.
  const done = card.getByRole('button', {name: 'Done: Warm up: walk briskly for 5 minutes (Run 1)'});
  await expect(done).toBeVisible();
  await expect(card.getByRole('link', {name: 'Open Workouts'}).first()).toHaveAttribute('href', '/app/health?view=workouts');
  await done.click();
  const undo = card.getByRole('button', {name: 'Undo: Warm up: walk briskly for 5 minutes (Run 1)'});
  await expect(undo).toBeFocused();
  await expect(card).toContainText('1 of 4 steps done');
  await expect.poll(async () => (await stored<{journeys: {programId: string; done: string[]; stepsDone?: string[]}[]}>(page, GUIDED_JOURNEYS_KEY)).journeys[0]).toMatchObject({programId: 'run-5k', done: [], stepsDone: ['w1-r1/warm-up']});
  // The whole day done: the day id goes in `done` (what older builds read), its step ticks leave the record.
  await card.getByRole('button', {name: 'Mark all of Run 1 done'}).click();
  await expect(card.getByRole('button', {name: 'Undo the whole of Run 1'})).toBeFocused();
  await expect.poll(async () => (await stored<{journeys: {done: string[]; stepsDone?: string[]}[]}>(page, GUIDED_JOURNEYS_KEY)).journeys[0]).toMatchObject({done: ['w1-r1'], stepsDone: []});
  await expect(card).toContainText('Week 1 of 8 · 1 of 24 runs done');
  const findings = await axe(page, page.locator('.guided-page'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('each programme is reached from its pillar’s quiet link, and opens focused', async ({page}) => {
  await openHealth(page, healthRecord(health()), '/app/health?view=workouts');
  await page.getByRole('link', {name: 'Programme: Beginner strength in 4 weeks →'}).click();
  await expect(page).toHaveURL(/\/app\/guided\?programme=strength-start$/);
  await expect(page.getByRole('heading', {name: 'Beginner strength in 4 weeks', level: 3})).toBeFocused();
  await page.goto('/app/health?view=workouts');
  await expect(page.getByRole('link', {name: 'Programme: 0 to 5 km in 8 weeks →'})).toHaveAttribute('href', '/app/guided?programme=run-5k');
  await page.goto('/app/health?view=sleep');
  await expect(page.getByRole('link', {name: 'Programme: A sleep reset →'})).toHaveAttribute('href', '/app/guided?programme=sleep-reset');
  await page.goto('/app/health?view=meditation');
  await expect(page.getByRole('link', {name: 'Programme: A 10-day meditation starter →'})).toHaveAttribute('href', '/app/guided?programme=meditation-start');
});

test('Motion Off: a programme day stands still (no animation runs on the card)', async ({page}) => {
  await openHealth(page, healthRecord(health()), '/app/guided');
  await page.evaluate(k => localStorage.setItem(k, 'off'), MOTION_PREFERENCE_KEY);
  await page.reload();
  await startRun(page);
  const card = page.getByRole('article', {name: '0 to 5 km in 8 weeks'});
  await card.getByRole('button', {name: 'Done: Warm up: walk briskly for 5 minutes (Run 1)'}).click();
  expect(await card.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
});

test('Read aloud: with only a network voice there is no Read aloud button anywhere', async ({page}) => {
  await mockSpeech(page, [NETWORK]);
  await openHealth(page, healthRecord(health()), '/app/guided');
  await startRun(page);
  await expect(page.getByRole('article', {name: '0 to 5 km in 8 weeks'}).getByRole('button', {name: 'Done: Warm up: walk briskly for 5 minutes (Run 1)'})).toBeVisible();
  await expect(page.getByRole('button', {name: /^Read aloud/})).toHaveCount(0);
  await page.goto('/app/health?view=meditation');
  await page.locator('summary', {hasText: 'Today’s practice, a short written guide'}).click();
  await expect(page.getByRole('button', {name: /^Begin · \d+ min with the bell$/})).toBeVisible();
  await expect(page.getByRole('button', {name: /^Read aloud/})).toHaveCount(0);
  expect(await spoken(page)).toEqual([]);
});

test('Read aloud: with a local voice beside a network one, the button shows and speak gets the local voice only', async ({page}) => {
  await mockSpeech(page, [NETWORK, LOCAL]);
  await openHealth(page, healthRecord(health()), '/app/guided');
  await startRun(page);
  const read = page.getByRole('button', {name: 'Read aloud: Run 1, Run 60 seconds, walk 90 seconds: 8 times'});
  await expect(read).toBeVisible();
  expect((await read.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await read.click();
  const group = page.getByRole('group', {name: 'Read aloud: Run 1, Run 60 seconds, walk 90 seconds: 8 times'});
  await expect(group.getByRole('button', {name: /^Pause: /})).toBeVisible();
  await expect(group.getByRole('status')).toHaveText('Reading aloud with this device’s voice.');
  const said = await spoken(page);
  expect(said.length).toBeGreaterThan(0);
  for (const s of said) expect(s).toMatchObject({voice: 'Fictional Local Voice', local: true});
  expect(said.map(s => s.text).join(' ')).toContain('Warm up: walk briskly for 5 minutes');
  await group.getByRole('button', {name: /^Pause: /}).click();
  await expect(group.getByRole('button', {name: /^Resume: /})).toBeVisible();
  await group.getByRole('button', {name: /^Stop: /}).click();
  await expect(read).toBeVisible();
  // The written meditation guide and the stretches have it too.
  await page.goto('/app/health?view=meditation');
  await page.locator('summary', {hasText: 'Today’s practice, a short written guide'}).click();
  await page.getByRole('button', {name: /^Read aloud: /}).first().click();
  await page.locator('summary', {hasText: 'Move gently: a short guided stretch'}).click();
  await expect(page.locator('.move-pick').getByRole('button', {name: /^Read aloud: /})).toBeVisible();
  for (const s of await spoken(page)) expect(s.local).toBe(true);
  const findings = await axe(page, page.locator('.meditation-today'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
});
