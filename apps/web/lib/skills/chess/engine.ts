import {chessCacheSchema, chessSettingsSchema, emptyChessSettings, type ChessCache, type ChessControl, type ChessGame, type ChessGoal, type ChessSettings, type ChessSite} from './schema';
import type {Rating} from './parse';
import type {SiteRead} from './api';
import {settingsGroupIn, withSettingsGroup} from '../../vault/w-homes';
import type {DashboardSettings} from '../../dashboard-settings';
import {habitCalendarDay, habitDay, habitRuleOn, logHabitValue, smartDoneValue, type HabitData} from '../../habits';

/**
 * Chess on ZIGoals (Session W Part 14): what the two sites said, kept on this device (`zigoals:chess-cache:v1`), and the
 * person's own choices in settings v3 `chess`. Ratings over time come from the sites' own history (Lichess) and from the
 * snapshots each refresh adds here; results are counted from the recent games as they are, by colour and time control.
 */
export const SITE_NAME: Record<ChessSite, string> = {chesscom: 'chess.com', lichess: 'Lichess'};
export const CONTROL_NAME: Record<ChessControl, string> = {rapid: 'Rapid', blitz: 'Blitz', bullet: 'Bullet', daily: 'Daily', classical: 'Classical', correspondence: 'Correspondence', puzzle: 'Puzzles'};
const dayOf = (iso: string) => iso.slice(0, 10);
/** Merges one site's answer: a snapshot per rating when it is new or changed, Lichess's daily history, its newest games. */
export function mergeRead(cache: ChessCache, read: SiteRead): ChessCache {
  const snapshots = [...cache.snapshots];
  const latest = (site: ChessSite, control: ChessControl) => snapshots.filter(s => s.site === site && s.control === control).sort((a, b) => b.at.localeCompare(a.at))[0];
  const add = (r: Rating) => {
    if (snapshots.some(s => s.site === r.site && s.control === r.control && dayOf(s.at) === dayOf(r.at) && s.rating === r.rating)) return;
    snapshots.push({site: r.site, control: r.control, rating: r.rating, at: r.at});
  };
  for (const point of read.history) add(point);
  for (const r of read.ratings) { const last = latest(r.site, r.control); if (!last || last.rating !== r.rating || dayOf(last.at) !== dayOf(r.at)) add({...r, at: read.at}); }
  const kept = snapshots.sort((a, b) => a.at.localeCompare(b.at)).slice(-3000);
  const games = [...read.games, ...cache.games.filter(g => g.site !== read.site)].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).slice(0, 200);
  return chessCacheSchema.parse({...cache, snapshots: kept, games, fetchedAt: {...cache.fetchedAt, [read.site]: read.at}});
}
/** Forgets what a site said (its username was removed or changed). */
export function forgetSite(cache: ChessCache, site: ChessSite): ChessCache {
  const {[site]: _gone, ...fetchedAt} = cache.fetchedAt; void _gone;
  return chessCacheSchema.parse({...cache, snapshots: cache.snapshots.filter(s => s.site !== site), games: cache.games.filter(g => g.site !== site), fetchedAt});
}
/** The newest rating per site and control. */
export function currentRatings(cache: ChessCache): {site: ChessSite; control: ChessControl; rating: number; at: string}[] {
  const best = new Map<string, ChessCache['snapshots'][number]>();
  for (const s of cache.snapshots) { const k = `${s.site}:${s.control}`, b = best.get(k); if (!b || s.at > b.at) best.set(k, s); }
  return [...best.values()].sort((a, b) => a.site.localeCompare(b.site) || CONTROLS_ORDER.indexOf(a.control) - CONTROLS_ORDER.indexOf(b.control));
}
const CONTROLS_ORDER: ChessControl[] = ['rapid', 'blitz', 'bullet', 'classical', 'daily', 'correspondence', 'puzzle'];
/** One rating's line over time, oldest first (at most one point a day: the day's last). */
export function ratingLine(cache: ChessCache, site: ChessSite, control: ChessControl): {day: string; rating: number}[] {
  const byDay = new Map<string, {at: string; rating: number}>();
  for (const s of cache.snapshots) if (s.site === site && s.control === control) { const d = dayOf(s.at), b = byDay.get(d); if (!b || s.at > b.at) byDay.set(d, {at: s.at, rating: s.rating}); }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({day, rating: v.rating}));
}
export type Record3 = {win: number; draw: number; loss: number};
/** Wins, draws and losses of the recent games, by colour and by time control (the games as fetched; no rating maths). */
export function results(games: readonly ChessGame[]): {total: Record3; white: Record3; black: Record3; byControl: {control: ChessControl; record: Record3}[]} {
  const zero = (): Record3 => ({win: 0, draw: 0, loss: 0}), total = zero(), white = zero(), black = zero(), control = new Map<ChessControl, Record3>();
  for (const g of games) {
    total[g.result]++; (g.color === 'white' ? white : black)[g.result]++;
    const r = control.get(g.control) ?? zero(); r[g.result]++; control.set(g.control, r);
  }
  return {total, white, black, byControl: [...control.entries()].sort(([a], [b]) => CONTROLS_ORDER.indexOf(a) - CONTROLS_ORDER.indexOf(b)).map(([c, record]) => ({control: c, record}))};
}
/** A rating goal against the newest rating on its site and control: how far, reached or not; nothing without a rating. */
export function goalProgress(cache: ChessCache, goal: ChessGoal): {rating: number | null; left: number | null; reached: boolean} {
  const now = currentRatings(cache).find(r => r.site === goal.site && r.control === goal.control)?.rating ?? null;
  return {rating: now, left: now === null ? null : Math.max(0, goal.target - now), reached: now !== null && now >= goal.target};
}

