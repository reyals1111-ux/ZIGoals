import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3 competitor gap, ADR-034): the expense and income log with a weekly "room to spend", TIER 3 (stored
 * format). A new device-only key, loose and versioned, so a later field never makes this build refuse the record and older
 * builds simply do not read it. Amounts are decimal strings in the entry's own currency (two decimals), never converted.
 * In Export everything and the encrypted backup; not synced (ADR-034 N18).
 */
export const MONEY_LOG_KEY = 'zigoals:money-log:v1';
export const EXPENSE_CATEGORIES = ['Food & drink', 'Groceries', 'Transport', 'Home', 'Bills', 'Subscriptions', 'Health', 'Fun', 'Shopping', 'Gifts', 'Other'] as const;
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Refund', 'Other income'] as const;
export const MAX_ENTRIES = 10_000, AMOUNT_MAX = 1_000_000_000;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const amountText = z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v => Number(v) > 0 && Number(v) <= AMOUNT_MAX, 'An amount above zero and at most a billion.');
export const currencyCode = z.string().regex(/^[A-Z]{3}$/);
/**
 * Session AK (lane M, item 22): one part of an entry split by category and/or Goal. OPTIONAL and additive on the loose
 * entry (older builds keep it untouched, since the entry is a loose object, and count the entry whole). One part links
 * the whole amount to a Goal; two to five split it. The sum is checked where it is read (lib/money-split): parts whose
 * sum is not exactly the entry's amount are ignored there and the entry counts whole. A malformed list reads as none,
 * so it never makes the log unreadable.
 */
