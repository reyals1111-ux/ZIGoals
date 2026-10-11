import {afterEach, describe, expect, it} from 'vitest';
import {chesscomGames, chesscomLatestArchive, chesscomOpening, chesscomRatings, lichessGames, lichessHistory, lichessRatings} from './parse';
import {ChessSiteError, readChesscom, readLichess, resetChessPauses, sitePausedFor, type ChessFetch} from './api';
import {appliedOn, applyChessCheckIn, chessCheckIn, currentRatings, forgetSite, goalProgress, markApplied, mergeRead, ratingLine, results, setChessHabit, setUsername} from './engine';
import {emptyChessCache, type ChessGame} from './schema';
import {dashboardSettingsSchema, emptyDashboardSettings} from '../../dashboard-settings';
import {createHabit, emptyHabitData, habitDay} from '../../habits';

// Session W Part 14: chess.com's Published-Data API and the Lichess API as documented (2026-10-07), with MOCK answers
// shaped like theirs; fictional usernames; no request leaves the test.
const AT = '2026-10-07T09:00:00.000Z';
const ccGame = (over: Record<string, unknown> = {}) => ({url: 'https://www.chess.com/game/live/101', pgn: '', time_control: '600', end_time: 1791363600, rated: true, time_class: 'rapid', rules: 'chess', uuid: 'aaaa-1', eco: 'https://www.chess.com/openings/Sicilian-Defense-2.Nf3',
  white: {username: 'Fictional_Player', rating: 1510, result: 'win'}, black: {username: 'someone', rating: 1490, result: 'resigned'}, ...over});
const liGame = (over: Record<string, unknown> = {}) => JSON.stringify({id: 'AbCdEf12', rated: true, variant: 'standard', speed: 'blitz', perf: 'blitz', createdAt: 1791360000000, lastMoveAt: 1791360600000, status: 'mate', winner: 'black',
  players: {white: {user: {name: 'Other', id: 'other'}, rating: 1600}, black: {user: {name: 'fictional-li', id: 'fictional-li'}, rating: 1580}}, opening: {eco: 'C50', name: 'Italian Game', ply: 5}, clock: {initial: 180, increment: 2, totalTime: 260}, ...over});

describe('reading chess.com', () => {
  it('ratings: each time class\'s "last" rating with its date; nothing invented for a class never played', () => {
    expect(chesscomRatings({chess_rapid: {last: {rating: 1512, date: 1791360000, rd: 50}, best: {rating: 1600}}, chess_blitz: {best: {rating: 1400}}, tactics: {highest: {rating: 2000}}}))
      .toEqual([{site: 'chesscom', control: 'rapid', rating: 1512, at: '2026-10-07T08:00:00.000Z'}]);
    expect(() => chesscomRatings('x')).toThrow(/cannot read/);
  });
  it('games: only standard chess with this player; results by the API\'s codes; the opening from its address; newest first', () => {
    const games = chesscomGames({games: [ccGame(), ccGame({uuid: 'aaaa-2', end_time: 1791367200, time_class: 'blitz', white: {username: 'x', rating: 1450, result: 'agreed'}, black: {username: 'fictional_player', rating: 1444, result: 'agreed'}}),
      ccGame({uuid: 'aaaa-3', rules: 'chess960'}), ccGame({uuid: 'aaaa-4', white: {username: 'a', result: 'win'}, black: {username: 'b', result: 'checkmated'}})]}, 'fictional_player');
    expect(games.map(g => [g.id, g.control, g.color, g.result, g.opponentRating, g.opening])).toEqual([['aaaa-2', 'blitz', 'black', 'draw', 1450, 'Sicilian Defense 2.Nf3'], ['aaaa-1', 'rapid', 'white', 'win', 1490, 'Sicilian Defense 2.Nf3']]);
    expect(chesscomOpening('https://evil.example/openings/x')).toBeNull();
    expect(chesscomLatestArchive({archives: ['https://api.chess.com/pub/player/fictional_player/games/2026/09', 'https://api.chess.com/pub/player/fictional_player/games/2026/10', 'https://elsewhere.example/2026/11']}, 'Fictional_Player')).toBe('https://api.chess.com/pub/player/fictional_player/games/2026/10');
  });
});

