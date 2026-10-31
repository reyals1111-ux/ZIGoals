import {createHash} from 'node:crypto';
import {test, type Page, type Request, type Route} from '@playwright/test';
import {desktopOnly, expect, hydrated, stored} from './journey-helpers';
import {createHabit, emptyHabitData} from '../../lib/habits';
import {presetSettings} from '../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../lib/whats-new';
import {DAILY_PUZZLE_FIXTURE, GAME_FULL_FIXTURE} from '../../lib/chess/fixtures';

/**
 * Session AK F2, journey 9: chess on Lichess over two days. Every lichess.org address is MOCKED (extending
 * tests/chess-play-ak.spec.ts's answers, shaped like Lichess's documented ones): the OAuth page and token endpoint, the
 * account, the ongoing games and the ndjson streams. Saturday: the person connects by PKCE, plays a move on the board, the
 * reply arrives on the stream, then resigns. Sunday: the daily puzzle (no token sent) is solved and ticks the chess
 * habit, which Habits shows as done. Finally the person disconnects and Lichess revokes the token. Fictional names.
 */
test.use({actionTimeout: 20_000, timezoneId: 'UTC'});
desktopOnly();
const TOKEN = 'lio_JourneyToken09', HABIT = '59a35604-3696-4a78-b455-000000000009';
const SAT = '2026-10-31T15:00:00.000Z', SUN = '2026-11-01T09:00:00.000Z';
type Lichess = {moves: string; replies: string[]; status: string; winner?: string; seen: Request[]; posted: string[]};
async function mockLichess(page: Page) {
  const state: Lichess = {moves: 'e2e4 e7e5', replies: ['b8c6'], status: 'started', seen: [], posted: []};
  const cors = {'access-control-allow-origin': '*'};
  const ndjson = (route: Route, lines: unknown[]) => route.fulfill({status: 200, contentType: 'application/x-ndjson', headers: cors, body: lines.map(l => typeof l === 'string' ? l : JSON.stringify(l)).join('\n') + '\n'});
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({status, contentType: 'application/json', headers: cors, body: JSON.stringify(body)});
  await page.route('https://lichess.org/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
    if (method === 'OPTIONS') return route.fulfill({status: 204, headers: {...cors, 'access-control-allow-headers': 'Origin, Authorization, If-Modified-Since, Cache-Control, Content-Type', 'access-control-allow-methods': 'OPTIONS, GET, POST, PUT, DELETE'}});
    state.seen.push(request);
    if (path === '/oauth') return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture Lichess</title><p>Fixture authorize page</p>'});
    if (path === '/api/token' && method === 'POST') return json(route, {token_type: 'Bearer', access_token: TOKEN, expires_in: 31536000});
    if (path === '/api/token' && method === 'DELETE') return route.fulfill({status: 204, headers: cors});
    if (path === '/api/account') return json(route, {id: 'fictional-me', username: 'Fictional-Me'});
    if (path === '/api/account/playing') return json(route, {nowPlaying: state.status === 'started' ? [{gameId: 'GaMe0001', fullId: 'GaMe0001abcd', color: 'white', isMyTurn: true, opponent: {id: 'fictional-rival', username: 'Fictional-Rival', rating: 1510}, speed: 'rapid', rated: false, variant: {key: 'standard', name: 'Standard'}}] : []});
    if (path === '/api/stream/event') return ndjson(route, ['']);
    if (path === '/api/board/game/stream/GaMe0001') return ndjson(route, [GAME_FULL_FIXTURE(state.moves, {state: {type: 'gameState', moves: state.moves, wtime: 590000, btime: 600000, winc: 0, binc: 0, status: state.status, ...(state.winner ? {winner: state.winner} : {})}})]);
    const move = /^\/api\/board\/game\/GaMe0001\/move\/([a-h][1-8][a-h][1-8][qrbn]?)$/.exec(path);
    if (move) { state.posted.push(move[1]!); state.moves = `${state.moves} ${move[1]} ${state.replies.shift() ?? ''}`.trim(); return json(route, {ok: true}); }
    if (path === '/api/board/game/GaMe0001/resign') { state.posted.push('resign'); state.status = 'resign'; state.winner = 'black'; return json(route, {ok: true}); }
    if (path === '/api/puzzle/daily') return json(route, DAILY_PUZZLE_FIXTURE);
    return json(route, {error: 'Not found'}, 404);
  });
  return state;
}