export const MAX_PARTS = 5;
export const moneyPartSchema = z.looseObject({
  amount: amountText,
  category: z.string().trim().min(1).max(40).optional(),
  goalId: z.string().regex(/^\d{1,80}$/).optional(),
});
export type MoneyPart = z.infer<typeof moneyPartSchema>;
export const moneyEntrySchema = z.looseObject({
  id, kind: z.enum(['expense', 'income']), amount: amountText, currency: currencyCode,
  category: z.string().trim().min(1).max(40), note: z.string().trim().max(200).optional(), date: day,
  createdAt: z.iso.datetime({offset: true}),
  /** Where it came from: the person's own form, ZIGi's card, or a quick line. */
  source: z.enum(['form', 'zigi', 'quick']).optional(),
  /** Session AK (lane M, item 22): the entry's parts (see moneyPartSchema); none: the entry counts whole. */
  parts: z.array(moneyPartSchema).min(1).max(MAX_PARTS).optional().catch(undefined),
  /**
   * Session AV lane 2 (money; YNAB's credit-card interest, Rocket Money's "ignore", Monarch's exclude), TIER 3 (stored
   * format), each additive and optional, dropped on read when this build cannot read it (older builds keep them untouched
   * in the loose entry and simply count the entry as before):
   * - `excluded`: "not part of my spending" — the entry stays in the log and in search, but no total, budget or insight
   *   counts it;
   * - `taxDeductible`: the person's own mark, for their records (ZIGoals gives no tax advice);
   * - `spread`: the number of months (2–24) budgets spread this expense over, from its own month (a yearly insurance
   *   at a twelfth a month); totals of the month it was paid in still show it whole;
   * - `account`: the account a bank file named (as the file wrote it, at most 40 characters);
   * - `ref`: the bank's reference of the imported row, so a re-import can find the row it came from;
   * - `transfer`: the id of the entry on the other side of a card payment or a move between accounts; both are left out
   *   of spending and income;
   * - `history`: the last 20 changes to the entry (what changed, from what, to what, and who: you, a rule, a change to
   *   several at once, or a re-import).
   */
  excluded: z.literal(true).optional().catch(undefined),
  taxDeductible: z.literal(true).optional().catch(undefined),
  spread: z.number().int().min(2).max(24).optional().catch(undefined),
  account: z.string().trim().min(1).max(40).optional().catch(undefined),
  ref: z.string().trim().min(1).max(140).optional().catch(undefined),
  transfer: id.optional().catch(undefined),
  /**
   * Session AV lane 2, round 2 (money; Wallet's payment types, Emma's subcategories, Emma's split, Emma's unusual-entry
   * alert), TIER 3 (stored format), each additive and optional, dropped on read when this build cannot read it (older
   * builds keep them untouched in the loose entry and count the entry whole in its main category, as before):
   * - `paidWith`: how it was paid (cash, debit card, credit card, transfer, other), the person's own choice;
   * - `sub`: the person's own subcategory under the entry's `category` (Food & drink › Coffee); totals and budgets roll
   *   it up into the main category;
   * - `share`: the person's own share of a cost paid for others too (at most the amount; checked where read); spending
   *   figures and budgets count this share, the log keeps what was paid;
   * - `fine`: "That's fine" on an entry the unusual-entry line named, so it is not named again.
   */
  paidWith: z.enum(['cash', 'debit', 'credit', 'transfer', 'other']).optional().catch(undefined),
  sub: z.string().trim().min(1).max(40).optional().catch(undefined),
  share: amountText.optional().catch(undefined),
  fine: z.literal(true).optional().catch(undefined),
  /**
   * Session AV lane 2, round 4 (money; Actual's reconcile, Lunch Money's grouped transactions), TIER 3 (stored format),
   * each additive and optional, dropped on read when this build cannot read it (older builds keep them untouched in the
   * loose entry and count the entry exactly as before):
   * - `checked`: the statement day the person checked this entry against their bank ("Check against my bank");
   * - `group`: the group the entry belongs to (an id and the person's name for it, at most 20 entries a group), shown
   *   as one line; every total, budget and report still counts each entry on its own.
   */
  checked: day.optional().catch(undefined),
  group: z.looseObject({id, name: z.string().trim().min(1).max(40)}).optional().catch(undefined),
  /**
   * Session AV lane 2, round 6 (money; Banktivity's refund, LEDGER #425), TIER 3 (stored format), each additive and
   * optional, dropped on read when this build cannot read it (older builds keep them untouched in the loose entry):
   * - `refund`: on an entry written as income (`kind: 'income'`) in an expense category — money back for a purchase. Every
   *   figure of this build counts it as spending below zero in that category (lib/money-log/counted.ts `isRefund`), never
   *   as income; an older build reads it as money received, as before;
   * - `refundOf`: the id of the purchase it refunds (the person's own link; nothing is counted by it).
   */
  refund: z.literal(true).optional().catch(undefined),
  refundOf: id.optional().catch(undefined),
  history: z.array(z.looseObject({
    at: z.iso.datetime({offset: true}), by: z.enum(['you', 'rule', 'bulk', 'import']),
    field: z.enum(['category', 'amount', 'date', 'note', 'excluded', 'spread', 'transfer']), from: z.string().max(200).optional(), to: z.string().max(200).optional(),
  })).max(20).optional().catch(undefined),
});
/** Session AV lane 2 (money): at most this many of the person's own categories of each kind, each at most 40 characters. */
export const MAX_OWN_CATEGORIES = 30, MAX_HISTORY = 20, MAX_SUBS = 20;
const ownCategory = z.string().trim().min(1).max(40);
export const NEED_WANT = ['need', 'want', 'saving'] as const, MAX_NEED_WANT = 80;
/** Session AV lane 2, round 4 (money): at most this many archived categories of each kind, and investment-income marks. */
export const MAX_ARCHIVED = 60, MAX_INVEST_INCOME = 30, MAX_GROUP = 20;
/** Session AV lane 2, round 6 (money, LEDGER #431): at most this many years put away. */
export const MAX_PUT_AWAY_YEARS = 60;
export const moneyLogSchema = z.looseObject({
  version: z.literal(1),
  entries: z.array(moneyEntrySchema).max(MAX_ENTRIES),
  /** The weekly budget for spending ("room to spend"), in one currency; none set: no room line. */
  budget: z.looseObject({weekly: amountText, currency: currencyCode}).optional(),
  /** The day a week starts on for the room to spend. */
  weekStartsOn: z.enum(['monday', 'sunday']).default('monday'),
  /** The currency the form starts with (the person's last choice). */
  currency: currencyCode.optional(),
  /**
   * Session AV lane 2 (money), TIER 3 (stored format), additive and optional, dropped on read when unreadable (older builds
   * keep them in the loose record):
   * - `own`: the person's own categories (Rocket Money), offered in the forms, budgets and review beside the usual ones;
   * - `accounts`: a note per account (by its id in `zigoals:accounts:v1`, whose strict record older builds read, so the
   *   note lives here) and the person's own order of the accounts list (Monarch);
   * - `lowBalance`: the cash the person does not want the 60-day forecast to go below (Rocket Money's low-balance alert).
   */
  own: z.looseObject({expense: z.array(ownCategory).max(MAX_OWN_CATEGORIES).optional(), income: z.array(ownCategory).max(MAX_OWN_CATEGORIES).optional()}).optional().catch(undefined),
  accounts: z.looseObject({notes: z.record(z.string().min(1).max(100), z.string().trim().min(1).max(300)).optional(), order: z.array(z.string().min(1).max(100)).max(200).optional(),
    /** Session AV lane 2, round 4 (review b4f #7), TIER 3 (stored format), additive: the last statement day checked against the bank, per account id. */
    checked: z.record(z.string().min(1).max(100), day).refine(r => Object.keys(r).length <= 200, 'At most 200 accounts.').optional().catch(undefined)}).optional().catch(undefined),
  lowBalance: z.looseObject({amount: amountText, currency: currencyCode}).optional().catch(undefined),
  /**
   * Session AV lane 2, round 2 (money; Emma's subcategories), TIER 3 (stored format), additive and optional, dropped on
   * read when unreadable: the person's own subcategories, by main category (at most 40 categories, 20 each).
   */
  subs: z.record(ownCategory, z.array(ownCategory).max(MAX_SUBS)).refine(r => Object.keys(r).length <= 40, 'At most 40 categories with subcategories.').optional().catch(undefined),
  /**
   * Session AV lane 2, round 3 (money; PocketGuard's needs, wants and savings), TIER 3 (stored format), additive and
   * optional, dropped on read when unreadable: the person's own mark on a spending category — a need, a want or saving
   * (at most 80 categories). Never a target: Wealth → Spending shows the month's shares of income as facts only.
   */
  needWant: z.record(ownCategory, z.enum(NEED_WANT)).refine(r => Object.keys(r).length <= MAX_NEED_WANT, `At most ${MAX_NEED_WANT} marked categories.`).optional().catch(undefined),
  /**
   * Session AV lane 2, round 4 (money; Lunch Money's archived categories, Actual's crossover report), TIER 3 (stored
   * format), additive and optional, dropped on read when unreadable (older builds keep them in the loose record):
   * - `archived`: categories the person archived, by kind — they leave the pickers; entries, reports and search keep them;
   * - `investIncome`: income categories the person marks as investment income (interest, dividends, staking rewards),
   *   set beside each month's spending as a share; their own choice, never a target.
   */
  archived: z.looseObject({expense: z.array(ownCategory).max(MAX_ARCHIVED).optional().catch(undefined), income: z.array(ownCategory).max(MAX_ARCHIVED).optional().catch(undefined)}).optional().catch(undefined),
  investIncome: z.array(ownCategory).max(MAX_INVEST_INCOME).optional().catch(undefined),
  /**
   * Session AV lane 2, round 6 (money; Banktivity's Remove Historical Data, LEDGER #431), TIER 3 (stored format), additive
   * and optional, dropped on read when unreadable: years of entries the person put away (at most 60 years), each with the
   * entries exactly as they were (kept as written, read back one by one when brought back), so nothing is deleted and
   * "Bring back" restores them (lib/money-log/put-away.ts). Put-away entries are in no list, search or figure. In this same
   * record, so Export everything, the backup, restore and the erase carry them. Older builds keep the field untouched
   * (loose record) and show the year as empty.
   */
  putAway: z.looseObject({years: z.array(z.looseObject({id, year: z.string().regex(/^\d{4}$/), at: z.iso.datetime({offset: true}), entries: z.array(z.unknown()).max(MAX_ENTRIES)})).max(MAX_PUT_AWAY_YEARS)}).optional().catch(undefined),
});
/** Session AV lane 2, round 3 (money): the three marks a spending category can carry (lib/money-insights/needs-wants.ts). */
export type NeedWant = typeof NEED_WANT[number];
export type MoneyEntry = z.infer<typeof moneyEntrySchema>;
export const PAID_WITH = ['cash', 'debit', 'credit', 'transfer', 'other'] as const;
export type PaidWith = typeof PAID_WITH[number];
export type MoneyLog = z.infer<typeof moneyLogSchema>;
export const emptyMoneyLog = (): MoneyLog => ({version: 1, entries: [], weekStartsOn: 'monday'});
export const MONEY_LOG: DeviceRecordSpec<MoneyLog> = {key: MONEY_LOG_KEY, schema: moneyLogSchema, empty: emptyMoneyLog};
