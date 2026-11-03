import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {amountText} from '../money-log/schema';

/**
 * Session AK (lane M, item 1, COMPETITORS M1): the person's transaction rules for the money log, TIER 3 (stored format).
 * A NEW device-only key, loose and versioned; the money log's own record is not changed. A rule is a plain,
 * case-insensitive text match (contains, equals or starts with — never a pattern) on the payee or the memo, with an
 * optional amount range and direction, and it sets a category, a new name, a tag and/or a Goal. Ordered; the first
 * rule that matches wins. At most 200 rules. Not synced; for Export everything, restore and the account erase.
 */
export const MONEY_RULES_KEY = 'zigoals:money-rules:v1';
export const MAX_RULES = 200, MAX_RULE_TEXT = 80;
export const RULE_FIELDS = ['either', 'payee', 'memo'] as const;
export const RULE_OPS = ['contains', 'equals', 'starts-with'] as const;
export const RULE_DIRECTIONS = ['any', 'out', 'in'] as const;
export const tagText = z.string().regex(/^[a-z0-9][a-z0-9-]{0,23}$/);
export const moneyRuleSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  /** Where the text is looked for: the payee (the note before " · "), the memo (after it) or either (the whole note). */
  field: z.enum(RULE_FIELDS).default('either'),
  op: z.enum(RULE_OPS).default('contains'),
  text: z.string().trim().min(1).max(MAX_RULE_TEXT),
  direction: z.enum(RULE_DIRECTIONS).default('any'),
  /** An optional amount range, inclusive, in the entry's own currency. */
  min: amountText.optional(),
  max: amountText.optional(),
  category: z.string().trim().min(1).max(40).optional(),
  /** The payee's new name (the memo after " · " is kept). */
  renameTo: z.string().trim().min(1).max(80).optional(),
  /** A short tag added to the note as "#tag". */
  tag: tagText.optional(),
  /** A Wealth Goal the whole entry is linked to (one part, lib/money-split). */
  goalId: z.string().regex(/^\d{1,80}$/).optional(),
  enabled: z.boolean().default(true),
  createdAt: z.iso.datetime({offset: true}).optional(),
});
export const moneyRulesSchema = z.looseObject({
  version: z.literal(1),
  rules: z.array(moneyRuleSchema).max(MAX_RULES).default([]),
});
export type MoneyRule = z.infer<typeof moneyRuleSchema>;
export type MoneyRules = z.infer<typeof moneyRulesSchema>;
export const emptyMoneyRules = (): MoneyRules => ({version: 1, rules: []});
export const MONEY_RULES: DeviceRecordSpec<MoneyRules> = {key: MONEY_RULES_KEY, schema: moneyRulesSchema, empty: emptyMoneyRules};
