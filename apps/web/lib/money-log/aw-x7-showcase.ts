import {addLocalDays} from '../local-date';
import {stepDue} from '../bills/cadence';
import {billsSchema, BILLS_KEY} from '../bills/schema';
import {MONEY_REMOVED_KEY, moneyRemovedSchema} from './removed';
import {WEALTH_SHEET_KEY, wealthSheetSchema} from '../wealth-sheet/schema';

/**
 * Session AW, round 7 X7 (money; Cashew, Money Manager): the Showcase's labelled examples of this group's features, in each
 * record's own format, in this tab's Showcase storage only (lib/showcase-data.ts calls it after the bills and accounts):
 * - #461: two fictional entries in Removed recently, removed two and nine days ago (notes "· SHOWCASE DATA");
 * - #462: the Showcase's Music bill ends after 24 payments, three of them still to come ("3 of 24 left");
 * - #464: the Showcase credit card keeps a statement day (the 5th) and a due day (the 25th), so its row shows how its
 *   next payment is worked out; the Showcase's entries are in EUR and the card in USD, so it says plainly that no entry
 *   is on the card yet (unknown is never shown as 0).
 * Additive: no existing Showcase figure (totals, bills due in the next 60 days, the month's bills) changes.
 */
export const SHOWCASE_CARD_ID = '93000000-0000-4000-8000-000000000005';
export function withX7Showcase(records: Record<string, string>, day: string): void {
  const removedAt = (days: number) => `${addLocalDays(day, -days)}T18:00:00.000Z`;
  records[MONEY_REMOVED_KEY] = JSON.stringify(moneyRemovedSchema.parse({version: 1, items: [
    {space: 'personal', removedAt: removedAt(9), entry: {id: 'showcase-removed-1', kind: 'expense', amount: '6.40', currency: 'EUR', category: 'Food & drink', note: 'Bakery (logged twice) · SHOWCASE DATA', date: addLocalDays(day, -10), createdAt: removedAt(10), source: 'form'}},
    {space: 'personal', removedAt: removedAt(2), entry: {id: 'showcase-removed-2', kind: 'expense', amount: '19.90', currency: 'EUR', category: 'Shopping', note: 'Phone case · SHOWCASE DATA', date: addLocalDays(day, -3), createdAt: removedAt(3), source: 'form', parts: [{amount: '14.90', category: 'Shopping'}, {amount: '5.00', category: 'Gifts'}]}},
  ]}));
  if (records[BILLS_KEY]) {
    const bills = billsSchema.parse(JSON.parse(records[BILLS_KEY]));
    records[BILLS_KEY] = JSON.stringify(billsSchema.parse({...bills, bills: bills.bills.map(b => b.id === 'showcase-bill-music' ? {...b, ends: {after: 24, from: stepDue(b.nextDue, b.cadence, -21)}} : b)}));
  }
  const sheet = records[WEALTH_SHEET_KEY] ? wealthSheetSchema.parse(JSON.parse(records[WEALTH_SHEET_KEY])) : {version: 1 as const};
  records[WEALTH_SHEET_KEY] = JSON.stringify(wealthSheetSchema.parse({...sheet, cards: {...(sheet.cards ?? {}), [SHOWCASE_CARD_ID]: {statementDay: 5, dueDay: 25}}}));
}
