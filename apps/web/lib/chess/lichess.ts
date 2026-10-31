import * as z from 'zod';

/**
 * Session AK (ADR-036 Q8, lane C): Lichess's Board API from the browser with the person's own token (OpenAPI v2.0.178,
 * read 2026-10-31; docs/research/session-ak/FORMATS.md (c)). Every address is on https://lichess.org (already in the
 * app's connect-src); the token goes only there, in the Authorization header, never in an address; no cookie or referrer
 * goes with it. Lichess asks for one request at a time, so the short requests here queue one after another (the streams
 * and a waiting seek are long requests of their own); a 429 pauses them for a minute and nothing is retried by itself.
 */
export const LICHESS = 'https://lichess.org';
export const GAME_ID = /^[A-Za-z0-9]{8}$/, CHALLENGE_ID = /^[A-Za-z0-9]{8}$/, USERNAME = /^[A-Za-z0-9_-]{2,30}$/;
export const WAIT_AFTER_429_MS = 60_000;
export class LichessError extends Error {
  constructor(readonly kind: 'unauthorized' | 'busy' | 'refused' | 'not-found' | 'offline' | 'unreadable', message: string, readonly status?: number) { super(message); this.name = 'LichessError'; }
}
type Fetcher = typeof fetch;
let queue: Promise<unknown> = Promise.resolve(), pausedUntil = 0;
export const lichessPausedFor = (now = Date.now()) => Math.max(0, pausedUntil - now);
/** For tests: forget a pause and the queue. */
export const resetLichessQueue = () => { pausedUntil = 0; queue = Promise.resolve(); };
function oneAtATime<T>(work: () => Promise<T>): Promise<T> { const next = queue.then(work, work); queue = next.catch(() => undefined); return next; }
const MAX_BODY = 512 * 1024;
const short = (text: unknown) => typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, 160) : '';
export type CallOptions = {fetcher?: Fetcher; now?: () => number; signal?: AbortSignal; queued?: boolean; form?: Record<string, string | number | boolean>; method?: 'GET' | 'POST' | 'DELETE'};
/** One request to Lichess's API; its JSON answer (an empty object for an empty answer). */
export async function lichessCall(token: string | null, path: string, o: CallOptions = {}): Promise<Record<string, unknown>> {
  if (!/^\/api\/[A-Za-z0-9/_.-]+(\?[A-Za-z0-9=&_.-]*)?$/.test(path)) throw new LichessError('refused', 'That is not a Lichess address this page asks.');
  const now = o.now ?? Date.now, fetcher = o.fetcher ?? fetch;
  const work = async () => {
    const wait = lichessPausedFor(now());
    if (wait > 0) throw new LichessError('busy', `Lichess asked to wait. Try again in ${Math.ceil(wait / 1000)} seconds.`, 429);
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body: string | undefined;
    if (o.form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(Object.entries(o.form).map(([k, v]) => [k, String(v)])).toString(); }
    let response: Response;
    try { response = await fetcher(`${LICHESS}${path}`, {method: o.method ?? (o.form ? 'POST' : 'GET'), headers, ...(body !== undefined ? {body} : {}), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors', ...(o.signal ? {signal: o.signal} : {})}); }
    catch (error) { if (o.signal?.aborted) throw error; throw new LichessError('offline', 'Lichess could not be reached. Check your connection and try again.'); }
    let text = '';
    try { text = await response.text(); } catch (error) { if (o.signal?.aborted) throw error; throw new LichessError('unreadable', 'Lichess sent something this page cannot read.', response.status); }
    if (text.length > MAX_BODY) throw new LichessError('unreadable', 'Lichess sent more than this page reads.', response.status);
    let data: unknown = {};
    if (text.trim()) { try { data = JSON.parse(text); } catch { data = null; } }
    const said = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null;
    if (response.status === 401 || response.status === 403) throw new LichessError('unauthorized', 'Lichess no longer accepts this connection. Connect again.', response.status);
    if (response.status === 429) { pausedUntil = now() + WAIT_AFTER_429_MS; throw new LichessError('busy', 'Lichess asked to wait. Try again in a minute.', 429); }
    if (response.status === 404) throw new LichessError('not-found', short(said?.error) || 'Lichess does not know that game or player.', 404);
    if (response.status === 400) throw new LichessError('refused', short(said?.error) ? `Lichess said: ${short(said?.error)}` : 'Lichess refused that.', 400);
    if (!response.ok) throw new LichessError('offline', `Lichess answered with an error (${response.status}). Try again.`, response.status);
    if (!said) throw new LichessError('unreadable', 'Lichess sent something this page cannot read.', response.status);
    return said;
  };
  return o.queued === false ? work() : oneAtATime(work);
}

const name = z.string().max(40);
export const accountSchema = z.looseObject({id: z.string().min(1).max(40), username: name});
export type LichessAccount = {id: string; username: string};
export async function getAccount(token: string, o: CallOptions = {}): Promise<LichessAccount> {
  const parsed = accountSchema.safeParse(await lichessCall(token, '/api/account', o));
  if (!parsed.success) throw new LichessError('unreadable', 'Lichess sent an account this page cannot read.');
  return {id: parsed.data.id.toLowerCase(), username: parsed.data.username};
}
const nowPlayingSchema = z.looseObject({
  gameId: z.string().regex(GAME_ID), color: z.enum(['white', 'black']), isMyTurn: z.boolean().optional(), lastMove: z.string().max(5).optional(),
  opponent: z.looseObject({username: name.optional(), rating: z.number().int().min(0).max(4000).nullable().optional(), ai: z.number().int().min(1).max(8).nullable().optional()}).optional(),
  speed: z.string().max(20).optional(), rated: z.boolean().optional(), secondsLeft: z.number().nullable().optional(),
  variant: z.looseObject({key: z.string().max(30)}).optional(),
});
export type NowPlaying = {gameId: string; color: 'white' | 'black'; myTurn: boolean; opponent: string; opponentRating: number | null; speed: string; rated: boolean; variant: string};
/** The person's ongoing games (at most 50), each read on its own: one Lichess cannot be read is left out. */
export async function getPlaying(token: string, o: CallOptions = {}): Promise<NowPlaying[]> {
  const data = await lichessCall(token, '/api/account/playing?nb=50', o), list = Array.isArray(data.nowPlaying) ? data.nowPlaying.slice(0, 50) : [];
  return list.flatMap(item => {
    const p = nowPlayingSchema.safeParse(item); if (!p.success) return [];
    const g = p.data, ai = g.opponent?.ai;
    return [{gameId: g.gameId, color: g.color, myTurn: g.isMyTurn ?? false, opponent: ai ? `Lichess AI level ${ai}` : g.opponent?.username ?? 'Anonymous', opponentRating: g.opponent?.rating ?? null, speed: g.speed ?? '', rated: g.rated ?? false, variant: g.variant?.key ?? 'standard'}];
  });
}
const gameIdOk = (id: string) => { if (!GAME_ID.test(id)) throw new LichessError('refused', 'That is not a Lichess game id.'); };
export async function postMove(token: string, gameId: string, uci: string, o: CallOptions = {}): Promise<void> {
  gameIdOk(gameId); if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new LichessError('refused', 'That is not a move.');
  await lichessCall(token, `/api/board/game/${gameId}/move/${uci}`, {...o, method: 'POST'});
}
export async function resign(token: string, gameId: string, o: CallOptions = {}) { gameIdOk(gameId); await lichessCall(token, `/api/board/game/${gameId}/resign`, {...o, method: 'POST'}); }
export async function abortGame(token: string, gameId: string, o: CallOptions = {}) { gameIdOk(gameId); await lichessCall(token, `/api/board/game/${gameId}/abort`, {...o, method: 'POST'}); }
/** `yes` offers a draw or accepts the opponent's; `no` declines it. */
export async function draw(token: string, gameId: string, answer: 'yes' | 'no', o: CallOptions = {}) { gameIdOk(gameId); await lichessCall(token, `/api/board/game/${gameId}/draw/${answer}`, {...o, method: 'POST'}); }

/**
 * Clock presets. Lichess's Board API seeks allow rapid, classical and correspondence only, not bullet or blitz (Lichess
 * counts a game as rapid from 8 minutes of estimated time, minutes × 60 + 40 × increment, and classical from 25).
 */
export const CLOCKS = [
  {id: '10+0', minutes: 10, increment: 0, speed: 'Rapid'}, {id: '10+5', minutes: 10, increment: 5, speed: 'Rapid'}, {id: '15+10', minutes: 15, increment: 10, speed: 'Rapid'},
  {id: '30+0', minutes: 30, increment: 0, speed: 'Classical'}, {id: '30+20', minutes: 30, increment: 20, speed: 'Classical'},
] as const;
export type ClockId = typeof CLOCKS[number]['id'];
export const clockOf = (id: string) => CLOCKS.find(c => c.id === id) ?? CLOCKS[0];
export type SeekColor = 'random' | 'white' | 'black';
/**
 * A public seek. Lichess keeps it while the request stays open and closes the request when a game starts (it then
 * arrives on the event stream); aborting `signal` withdraws the seek. Not queued: it is a long request of its own.
 */
export async function seek(token: string, choice: {clock: string; rated: boolean}, signal: AbortSignal, fetcher: Fetcher = fetch): Promise<void> {
  const c = clockOf(choice.clock);
  const body = new URLSearchParams({rated: String(choice.rated), time: String(c.minutes), increment: String(c.increment), variant: 'standard', color: 'random'}).toString();
  let response: Response;
  try { response = await fetcher(`${LICHESS}/api/board/seek`, {method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded'}, body, signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors'}); }
  catch (error) { if (signal.aborted) throw error; throw new LichessError('offline', 'Lichess could not be reached. Check your connection and try again.'); }
  if (response.status === 401 || response.status === 403) throw new LichessError('unauthorized', 'Lichess no longer accepts this connection. Connect again.', response.status);
  if (response.status === 429) { pausedUntil = Date.now() + WAIT_AFTER_429_MS; throw new LichessError('busy', 'Lichess asked to wait. Try again in a minute.', 429); }
  if (response.status === 400) { const said = await response.json().catch(() => null) as {error?: unknown} | null; throw new LichessError('refused', short(said?.error) ? `Lichess said: ${short(said?.error)}` : 'Lichess refused that seek.', 400); }
  if (!response.ok) throw new LichessError('offline', `Lichess answered with an error (${response.status}). Try again.`, response.status);
  // Drain the (keep-alive only) answer until Lichess closes it: a game has started.
  try { const reader = response.body?.getReader(); if (reader) for (;;) { const {done} = await reader.read(); if (done) break; } } catch (error) { if (signal.aborted) throw error; }
}
/** Challenges a player by username, with a clock; the game starts on the event stream once they accept. */
export async function challengeUser(token: string, username: string, choice: {clock: string; rated: boolean; color: SeekColor}, o: CallOptions = {}): Promise<{id: string}> {
  if (!USERNAME.test(username)) throw new LichessError('refused', 'A Lichess username has 2 to 30 letters, digits, "_" or "-".');
  const c = clockOf(choice.clock);
  const data = await lichessCall(token, `/api/challenge/${encodeURIComponent(username)}`, {...o, form: {rated: choice.rated, 'clock.limit': c.minutes * 60, 'clock.increment': c.increment, color: choice.color, variant: 'standard'}});
  const id = (data.challenge as {id?: unknown} | undefined)?.id ?? data.id;
  if (typeof id !== 'string' || !CHALLENGE_ID.test(id)) throw new LichessError('unreadable', 'Lichess sent a challenge this page cannot read.');
  return {id};
}
/** A game against Lichess's own AI (levels 1–8): it starts at once. */
export async function challengeAi(token: string, choice: {level: number; clock: string; color: SeekColor}, o: CallOptions = {}): Promise<{id: string}> {
  const c = clockOf(choice.clock), level = Math.min(8, Math.max(1, Math.round(choice.level)));
  const data = await lichessCall(token, '/api/challenge/ai', {...o, form: {level, 'clock.limit': c.minutes * 60, 'clock.increment': c.increment, color: choice.color, variant: 'standard'}});
  if (typeof data.id !== 'string' || !GAME_ID.test(data.id)) throw new LichessError('unreadable', 'Lichess sent a game this page cannot read.');
  return {id: data.id};
}
export async function answerChallenge(token: string, id: string, accept: boolean, o: CallOptions = {}): Promise<void> {
  if (!CHALLENGE_ID.test(id)) throw new LichessError('refused', 'That is not a Lichess challenge id.');
  await lichessCall(token, `/api/challenge/${id}/${accept ? 'accept' : 'decline'}`, {...o, method: 'POST'});
}
/** Revokes the token at Lichess (DELETE /api/token); true when Lichess confirmed it. */
export async function revokeToken(token: string, fetcher: Fetcher = fetch): Promise<boolean> {
  try { const r = await fetcher(`${LICHESS}/api/token`, {method: 'DELETE', headers: {Authorization: `Bearer ${token}`}, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', mode: 'cors', signal: AbortSignal.timeout(15_000)}); return r.ok || r.status === 401; }
  catch { return false; }
}

/** Events from GET /api/stream/event that this page uses; anything else is ignored. */
const challengeSchema = z.looseObject({
  id: z.string().regex(CHALLENGE_ID), status: z.string().max(20).optional(),
  challenger: z.looseObject({id: z.string().max(40), name: name.optional(), rating: z.number().nullable().optional()}).nullable().optional(),
  destUser: z.looseObject({id: z.string().max(40)}).nullable().optional(),
  timeControl: z.looseObject({type: z.string().max(20), show: z.string().max(20).optional()}).optional(),
  rated: z.boolean().optional(), speed: z.string().max(20).optional(), variant: z.looseObject({key: z.string().max(30)}).optional(),
});
export type IncomingChallenge = {id: string; from: string; rating: number | null; clock: string; rated: boolean; variant: string};
export type LichessEvent = {type: 'gameStart' | 'gameFinish'; gameId: string} | {type: 'challenge'; challenge: IncomingChallenge | null; id: string} | {type: 'challengeGone'; id: string} | {type: 'other'};
export function readEvent(value: Record<string, unknown>, me: string): LichessEvent {
  const type = value.type;
  if (type === 'gameStart' || type === 'gameFinish') {
    const id = (value.game as {gameId?: unknown; id?: unknown} | undefined)?.gameId ?? (value.game as {id?: unknown} | undefined)?.id;
    return typeof id === 'string' && GAME_ID.test(id) ? {type, gameId: id} : {type: 'other'};
  }
  if (type === 'challenge' || type === 'challengeCanceled' || type === 'challengeDeclined') {
    const p = challengeSchema.safeParse(value.challenge);
    if (!p.success) return {type: 'other'};
    if (type !== 'challenge') return {type: 'challengeGone', id: p.data.id};
    const c = p.data, incoming = c.destUser?.id?.toLowerCase() === me && c.challenger?.id?.toLowerCase() !== me;
    return {type: 'challenge', id: c.id, challenge: incoming ? {id: c.id, from: c.challenger?.name ?? c.challenger?.id ?? 'Someone', rating: c.challenger?.rating ?? null, clock: c.timeControl?.show ?? c.speed ?? '', rated: c.rated ?? false, variant: c.variant?.key ?? 'standard'} : null};
  }
  return {type: 'other'};
}
export const gameUrl = (gameId: string) => `${LICHESS}/${GAME_ID.test(gameId) ? gameId : ''}`;
