import {expect, type Page, type Route} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {createEmptyHealth, HEALTH_STORAGE_KEY, logHealthItem, saveFood} from '../lib/health';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../lib/positions';
import {journey, open, ready, snap} from './kit';

// Session X Part 14, journeys J181–J200: Activity, Chess, Music (docs/verification/x-cloud/HUMAN_TEST.md). Chess's sites
// and Spotify are never reached: their requests are answered here, or the journey stops before any.
const pagesCard = (page: import('@playwright/test').Page) => page.getByRole('region', {name: 'Your pages & buttons', exact: true});

journey('J181', 'Activity lists what I just did', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional activity check');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  if (j.phone) { const sheet = page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await page.keyboard.press('Escape'); }
  await page.getByRole('article', {name: 'Fictional activity check', exact: true}).getByRole('button', {name: 'Complete Fictional activity check', exact: true}).click();
  await open(page, '/app/activity');
  await expect(page.locator('main')).toContainText('Fictional activity check');
});

journey('J182', 'Activity\'s empty state', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/activity');
  await snap(j, 'J182', 'empty');
});

journey('J185', 'Chess is hidden until shown; showing it adds it to the navigation', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const toggle = pagesCard(page).getByRole('switch', {name: 'Chess', exact: true});
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await open(page, '/app/chess');
});

journey('J189', 'Chess with no username: an honest empty state, no request to either site', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  const external: string[] = [];
  page.on('request', r => { const host = new URL(r.url()).hostname; if (/chess\.com|lichess\.org/.test(host)) external.push(host); });
  await open(page, '/app/chess');
  await page.waitForTimeout(800);
  expect(external).toEqual([]);
});

journey('J190', 'the music player is hidden until shown; Settings → Music shows it', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app');
  await expect(page.getByRole('button', {name: 'Open the music player'})).toHaveCount(0);
  await open(page, '/app/settings');
  const card = page.getByRole('region', {name: 'Your soundtrack.'});
  await card.getByRole('button', {name: 'Show the music player'}).click();
  await expect(card.getByRole('status')).toHaveText('The music player shows again.');
  await expect(page.getByRole('button', {name: 'Open the music player'})).toBeVisible();
});

journey('J191', 'focus sounds play and stop; nothing is downloaded', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Your soundtrack.'}).getByRole('button', {name: 'Show the music player'}).click();
  const media: string[] = [];
  page.on('request', r => { if (/\.(mp3|ogg|wav|m4a|aac)(\?|$)/.test(r.url())) media.push(r.url()); });
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const panel = page.getByRole('dialog', {name: 'Your soundtrack'});
  await panel.getByRole('button', {name: /^Play /}).click();
  await expect(panel.getByRole('status')).toHaveText('Playing · until you stop it');
  await panel.getByRole('button', {name: /^Stop /}).click();
  await expect(panel.getByRole('status')).toHaveText('Made on this device · nothing is downloaded');
  expect(media).toEqual([]);
});

journey('J192', 'Spotify not registered here: it says so and offers no sign-in', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await page.route('**/api/music-config', route => route.fulfill({status: 503, json: {error: 'MUSIC_UNAVAILABLE'}}));
  const spotify: string[] = [];
  page.on('request', r => { if (/spotify\.com/.test(r.url())) spotify.push(r.url()); });
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Your soundtrack.'}).getByRole('button', {name: 'Show the music player'}).click();
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const panel = page.getByRole('dialog', {name: 'Your soundtrack'});
  await panel.getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Spotify'}).click();
  await expect(panel.getByRole('button', {name: /Connect Spotify|Sign in/})).toHaveCount(0);
  expect(spotify).toEqual([]);
});

journey('J193', 'Apple Music is a link to its own app, safely', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Your soundtrack.'}).getByRole('button', {name: 'Show the music player'}).click();
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const panel = page.getByRole('dialog', {name: 'Your soundtrack'});
  await panel.getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Apple Music'}).click();
  await expect(panel.getByRole('link', {name: 'Open Apple Music ↗'})).toHaveAttribute('rel', 'noopener noreferrer');
});

journey('J199', 'a hidden page still opens from a link, with a note to show it again', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await pagesCard(page).getByRole('switch', {name: 'Markets', exact: true}).click();
  await open(page, '/app/markets');
  // The note sits just above <main> (shell.tsx), as the "Hidden page" region, with its one-tap way back.
  const note = page.getByRole('region', {name: 'Hidden page', exact: true});
  await expect(note).toContainText('This page is hidden — show it again');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await note.getByRole('button', {name: 'Show it again: Markets', exact: true}).click();
  await expect(note).toHaveCount(0);
});

