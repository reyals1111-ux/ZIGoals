import {calendarDay} from '../../visual-format';
import {MAX_ASKS, asksOf, novaStageSchema, type NovaAsk, type NovaStage} from './record';

/**
 * Session AM (ADR-038 D16, D19; art direction §3 "what was asked"): how the right bar reads the request history of the
 * stage record — newest first, split into Today and Earlier by the device's own calendar day — and how a forgotten request
 * comes back on Undo. Pure; the record's own `forgetAsk` / `forgetAsks` do the forgetting.
 */
export type AskGroups = {today: NovaAsk[]; earlier: NovaAsk[]};
/** The requests newest first, split by the calendar day of `now` (an instant or a day key; in `timeZone`, the device's by default). */
export function groupAsks(r: NovaStage, now: Date | number | string, timeZone?: string): AskGroups {
  const day = calendarDay(now, timeZone), sorted = [...asksOf(r)].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return {today: sorted.filter(a => calendarDay(a.at, timeZone) === day), earlier: sorted.filter(a => calendarDay(a.at, timeZone) !== day)};
}
/**
 * Puts forgotten requests back (Undo): each returns once, beside whatever was asked since, newest first, within the
 * record's own bound. A request that is in the list again (asked or restored meanwhile) is not doubled.
 */
export function restoreAsks(r: NovaStage, forgotten: readonly NovaAsk[]): NovaStage {
  if (!forgotten.length) return r;
  const have = new Set(asksOf(r).map(a => a.id)), back = forgotten.filter(a => !have.has(a.id));
  if (!back.length) return r;
  const asks = [...asksOf(r), ...back].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX_ASKS);
  return novaStageSchema.parse({...r, asks});
}
