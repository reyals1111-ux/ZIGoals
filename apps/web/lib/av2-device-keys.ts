/**
 * Session AV lane 2 (owner follow-up 4; ADR-045): lane 2's device keys and their rows for the shared registries, as
 * literals in a module with no imports (the lib/av-device-keys.ts pattern), so the welcome check, Export everything, the
 * data catalog and the account erase name them without shipping a schema; lib/av2-device-keys.test.ts proves each literal
 * equals its owner's constant and that every registry carries it. Every record is device only, versioned, exported,
 * restored, erased with the account and never synced (TIER 3 stored formats: additive keys only; older builds ignore them).
 * - `zigoals:task-plan:v1` (Tasks: planning choices, timers, the finished-per-day log; lib/tasks/plan-record.ts).
 * - `zigoals:task-templates:v1` (Tasks: your own project templates; lib/tasks/templates.ts).
 * - `zigoals:budget-periods:v1` (Budgets: pay periods, the paycheck fill, debts paid from a budget; lib/budgets/periods.ts).
 * - display `zigoals:task-area` (the area chosen at the top of Tasks; components/tasks/tasks-page.tsx).
 */
export const TASK_PLAN_KEY_LITERAL = 'zigoals:task-plan:v1';
export const TASK_TEMPLATES_KEY_LITERAL = 'zigoals:task-templates:v1';
export const BUDGET_PERIODS_KEY_LITERAL = 'zigoals:budget-periods:v1';
export const TASK_AREA_KEY_LITERAL = 'zigoals:task-area';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AV2_PERSONAL_KEYS: readonly string[] = [TASK_PLAN_KEY_LITERAL, TASK_TEMPLATES_KEY_LITERAL, BUDGET_PERIODS_KEY_LITERAL];
/** Display/setting records (onboarding `NON_PERSONAL_KEYS`). */
export const AV2_DISPLAY_KEYS: readonly string[] = [TASK_AREA_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AV2_EXPORT_KEYS = {taskPlan: TASK_PLAN_KEY_LITERAL, taskTemplates: TASK_TEMPLATES_KEY_LITERAL, budgetPeriods: BUDGET_PERIODS_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AV2_CATALOG_LABELS = {
  taskPlan: ['Tasks: your planning choices, timers and the count of finished tasks per day', 'Today'],
  taskTemplates: ['Tasks: your project templates', 'Today'],
  budgetPeriods: ['Budgets: pay periods, the paycheck fill and debts paid from a budget', 'Wealth'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AV2_ERASE_KEYS: readonly string[] = [...AV2_PERSONAL_KEYS, ...AV2_DISPLAY_KEYS];
