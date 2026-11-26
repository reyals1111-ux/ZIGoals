import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme, type Theme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {JOURNAL_DISPLAY_KEY} from '../lib/on-this-day/store';
import {NOTES_KEY} from '../lib/notes/schema';
import {NOTE_SEARCHES_KEY} from '../lib/notes/saved-searches';

/**
 * Session AW (x3; LEDGER #441, #442, #444, #445; Evernote and The Five Minute Journal): Sanne's journal and notes.
 * - #444 Journal → Write → Morning and evening: switched on, the morning page's questions, then the evening page with
 *   "This morning you wrote …" above its own; the day stays one entry; the morning page's own reminder.
 * - #442 a voice note plays in the journal's own player: 1.5× kept on the device (after a reload too), 15 s forward and
 *   back, the time played of the whole; also in Photos and voice notes. A generated WAV stands in for a recording.
 * - #445 Photo of the day on one photo of an entry, and "A photo a day": the month's strip, a blank day left blank,
 *   paged by month, a day's photo opening that day.
 * - #441 Notes → Notes: a search narrowed by a tag and kept by name, opened again in one tap, renamed, removed with Undo;
 *   a locked note is never found by its words.
 * At 390 (mobile) and 1440 (desktop), in Nebula, Light and Dark, axe-clean, no sideways scroll at 320, Motion Off still.
 * Fictional data; the API offline.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const NOW = new Date('2026-11-25T08:00:00.000Z'); // Wednesday 09:00 in Amsterdam: the morning page opens first
const AT = '2026-11-20T09:00:00.000Z';
// A 1×1 PNG, the person's "photo" (kept as the media store keeps a shrunk photo).
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
type Stored = {entries: {id: string; date: string; text: string; template?: string; parts?: {morning?: {q: string; a: string}[]; evening?: {q: string; a: string}[]}; dayPhoto?: string}[]; dayPages?: {on: boolean}; morningReminder?: {on: boolean; time: string}};
const read = <T>(page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T | null>;
const serious = async (page: Page, where: ReturnType<Page['locator']>) => { const f = await axe(page, where); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => { await page.setViewportSize({width: 320, height: 720}); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); };
async function start(page: Page, theme: Theme | null, isMobile: boolean) {
  if (theme) await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  await offlineApi(page);
  await freshDevice(page);
}
/**
 * The journal's media store with photos and one voice note. Session AW (x3, deliberate; CI run 2033): the voice note is a
 * real 40-second WebM/Opus recording of a test tone (tests/fixtures/media/voice-tone-40s.webm, made once with Chromium's
 * MediaRecorder, as the app records), in place of a generated WAV stored as audio/webm, which Chrome would not load.
 */