describe('reading Lichess', () => {
  it('ratings only for perfs with games; a closed account says so', () => {
    expect(lichessRatings({username: 'fictional-li', perfs: {blitz: {games: 12, rating: 1580, rd: 60, prog: 4}, rapid: {games: 0, rating: 1500}, puzzle: {games: 30, rating: 1700}}}, AT).ratings.map(r => [r.control, r.rating])).toEqual([['blitz', 1580], ['puzzle', 1700]]);
    expect(lichessRatings({disabled: true}, AT)).toEqual({ratings: [], closed: true});
  });
  it('history: [year, month from 0, day, rating]; games from NDJSON: finished standard games only, the opening by name', () => {
    expect(lichessHistory([{name: 'Blitz', points: [[2026, 9, 6, 1570], [2026, 12, 1, 1]]}, {name: 'Chess960', points: [[2026, 9, 6, 1500]]}])).toEqual([{site: 'lichess', control: 'blitz', rating: 1570, at: '2026-10-06T12:00:00.000Z'}]);
    const games = lichessGames([liGame(), liGame({id: 'Zz000001', status: 'aborted'}), liGame({id: 'Zz000002', variant: 'chess960'}), liGame({id: 'Zz000003', status: 'stalemate', winner: undefined, speed: 'ultraBullet'}), 'not json'].join('\n'), 'Fictional-Li');
    expect(games.map(g => [g.id, g.control, g.color, g.result, g.opponentRating, g.opening, g.timeControl])).toEqual([['AbCdEf12', 'blitz', 'black', 'win', 1600, 'Italian Game', '3+2'], ['Zz000003', 'bullet', 'black', 'draw', 1600, 'Italian Game', '3+2']]);
  });
});

describe('asking the sites', () => {
  afterEach(() => resetChessPauses());
  const answer = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {status});
  it('chess.com: one request at a time, the username only in the address, the browser cache revalidating, no cookie or referrer', async () => {
    const calls: {url: string; init: RequestInit; overlapping: boolean}[] = [];
    let inFlight = 0;
    const fetcher: ChessFetch = async (url, init) => {
      calls.push({url, init, overlapping: inFlight > 0}); inFlight++;
      await new Promise(r => setTimeout(r, 5)); inFlight--;
      if (url.endsWith('/stats')) return answer(200, {chess_rapid: {last: {rating: 1512, date: 1791360000}}});
      if (url.endsWith('/archives')) return answer(200, {archives: ['https://api.chess.com/pub/player/fictional_player/games/2026/10']});
      return answer(200, {games: [ccGame()]});
    };
    const read = await readChesscom('Fictional_Player', fetcher, () => Date.parse(AT));
    expect(calls.map(c => c.url)).toEqual(['https://api.chess.com/pub/player/fictional_player/stats', 'https://api.chess.com/pub/player/fictional_player/games/archives', 'https://api.chess.com/pub/player/fictional_player/games/2026/10']);
    expect(calls.every(c => !c.overlapping && c.init.cache === 'no-cache' && c.init.credentials === 'omit' && c.init.referrerPolicy === 'no-referrer' && Object.keys(c.init.headers as object).join() === 'Accept')).toBe(true);
    expect(read.ratings).toHaveLength(1);
    expect(read.games).toHaveLength(1);
  });
  it('an unknown player, a refused username, and a 429 that pauses the site for a minute without retrying', async () => {
    await expect(readChesscom('nobody_here', async () => answer(404, {}))).rejects.toMatchObject({kind: 'not-found', message: 'No chess.com player is called nobody_here.'});
    await expect(readChesscom('a b', async () => answer(200, {}))).rejects.toBeInstanceOf(ChessSiteError);
    let asked = 0;
    const busy: ChessFetch = async () => { asked++; return answer(429, {}); };
    await expect(readLichess('fictional-li', busy, () => 1_000)).rejects.toMatchObject({kind: 'busy'});
    expect(sitePausedFor('lichess', 1_000)).toBe(60_000);
    await expect(readLichess('fictional-li', busy, () => 30_000)).rejects.toMatchObject({kind: 'busy', message: 'Lichess asked to wait. Try again in 31 seconds.'});
    expect(asked).toBe(1);
  });
  it('Lichess: the account, its history and its 50 newest games as NDJSON, one after another', async () => {
    const urls: string[] = [];
    const fetcher: ChessFetch = async (url, init) => {
      urls.push(`${url} ${(init.headers as Record<string, string>).Accept}`);
      if (url.endsWith('/rating-history')) return answer(200, [{name: 'Blitz', points: [[2026, 9, 6, 1570]]}]);
      if (url.includes('/api/games/')) return answer(200, `${liGame()}\n`);
      return answer(200, {username: 'fictional-li', perfs: {blitz: {games: 3, rating: 1580}}});
    };
    const read = await readLichess('fictional-li', fetcher, () => Date.parse(AT));
    expect(urls).toEqual(['https://lichess.org/api/user/fictional-li application/json', 'https://lichess.org/api/user/fictional-li/rating-history application/json', 'https://lichess.org/api/games/user/fictional-li?max=50&moves=false&tags=false&opening=true application/x-ndjson']);
    expect([read.ratings.length, read.history.length, read.games.length]).toEqual([1, 1, 1]);
  });
});

