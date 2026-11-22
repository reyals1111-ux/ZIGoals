import type {DeviceRecordSpec} from '../device-record';
import {BUDGETS_BUSINESS_KEY_LITERAL, MONEY_LOG_BUSINESS_KEY_LITERAL} from '../av2-money-r2-keys';
import {MONEY_LOG, moneyLogSchema, emptyMoneyLog, type MoneyLog} from '../money-log/schema';
import {BUDGETS, budgetsSchema, emptyBudgets, type BudgetsRecord} from '../budgets/schema';
import type {MoneyMore} from './schema';

/**
 * Session AV lane 2, round 2 (money; Emma's Spaces), TIER 3 (stored format): the business space keeps its own money log
 * and budgets in two NEW device records of the same formats, so the personal records — and every reader of them (Today,
 * NOVA and ZIGi, insights, notices, Export) — stay exactly as they were. Only Spending and Budgets on Wealth switch.
 */
export type MoneySpace = 'personal' | 'business';
export const MONEY_LOG_BUSINESS: DeviceRecordSpec<MoneyLog> = {key: MONEY_LOG_BUSINESS_KEY_LITERAL, schema: moneyLogSchema, empty: emptyMoneyLog};
export const BUDGETS_BUSINESS: DeviceRecordSpec<BudgetsRecord> = {key: BUDGETS_BUSINESS_KEY_LITERAL, schema: budgetsSchema, empty: emptyBudgets};
export const logSpec = (space: MoneySpace) => space === 'business' ? MONEY_LOG_BUSINESS : MONEY_LOG;
export const budgetsSpec = (space: MoneySpace) => space === 'business' ? BUDGETS_BUSINESS : BUDGETS;
/** The space shown: business only while the business space exists and was chosen. */
export const spaceOf = (more: Pick<MoneyMore, 'space' | 'business'> | null | undefined): MoneySpace => more?.business && more.space === 'business' ? 'business' : 'personal';
export const spaceName = (more: Pick<MoneyMore, 'business'> | null | undefined, space: MoneySpace) => space === 'business' ? more?.business?.name ?? 'Business' : 'Personal';
/**
 * Starts the business space and shows it, or renames it. Review b2a #10: a rename keeps the space shown as it was (renaming
 * from Personal stays on Personal); only starting the space switches to it.
 */
export function withBusiness(more: MoneyMore, name: string): MoneyMore {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 30);
  if (!clean) throw new Error('Give the space a name, for example Business or Studio.');
  if (clean.toLowerCase() === 'personal') throw new Error('Personal is your own space already: choose another name.');
  return more.business ? {...more, business: {...more.business, name: clean}} : {...more, business: {name: clean}, space: 'business'};
}
export function showSpace(more: MoneyMore, space: MoneySpace): MoneyMore {
  const {space: _s, ...rest} = more; void _s;
  return space === 'business' && more.business ? {...rest, space: 'business'} : rest;
}
/** Ends the business space's switch (its own records stay on the device until the person erases them). */
export function withoutBusiness(more: MoneyMore): MoneyMore {
  const {space: _s, business: _b, ...rest} = more; void _s; void _b;
  return rest;
}
