import {afterEach, describe, expect, it} from 'vitest';
import {answerChallenge, challengeAi, challengeUser, draw, getAccount, getPlaying, LichessError, lichessCall, lichessPausedFor, postMove, readEvent, resetLichessQueue, resign, seek} from './lichess';

// Session AK (lane C): Lichess's Board API as documented (OpenAPI v2.0.178), with MOCK answers; fictional names.
type Call = {url: string; init: RequestInit; overlapping: boolean};
function mock(answer: (url: string, init: RequestInit) => Response) {
  const calls: Call[] = []; let inFlight = 0;
  const fetcher = (async (url: string, init: RequestInit) => { calls.push({url, init, overlapping: inFlight > 0}); inFlight++; await new Promise(r => setTimeout(r, 3)); inFlight--; return answer(url, init); }) as typeof fetch;
  return {calls, fetcher};
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status});
const TOKEN = 'lio_FixtureToken01';
afterEach(() => resetLichessQueue());

describe('the Board API client', () => {
  it('every request goes to https://lichess.org with the token in the header, one at a time, without cookie or referrer', async () => {
    const {calls, fetcher} = mock(url => url.endsWith('/api/account') ? json({id: 'Fictional-Me', username: 'Fictional-Me'}) : json({ok: true}));
    const [account] = await Promise.all([getAccount(TOKEN, {fetcher}), postMove(TOKEN, 'GaMe0001', 'e2e4', {fetcher}), resign(TOKEN, 'GaMe0001', {fetcher}), draw(TOKEN, 'GaMe0001', 'yes', {fetcher})]);
    expect(account).toEqual({id: 'fictional-me', username: 'Fictional-Me'});
    expect(calls.map(c => `${c.init.method} ${c.url}`)).toEqual(['GET https://lichess.org/api/account', 'POST https://lichess.org/api/board/game/GaMe0001/move/e2e4', 'POST https://lichess.org/api/board/game/GaMe0001/resign', 'POST https://lichess.org/api/board/game/GaMe0001/draw/yes']);
    for (const c of calls) {
      expect(c.overlapping).toBe(false);
      expect(c.init).toMatchObject({credentials: 'omit', referrerPolicy: 'no-referrer', headers: {Authorization: `Bearer ${TOKEN}`}});
      expect(c.url).not.toContain(TOKEN);
    }
  });
  it('a refused move says Lichess\'s reason; 401 asks to connect again; a 429 pauses everything for a minute', async () => {
    const refused = mock(() => json({error: 'Not your turn, or game already over'}, 400));
    await expect(postMove(TOKEN, 'GaMe0001', 'e2e4', {fetcher: refused.fetcher})).rejects.toMatchObject({kind: 'refused', message: 'Lichess said: Not your turn, or game already over'});
    const gone = mock(() => json({error: 'No such token'}, 401));
    await expect(getAccount(TOKEN, {fetcher: gone.fetcher})).rejects.toMatchObject({kind: 'unauthorized'});
    const busy = mock(() => json({}, 429));
    await expect(resign(TOKEN, 'GaMe0001', {fetcher: busy.fetcher, now: () => 1000})).rejects.toMatchObject({kind: 'busy'});
    expect(lichessPausedFor(1000)).toBe(60_000);
    await expect(resign(TOKEN, 'GaMe0001', {fetcher: busy.fetcher, now: () => 30_000})).rejects.toThrow(/31 seconds/);
    expect(busy.calls).toHaveLength(1);
  });
  it('refuses ids, moves and paths that are not Lichess\'s before sending anything', async () => {
    const {calls, fetcher} = mock(() => json({}));
    await expect(postMove(TOKEN, '../evil', 'e2e4', {fetcher})).rejects.toBeInstanceOf(LichessError);
    await expect(postMove(TOKEN, 'GaMe0001', 'e2e4/../../x', {fetcher})).rejects.toBeInstanceOf(LichessError);
    await expect(challengeUser(TOKEN, 'a b', {clock: '10+0', rated: false, color: 'random'}, {fetcher})).rejects.toBeInstanceOf(LichessError);
    await expect(lichessCall(TOKEN, 'https://elsewhere.example/api', {fetcher})).rejects.toBeInstanceOf(LichessError);
    await expect(answerChallenge(TOKEN, 'x', true, {fetcher})).rejects.toBeInstanceOf(LichessError);
    expect(calls).toEqual([]);
  });
  it('the ongoing games: each read on its own; one that does not read is left out', async () => {
    const {fetcher} = mock(() => json({nowPlaying: [
      {gameId: 'GaMe0001', fullId: 'GaMe0001abcd', color: 'white', isMyTurn: true, lastMove: 'e7e5', opponent: {id: 'fictional-rival', username: 'Fictional-Rival', rating: 1510}, speed: 'rapid', rated: false, variant: {key: 'standard', name: 'Standard'}},
      {gameId: 'GaMe0002', color: 'black', isMyTurn: false, opponent: {id: null, username: 'A.I. level 3', ai: 3}, speed: 'rapid', variant: {key: 'standard'}},
      {gameId: 'bad id', color: 'white'},
    ]}));
    expect(await getPlaying(TOKEN, {fetcher})).toEqual([
      {gameId: 'GaMe0001', color: 'white', myTurn: true, opponent: 'Fictional-Rival', opponentRating: 1510, speed: 'rapid', rated: false, variant: 'standard'},
      {gameId: 'GaMe0002', color: 'black', myTurn: false, opponent: 'Lichess AI level 3', opponentRating: null, speed: 'rapid', rated: false, variant: 'standard'},
    ]);
  });
  it('challenges: a friend by username and the Lichess AI, with the clock as form fields', async () => {
    const {calls, fetcher} = mock(url => url.endsWith('/ai') ? json({id: 'AiGame01', status: {name: 'started'}}) : json({challenge: {id: 'ChAl0001', url: 'https://lichess.org/ChAl0001'}}));
    expect(await challengeUser(TOKEN, 'Fictional-Friend', {clock: '15+10', rated: true, color: 'white'}, {fetcher})).toEqual({id: 'ChAl0001'});
    expect(await challengeAi(TOKEN, {level: 12, clock: '10+0', color: 'random'}, {fetcher})).toEqual({id: 'AiGame01'});
    expect(calls[0]!.url).toBe('https://lichess.org/api/challenge/Fictional-Friend');
    expect(Object.fromEntries(new URLSearchParams(String(calls[0]!.init.body)))).toEqual({rated: 'true', 'clock.limit': '900', 'clock.increment': '10', color: 'white', variant: 'standard'});
    expect(Object.fromEntries(new URLSearchParams(String(calls[1]!.init.body)))).toMatchObject({level: '8', 'clock.limit': '600'});
  });
  it('a seek is rapid or classical, stays open until a game starts, and is withdrawn by aborting', async () => {
    let body = '';
    const fetcher = (async (url: string, init: RequestInit) => {
      body = String(init.body);
      return new Response(new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode('\n')); init.signal!.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError'))); }}), {status: 200});
    }) as typeof fetch;
    const controller = new AbortController(), running = seek(TOKEN, {clock: '30+20', rated: false}, controller.signal, fetcher);
    await new Promise(r => setTimeout(r, 5));
    controller.abort();
    await expect(running).rejects.toThrow();
    expect(Object.fromEntries(new URLSearchParams(body))).toMatchObject({time: '30', increment: '20', rated: 'false'});
    const done = (async () => new Response('\n\n', {status: 200})) as unknown as typeof fetch;
    await expect(seek(TOKEN, {clock: '10+0', rated: true}, new AbortController().signal, done)).resolves.toBeUndefined();
  });
  it('events: game start and finish, challenges to the person, and challenges gone', () => {
    expect(readEvent({type: 'gameStart', game: {gameId: 'GaMe0001', color: 'white'}}, 'fictional-me')).toEqual({type: 'gameStart', gameId: 'GaMe0001'});
    expect(readEvent({type: 'gameFinish', game: {gameId: 'GaMe0001'}}, 'fictional-me')).toEqual({type: 'gameFinish', gameId: 'GaMe0001'});
    const c = {id: 'ChAl0001', status: 'created', challenger: {id: 'fictional-friend', name: 'Fictional-Friend', rating: 1600}, destUser: {id: 'fictional-me'}, timeControl: {type: 'clock', show: '15+10'}, rated: false, variant: {key: 'standard'}};
    expect(readEvent({type: 'challenge', challenge: c}, 'fictional-me')).toEqual({type: 'challenge', id: 'ChAl0001', challenge: {id: 'ChAl0001', from: 'Fictional-Friend', rating: 1600, clock: '15+10', rated: false, variant: 'standard'}});
    expect(readEvent({type: 'challenge', challenge: {...c, challenger: {id: 'fictional-me'}, destUser: {id: 'fictional-friend'}}}, 'fictional-me')).toMatchObject({challenge: null});
    expect(readEvent({type: 'challengeDeclined', challenge: c}, 'fictional-me')).toEqual({type: 'challengeGone', id: 'ChAl0001'});
    expect(readEvent({type: 'gameStart', game: {gameId: 'nope'}}, 'x')).toEqual({type: 'other'});
  });
});
