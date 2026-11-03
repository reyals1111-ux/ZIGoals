import type {MoneyLog} from '../money-log/schema';
import {emptyMoneyReview, markForReview, type MoneyReview} from '../money-review/review';

/**
 * Session AK (BUILD list 2 #9), for the lead to wire in lib/showcase-data.ts (`zigoals:money-review:v1`): the Showcase's
 * To review list, so "One at a time" has labelled example cards. It marks the three newest fictional expenses of the
 * Showcase money log (their notes already say SHOWCASE DATA); nothing about the entries changes.
 */
export function showcaseMoneyReview(log: MoneyLog): MoneyReview {
  const ids = log.entries.filter(e => e.kind === 'expense' && e.note?.includes('SHOWCASE DATA')).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 3).map(e => e.id);
  return markForReview(emptyMoneyReview(), ids);
}
