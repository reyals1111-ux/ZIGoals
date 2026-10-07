import {z} from 'zod';
import {ACCOUNTS_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Accounts and debts (Session W Part 12). Kept in the device key `zigoals:accounts:v1` in this release; its synced home
 * is finance v5 `accounts` (read support only here; a later one-line switch PR moves them, the SYNC_HOMES pattern), so
 * the record's fields are exactly the home's. Money is an exact integer string with its decimals, per account in the
 * account's own currency, never converted. A balance is entered by the person on a date (a snapshot); a debt's balance
 * is what is owed, a positive number. An interest rate is only ever the person's own figure, labelled as theirs.
 */
export {ACCOUNTS_KEY};
export const ASSET_KINDS = ['cash', 'savings', 'investment', 'pension', 'property', 'vehicle', 'other-asset'] as const;
export const DEBT_KINDS = ['loan', 'mortgage', 'credit-card', 'other-debt'] as const;
export const ACCOUNT_KINDS = [...ASSET_KINDS, ...DEBT_KINDS] as const;
export type AccountKind = typeof ACCOUNT_KINDS[number];
export const isDebtKind = (kind: AccountKind) => (DEBT_KINDS as readonly string[]).includes(kind);
export const MAX_ACCOUNTS = 200, MAX_SNAPSHOTS = 2000, MAX_PAYMENTS = 2000;
const instant = z.iso.datetime();
const units = z.string().regex(/^(0|[1-9]\d{0,29})$/);
const money = {value: units, decimals: z.number().int().min(0).max(8)};
export const balanceSnapshotSchema = z.strictObject({id: z.uuid(), date: z.iso.date(), ...money, note: z.string().max(200).optional()});
export const debtPaymentSchema = z.strictObject({id: z.uuid(), date: z.iso.date(), ...money, note: z.string().max(200).optional()});
/** A yearly rate the person typed, as a plain decimal text ("4.25" for 4.25 %), at most 100. */
export const ratePercentSchema = z.string().regex(/^(?:0|[1-9]\d{0,2})(?:\.\d{1,4})?$/).refine(v => Number(v) <= 100, 'At most 100 %.');
export const accountSchema = z.strictObject({
  id: z.uuid(), kind: z.enum(ACCOUNT_KINDS), name: z.string().trim().min(1).max(80), currency: z.string().regex(/^[A-Z]{3}$/),
  institution: z.string().trim().max(80).optional(), ratePercent: ratePercentSchema.optional(), archivedAt: instant.optional(),
  snapshots: z.array(balanceSnapshotSchema).max(MAX_SNAPSHOTS), payments: z.array(debtPaymentSchema).max(MAX_PAYMENTS),
  createdAt: instant, updatedAt: instant,
}).superRefine((account, ctx) => {
  if (new Set(account.snapshots.map(s => s.id)).size !== account.snapshots.length) ctx.addIssue({code: 'custom', message: 'Duplicate balance entry.'});
  if (new Set(account.snapshots.map(s => s.date)).size !== account.snapshots.length) ctx.addIssue({code: 'custom', message: 'One balance per date.'});
  if (new Set(account.payments.map(p => p.id)).size !== account.payments.length) ctx.addIssue({code: 'custom', message: 'Duplicate payment.'});
  if (account.payments.length && !isDebtKind(account.kind)) ctx.addIssue({code: 'custom', message: 'Only a debt has payments.'});
});
export type Account = z.infer<typeof accountSchema>;
export const accountsSchema = z.strictObject({version: z.literal(1), items: z.array(accountSchema).max(MAX_ACCOUNTS)})
  .refine(group => new Set(group.items.map(a => a.id)).size === group.items.length, 'Duplicate account.');
export type Accounts = z.infer<typeof accountsSchema>;
export const emptyAccounts = (): Accounts => ({version: 1, items: []});
export const ACCOUNTS: DeviceRecordSpec<Accounts> = {key: ACCOUNTS_KEY, schema: accountsSchema, empty: emptyAccounts};
