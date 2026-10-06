import {GOAL_CATEGORIES, HOLDING_CATEGORIES, MEALS, MEASUREMENT_KINDS, actionSchema, type Action, type ActionKind} from './schema';

/**
 * "Edit" on a proposal card (ADR-012, Part 5): the person changes the plain fields of a proposal before adding it. The
 * edited proposal goes through the same schema as a fresh one, so an edit can never widen what a card may do. Handles
 * (h1, g2, f3) are not editable: the person never sees identifiers, and a record is chosen by asking again.
 */
/** `lines` (Session V Part 7): a list edited as one item per line (grocery items, goal milestones). */
export type Field = {key: string; label: string; type: 'number' | 'integer' | 'text' | 'date' | 'select' | 'day' | 'lines'; options?: readonly string[]; optional?: boolean; multiline?: boolean};
const num = (key: string, label: string, optional = false): Field => ({key, label, type: 'number', optional});
const int = (key: string, label: string, optional = false): Field => ({key, label, type: 'integer', optional});
const text = (key: string, label: string, optional = false, multiline = false): Field => ({key, label, type: 'text', optional, multiline});
const select = (key: string, label: string, options: readonly string[], optional = false): Field => ({key, label, type: 'select', options, optional});
const DAY: Field = {key: 'day', label: 'Day', type: 'day', optional: true};
const lines = (key: string, label: string, optional = false): Field => ({key, label, type: 'lines', optional, multiline: true});
const ESTIMATE = [num('estimate.kcal', 'kcal per serving', true), num('estimate.protein_g', 'Protein (g)', true), num('estimate.carbs_g', 'Carbs (g)', true), num('estimate.fat_g', 'Fat (g)', true)];
const FIELDS: Record<ActionKind, readonly Field[]> = {
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
  'create-goal': [text('name', 'Name'), select('type', 'Type', ['VALUE', 'QUANTITY']), num('target', 'Target'), text('currency', 'Currency'), {key: 'targetDate', label: 'Target date', type: 'date', optional: true}, select('category', 'Category', GOAL_CATEGORIES, true), text('notes', 'Notes', true, true), lines('milestones', 'Milestones (one per line)', true)],
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
      const parsed = Number(raw.replace(',', '.'));
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