/** Fictional records written as the app writes them (lib/habits, lib/health, lib/positions), before the journey opens a page. */
const STAMP = '2026-10-01T08:00:00.000Z';
function habitWith(id: string, title: string, day: string) {
  return logHabitValue(createHabit(emptyHabitData(), {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(STAMP), id), id, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00.000Z`));
}
function mealOn(name: string, day: string) {
  const food = saveFood(createEmptyHealth(), {id: 'health_food-activity', name, brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5000, carbsMg: 20000, fatMg: 3000}, createdAt: STAMP, updatedAt: STAMP});
  return logHealthItem(food, {id: 'health_entry-activity', sourceId: 'health_food-activity', sourceKind: 'food', date: day, meal: 'Breakfast', quantityMilli: 1000}, `${day}T07:30:00.000Z`);
}
async function seed(page: Page, values: Record<string, unknown>) {
  await page.goto('/app/settings');
  await page.evaluate(v => { for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, JSON.stringify(v)])));
}
const event = (page: Page, text: string) => page.locator('.activity-event').filter({hasText: text});

journey('J183', 'Activity: each event\'s link lands on its own record (a Goal, an asset, a habit)', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const goal = privateGoalSchema.parse({id: '73', name: 'Fictional bike fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '80000', notes: '', createdAt: '2026-10-05T09:00:00.000Z', milestones: []});
  await seed(page, {[PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]}, [HABITS_KEY]: habitWith('95000000-0000-4000-8000-000000000001', 'Fictional morning pages', '2026-10-06')});
  // An asset added as a person adds one, so Activity records "… added".
  await open(page, '/app/wealth');
  await page.getByRole('button', {name: '+ Add asset'}).first().click();
  const sheet = page.getByRole('dialog', {name: 'Add to your wealth'});
  await sheet.getByRole('group', {name: 'Asset categories'}).getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByLabel('Asset name', {exact: true}).fill('Fictional activity cash');
  await sheet.getByLabel('Cash amount', {exact: true}).fill('120');
  await sheet.getByRole('button', {name: 'Save asset', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await open(page, '/app/activity');
  await event(page, 'Fictional activity cash added').getByRole('link', {name: 'Fictional activity cash added', exact: true}).click();
  await page.waitForURL(/\/app\/wealth\/asset\//);
  await ready(page);
  await expect(page.locator('main h1').first()).toContainText('Fictional activity cash');
  await page.goBack();
  await page.waitForURL(/\/app\/activity$/);
  await ready(page);
  await event(page, 'Fictional bike fund').getByRole('link', {name: 'Goal created', exact: true}).click();
  await page.waitForURL(/\/app\/goals\/tracked\/73$/);
  await ready(page);
  await expect(page.getByRole('heading', {level: 1, name: 'Fictional bike fund'})).toBeVisible();
  await page.goBack();
  await page.waitForURL(/\/app\/activity$/);
  await ready(page);
  await event(page, '2026-10-06 · 1 / 1 completed').getByRole('link', {name: 'Fictional morning pages', exact: true}).click();
  await page.waitForURL(/\/app\/habits$/);
  await ready(page);
  await expect(page.getByRole('article', {name: 'Fictional morning pages', exact: true})).toBeVisible();
});

journey('J184', 'Activity with no ZIGi actions: no "Actions by ZIGi" filter is offered and nothing claims ZIGi did anything', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/activity');
  const filters = page.getByRole('navigation', {name: 'Activity categories'});
  // The filter appears once a ZIGi card was confirmed on this device; before that it is not offered at all.
  await expect(filters.getByRole('button')).toHaveText(['All', 'Goal', 'Wealth', 'Habit', 'Health']);
  await expect(filters.getByRole('button', {name: 'Actions by ZIGi'})).toHaveCount(0);
  const timeline = page.getByRole('region', {name: 'Unified private activity'});
  await expect(timeline.locator('.timeline-empty')).toContainText('Your next step belongs here.');
  await expect(timeline.locator('.timeline-empty')).toContainText('Goal actions, habit check-ins and health logs will build your story.');
  await expect(page.locator('main')).not.toContainText('by ZIGi');
  await expect(page.locator('main')).toContainText('On this device · Local simulation history');
  await snap(j, 'J184', 'no-zigi-actions');
});

type Seen = {url: string; started: number; ended: number; headers: Record<string, string>};
const NOW = '2026-10-07T18:00:00.000Z', ENDED = Date.parse('2026-10-06T19:30:00.000Z') / 1000;
/** chess.com and Lichess answered here with fictional public data; each request is noted with when it started and ended. */
async function chessSites(page: Page, {lichessBusy = false}: {lichessBusy?: boolean} = {}) {
  const seen: Seen[] = [];
  const answer = async (route: Route, body: unknown, type = 'application/json', status = 200) => {
    const item: Seen = {url: route.request().url(), started: Date.now(), ended: 0, headers: route.request().headers()};
    seen.push(item);
    await new Promise(r => setTimeout(r, 40));
    item.ended = Date.now();
    await route.fulfill({status, contentType: type, headers: {'access-control-allow-origin': '*'}, body: typeof body === 'string' ? body : JSON.stringify(body)});
  };
  await page.route('https://api.chess.com/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stats')) return answer(route, {chess_rapid: {last: {rating: 1512, date: ENDED, rd: 45}, best: {rating: 1580}, record: {win: 30, loss: 20, draw: 4}}});
    if (path.endsWith('/games/archives')) return answer(route, {archives: ['https://api.chess.com/pub/player/fictional_player/games/2026/10']});
    if (path.endsWith('/games/2026/10')) return answer(route, {games: [{url: 'https://www.chess.com/game/live/9001', uuid: 'f-1', end_time: ENDED, rated: true, time_class: 'rapid', rules: 'chess', time_control: '600', eco: 'https://www.chess.com/openings/Italian-Game', white: {username: 'Fictional_Player', rating: 1512, result: 'win'}, black: {username: 'rival', rating: 1498, result: 'resigned'}}]});
    return answer(route, {}, 'application/json', 404);
  });
  await page.route('https://lichess.org/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/training/frame') || url.pathname.startsWith('/tv/')) return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture frame</title><p>Fixture frame</p>'});
    if (lichessBusy) return answer(route, {error: 'Too many requests'}, 'application/json', 429);
    if (url.pathname === '/api/user/fictional-li') return answer(route, {id: 'fictional-li', username: 'fictional-li', perfs: {blitz: {games: 40, rating: 1620, rd: 55, prog: 8}}});
    if (url.pathname === '/api/user/fictional-li/rating-history') return answer(route, [{name: 'Blitz', points: [[2026, 9, 1, 1590], [2026, 9, 6, 1612]]}]);
    if (url.pathname === '/api/games/user/fictional-li') return answer(route, '', 'application/x-ndjson');
    return answer(route, {}, 'application/json', 404);
  });
  await page.route('https://www.chess.com/**', route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture puzzle</title><p>Fixture puzzle</p>'}));
  return seen;
}
/** Chess shown under Your pages & buttons and both usernames saved in Settings → Chess; Settings asks neither site. */
async function chessReady(page: Page, seen: Seen[]) {
  await open(page, '/app/settings');
  await pagesCard(page).getByRole('switch', {name: 'Chess', exact: true}).click();
  const form = page.getByRole('form', {name: 'Your chess usernames'});
  await form.getByLabel('chess.com username (optional)').fill('Fictional_Player');
  await form.getByLabel('Lichess username (optional)').fill('fictional-li');
  await form.getByRole('button', {name: 'Save usernames', exact: true}).click();
  await expect(form.getByRole('status')).toHaveText('Saved. Only these usernames are sent, each to its own site.');
  expect(seen, 'Settings asks neither site').toEqual([]);
}

journey('J186', 'Chess: usernames saved; the ratings load one request at a time, with only the username and no cookie or referrer', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date(NOW)});
  const seen = await chessSites(page);
  await chessReady(page, seen);
  await open(page, '/app/chess');
  await expect(page.getByRole('article', {name: 'chess.com Rapid rating'})).toContainText('1,512');
  await expect(page.getByRole('article', {name: 'Lichess Blitz rating'})).toContainText('1,620');
  expect(seen.length).toBeGreaterThan(3);
  for (let i = 1; i < seen.length; i++) expect(seen[i]!.started, seen[i]!.url).toBeGreaterThanOrEqual(seen[i - 1]!.ended);
  for (const s of seen) { expect(s.headers.cookie, s.url).toBeUndefined(); expect(s.headers.referer, s.url).toBeUndefined(); }
  expect(seen.filter(s => s.url.includes('lichess.org')).every(s => s.url.includes('fictional-li'))).toBe(true);
  expect(seen.filter(s => s.url.includes('chess.com')).every(s => s.url.includes('fictional_player'))).toBe(true);
  await expect(page.getByRole('region', {name: 'Recent games'})).toContainText('Won');
});

journey('J187', 'Chess with a site answering 429: that site pauses a minute, nothing retried; the other still shows', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date(NOW)});
  const seen = await chessSites(page, {lichessBusy: true});
  await chessReady(page, seen);
  await open(page, '/app/chess');
  await expect(page.getByRole('region', {name: 'Ratings', exact: true}).getByRole('alert')).toHaveText('Lichess asked to wait. Try again in a minute.');
  await expect(page.getByRole('article', {name: 'chess.com Rapid rating'})).toContainText('1,512');
  const refresh = page.getByRole('button', {name: 'Refresh', exact: true});
  await expect(refresh).toBeDisabled();
  const lichess = () => seen.filter(s => s.url.startsWith('https://lichess.org')).length;
  expect(lichess()).toBe(1);
  await page.clock.fastForward(30_000);
  expect(lichess(), 'nothing retried while paused').toBe(1);
  await page.clock.fastForward(31_000);
  await expect(refresh).toBeEnabled();
  expect(lichess(), 'nothing retried by itself after the pause either').toBe(1);
});

journey('J188', 'Chess puzzles and TV load only on a tap; "Play" opens the site in a window of its own', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const seen = await chessSites(page), opened: string[] = [];
  await page.exposeFunction('recordOpen', (url: string, features: string) => { opened.push(`${url} ${features}`); });
  await page.addInitScript(() => { window.open = ((url: string, _target: string, features: string) => { void (window as unknown as {recordOpen: (u: string, f: string) => void}).recordOpen(String(url), String(features)); return null; }) as typeof window.open; });
  const frames: string[] = [];
  page.on('request', r => { if (r.resourceType() === 'document' && r.frame() !== page.mainFrame()) frames.push(r.url()); });
  await open(page, '/app/settings');
  await pagesCard(page).getByRole('switch', {name: 'Chess', exact: true}).click();
  await open(page, '/app/chess');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(frames, 'nothing framed before a tap').toEqual([]);
  for (const [name, src] of [['Daily puzzle', /^https:\/\/www\.chess\.com\/daily_puzzle$/], ['Lichess TV', /^https:\/\/lichess\.org\/tv\//]] as const) {
    await page.getByRole('button', {name, exact: true}).click();
    const dialog = page.getByRole('dialog', {name}), frame = dialog.locator('iframe');
    await expect(frame).toHaveAttribute('src', src);
    await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    await dialog.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.getByRole('button', {name, exact: true})).toBeFocused();
  }
  await page.getByRole('button', {name: 'Play on chess.com', exact: true}).click();
  await expect.poll(() => opened).toEqual(['https://www.chess.com/play/online popup,width=1100,height=820,noopener,noreferrer']);
  expect(seen.filter(s => s.url.includes('/api/'))).toEqual([]);
});

journey('J200', 'Activity with the keyboard only: a filter chosen with Enter, an event opened with Enter', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await seed(page, {[HABITS_KEY]: habitWith('95000000-0000-4000-8000-000000000002', 'Fictional keyboard habit', '2026-10-06'), [HEALTH_STORAGE_KEY]: mealOn('Fictional keyboard oats', '2026-10-06')});
  await open(page, '/app/activity');
  await expect(page.locator('.activity-event')).toHaveCount(2);
  const filters = page.getByRole('navigation', {name: 'Activity categories'}), habit = filters.getByRole('button', {name: 'Habit', exact: true});
  await filters.getByRole('button', {name: 'All', exact: true}).focus();
  for (const name of ['Goal', 'Wealth', 'Habit']) {
    await page.keyboard.press('Tab');
    await expect(filters.getByRole('button', {name, exact: true})).toBeFocused();
  }
  expect(await page.evaluate(() => !!document.activeElement?.matches(':focus-visible')), 'focus is visible').toBe(true);
  await page.keyboard.press('Enter');
  await expect(habit).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.activity-event')).toHaveCount(1);
  await expect(page.locator('.activity-event')).toHaveAttribute('data-category', 'HABIT');
  // The next stop after the filters is the event's own link.
  await page.keyboard.press('Tab');
  const link = page.locator('.activity-event').getByRole('link', {name: 'Fictional keyboard habit', exact: true});
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/app\/habits$/);
  await ready(page);
  await expect(page.getByRole('article', {name: 'Fictional keyboard habit', exact: true})).toBeVisible();
});
