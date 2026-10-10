import {CATEGORY_LABELS, REMEMBER_CATEGORIES} from '../memory';
import {GOAL_CATEGORIES, GOAL_TYPES, HABIT_STATES, HOLDING_CATEGORIES, MEALS, MEASUREMENT_KINDS, WIDGET_KINDS, actionSchema, type Action, type ActionKind} from './schema';
import {EXERCISE_ICONS} from '../../health-counters';
import {BELL_SOUNDS} from '../../meditation/schema';
import {LINK_ICONS} from '../../links/schema';
import {BUTTON_IDS, PAGE_IDS} from '../../pages/schema';
import {ACCOUNT_KINDS} from '../../accounts/schema';
import {ZIGI_ANIMATIONS, ZIGI_GREETINGS, ZIGI_SIDES, ZIGI_SIZES} from '../store/records';
import {PRESET_IDS, WEEKDAY_NAMES} from './schema';

/**
 * "Edit" on a proposal card (ADR-012, Part 5): the person changes the plain fields of a proposal before adding it. The
 * edited proposal goes through the same schema as a fresh one, so an edit can never widen what a card may do. Handles
 * (h1, g2, f3) are not editable: the person never sees identifiers, and a record is chosen by asking again.
 */
/** `lines` (Session V Part 7): a list edited as one item per line (grocery items, goal milestones). */
export type Field = {key: string; label: string; type: 'number' | 'integer' | 'text' | 'date' | 'select' | 'day' | 'lines'; options?: readonly string[]; optional?: boolean; multiline?: boolean;
  /** Words shown for a select's options (Part 8), when they differ from the stored values. */
  labels?: Readonly<Record<string, string>>};