async function seedMedia(page: Page, photos: string[], audio: string | null) {
  const voiceB64 = audio ? readFileSync(join(__dirname, 'fixtures', 'media', 'voice-tone-40s.webm')).toString('base64') : '';
  await page.evaluate(async ([png, photoIds, audioId, at, voice64]) => {
    const bytes = Uint8Array.from(atob(png as string), c => c.charCodeAt(0));
    const voice = audioId ? new Blob([Uint8Array.from(atob(voice64 as string), c => c.charCodeAt(0))], {type: 'audio/webm'}) : null;
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('zigoals-journal-media-v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('media', 'readwrite'), s = t.objectStore('media');
      for (const id of photoIds as string[]) s.put({kind: 'photo', blob: new Blob([bytes], {type: 'image/webp'}), type: 'image/webp', bytes: bytes.length, at}, `local:${id}`);
      if (audioId && voice) s.put({kind: 'audio', blob: voice, type: 'audio/webm', bytes: voice.size, seconds: 40, at}, `local:${audioId}`);
      t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error);
    });
  }, [PNG, photos, audio, AT, voiceB64] as const);
}
/** A length on the player's clock (whole seconds, rounded down), as lib/journal/voice-speed.ts `clock` writes it. */
const clockOf = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, '0')}`;

test('Morning and evening: the morning page, then the evening page with this morning’s answers, as one entry', async ({page, isMobile}) => {
  await start(page, 'nebula', isMobile);
  await page.goto('/app/journal'); await hydrated(page);
  const fold = page.locator('details#day-pages');
  await expect(fold.locator(':scope > summary')).toContainText('a morning page and an evening page, off');
  await fold.locator(':scope > summary').click();
  // Off, it teaches what it is.
  await expect(fold).toContainText('Write each day in two parts: a morning page with a few questions');
  await fold.getByLabel('Write each day as a morning page and an evening page').check();
  await expect.poll(async () => (await read<Stored>(page, JOURNAL_KEY))?.dayPages).toEqual({on: true});
  // 09:00: the morning page opens first, with the usual two questions.
  await expect(fold.getByRole('button', {name: 'Morning page', exact: true})).toHaveAttribute('aria-pressed', 'true');
  const morning = fold.getByRole('form', {name: 'Morning page'});
  await morning.getByLabel('I am grateful for…').fill('A fictional coffee with Anna.');
  await morning.getByLabel('What would make today great?').fill('A fictional walk by the river.');
  await serious(page, fold);
  await morning.getByRole('button', {name: 'Save the morning page'}).click();
  await expect(page.locator('.aa-toast')).toContainText('Your morning page is saved in today’s entry.');
  await expect.poll(async () => (await read<Stored>(page, JOURNAL_KEY))?.entries.map(e => [e.date, e.template, e.parts?.morning?.length])).toEqual([['2026-11-25', 'morning-evening', 2]]);
  await expect(fold.getByRole('button', {name: /^Morning page · written$/})).toBeVisible();
  // The evening page shows what the morning said above its own questions; saving it changes the same entry.
  await fold.getByRole('button', {name: 'Evening page', exact: true}).click();
  const evening = fold.getByRole('form', {name: 'Evening page'});
  await expect(evening.getByRole('group', {name: 'This morning you wrote'})).toContainText('A fictional coffee with Anna.');
  await evening.getByLabel('What went well today?').fill('A fictional dinner with friends.');
  await evening.getByRole('button', {name: 'Save the evening page'}).click();
  await expect.poll(async () => { const j = await read<Stored>(page, JOURNAL_KEY); return [j?.entries.length, j?.entries[0]?.parts?.evening?.[0]?.a]; }).toEqual([1, 'A fictional dinner with friends.']);
  const entry = page.locator('ol.journal-entries > li').first();
  await expect(entry).toContainText('Morning page');
  await expect(entry).toContainText('Evening page');
  await expect(fold.locator(':scope > summary')).toContainText('morning page written, evening page written');
  // The morning page's own reminder, off until chosen.
  await fold.locator('details.day-pages-settings > summary').click();
  const reminder = fold.getByRole('group', {name: 'Reminder for the morning page'});
  await reminder.getByLabel('Remind me to write the morning page').check();
  await reminder.getByLabel('At', {exact: true}).fill('07:15');
  await expect.poll(async () => (await read<Stored>(page, JOURNAL_KEY))?.morningReminder).toEqual({on: true, time: '07:15', days: 127});
  await expect(reminder).toContainText('Notifications are off on this device');
  await serious(page, fold);
  await noSideways(page);
});

test('a voice note faster, 15 seconds either way, and the photo of the day in its month', async ({page, isMobile}) => {
  test.skip(page.context().browser()?.browserType().name() !== 'chromium', 'the WebM/Opus recording is played by Chromium');
  await start(page, 'light', isMobile);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'e1', date: '2026-11-03', text: 'A fictional walk by the sea.', createdAt: '2026-11-03T18:00:00.000Z', photos: ['m-photo0001']},
    {id: 'e2', date: '2026-11-20', text: 'A fictional market morning.', createdAt: '2026-11-20T09:00:00.000Z', photos: ['m-photo0002', 'm-photo0003'], audio: [{id: 'm-audio0001', seconds: 40}]}]})), JOURNAL_KEY);
  await seedMedia(page, ['m-photo0001', 'm-photo0002', 'm-photo0003'], 'm-audio0001');
  await page.goto('/app/journal'); await hydrated(page);
  const row = page.locator('ol.journal-entries > li').filter({hasText: 'market morning'});
  const player = row.getByRole('group', {name: /^Voice note of .*, 0:40$/});
  const audioEl = player.locator('audio');
  await expect(player.getByRole('button', {name: '1×', exact: true})).toHaveAttribute('aria-pressed', 'true');
  // 1.5×, kept on this device for every voice note.
  await player.getByRole('button', {name: '1.5×'}).click();
  await expect.poll(async () => (await read<{voiceSpeed?: number}>(page, JOURNAL_DISPLAY_KEY))?.voiceSpeed).toBe(1.5);
  await expect.poll(() => audioEl.evaluate(a => (a as HTMLAudioElement).playbackRate)).toBe(1.5);
  await expect.poll(() => audioEl.evaluate(a => (a as HTMLAudioElement).readyState)).toBeGreaterThanOrEqual(1);
  // The browser's "Infinity" of a recording is measured once, so the whole is the recording's real length.
  await expect.poll(() => audioEl.evaluate(a => Number.isFinite((a as HTMLAudioElement).duration) && (a as HTMLAudioElement).duration > 0)).toBe(true);
  const whole = clockOf(await audioEl.evaluate(a => (a as HTMLAudioElement).duration));
  await expect(player.locator('.voice-player-time')).toHaveText(`0:00 of ${whole}`);
  expect(whole).toBe('0:40');
  await player.getByRole('button', {name: 'Forward 15 seconds'}).click();
  await expect(player.locator('.voice-player-time')).toHaveText('0:15 of 0:40');
  await player.getByRole('button', {name: 'Forward 15 seconds'}).click();
  await player.getByRole('button', {name: 'Forward 15 seconds'}).click();
  await expect(player.locator('.voice-player-time')).toHaveText('0:40 of 0:40');
  await player.getByRole('button', {name: 'Back 15 seconds'}).click();
  await expect(player.locator('.voice-player-time')).toHaveText('0:25 of 0:40');
  // Keyboard: Play is a button reached and pressed like any other.
  await player.getByRole('button', {name: 'Play', exact: true}).focus();
  await page.keyboard.press('Enter');
  await expect(player.getByRole('button', {name: 'Pause', exact: true})).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(player.getByRole('button', {name: 'Play', exact: true})).toBeVisible();
  await serious(page, row);
  // The photo of the day: the second photo of that day, marked; one a day.
  await row.getByRole('button', {name: /^Photo of the day: photo 2 of the entry of/}).click();
  await expect.poll(async () => (await read<Stored>(page, JOURNAL_KEY))?.entries.find(e => e.id === 'e2')?.dayPhoto).toBe('m-photo0003');
  await expect(row.getByRole('button', {name: /^Photo of the day: photo 2 of the entry of/})).toHaveAttribute('aria-pressed', 'true');
  await page.reload(); await hydrated(page);
  await expect(page.locator('ol.journal-entries > li').filter({hasText: 'market morning'}).getByRole('group', {name: /^Voice note of/}).getByRole('button', {name: '1.5×'})).toHaveAttribute('aria-pressed', 'true');
  // A photo a day: November with two days, blank days left blank (no button, no "missed"), paged by month.
  await page.locator('#journal-photos > summary').click();
  const strip = page.locator('#journal-photos .journal-day-strip');
  await expect(strip.getByRole('heading', {name: 'A photo a day'})).toBeVisible();
  await expect(strip).toContainText('A photo on 2 days of Nov 2026. A day without one stays blank.');
  await expect(strip).not.toContainText(/missed/i);
  await expect(strip.getByRole('button', {name: /^Photo of the day, /})).toHaveCount(2);
  await expect(strip.locator('.journal-day-strip-cell')).toHaveCount(30);
  await expect(strip.getByRole('button', {name: /^The month after/})).toBeDisabled();
  await expect(strip.getByRole('button', {name: /^The month before/})).toBeDisabled();
  // The voice note plays here too, at the speed kept.
  await expect(page.locator('#journal-photos').getByRole('group', {name: /^Voice note from .*, 0:40$/}).getByRole('button', {name: '1.5×'})).toHaveAttribute('aria-pressed', 'true');
  await serious(page, page.locator('#journal-photos'));
  await strip.getByRole('button', {name: /^Photo of the day, Fri, Nov 20/}).click();
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
  await expect(page.locator('ol.journal-entries > li').first()).toContainText('market morning');
  await noSideways(page);
});

test('a Notes search narrowed by a tag, kept by name, opened in one tap, renamed and removed with Undo', async ({page, isMobile}) => {
  await start(page, 'dark', isMobile);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, voice: false, notes: [
    {id: 'n-trip', kind: 'topic', title: 'Fictional trip ideas', body: 'Lisbon in spring #travel', createdAt: '2026-11-10T09:00:00.000Z', props: [{k: 'Status', t: 'choice', v: 'Planning'}]},
    {id: 'n-pack', kind: 'topic', title: 'Fictional packing', body: 'Socks for the trip', createdAt: '2026-11-11T09:00:00.000Z'},
    {id: 'n-lock', kind: 'topic', title: 'Fictional locked', body: 'a trip kept private #travel', locked: true, createdAt: '2026-11-12T09:00:00.000Z'}]})), NOTES_KEY);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const search = page.getByRole('region', {name: 'Search notes'});
  // The empty state teaches.
  await expect(search).toContainText('Keep this search');
  await search.getByLabel('Search', {exact: true}).fill('trip');
  await expect(search.locator('.note-results > li')).toHaveCount(2); // never the locked note's words
  await search.locator('details.note-narrow-fold > summary').click();
  await expect(search.locator('details.note-narrow-fold')).toHaveAttribute('open', '');
  // Session AW (x3, deliberate; CI run 2033): a label around a select holds its options' words too ("TagAny tag#travel"),
  // so the Tag field is found by the start of its label, not by the exact word.
  await search.getByLabel(/^Tag/).selectOption('travel');
  await expect(search.locator('.note-results > li')).toHaveCount(1);
  await expect(search.locator('.note-results')).toContainText('Fictional trip ideas');
  await serious(page, search);
  await search.getByRole('textbox', {name: 'Keep this search as'}).fill('Trip ideas');
  await search.getByRole('button', {name: 'Keep this search', exact: true}).click();
  await expect.poll(async () => (await read<{searches: {name: string; words?: string; tag?: string}[]}>(page, NOTE_SEARCHES_KEY))?.searches).toEqual([expect.objectContaining({name: 'Trip ideas', words: 'trip', tag: 'travel'})]);
  // Cleared, then opened again in one tap.
  await search.getByLabel('Search', {exact: true}).fill('');
  await search.getByRole('button', {name: 'Clear the narrowing'}).click();
  await expect(search.locator('.note-results')).toHaveCount(0);
  await search.getByRole('group', {name: 'Saved searches'}).getByRole('button', {name: 'Trip ideas'}).click();
  await expect(search.getByLabel('Search', {exact: true})).toHaveValue('trip');
  await expect(search.locator('.note-saved-line')).toHaveText('Saved search “Trip ideas”: 1 note.');
  // Renamed, then removed and back with Undo.
  await search.locator('details.note-saved-manage > summary').click();
  await search.getByLabel('Name of “Trip ideas”').fill('Lisbon plans');
  await search.getByRole('button', {name: 'Rename', exact: true}).click();
  await expect.poll(async () => (await read<{searches: {name: string}[]}>(page, NOTE_SEARCHES_KEY))?.searches.map(s => s.name)).toEqual(['Lisbon plans']);
  await search.getByRole('button', {name: 'Remove the saved search “Lisbon plans”'}).click();
  await expect.poll(async () => (await read<{searches: unknown[]}>(page, NOTE_SEARCHES_KEY))?.searches).toEqual([]);
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read<{searches: {name: string}[]}>(page, NOTE_SEARCHES_KEY))?.searches.map(s => s.name)).toEqual(['Lisbon plans']);
  await serious(page, search);
  await noSideways(page);
});

test('every new part in Nebula, Light and Dark: axe-clean, and still with Motion Off', async ({page, isMobile}) => {
  await start(page, null, isMobile); // the theme is set per loop below (applyTheme would reset it on every load)
  await page.evaluate(([j, n, s]) => {
    localStorage.setItem(j, JSON.stringify({version: 1, shareWithAi: false, followUps: false, dayPages: {on: true}, entries: [{id: 'e2', date: '2026-11-20', text: 'A fictional market morning.', createdAt: '2026-11-20T09:00:00.000Z', photos: ['m-photo0002'], audio: [{id: 'm-audio0001', seconds: 40}]}]}));
    localStorage.setItem(n, JSON.stringify({version: 1, voice: false, notes: [{id: 'n-trip', kind: 'topic', title: 'Fictional trip ideas', body: 'Lisbon #travel', createdAt: '2026-11-10T09:00:00.000Z'}]}));
    localStorage.setItem(s, JSON.stringify({version: 1, searches: [{id: 'ns-fiction1', name: 'Fictional travel', tag: 'travel'}]}));
    localStorage.setItem('zigoals:motion:v1', 'off');
  }, [JOURNAL_KEY, NOTES_KEY, NOTE_SEARCHES_KEY] as const);
  await seedMedia(page, ['m-photo0002'], 'm-audio0001');
  for (const theme of THEMES) {
    await page.evaluate(t => { const key = 'zigoals:ui-prefs:v1'; const prefs = JSON.parse(localStorage.getItem(key) ?? '{"version":1}'); if (t === 'nebula') delete prefs.theme; else prefs.theme = t; localStorage.setItem(key, JSON.stringify(prefs)); }, theme);
    await page.goto('/app/journal'); await hydrated(page);
    await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
    const fold = page.locator('details#day-pages');
    await expect(fold).toHaveAttribute('open', ''); // open by itself once switched on
    await expect(fold.getByRole('form', {name: 'Morning page'})).toBeVisible();
    await serious(page, fold);
    await page.locator('#journal-photos > summary').click();
    await expect(page.locator('#journal-photos .journal-day-strip')).toBeVisible();
    await serious(page, page.locator('#journal-photos'));
    // Nothing in the player or the strip moves on its own.
    expect(await page.evaluate(() => document.getAnimations().filter(a => { const t = (a.effect as KeyframeEffect | null)?.target; return t instanceof Element && !!t.closest('.voice-player, .journal-day-strip, .day-pages'); }).length)).toBe(0);
    await page.goto('/app/notes?view=notes'); await hydrated(page);
    const search = page.getByRole('region', {name: 'Search notes'});
    await expect(search.getByRole('group', {name: 'Saved searches'}).getByRole('button', {name: 'Fictional travel'})).toBeVisible();
    await serious(page, search);
  }
});