test('@journey 9 Lichess: connect, a game with a reply from the stream, resign; next day the daily puzzle ticks the chess habit', async ({page}) => {
  test.setTimeout(150_000);
  const lichess = await mockLichess(page);
  const outside: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost', 'lichess.org'].includes(u.hostname)) outside.push(r.url()); if (r.url().includes(TOKEN)) outside.push(`token in an address: ${r.url()}`); });
  await page.clock.setFixedTime(new Date(SAT));
  await page.route(url => url.pathname.startsWith('/api/') && url.hostname === '127.0.0.1', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  const habits = createHabit({...emptyHabitData(), timeZone: 'UTC'}, {title: 'Play chess', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1}, new Date('2026-10-01T08:00:00.000Z'), HABIT);
  const settings = {...presetSettings('balanced'), onboarded: true, schemaVersion: 3, pages: {version: 1, items: {chess: {v: 'shown', at: SAT}}}, chess: {version: 1, goals: [], applied: [], habit: {id: HABIT, at: SAT}}};
  await page.addInitScript(values => {
    if (sessionStorage.getItem('journey-9')) return;
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('zigoals:motion:v1', 'off');
    sessionStorage.setItem('journey-9', '1');
  }, {'zigoals:onboarding:v1': {version: 1, seen: true}, [WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}, 'zigoals:settings:v1': settings, 'zigoals:habits:v1': habits});

  // Saturday: connect by PKCE (Lichess's redirect back is simulated by visiting the callback with a code).
  await page.goto('/app/chess'); await hydrated(page);
  const base = new URL(page.url()).origin;
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Connect Lichess'}).click();
  await page.waitForURL(u => u.hostname === 'lichess.org' && u.pathname === '/oauth');
  const q = Object.fromEntries(new URL(page.url()).searchParams);
  expect(q).toMatchObject({response_type: 'code', client_id: 'zigoals.app', redirect_uri: `${base}/app/chess?lichess=callback`, code_challenge_method: 'S256', scope: 'board:play'});
  await page.goto(`/app/chess?lichess=callback&code=fixture-code&state=${encodeURIComponent(q.state!)}`);
  await expect(page.getByRole('heading', {name: 'Lichess · Fictional-Me'})).toBeVisible();
  const exchange = lichess.seen.find(r => r.url() === 'https://lichess.org/api/token' && r.method() === 'POST')!;
  expect(createHash('sha256').update(new URLSearchParams(exchange.postData() ?? '').get('code_verifier')!).digest('base64url')).toBe(q.code_challenge);

  // A game: the knight to f3, the reply arrives on the stream; then resign (asked once more).
  const games = page.getByRole('list', {name: 'Your ongoing Lichess games'});
  await games.getByRole('button', {name: 'Open the game against Fictional-Rival'}).click();
  const status = page.locator('.chess-status[role=status]');
  await expect(status).toHaveText('Your move.');
  const board = page.getByRole('grid', {name: /Chess board, white at the bottom/});
  await board.locator('[data-square="g1"]').click();
  await board.locator('[data-square="f3"]').click();
  await expect.poll(() => lichess.posted).toEqual(['g1f3']);
  await expect(page.getByRole('list', {name: 'Moves'})).toContainText('Nc6', {timeout: 10_000});
  await page.getByRole('button', {name: 'Resign'}).click();
  await page.getByRole('button', {name: 'Yes, resign'}).click();
  await expect(status).toHaveText('You resigned.', {timeout: 10_000});
  expect(lichess.posted).toEqual(['g1f3', 'resign']);
  // A game played (and lost) on Saturday does not tick the puzzle habit by itself.
  expect((await stored<{habits: {entries: unknown[]}[]}>(page, 'zigoals:habits:v1'))!.habits[0]!.entries).toEqual([]);

  // Sunday: the daily puzzle, checked move by move; solving it ticks the chess habit; no token goes with it.
  await page.clock.setFixedTime(new Date(SUN));
  await page.goto('/app/chess'); await hydrated(page);
  const seenBefore = lichess.seen.length;
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Load today’s puzzle'}).click();
  const puzzle = page.locator('#chess-puzzle-title ~ .chess-game-area .chess-status');
  await expect(puzzle).toHaveText('Find the best move for Black.');
  const input = page.getByLabel('Type a move (e2e4 or Nf3)').last(), play = page.getByRole('form', {name: 'Type a move'}).last().getByRole('button', {name: 'Play move'});
  for (const move of ['d4c5', 'Rxd3+', 'e6c4']) { await input.fill(move); await play.click(); await expect(puzzle).toHaveText('Right. Find the next move.'); }
  await input.fill('Bxf1'); await play.click();
  await expect(puzzle).toHaveText(/^Solved/);
  await expect(page.getByText('Your chess habit is ticked off for today.')).toBeVisible();
  const daily = lichess.seen.slice(seenBefore).find(r => r.url() === 'https://lichess.org/api/puzzle/daily')!;
  expect(daily.headers().authorization).toBeUndefined();
  await page.goto('/app/habits'); await hydrated(page);
  await expect(page.getByRole('article', {name: 'Play chess', exact: true}).locator('.habit-result')).toHaveText('Complete');
  expect((await stored<{habits: {entries: {date: string; count: number}[]}[]}>(page, 'zigoals:habits:v1'))!.habits[0]!.entries).toEqual([expect.objectContaining({date: '2026-11-01', count: 1})]);

  // Disconnect: Lichess revokes the token; this device forgets it.
  await page.goto('/app/chess'); await hydrated(page);
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Disconnect Lichess'}).click();
  await expect(page.getByText('Disconnected. This device forgot the connection and Lichess revoked it.')).toBeVisible();
  expect(lichess.seen.some(r => r.url() === 'https://lichess.org/api/token' && r.method() === 'DELETE' && r.headers().authorization === `Bearer ${TOKEN}`)).toBe(true);
  expect(outside).toEqual([]);
});
