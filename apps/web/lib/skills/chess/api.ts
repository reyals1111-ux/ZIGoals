import {CHESSCOM_USERNAME, LICHESS_USERNAME, type ChessGame, type ChessSite} from './schema';
import {chesscomGames, chesscomLatestArchive, chesscomRatings, lichessGames, lichessHistory, lichessRatings, type Rating} from './parse';

/**
 * Asking chess.com and Lichess for a username's public ratings and recent games (Session W Part 14), browser to site,
 * as each documents (2026-10-07): one request at a time per site; chess.com's answers are revalidated by the browser's
 * own cache (its ETag, without a header of ours: chess.com's preflight allows none), and a 429 from either site pauses
 * that site for a minute with nothing retried by itself. Only the username leaves the device, in the address; no
 * cookie or referrer goes with it.
 */
export const CHESSCOM_API = 'https://api.chess.com/pub', LICHESS_ORIGIN = 'https://lichess.org';
export const WAIT_AFTER_429_MS = 60_000;
export type ChessFetch = (url: string, init: RequestInit) => Promise<Response>;
const browserFetch: ChessFetch = (url, init) => fetch(url, init);
export class ChessSiteError extends Error {
  constructor(readonly site: ChessSite, readonly kind: 'not-found' | 'closed' | 'busy' | 'offline' | 'unreadable', message: string) { super(message); }
}
const NAMES: Record<ChessSite, string> = {chesscom: 'chess.com', lichess: 'Lichess'};
const queues: Record<ChessSite, Promise<unknown>> = {chesscom: Promise.resolve(), lichess: Promise.resolve()};
const pausedUntil: Record<ChessSite, number> = {chesscom: 0, lichess: 0};
/** Runs one request after the site's previous one has finished (the documented rule for both sites). */
function oneAtATime<T>(site: ChessSite, work: () => Promise<T>): Promise<T> {
  const next = queues[site].then(work, work);
  queues[site] = next.catch(() => undefined);
  return next;
}
export const sitePausedFor = (site: ChessSite, now = Date.now()) => Math.max(0, pausedUntil[site] - now);
/** For tests: forget a pause. */
export const resetChessPauses = () => { pausedUntil.chesscom = 0; pausedUntil.lichess = 0; };
async function ask(site: ChessSite, url: string, fetcher: ChessFetch, accept: string, now: () => number): Promise<Response | null> {
  return oneAtATime(site, async () => {
    const wait = sitePausedFor(site, now());
    if (wait > 0) throw new ChessSiteError(site, 'busy', `${NAMES[site]} asked to wait. Try again in ${Math.ceil(wait / 1000)} seconds.`);
    let response: Response;
    try { response = await fetcher(url, {method: 'GET', headers: {Accept: accept}, cache: 'no-cache', credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors'}); }
    catch { throw new ChessSiteError(site, 'offline', `${NAMES[site]} could not be reached. Your saved ratings stay as they are.`); }
    if (response.status === 429) { pausedUntil[site] = now() + WAIT_AFTER_429_MS; throw new ChessSiteError(site, 'busy', `${NAMES[site]} asked to wait. Try again in a minute.`); }
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) throw new ChessSiteError(site, 'offline', `${NAMES[site]} answered with an error (${response.status}). Your saved ratings stay as they are.`);
    return response;
  });
}
async function json(site: ChessSite, response: Response): Promise<unknown> {
  try { return await response.json(); } catch { throw new ChessSiteError(site, 'unreadable', `${NAMES[site]} sent something this page cannot read.`); }
}
export type SiteRead = {site: ChessSite; ratings: Rating[]; history: Rating[]; games: ChessGame[]; at: string};
/** chess.com: the stats, then the newest month of games (two or three requests, one after another). */
export async function readChesscom(username: string, fetcher: ChessFetch = browserFetch, now: () => number = Date.now): Promise<SiteRead> {
  if (!CHESSCOM_USERNAME.test(username)) throw new ChessSiteError('chesscom', 'not-found', 'A chess.com username has 3 to 25 letters, digits, "_" or "-".');
  const user = encodeURIComponent(username.toLowerCase()), at = new Date(now()).toISOString();
  const stats = await ask('chesscom', `${CHESSCOM_API}/player/${user}/stats`, fetcher, 'application/json', now);
  if (!stats) throw new ChessSiteError('chesscom', 'not-found', `No chess.com player is called ${username}.`);
  const ratings = chesscomRatings(await json('chesscom', stats));
  const archives = await ask('chesscom', `${CHESSCOM_API}/player/${user}/games/archives`, fetcher, 'application/json', now);
  const latest = archives ? chesscomLatestArchive(await json('chesscom', archives), username) : null;
  const month = latest ? await ask('chesscom', latest, fetcher, 'application/json', now) : null;
  const games = month ? chesscomGames(await json('chesscom', month), username).slice(0, 50) : [];
  return {site: 'chesscom', ratings, history: [], games, at};
}
/** Lichess: the account, its rating history and its 50 newest games (three requests, one after another). */
export async function readLichess(username: string, fetcher: ChessFetch = browserFetch, now: () => number = Date.now): Promise<SiteRead> {
  if (!LICHESS_USERNAME.test(username)) throw new ChessSiteError('lichess', 'not-found', 'A Lichess username has 2 to 30 letters, digits, "_" or "-".');
  const user = encodeURIComponent(username), at = new Date(now()).toISOString();
  const account = await ask('lichess', `${LICHESS_ORIGIN}/api/user/${user}`, fetcher, 'application/json', now);
  if (!account) throw new ChessSiteError('lichess', 'not-found', `No Lichess player is called ${username}.`);
  const {ratings, closed} = lichessRatings(await json('lichess', account), at);
  if (closed) throw new ChessSiteError('lichess', 'closed', `The Lichess account ${username} is closed.`);
  const history = await ask('lichess', `${LICHESS_ORIGIN}/api/user/${user}/rating-history`, fetcher, 'application/json', now);
  const points = history ? lichessHistory(await json('lichess', history)) : [];
  const games = await ask('lichess', `${LICHESS_ORIGIN}/api/games/user/${user}?max=50&moves=false&tags=false&opening=true`, fetcher, 'application/x-ndjson', now);
  let text = '';
  if (games) { try { text = await games.text(); } catch { throw new ChessSiteError('lichess', 'unreadable', 'Lichess sent something this page cannot read.'); } }
  return {site: 'lichess', ratings, history: points, games: lichessGames(text, username), at};
}