export const chessOf = (settings: DashboardSettings): ChessSettings | undefined => settingsGroupIn(settings, 'chess');
const startChess = (settings: DashboardSettings): ChessSettings => chessOf(settings) ?? emptyChessSettings();
/** Saves (or removes, with null) a site's username; the first username raises Today's settings to v3. */
export function setUsername(settings: DashboardSettings, site: ChessSite, username: string | null, at: string): DashboardSettings {
  const current = startChess(settings), {[site]: _old, ...rest} = current; void _old;
  const next = chessSettingsSchema.parse(username ? {...rest, [site]: {username: username.trim(), at}} : rest);
  return withSettingsGroup(settings, 'chess', next, !username && !chessOf(settings));
}
export function saveChessGoal(settings: DashboardSettings, goal: ChessGoal): DashboardSettings {
  const current = startChess(settings);
  return withSettingsGroup(settings, 'chess', chessSettingsSchema.parse({...current, goals: [...current.goals.filter(g => g.id !== goal.id), goal]}), false);
}
export function removeChessGoal(settings: DashboardSettings, id: string): DashboardSettings {
  const current = startChess(settings);
  return withSettingsGroup(settings, 'chess', chessSettingsSchema.parse({...current, goals: current.goals.filter(g => g.id !== id)}), false);
}
/** The habit chess ticks off (null: none). */
export function setChessHabit(settings: DashboardSettings, habitId: string | null, at: string): DashboardSettings {
  const current = startChess(settings), {habit: _old, ...rest} = current; void _old;
  return withSettingsGroup(settings, 'chess', chessSettingsSchema.parse(habitId ? {...rest, habit: {id: habitId, at}} : rest), !habitId && !chessOf(settings));
}
/** Whether a game ended on `day` (the habit's day, in its zone), so the chess habit can be ticked off that day. */
export const playedOn = (games: readonly ChessGame[], day: string, dayOfInstant: (iso: string) => string) => games.some(g => dayOfInstant(g.endedAt) === day);
/** Remembers a day chess ticked the habit off (or that the person undid it), so it happens once a day and never again after an undo. */
export function markApplied(settings: DashboardSettings, day: string, at: string, undone = false): DashboardSettings {
  const current = startChess(settings), applied = [...current.applied.filter(a => a.date !== day), {date: day, appliedAt: at, ...(undone ? {undone: true as const} : {})}].sort((a, b) => a.date.localeCompare(b.date)).slice(-2000);
  return withSettingsGroup(settings, 'chess', chessSettingsSchema.parse({...current, applied}), false);
}
export const appliedOn = (settings: DashboardSettings, day: string) => chessOf(settings)?.applied.find(a => a.date === day);
/**
 * The chess habit's automatic check-in: on a day a game of the person's ended (the habit's own day), a habit set in
 * Chess and still due that day is ticked off once, like Health's linked habits; a day already applied (or undone by the
 * person) is never applied again.
 */
export function chessCheckIn(habits: HabitData, settings: DashboardSettings, games: readonly ChessGame[], now: Date): {habitId: string; day: string} | null {
  const chess = chessOf(settings), habit = chess?.habit ? habits.habits.find(h => h.id === chess.habit!.id) : undefined;
  if (!chess || !habit) return null;
  const day = habitCalendarDay(habits, now);
  if (chess.applied.some(a => a.date === day) || !playedOn(games, day, iso => habitCalendarDay(habits, new Date(iso)))) return null;
  const rule = habitRuleOn(habit, day);
  if (!rule || rule.type !== 'build' || habitDay(habit, day, day).status !== 'due') return null;
  return {habitId: habit.id, day};
}
export function applyChessCheckIn(habits: HabitData, item: {habitId: string; day: string}, now: Date): HabitData {
  const habit = habits.habits.find(h => h.id === item.habitId), rule = habit ? habitRuleOn(habit, item.day) : undefined;
  if (!habit || !rule || rule.type !== 'build' || habitDay(habit, item.day, item.day).status !== 'due') return habits;
  return logHabitValue(habits, habit.id, item.day, smartDoneValue(rule), {note: 'Ticked off by Chess: a game ended today.'}, now);
}