describe('on this device', () => {
  const game = (id: string, endedAt: string, over: Partial<ChessGame> = {}): ChessGame => ({site: 'lichess', id, url: `https://lichess.org/${id}`, endedAt, control: 'blitz', color: 'white', result: 'win', opponentRating: 1500, opening: null, timeControl: '3+2', rated: true, ...over});
  it('merging: a snapshot only for a new or changed rating, the site\'s history once, its newest games; forgetting a site', () => {
    let cache = mergeRead(emptyChessCache(), {site: 'lichess', ratings: [{site: 'lichess', control: 'blitz', rating: 1580, at: AT}], history: [{site: 'lichess', control: 'blitz', rating: 1570, at: '2026-10-06T12:00:00.000Z'}], games: [game('AbCdEf12', AT)], at: AT});
    cache = mergeRead(cache, {site: 'lichess', ratings: [{site: 'lichess', control: 'blitz', rating: 1580, at: AT}], history: [{site: 'lichess', control: 'blitz', rating: 1570, at: '2026-10-06T12:00:00.000Z'}], games: [game('AbCdEf12', AT)], at: AT});
    expect(cache.snapshots.map(s => s.rating)).toEqual([1570, 1580]);
    expect(currentRatings(cache)).toEqual([{site: 'lichess', control: 'blitz', rating: 1580, at: AT}]);
    expect(ratingLine(cache, 'lichess', 'blitz')).toEqual([{day: '2026-10-06', rating: 1570}, {day: '2026-10-07', rating: 1580}]);
    expect(cache.fetchedAt.lichess).toBe(AT);
    expect(forgetSite(cache, 'lichess')).toEqual(emptyChessCache());
  });
  it('results by colour and time control; a goal against the newest rating', () => {
    const r = results([game('a', AT), game('b', AT, {result: 'draw', color: 'black'}), game('c', AT, {result: 'loss', control: 'rapid'})]);
    expect(r).toEqual({total: {win: 1, draw: 1, loss: 1}, white: {win: 1, draw: 0, loss: 1}, black: {win: 0, draw: 1, loss: 0}, byControl: [{control: 'rapid', record: {win: 0, draw: 0, loss: 1}}, {control: 'blitz', record: {win: 1, draw: 1, loss: 0}}]});
    const cache = mergeRead(emptyChessCache(), {site: 'lichess', ratings: [{site: 'lichess', control: 'blitz', rating: 1580, at: AT}], history: [], games: [], at: AT});
    const goal = {id: '00000000-0000-4000-8000-000000000001', site: 'lichess' as const, control: 'blitz' as const, target: 1600, status: 'active' as const, createdAt: AT, updatedAt: AT};
    expect(goalProgress(cache, goal)).toEqual({rating: 1580, left: 20, reached: false});
    expect(goalProgress(cache, {...goal, control: 'rapid'})).toEqual({rating: null, left: null, reached: false});
  });
  it('usernames and the chess habit in settings v3; the habit ticked off once on a day a game ended, never again that day', () => {
    let s = setUsername(emptyDashboardSettings(), 'lichess', 'fictional-li', AT);
    expect(s.schemaVersion).toBe(3);
    expect(dashboardSettingsSchema.parse(s)).toEqual(s);
    const habitId = '59a35604-3696-4a78-b455-000000000009';
    // The habit journal is in UTC, as the games' times are written (Session Y Part 2: the machine's own zone no longer decides).
    const fresh = () => createHabit({...emptyHabitData(), timeZone: 'UTC'}, {title: 'Play a game', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1}, new Date('2026-10-01T08:00:00.000Z'), habitId);
    let habits = fresh();
    s = setChessHabit(s, habitId, AT);
    const now = new Date('2026-10-07T18:00:00.000Z');
    expect(chessCheckIn(habits, s, [game('a', '2026-10-05T10:00:00.000Z')], now)).toBeNull();
    const item = chessCheckIn(habits, s, [game('a', '2026-10-07T10:00:00.000Z')], now)!;
    expect(item.habitId).toBe(habitId);
    habits = applyChessCheckIn(habits, item, now);
    expect(habitDay(habits.habits[0]!, item.day, item.day).status).toBe('complete');
    s = markApplied(s, item.day, AT);
    expect(appliedOn(s, item.day)).toMatchObject({date: item.day});
    // Undone on the habit (the day is due again): the day's marker keeps chess from ticking it off a second time.
    expect(chessCheckIn(fresh(), s, [game('a', '2026-10-07T10:00:00.000Z')], now)).toBeNull();
    expect(setUsername(s, 'lichess', null, AT).chess).toEqual({version: 1, goals: [], habit: {id: habitId, at: AT}, applied: [{date: item.day, appliedAt: AT}]});
  });
});
