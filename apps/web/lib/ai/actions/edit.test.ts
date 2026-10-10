import {expect, test} from 'vitest';
import {applyEdits, editableFields, fieldText} from './edit';
import {ACTION_KINDS, actionSchema, type Action} from './schema';

// ADR-012, Part 5: an edited proposal is validated like a fresh one; handles are never editable.
const action = (raw: Record<string, unknown>): Action => actionSchema.parse(raw);
test('every kind has its fields, each field reads a key the schema knows, and no field is a handle', () => {
  const samples: Record<string, Record<string, unknown>> = {
    'log-water': {kind: 'log-water', glasses: 1}, 'log-weight': {kind: 'log-weight', value: 70, unit: 'kg'}, 'log-steps': {kind: 'log-steps', steps: 10}, 'log-food': {kind: 'log-food', name: 'x', meal: 'Lunch', food: 'f1'},
    'log-measurement': {kind: 'log-measurement', kind_of: 'waist', value: 80, unit: 'cm'}, 'check-in': {kind: 'check-in', habit: 'h1'}, skip: {kind: 'skip', habit: 'h1'}, 'create-habit': {kind: 'create-habit', title: 'x'}, 'start-fast': {kind: 'start-fast', targetHours: 16}, 'stop-fast': {kind: 'stop-fast'},
    'create-goal': {kind: 'create-goal', name: 'x', target: 1, currency: 'USD'}, 'add-goal-note': {kind: 'add-goal-note', goal: 'g1', note: 'x'}, 'prefill-holding': {kind: 'prefill-holding', category: 'Cash', name: 'x', quantity: '1'},
    // Session V Part 7
    'create-food': {kind: 'create-food', name: 'Shake', serving_ml: 300, estimate: {kcal: 200}}, 'create-recipe': {kind: 'create-recipe', name: 'Soup', ingredients: [{name: 'Lentils', grams: 250}]},
    'plan-meal': {kind: 'plan-meal', recipe: 'r1', meal: 'Dinner'}, 'grocery-item': {kind: 'grocery-item', items: ['Oat milk', 'Spinach']}, counter: {kind: 'counter', counter: 'Push-ups', count: 20},
    'create-reminder': {kind: 'create-reminder', for: 'water', time: '10:00'}, 'review-intention': {kind: 'review-intention', intention: 'Walk after lunch'},
    // Session V Part 8
    remember: {kind: 'remember', text: 'Prefers morning workouts', category: 'preferences'},
    // Session W Part 21
    'log-sleep': {kind: 'log-sleep', wake: '07:00', bedtime: '23:00'}, 'log-meditation': {kind: 'log-meditation', minutes: 10}, 'add-milestone': {kind: 'add-milestone', goal: 'g1', title: 'Halfway'},
    'update-account-balance': {kind: 'update-account-balance', account: 'Savings', balance: '100'}, 'start-challenge': {kind: 'start-challenge', habit: 'h1', days: 30},
    // Session X-Local Part 5a
    'stack-habit': {kind: 'stack-habit', habit: 'h2', after: 'h1'}, 'edit-habit': {kind: 'edit-habit', habit: 'h1', title: 'Evening pages'}, 'edit-goal': {kind: 'edit-goal', goal: 'g1', name: 'Lisbon in spring'},
    'log-mood': {kind: 'log-mood', mood: 4, note: 'Calm'}, 'add-link': {kind: 'add-link', label: 'Club', url: 'https://example.org/club'}, 'add-widget': {kind: 'add-widget', widget: 'habit', habit: 'h1', metric: 'streak'},
    // Session Z-Local Part 5
    'open-page': {kind: 'open-page', page: 'health', view: 'sleep'}, 'delete-record': {kind: 'delete-record', what: 'habit', habit: 'h1'}, 'set-habit-state': {kind: 'set-habit-state', habit: 'h1', state: 'paused'}, vacation: {kind: 'vacation', from: '2026-09-22', to: '2026-09-24'},
    unskip: {kind: 'unskip', habit: 'h1'}, 'remove-reminder': {kind: 'remove-reminder', for: 'water'}, 'close-goal': {kind: 'close-goal', goal: 'g1'}, 'reopen-goal': {kind: 'reopen-goal', goal: 'g1'},
  };
  for (const kind of ACTION_KINDS) {
    const a = action(samples[kind]!), fields = editableFields(a);
    expect(fields.map(f => f.key), kind).not.toContain('habit'); expect(fields.map(f => f.key), kind).not.toContain('goal'); expect(fields.map(f => f.key), kind).not.toContain('food'); expect(fields.map(f => f.key), kind).not.toContain('kind');
    // Writing every field back unchanged keeps the proposal valid and identical.
    const values = Object.fromEntries(fields.map(f => [f.key, fieldText(a, f)]));
    expect(applyEdits(a, values), kind).toEqual({ok: true, action: a});
  }
});
test('edits change plain values, clear optional ones, add an estimate, and read "today" as an empty day', () => {
  const water = action({kind: 'log-water', glasses: 2});
  expect(fieldText(water, {key: 'day', label: 'Day', type: 'day'})).toBe(''); expect(fieldText(water, {key: 'glasses', label: 'g', type: 'number'})).toBe('2');
  expect(applyEdits(water, {glasses: '', millilitres: '750', day: 'yesterday'})).toEqual({ok: true, action: {kind: 'log-water', millilitres: 750, day: 'yesterday'}});
  const food = action({kind: 'log-food', name: 'Toast', meal: 'Breakfast'});
  expect(applyEdits(food, {'estimate.kcal': '180', 'estimate.protein_g': '5,5', quantity: '2'})).toEqual({ok: true, action: {kind: 'log-food', name: 'Toast', meal: 'Breakfast', quantity: 2, estimate: {kcal: 180, protein_g: 5.5}, day: 'today'}});
  const estimated = action({kind: 'log-food', name: 'Toast', meal: 'Breakfast', estimate: {kcal: 180}});
  expect(applyEdits(estimated, {'estimate.kcal': ''})).toEqual({ok: true, action: {kind: 'log-food', name: 'Toast', meal: 'Breakfast', quantity: 1, day: 'today'}});
  const goal = action({kind: 'create-goal', name: 'Bike', target: 1200, currency: 'EUR'});
  expect(applyEdits(goal, {targetDate: '2027-01-01', category: 'Custom', currency: 'usd'})).toMatchObject({ok: true, action: {targetDate: '2027-01-01', category: 'Custom', currency: 'USD'}});
});
test('an edit cannot widen a proposal: wrong numbers, bad enums, lost required values and unknown kinds are refused in plain words', () => {
  const weight = action({kind: 'log-weight', value: 70, unit: 'kg'});
  expect(applyEdits(weight, {value: 'seventy'})).toEqual({ok: false, message: 'Weight needs a number.'});
  expect(applyEdits(weight, {value: ''})).toMatchObject({ok: false, message: expect.stringMatching(/^Weight: /)});
  expect(applyEdits(weight, {unit: 'stone'})).toMatchObject({ok: false, message: expect.stringMatching(/^Unit: /)});
  expect(applyEdits(action({kind: 'log-steps', steps: 10}), {steps: '10.5'})).toEqual({ok: false, message: 'Steps needs a whole number.'});
  expect(applyEdits(action({kind: 'start-fast', targetHours: 16}), {targetHours: '24'})).toMatchObject({ok: false});
  expect(applyEdits(action({kind: 'log-water', glasses: 1}), {glasses: '', millilitres: ''})).toMatchObject({ok: false});
  // Values for keys outside the kind's fields are ignored, so a "kind" or "habit" text can never slip in.
  const checkIn = action({kind: 'check-in', habit: 'h1'});
  expect(applyEdits(checkIn, {kind: 'delete-everything', habit: 'h9', value: '3'})).toEqual({ok: true, action: {kind: 'check-in', habit: 'h1', value: 3, day: 'today'}});
});
test('Session X-Local Part 5a: a project goal edits without a target, a widget edit keeps its record handle, an address stays https', () => {
  const project = action({kind: 'create-goal', name: 'Kitchen', type: 'PROJECT', milestones: ['Plans', 'Quotes']});
  expect(fieldText(project, {key: 'target', label: 'Target', type: 'number'})).toBe('');
  expect(applyEdits(project, {target: '', currency: '', milestones: 'Plans\nQuotes\nDone'})).toEqual({ok: true, action: {...project, milestones: ['Plans', 'Quotes', 'Done']}});
  expect(applyEdits(project, {milestones: ''})).toMatchObject({ok: false, message: expect.stringMatching(/milestone/i)});
  const widget = action({kind: 'add-widget', widget: 'habit', habit: 'h1', metric: 'streak'});
  expect(applyEdits(widget, {habit: 'h9', size: 'wide', title: 'Pages'})).toEqual({ok: true, action: {...widget, size: 'wide', title: 'Pages'}});
  const link = action({kind: 'add-link', label: 'Club', url: 'https://example.org/club'});
  expect(applyEdits(link, {url: 'http://example.org/club'})).toMatchObject({ok: false, message: expect.stringMatching(/https/)});
  const mood = action({kind: 'log-mood', mood: 4});
  expect(applyEdits(mood, {mood: '6'})).toMatchObject({ok: false});
  expect(applyEdits(mood, {mood: '2', day: '2026-09-19'})).toEqual({ok: true, action: {kind: 'log-mood', mood: 2, day: '2026-09-19'}});
});