const num = (key: string, label: string, optional = false): Field => ({key, label, type: 'number', optional});
const int = (key: string, label: string, optional = false): Field => ({key, label, type: 'integer', optional});
const text = (key: string, label: string, optional = false, multiline = false): Field => ({key, label, type: 'text', optional, multiline});
const select = (key: string, label: string, options: readonly string[], optional = false): Field => ({key, label, type: 'select', options, optional});
const DAY: Field = {key: 'day', label: 'Day', type: 'day', optional: true};
const lines = (key: string, label: string, optional = false): Field => ({key, label, type: 'lines', optional, multiline: true});
const ESTIMATE = [num('estimate.kcal', 'kcal per serving', true), num('estimate.protein_g', 'Protein (g)', true), num('estimate.carbs_g', 'Carbs (g)', true), num('estimate.fat_g', 'Fat (g)', true)];
const FIELDS: Record<ActionKind, readonly Field[]> = {
  // ---- Session Z-Local Part 5 ----
  'open-page': [],
  'delete-record': [DAY],
  'set-habit-state': [select('state', 'State', HABIT_STATES, false)],
  vacation: [{key: 'from', label: 'From', type: 'date'}, {key: 'to', label: 'To', type: 'date'}],
  unskip: [DAY],
  'remove-reminder': [],
  'close-goal': [],
  'reopen-goal': [],
  'edit-diary-entry': [select('meal', 'Meal', MEALS, true), num('quantity', 'Servings', true), {key: 'move_to', label: 'Move to day', type: 'date', optional: true}, DAY],
  'log-meal-plan': [select('meal', 'Meal', MEALS, true), DAY],
  'grocery-notes': [text('notes', 'Notes', false, true)],
  'set-favorite': [],
  'create-counter': [text('name', 'Name'), select('icon', 'Icon', EXERCISE_ICONS, true)],
  'edit-counter': [text('name', 'New name', true), select('icon', 'Icon', EXERCISE_ICONS, true)],
  'set-target': [num('value', 'Value (empty clears the target)', true), select('unit', 'Unit', ['kcal', 'g', 'steps', 'ml', 'l', 'kg', 'lb', 'hours', 'minutes'], true)],
  'set-health-preference': [select('waterUnit', 'Water unit', ['ml', 'fl-oz-us'], true), select('weightUnit', 'Weight unit', ['kg', 'lb'], true)],
  'start-night': [{key: 'bedtime', label: 'Bedtime (HH:MM, empty = now)', type: 'text', optional: true}],
  'end-night': [{key: 'wake', label: 'Woke up at (HH:MM, empty = now)', type: 'text', optional: true}],
  'set-bells': [int('intervalMin', 'Bell every (minutes)', true), select('sound', 'Sound', BELL_SOUNDS, true), int('volume', 'Volume (0 to 100)', true)],
  // Session Z-Local Part 5, batch 3 (the yes/no fields are the card's; the editor changes names, times and choices)
  'set-today-preset': [select('preset', 'Preset', PRESET_IDS)],
  'edit-link': [text('link', 'Which link (its name)'), text('label', 'New name', true), text('url', 'New address (https://…)', true), select('icon', 'Icon', LINK_ICONS, true)],
  'skip-review': [],
  'set-review-weekday': [select('weekday', 'Weekday', WEEKDAY_NAMES)],
  'set-wrap-up': [text('time', 'Time (HH:MM)', true)],
  'set-page-visibility': [select('page', 'Page or button', [...PAGE_IDS, ...BUTTON_IDS])],
  'set-start-page': [select('page', 'Start page', PAGE_IDS, true)],
  'set-zigi-look': [text('skin', 'Look (its name)', true), select('animation', 'Animation', ZIGI_ANIMATIONS, true), select('side', 'Side', ZIGI_SIDES, true), select('size', 'Size', ZIGI_SIZES, true), select('greeting', 'Greeting', ZIGI_GREETINGS, true)],
  'prefill-contribution': [text('amount', 'Amount'), text('asset', 'Asset or currency', true), DAY, text('note', 'Note', true)],
  'prefill-account': [text('name', 'Account name'), select('accountKind', 'Kind', ACCOUNT_KINDS), text('currency', 'Currency', true), text('institution', 'Institution', true), text('balance', 'Opening balance', true), text('ratePercent', 'Interest rate (%)', true), DAY],
  'log-water': [num('millilitres', 'Millilitres', true), num('glasses', 'Glasses (250 mL)', true), DAY],
  'log-weight': [num('value', 'Weight'), select('unit', 'Unit', ['kg', 'lb']), DAY],
  'log-steps': [int('steps', 'Steps'), int('minutes', 'Minutes', true), DAY],
  'log-food': [text('name', 'Name'), select('meal', 'Meal', MEALS), num('quantity', 'Servings'), num('estimate.kcal', 'kcal per serving', true), num('estimate.protein_g', 'Protein (g)', true), num('estimate.carbs_g', 'Carbs (g)', true), num('estimate.fat_g', 'Fat (g)', true), num('estimate.serving_g', 'Serving weight (g)', true), DAY],
  'log-measurement': [select('kind_of', 'Measurement', MEASUREMENT_KINDS), num('value', 'Value'), select('unit', 'Unit', ['cm', 'in']), DAY],
  'check-in': [num('value', 'Value', true), num('minutes', 'Minutes', true), num('quantity', 'Quantity', true), text('unit', 'Unit of the quantity', true), text('note', 'Note', true), DAY],
  skip: [text('reason', 'Reason', true), DAY],
  'create-habit': [text('title', 'Title'), select('type', 'Type', ['build', 'quit', 'limit']), num('target', 'Daily target', true), select('timeOfDay', 'Time of day', ['anytime', 'morning', 'afternoon', 'evening']), text('description', 'Description', true, true), text('category', 'Category', true)],
  'start-fast': [int('targetHours', 'Target hours')],
  'stop-fast': [],
  'create-goal': [text('name', 'Name'), select('type', 'Type', GOAL_TYPES), num('target', 'Target (not for a project)', true), text('currency', 'Currency or asset', true), {key: 'targetDate', label: 'Target date', type: 'date', optional: true}, select('category', 'Category', GOAL_CATEGORIES, true), text('notes', 'Notes', true, true), lines('milestones', 'Milestones (one per line)', true)],
  'add-goal-note': [text('note', 'Note', false, true)],
  'prefill-holding': [select('category', 'Category', HOLDING_CATEGORIES), text('name', 'Name'), text('quantity', 'Quantity'), text('currency', 'Currency'), num('value', 'Total value', true), text('symbol', 'Symbol', true), text('notes', 'Notes', true, true)],
  // Session V Part 7. A recipe's ingredients and a counter or reminder's record are not edited here: ask again, or edit the
  // recipe in Foods & recipes once it is added.
  'create-food': [text('name', 'Name'), text('brand', 'Brand', true), num('serving_g', 'Serving weight (g)', true), num('serving_ml', 'Serving volume (mL)', true), ...ESTIMATE],
  'create-recipe': [text('name', 'Name'), num('servings', 'Makes (servings)')],
  'plan-meal': [select('meal', 'Meal', MEALS), num('servings', 'Servings'), DAY],
  'grocery-item': [lines('items', 'Items (one per line)')],
  counter: [int('count', 'Count (negative to take away)'), DAY],
  'create-reminder': [{key: 'time', label: 'Time (HH:MM)', type: 'text'}, int('weekday', 'Weekday (0 = Sunday; weekly reminders)', true)],
  'review-intention': [text('intention', 'Intention', false, true)],
  // Session V Part 8: the note and its kind (never Health: ZIGi's cards keep no notes about health conditions).
  remember: [text('text', 'Note (up to 500 characters)', false, true), {key: 'category', label: 'Kind of note', type: 'select', options: REMEMBER_CATEGORIES, labels: CATEGORY_LABELS}],
  // Session W Part 21. A goal or habit is not changed here (ask again); a night's times are HH:MM where it was slept.
  'log-sleep': [{key: 'wake', label: 'Woke up at (HH:MM)', type: 'text'}, {key: 'bedtime', label: 'Went to bed at (HH:MM)', type: 'text', optional: true}, num('hours', 'Or: hours in bed', true), int('minutes', 'Or: minutes in bed', true), int('quality', 'Quality (1 to 5)', true), DAY],
  'log-meditation': [int('minutes', 'Minutes'), {key: 'time', label: 'Started at (HH:MM)', type: 'text', optional: true}, text('note', 'Note', true, true), DAY],
  'add-milestone': [text('title', 'Milestone'), num('value', 'Value in the goal\'s currency', true)],
  'update-account-balance': [text('account', 'Account (its name in Wealth)'), text('balance', 'Balance'), text('currency', 'Currency', true), DAY],
  'start-challenge': [int('days', 'Days (7 to 365)')],
  // Session X-Local Part 5a. A stack names two habits by handle (ask again to change them); an edit changes only the
  // plain fields it lists; the measurement and schedule of a habit are edited in Habits.
  'stack-habit': [],
  'edit-habit': [text('title', 'New title', true), select('type', 'Type', ['build', 'quit', 'limit'], true), num('target', 'Daily target', true), select('timeOfDay', 'Time of day', ['anytime', 'morning', 'afternoon', 'evening'], true), text('description', 'Description', true, true), text('category', 'Category', true)],
  'edit-goal': [text('name', 'New name', true), num('target', 'Target', true), {key: 'targetDate', label: 'Target date', type: 'date', optional: true}, select('category', 'Category', GOAL_CATEGORIES, true), text('notes', 'Notes', true, true)],
  'log-mood': [int('mood', 'Mood (1 = hard, 5 = great)'), text('note', 'Note', true, true), DAY],
  'add-link': [text('label', 'Name'), text('url', 'Address (https://…)'), select('icon', 'Icon', LINK_ICONS, true)],
  'add-widget': [select('widget', 'Widget', WIDGET_KINDS), text('metric', 'Metric', true), text('title', 'Title', true), select('size', 'Size', ['compact', 'wide'])],
};
export const editableFields = (action: Action): readonly Field[] => FIELDS[action.kind];
const read = (record: unknown, path: string): unknown => path.split('.').reduce<unknown>((value, part) => value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, record);
/** The current value of a field as the text an input shows. */
export function fieldText(action: Action, field: Field): string {
  const value = read(action, field.key);
  if (value === undefined || value === null) return '';
  if (field.type === 'day' && value === 'today') return '';
  if (field.type === 'lines' && Array.isArray(value)) return value.map(String).join('\n');
  return String(value);
}
function write(record: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.'), last = parts.pop()!;
  let target = record;
  for (const part of parts) { const next = target[part]; if (!next || typeof next !== 'object') { if (value === undefined) return; target[part] = {}; } target = target[part] as Record<string, unknown>; }
  if (value === undefined) delete target[last]; else target[last] = value;
}
/** Applies the edited texts to a proposal and validates the result; an empty text clears an optional field. */
export function applyEdits(action: Action, values: Readonly<Record<string, string>>): {ok: true; action: Action} | {ok: false; message: string} {
  const draft = JSON.parse(JSON.stringify(action)) as Record<string, unknown>;
  for (const field of editableFields(action)) {
    if (!(field.key in values)) continue;
    const raw = values[field.key]!.trim();
    if (raw === '') { write(draft, field.key, undefined); continue; }
    if (field.type === 'lines') { const items = raw.split('\n').map(line => line.trim()).filter(Boolean); write(draft, field.key, items.length ? items : undefined); continue; }
    if (field.type === 'number' || field.type === 'integer') {
      // SECURITY_REVIEW_Y F7: "10,000" is ten thousand and "10.000,5" ten thousand and a half; only a lone comma is a decimal comma.
      const digits = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw) ? raw.replace(/,/g, '') : /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(',', '.');
      const parsed = Number(digits);
      if (!Number.isFinite(parsed)) return {ok: false, message: `${field.label} needs a number.`};
      if (field.type === 'integer' && !Number.isInteger(parsed)) return {ok: false, message: `${field.label} needs a whole number.`};
      write(draft, field.key, parsed); continue;
    }
    write(draft, field.key, raw);
  }
  if (draft.kind === 'log-food' && draft.estimate && typeof draft.estimate === 'object' && Object.keys(draft.estimate as object).length === 0) delete draft.estimate;
  const result = actionSchema.safeParse(draft);
  if (!result.success) { const issue = result.error.issues[0]; const label = issue ? editableFields(action).find(f => f.key === issue.path.map(String).join('.'))?.label ?? issue.path.map(String).join('.') : ''; return {ok: false, message: `${label ? `${label}: ` : ''}${issue?.message ?? 'Check the values.'}`}; }
  return {ok: true, action: result.data};
}
