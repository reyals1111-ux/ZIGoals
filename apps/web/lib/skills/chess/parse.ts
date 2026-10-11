import type {ChessControl, ChessGame, ChessSite} from './schema';

/**
 * Readers for the two public sources Chess uses (Session W Part 14), from their own documentation (read 2026-10-07):
 * chess.com's Published-Data API (www.chess.com/news/view/published-data-api) and the Lichess API (lichess.org/api, its
 * OpenAPI files in github.com/lichess-org/api). Only standard chess is kept; a rating appears only where the source
 * gives one (a Lichess rating with no games played is the site's starting value, not the person's, so it is left out).
 */
export type Rating = {site: ChessSite; control: ChessControl; rating: number; at: string};
const iso = (ms: number) => new Date(ms).toISOString();
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const int = (v: unknown): number | null => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 4000 ? v : null;

/** chess.com /pub/player/{username}/stats: each time class's latest rating ("last": rating and its date in seconds). */
export function chesscomRatings(json: unknown): Rating[] {
  if (!isRecord(json)) throw Error('chess.com sent something this page cannot read.');
  const out: Rating[] = [];
  for (const control of ['rapid', 'blitz', 'bullet', 'daily'] as const) {
    const stat = json[`chess_${control}`], last = isRecord(stat) && isRecord(stat.last) ? stat.last : null;
    const rating = last ? int(last.rating) : null, date = last && typeof last.date === 'number' ? last.date : null;
    if (rating !== null && date !== null) out.push({site: 'chesscom', control, rating, at: iso(date * 1000)});
  }
  return out;
}
/** chess.com result codes (the API's own table): a draw is agreed, repetition, stalemate, insufficient, 50move or timevsinsufficient. */
const CHESSCOM_DRAWS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);
/** The opening's name from chess.com's opening address (".../openings/Sicilian-Defense-2.Nf3" → "Sicilian Defense 2.Nf3"). */
export function chesscomOpening(eco: unknown): string | null {
  if (typeof eco !== 'string') return null;
  const m = /^https:\/\/www\.chess\.com\/openings\/([^/?#]{1,160})$/.exec(eco);
  if (!m) return null;
  let name: string; try { name = decodeURIComponent(m[1]!); } catch { return null; }
  return name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || null;
}
/** chess.com /pub/player/{username}/games/{YYYY}/{MM}: that month's finished games, newest first. */
export function chesscomGames(json: unknown, username: string): ChessGame[] {
  if (!isRecord(json) || !Array.isArray(json.games)) throw Error('chess.com sent something this page cannot read.');
  const me = username.toLowerCase(), out: ChessGame[] = [];
  for (const g of json.games) {
    if (!isRecord(g) || g.rules !== 'chess' || !isRecord(g.white) || !isRecord(g.black) || typeof g.end_time !== 'number' || typeof g.url !== 'string') continue;
    const color = String(g.white.username).toLowerCase() === me ? 'white' : String(g.black.username).toLowerCase() === me ? 'black' : null;
    const control = g.time_class === 'rapid' || g.time_class === 'blitz' || g.time_class === 'bullet' || g.time_class === 'daily' ? g.time_class : null;
    if (!color || !control || !/^https:\/\/www\.chess\.com\/game\//.test(g.url)) continue;
    const own = String((color === 'white' ? g.white : g.black).result), opponent = color === 'white' ? g.black : g.white;
    out.push({site: 'chesscom', id: typeof g.uuid === 'string' && g.uuid ? g.uuid.slice(0, 120) : g.url.slice(-120), url: g.url.slice(0, 300), endedAt: iso(g.end_time * 1000), control, color,
      result: own === 'win' ? 'win' : CHESSCOM_DRAWS.has(own) ? 'draw' : 'loss', opponentRating: int(opponent.rating), opening: chesscomOpening(g.eco),
      timeControl: typeof g.time_control === 'string' ? g.time_control.slice(0, 40) : null, rated: g.rated === true});
  }
  return out.sort((a, b) => b.endedAt.localeCompare(a.endedAt));
}
/** chess.com /pub/player/{username}/games/archives: the newest monthly archive address, or null. */
export function chesscomLatestArchive(json: unknown, username: string): string | null {
  if (!isRecord(json) || !Array.isArray(json.archives)) throw Error('chess.com sent something this page cannot read.');
  const prefix = `https://api.chess.com/pub/player/${username.toLowerCase()}/games/`;
  const months = json.archives.filter((a): a is string => typeof a === 'string' && a.toLowerCase().startsWith(prefix) && /\/games\/\d{4}\/\d{2}$/.test(a));
  return months.length ? months.sort().at(-1)! : null;
}

const LICHESS_CONTROLS = {bullet: 'bullet', blitz: 'blitz', rapid: 'rapid', classical: 'classical', correspondence: 'correspondence', puzzle: 'puzzle'} as const;
/** Lichess /api/user/{username}: the perfs with at least one game played; a closed account says so. */
export function lichessRatings(json: unknown, at: string): {ratings: Rating[]; closed: boolean} {
  if (!isRecord(json)) throw Error('Lichess sent something this page cannot read.');
  if (json.disabled === true || json.tosViolation === true || json.closed === true) return {ratings: [], closed: true};
  const perfs = isRecord(json.perfs) ? json.perfs : {}, ratings: Rating[] = [];
  for (const [key, control] of Object.entries(LICHESS_CONTROLS)) {
    const perf = perfs[key], rating = isRecord(perf) ? int(perf.rating) : null;
    if (isRecord(perf) && rating !== null && typeof perf.games === 'number' && perf.games > 0) ratings.push({site: 'lichess', control, rating, at});
  }
  return {ratings, closed: false};
}
/** Lichess /api/user/{username}/rating-history: [year, month from 0, day, rating] per day, for the controls Chess follows. */
export function lichessHistory(json: unknown): Rating[] {
  if (!Array.isArray(json)) throw Error('Lichess sent something this page cannot read.');
  const names: Record<string, ChessControl> = {Bullet: 'bullet', Blitz: 'blitz', Rapid: 'rapid', Classical: 'classical', Correspondence: 'correspondence', Puzzles: 'puzzle'};
  const out: Rating[] = [];
  for (const entry of json) {
    if (!isRecord(entry) || typeof entry.name !== 'string' || !names[entry.name] || !Array.isArray(entry.points)) continue;
    for (const p of entry.points) {
      if (!Array.isArray(p) || p.length !== 4 || !p.every(n => typeof n === 'number' && Number.isInteger(n))) continue;
      const [y, m, d, r] = p as [number, number, number, number], rating = int(r);
      if (rating === null || m < 0 || m > 11 || d < 1 || d > 31) continue;
      out.push({site: 'lichess', control: names[entry.name]!, rating, at: iso(Date.UTC(y, m, d, 12))});
    }
  }
  return out;
}
/** Lichess /api/games/user/{username} as NDJSON (opening=true, moves=false): finished standard games, newest first. */
export function lichessGames(ndjson: string, username: string): ChessGame[] {
  const me = username.toLowerCase(), out: ChessGame[] = [];
  for (const line of ndjson.split('\n')) {
    if (!line.trim()) continue;
    let g: unknown; try { g = JSON.parse(line); } catch { continue; }
    if (!isRecord(g) || typeof g.id !== 'string' || !/^[A-Za-z0-9]{8}$/.test(g.id) || g.variant !== 'standard' || typeof g.lastMoveAt !== 'number' || !isRecord(g.players)) continue;
    if (['created', 'started', 'aborted', 'noStart'].includes(String(g.status))) continue;
    const white = isRecord(g.players.white) ? g.players.white : null, black = isRecord(g.players.black) ? g.players.black : null;
    const nameOf = (p: Record<string, unknown> | null) => p && isRecord(p.user) && typeof p.user.name === 'string' ? p.user.name.toLowerCase() : null;
    const color = nameOf(white) === me ? 'white' : nameOf(black) === me ? 'black' : null;
    const control = g.speed === 'ultraBullet' ? 'bullet' : (LICHESS_CONTROLS as Record<string, ChessControl>)[String(g.speed)] ?? null;
    if (!color || !control || control === 'puzzle') continue;
    const opponent = color === 'white' ? black : white, clock = isRecord(g.clock) ? g.clock : null;
    const timeControl = clock && typeof clock.initial === 'number' && typeof clock.increment === 'number' ? `${clock.initial / 60}+${clock.increment}` : typeof g.daysPerTurn === 'number' ? `${g.daysPerTurn} days a move` : null;
    out.push({site: 'lichess', id: g.id, url: `https://lichess.org/${g.id}`, endedAt: iso(g.lastMoveAt), control, color, result: g.winner === color ? 'win' : g.winner === 'white' || g.winner === 'black' ? 'loss' : 'draw',
      opponentRating: opponent ? int(opponent.rating) : null, opening: isRecord(g.opening) && typeof g.opening.name === 'string' ? g.opening.name.slice(0, 120) : null, timeControl, rated: g.rated === true});
  }
  return out.sort((a, b) => b.endedAt.localeCompare(a.endedAt));
}
