/**
 * Session AW (X6, body and nights; TIER 3 stored formats: additive only): this group's stored changes, for the shared
 * registries, as literals in a module with no imports (the lib/av2-r6-notes-keys.ts pattern). The integrator spreads these
 * into the registries; lib/aw-x6-keys.test.ts proves each literal equals its owner's constant.
 * - `zigoals:sleep-goal-period:v1` (lib/sleep/goal-period.ts, LEDGER #460): which period "Your sleep goal" looks back over
 *   (14 or 30 days). A display key: not a personal record, never synced, never in Health's strict sleep group and not in
 *   Export everything; "Erase everything" removes it with every zigoals key, and the account erase removes it too.
 * - No other new key. LEDGER #456 (named days) and #457 (notes on weigh-ins) are optional fields in
 *   `zigoals:body-extras:v1` (lib/body-extras/schema.ts), a loose record that is already exported, restored with Health,
 *   catalogued and erased (lib/av2-device-keys.ts BODY_EXTRAS_KEY_LITERAL). #458 is derived; #459 writes the strict sleep
 *   group's existing `tags` only.
 */
export const SLEEP_GOAL_PERIOD_KEY_LITERAL = 'zigoals:sleep-goal-period:v1';
/** Display keys (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AW_X6_DISPLAY_KEYS: readonly string[] = [SLEEP_GOAL_PERIOD_KEY_LITERAL];
/** lib/erase-coverage.test.ts `NOT_RECORDS`: why it is in neither Export everything nor the catalog. */
export const AW_X6_NOT_RECORDS: Readonly<Record<string, string>> = {[SLEEP_GOAL_PERIOD_KEY_LITERAL]: 'localStorage: whether "Your sleep goal" looks back over 14 or 30 days on this device (a number only), a display convenience (Session AW, LEDGER #460)'};
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AW_X6_ERASE_KEYS: readonly string[] = [...AW_X6_DISPLAY_KEYS];
/** The existing record that holds #456 and #457's optional fields (already in every registry). */
export const BODY_EXTRAS_KEY_LITERAL = 'zigoals:body-extras:v1';
