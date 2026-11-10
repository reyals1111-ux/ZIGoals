import {addDays} from '../../zone-time';
import {chessCacheSchema, chessSettingsSchema, type ChessCache, type ChessGame, type ChessSettings} from './schema';

/**
 * The Showcase's chess (Session W Part 14): fictional usernames that are never sent (the Showcase asks no site), a
 * month of fictional ratings on both sites and twelve fictional games, so the Chess page and its Today card show
 * everything. Deterministic: the same day always gives the same sample.
 */
export function showcaseChess(day: string, now: number = Date.now()): {settings: ChessSettings; cache: ChessCache} {
  // Session AL sweep 2 (P-PR-09; PR-009, PR-108, BUG-037): a time on the open day is never later than now (opened before
  // 07:00, a game had "ended" in the future). Earlier days keep their fixed hours, and so does a day that has not begun
  // anywhere yet (more than 14 h ahead of UTC midnight), so a sample built for another day stays the same.
  const opened = now >= Date.parse(`${day}T00:00:00.000Z`) - 14 * 3_600_000;
  const at = (d: string, h = 19) => { const stamp = `${d}T${String(h).padStart(2, '0')}:00:00.000Z`; return opened && d === day && Date.parse(stamp) > now ? new Date(now).toISOString() : stamp; };
  const snapshots = Array.from({length: 30}, (_, i) => addDays(day, i - 29)).flatMap((d, i) => [
    {site: 'chesscom' as const, control: 'rapid' as const, rating: 1460 + Math.round(i * 1.8) + (i % 4 === 1 ? -9 : 0), at: at(d, 6)},
    {site: 'lichess' as const, control: 'blitz' as const, rating: 1612 + Math.round(i * 1.1) + (i % 3 === 2 ? -12 : 0), at: at(d, 6)},
  ]);
  const openings = ['Italian Game', 'Sicilian Defense', 'Queen\'s Gambit Declined', 'Caro-Kann Defense'];
  const games: ChessGame[] = Array.from({length: 12}, (_, i) => {
    const site = i % 3 === 0 ? 'lichess' as const : 'chesscom' as const, d = addDays(day, -Math.floor(i / 2));
    return {site, id: `showcase-${i}`, url: site === 'lichess' ? 'https://lichess.org/' : 'https://www.chess.com/', endedAt: at(d, 7 + (i % 2)), control: site === 'lichess' ? 'blitz' : 'rapid', color: i % 2 ? 'black' : 'white',
      result: i % 5 === 3 ? 'draw' : i % 3 === 1 ? 'loss' : 'win', opponentRating: 1450 + ((i * 37) % 160), opening: openings[i % openings.length]!, timeControl: site === 'lichess' ? '3+2' : '10+0', rated: true};
  });
  return {
    settings: chessSettingsSchema.parse({version: 1, chesscom: {username: 'showcase-rapid', at: at(addDays(day, -29))}, lichess: {username: 'showcase-blitz', at: at(addDays(day, -29))}, goals: [{id: '94000000-0000-4000-8000-000000000001', site: 'chesscom', control: 'rapid', target: 1600, status: 'active', createdAt: at(addDays(day, -29)), updatedAt: at(addDays(day, -29))}], applied: []}),
    cache: chessCacheSchema.parse({version: 1, snapshots, games, etags: {}, fetchedAt: {chesscom: at(day, 8), lichess: at(day, 8)}}),
  };
}
