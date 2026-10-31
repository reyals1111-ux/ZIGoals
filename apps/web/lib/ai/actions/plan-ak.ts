import {newAutoRule, ruleSentence} from '../../auto-rules/engine';
import {AUTO_RULES, AUTO_RULES_KEY, autoRuleIssue, type AutoRule, type AutoRules} from '../../auto-rules/schema';
import {manualBillIssue} from '../../bills/store';
import {BILLS, BILLS_KEY, type BillsRecord} from '../../bills/schema';
import {GROCERY_KEY} from '../../grocery/schema';
import {readDeviceRecord} from '../../device-record';
import {privateGoalPoints} from '../../goal-forecast';
import {unifiedGoalSummaries} from '../../goal-summary';
import {parseGoalBundle} from '../../goals/nl-bundle';
import {GOAL_WIZARD_DRAFT_KEY, bundleHabitInput, goalWizardDraft} from '../../goals/nl-bundle-create';
import {PROJECTION_LABEL, pace30, paceSentence, requiredPace, whatIf, whatIfSentence} from '../../goals/what-if';
import {SOUNDSCAPE_PRESETS} from '../../audio/mix';
import {addLocalDays, localDate, localWeekday} from '../../local-date';
import {getAppStorage} from '../../showcase-storage';
import {formatDate, formatNumber} from '../../visual-format';
import {healthLinkedHabitIds} from './ak-writes';
import type {AaHelpers} from './plan-aa';
import type {Env, PlanResult} from './plan';
import type {Action} from './schema';
import {AK_SOUNDSCAPES} from './schema-ak';

/**
 * Session AK (Part 12): the planner's cases for this session's kinds, in the lazy planner chunk (plan-aa.ts re-exports
 * this module, so loading it costs no new request). Every card is `target: 'form'`: never batched, never automatic, and
 * each says what it changes and where it is changed back. The records it reads (the auto-complete rules, the bills) come
 * from `env.akRecords` when the caller has them, else from this device's storage at the moment the card is planned.
 * Arguments are data: a name is matched against the person's own records (one match, never a guess), a figure is checked
 * against the owner's own rules, and the patch a card carries has one fixed shape (ak-writes.ts checks it again).
 */
export type AkRecords = {autoRules: AutoRules; bills: BillsRecord; unreadable?: boolean};
/** The effects only the runner can perform (components/ai/use-proposals.ts): a draft kept for a form, a soundscape. */
export type AkEffect = {stash?: {key: typeof GOAL_WIZARD_DRAFT_KEY; value: Record<string, unknown>}; soundscape?: (typeof AK_SOUNDSCAPES)[number]; button?: string};
const AK_RECORDS_UNREADABLE = 'The records for this card cannot be read on this device, so nothing was proposed.';
function recordsOf(env: Env): AkRecords {
  if (env.akRecords) return env.akRecords;
  try {
    const storage = getAppStorage(), rules = readDeviceRecord(storage, AUTO_RULES), bills = readDeviceRecord(storage, BILLS);
    return {autoRules: rules.data, bills: bills.data, unreadable: rules.unreadable || bills.unreadable};
  } catch { return {autoRules: AUTO_RULES.empty(), bills: BILLS.empty()}; }
}
const day = (iso: string) => formatDate(iso);
const plain = (n: number, digits = 2) => formatNumber(n, {maximumFractionDigits: digits});
/** Monday of the week holding `date` (the grocery list's week, Monday first like the planner). */
export const mondayOf = (date: string) => addLocalDays(date, -((localWeekday(date) + 6) % 7));
type Helpers = AaHelpers;
/** A private goal by its handle, else by its name among the person's own goals (exactly one). */
function privateGoal(env: Env, h: Helpers, named: string): {ok: true; id: string; name: string} | {ok: false; message: string} {
  const byHandle = h.goalOf(env, named);
  if (byHandle.ok) {
    const id = byHandle.found.id.startsWith('private:') ? byHandle.found.id.slice('private:'.length) : null, goal = id ? env.stores.platform.goals.find(g => g.id === id) : undefined;
    return goal ? {ok: true, id: goal.id, name: goal.name} : {ok: false, message: 'That goal is not one of your own goals in Goals, so nothing was proposed.'};
  }
  const words = named.trim().toLowerCase().replace(/\s+goal$/, ''), open = env.stores.platform.goals.filter(g => g.status !== 'closed');
  const exact = open.filter(g => g.name.trim().toLowerCase() === words), near = exact.length ? exact : open.filter(g => g.name.toLowerCase().includes(words) || words.includes(g.name.toLowerCase()));
  if (near.length === 1) return {ok: true, id: near[0]!.id, name: near[0]!.name};
  return {ok: false, message: near.length ? `More than one goal matches "${named.slice(0, 60)}"; name it exactly.` : `No goal of yours is called "${named.slice(0, 60)}".`};
}
/** A habit by handle or title, or a habit another card of this reply creates (new1). */
function habitFor(env: Env, h: Helpers, named: string): {ok: true; id: string; title: string; pending: boolean} | {ok: false; message: string} {
  if (/^new\d{1,2}$/i.test(named.trim())) {
    const ref = env.refs?.get(named.trim().toLowerCase());
    return ref ? {ok: true, id: ref.id, title: ref.title, pending: !env.stores.habits.habits.some(x => x.id === ref.id)} : {ok: false, message: 'This rule belongs to a habit that is not proposed in this reply, so nothing was proposed.'};
  }
  const found = h.habitOf(env, named);
  return found.ok ? {ok: true, id: found.habit.id, title: found.habit.title, pending: false} : found;
}

export function planAkAction(action: Action, env: Env, h: Helpers): PlanResult | null {
  const at = env.now.toISOString();
  switch (action.kind) {
    case 'set-auto-rule': {
      const habit = habitFor(env, h, action.habit); if (!habit.ok) return h.refuse(habit.message);
      const records = recordsOf(env); if (records.unreadable) return h.refuse(AK_RECORDS_UNREADABLE);
      let goalId: string | undefined, goalName: string | undefined;
      if (action.source === 'contribution') { const g = privateGoal(env, h, action.goal!); if (!g.ok) return h.refuse(g.message); goalId = g.id; goalName = g.name; }
      const comparator = action.threshold !== undefined && action.threshold > 0 ? 'at-least' as const : 'recorded' as const;
      const input = {source: action.source, comparator, habitId: habit.id, ...(comparator === 'at-least' ? {threshold: action.threshold} : {}), ...(goalId ? {goalId} : {}), ...(action.workout_type ? {workoutType: action.workout_type} : {}), ...(action.paused ? {paused: true as const} : {})};
      const issue = autoRuleIssue({...input, unit: newUnit(action.source)}); if (issue) return h.refuse(issue);
      if (healthLinkedHabitIds().has(habit.id) && ['steps', 'sleep', 'water', 'active-minutes'].includes(action.source)) return h.refuse(`${habit.title} already ticks itself off from Health. Change that link in the habit instead.`);
      // One rule per habit and source: a second card for the same pair changes the rule that is there.
      const existing = records.autoRules.rules.find(r => r.habitId === habit.id && r.source === action.source && (r.source !== 'contribution' || r.goalId === goalId));
      let rule: AutoRule;
      try { rule = newAutoRule(input, env.now, existing?.id ?? crypto.randomUUID()); } catch { return h.refuse('This rule cannot be set as proposed; set it in the habit itself.'); }
      if (existing) rule = {...rule, createdAt: existing.createdAt};
      const sentence = ruleSentence(rule, habit.title, goalName), before = existing ? ruleSentence(existing, habit.title, goalName) : null;
      if (existing && before === sentence && !!existing.paused === !!rule.paused) return h.refuse(`That rule is already set: ${sentence}.`);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Auto-complete: ${sentence}`, lines: [
        ...(before ? [`Replaces: ${before}${existing?.paused ? ' (paused)' : ''}`] : ['A new rule, kept on this device']), ...(rule.paused ? ['Kept paused: it ticks nothing until you turn it on'] : ['The day is ticked when your own records meet it; Undo on the tick puts the day back']),
        ...(habit.pending ? [`For the new habit "${habit.title}": add that card first`] : []), 'Change or remove it in the habit’s rules'], where: 'Habits · Auto-complete', day: null, estimate: false},
        write: () => ({}), undo: null, device: {key: AUTO_RULES_KEY, patch: {set: rule}, label: `Rule set: ${sentence}`}}};
    }
    case 'set-bill-reminder': {
      const records = recordsOf(env); if (records.unreadable) return h.refuse(AK_RECORDS_UNREADABLE);
      const key = action.title.trim().toLowerCase(), existing = records.bills.bills.find(b => b.title.trim().toLowerCase() === key);
      if (existing) {
        const note = action.note?.trim() || existing.cancelNote || '';
        if (!note) return h.refuse(`${existing.title} is already in your bills. Change its amount or date in Wealth → Upcoming bills.`);
        return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Note on ${existing.title}`, lines: [note, ...(action.cancel_by ? [`Remind me by ${day(action.cancel_by)}`] : []), 'A note to yourself: ZIGoals never pays, cancels or moves money', 'Change it in Wealth → Upcoming bills'], where: 'Wealth → Upcoming bills', day: null, estimate: false},
          write: () => ({}), undo: null, device: {key: BILLS_KEY, patch: {note: {billId: existing.id, note, ...(action.cancel_by ? {cancelBy: action.cancel_by} : {})}}, label: `Note kept on ${existing.title}`}}};
      }
      if (action.amount === undefined) return h.refuse(`Say how much ${action.title} is, and when it is next due.`);
      if (!action.next_due) return h.refuse(`Say when ${action.title} is next due (a date).`);
      const amount = typeof action.amount === 'number' ? (Math.round(action.amount * 100) / 100).toFixed(2).replace(/\.00$/, '') : action.amount.replace(',', '.');
      const currency = action.currency ?? 'EUR', cadence = action.cadence ?? 'monthly';
      const issue = manualBillIssue({title: action.title, amount, currency, cadence, nextDue: action.next_due}); if (issue) return h.refuse(issue);
      const bill = {id: crypto.randomUUID(), title: action.title.trim().slice(0, 80), amount, currency, cadence, nextDue: action.next_due, createdAt: at, ...(action.category ? {category: action.category} : {}), ...(action.note?.trim() ? {note: action.note.trim(), ...(action.cancel_by ? {cancelBy: action.cancel_by} : {})} : {})};
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Bill reminder: ${bill.title}`, lines: [`${amount} ${currency}, ${cadence}; next due ${day(action.next_due)}`, ...(bill.note ? [`Note: ${bill.note}`] : []), 'A reminder only: ZIGoals never pays, cancels or moves money', 'Remove it in Wealth → Upcoming bills'], where: 'Wealth → Upcoming bills', day: null, estimate: false},
        write: () => ({}), undo: null, device: {key: BILLS_KEY, patch: {add: bill}, label: `Bill reminder added: ${bill.title}`}}};
    }
    case 'grocery-list': {
      const weekStart = addLocalDays(mondayOf(env.healthDay), action.week === 'next' ? 7 : 0), seen = new Set<string>();
      const names = action.items.map(i => i.trim().slice(0, 120)).filter(i => { const k = i.toLowerCase(); if (!i || seen.has(k)) return false; seen.add(k); return true; });
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Add to your grocery list: ${names.length} ${names.length === 1 ? 'item' : 'items'}`, lines: [names.join(', '), `${action.week === 'next' ? 'Next week' : 'This week'}, from ${day(weekStart)}`, 'Remove an item on the grocery list itself'], where: 'Health → Planner', day: null, estimate: false},
        write: () => ({}), undo: null, healthContent: true, device: {key: GROCERY_KEY, patch: {add: {weekStart, names, at}}, label: `On your grocery list: ${names.length} ${names.length === 1 ? 'item' : 'items'}`}}};
    }
    case 'goal-draft': {
      const today = env.healthDay, value = action.type === 'VALUE';
      const draft = goalWizardDraft({name: action.name, kind: value ? 'value' : 'project', ...(action.target !== undefined ? {target: action.target} : {}), ...(action.currency ? {currency: action.currency} : {}), ...(action.date ? {date: action.date} : {}), ...(action.milestones ? {milestones: action.milestones} : {})}, today);
      const lines = [
        value ? (draft.target ? `Target ${draft.target} ${draft.asset}` : action.target !== undefined ? `Target ${plain(action.target)} ${action.currency ?? ''}: type it in the form (it takes USD or EUR)`.replace(' :', ':') : 'Target: type it in the form') : `${(action.milestones ?? []).length} milestones`,
        ...(draft.date ? [`By ${day(draft.date)}`] : action.date ? ['The date is past: choose one in the form'] : []),
        ...(action.suggested_per_month !== undefined ? [`About ${plain(action.suggested_per_month)} ${action.currency ?? ''} a month would reach it by then: a suggestion, not filled in`.replace('  ', ' ')] : []),
        'Opens the goal form filled in; nothing is saved until you create the goal there'];
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Goal form, filled in: ${action.name}`, lines, where: 'Goals → New goal', day: null, estimate: false},
        write: () => ({}), undo: null, navigate: {href: '/app/goals/new', label: 'Goals → New goal'}, ak: {stash: {key: GOAL_WIZARD_DRAFT_KEY, value: draft}, button: 'Open the form'}}};
    }
    case 'what-if': {
      const named = privateGoal(env, h, action.goal); if (!named.ok) return h.refuse(named.message);
      const goal = env.stores.platform.goals.find(g => g.id === named.id)!, summary = unifiedGoalSummaries([], {}, env.stores.platform, [], env.now.getTime()).find(s => s.key === `private:${goal.id}`);
      if (!summary || goal.type === 'PROJECT' || summary.progressBound === 'unavailable' || !summary.target) return h.refuse(`${goal.name} has no known value here, so ZIGi cannot project it. Its page shows what is known.`);
      const current = Number(summary.current), target = Number(summary.target), today = env.healthDay;
      if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return h.refuse(`${goal.name} has no known value here, so ZIGi cannot project it.`);
      const pace = pace30(privateGoalPoints(goal, env.stores.platform.contributions ?? [], current, today), current, target, today);
      const targetDate = action.target_date && action.target_date > today ? action.target_date : null;
      const result = whatIf({current, target, today, pace}, {extraPerMonth: action.extra_per_month, regular: action.regular_amount ? {amount: action.regular_amount, every: action.regular_every ?? 'month'} : null, targetDate});
      const unit = summary.currency, needed = targetDate ? requiredPace(current, target, today, targetDate) : null;
      const changes = [action.extra_per_month ? `${plain(action.extra_per_month)} ${unit} more a month` : '', action.regular_amount ? `${plain(action.regular_amount)} ${unit} every ${action.regular_every === 'two-weeks' ? 'two weeks' : action.regular_every ?? 'month'}` : '', targetDate ? `a target date of ${day(targetDate)}` : ''].filter(Boolean);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `What if: ${goal.name}`, lines: [`With ${changes.join(' and ')}`, paceSentence(pace, day), whatIfSentence(result, day),
        ...(needed ? [`${day(targetDate!)} needs about ${plain(needed.perMonth)} ${unit} a month from now${result.meetsTargetDate ? '; this pace gets there' : ''}`] : []), PROJECTION_LABEL, 'Nothing is written; the goal page has the same what-if to try more'], where: 'Goals · a projection', day: null, estimate: false},
        write: () => ({}), undo: null, navigate: {href: `${summary.href}#what-if`, label: `Goals → ${goal.name} → What if…`}, ak: {button: 'Open the what-if'}}};
    }
    case 'scan-food': {
      const views = {
        barcode: {href: `/app/health${action.barcode ? `?barcode=${action.barcode}` : ''}#diary`, label: 'Health → Diary → Scan or look up a food barcode', line: action.barcode ? `Barcode ${action.barcode}, filled in: the barcode fold opens with it; press Look up barcode` : 'Open the barcode fold under the diary; the camera asks first'},
        label: {href: '/app/health#foods', label: 'Health → Foods & recipes → Read the label from a photo', line: 'In a new food, “Read the label from a photo”: the photo goes to your own AI when you send it'},
        'meal-photo': {href: '/app/health#foods', label: 'Health → Foods & recipes → A photo of a meal', line: 'Under “A photo of a meal”: the estimate goes to your own AI when you send it'},
      }[action.mode];
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: action.mode === 'barcode' ? 'Log a food by its barcode' : action.mode === 'label' ? 'Read a food label from a photo' : 'Estimate a meal from a photo', lines: [views.line, 'Nothing is logged until you check the values and confirm there'], where: 'Health', day: null, estimate: false},
        write: () => ({}), undo: null, healthContent: true, navigate: {href: views.href, label: views.label}, ak: {button: 'Open'}}};
    }
    case 'start-soundscape': {
      const preset = SOUNDSCAPE_PRESETS[action.preset], minutes = preset.timerMin;
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Play the ${preset.label} soundscape`, lines: ['Made on this device: nothing is downloaded', minutes ? `Fades out after ${minutes} minutes` : 'Plays until you stop it', 'Stop it from the music button'], where: 'Music', day: null, estimate: false},
        write: () => ({}), undo: null, ak: {soundscape: action.preset, button: 'Play'}}};
    }
    default: return null;
  }
}
const newUnit = (source: AutoRule['source']) => ({steps: 'steps', sleep: 'hours', workout: 'minutes', water: 'mL', contribution: 'goal-unit', 'active-minutes': 'minutes'} as const)[source];

/**
 * The goal bundle's reader (installed into schema-ak.ts): the person's words through Session AK's own parser into the
 * cards Quick add's review offers: each habit (with its auto-complete rule, as a card of its own) and the goal as the
 * Goal wizard filled in. A suggested monthly amount is shown on the goal's card and never filled in.
 */
export function readGoalBundle(words: string, next: () => string, today = localDate()): Record<string, unknown>[] | string {
  const bundle = parseGoalBundle(words, today);
  if (!bundle || (!bundle.goal && !bundle.habits.length)) return 'ZIGi could not read a goal or a habit in those words. Try “save €5,000 for a trip by June and walk 8k steps most days”.';
  const parts: Record<string, unknown>[] = [];
  if (bundle.goal) {
    const g = bundle.goal, plan = bundle.contributionPlan;
    parts.push({kind: 'goal-draft', name: g.name, type: g.kind === 'value' ? 'VALUE' : 'PROJECT', ...(g.target !== undefined ? {target: g.target} : {}), ...(g.currency ? {currency: g.currency} : {}), ...(g.date && g.date > today ? {date: g.date} : {}),
      ...(g.milestones?.length ? {milestones: g.milestones.slice(0, 10)} : {}), ...(plan && plan.perMonth > 0 ? {suggested_per_month: Math.round(plan.perMonth * 100) / 100} : {})});
  }
  for (const habit of bundle.habits) {
    const input = bundleHabitInput(habit, bundle.lifeArea), m = input.measurement;
    const unit = m && 'unit' in m && typeof m.unit === 'string' ? m.unit.slice(0, 24) : '';
    const measurement = !m || m.kind === 'boolean' ? 'done' : m.kind === 'duration' ? 'minutes' : unit ? {unit} : 'count';
    const schedule = habit.schedule.kind === 'daily' ? 'daily' : {timesPerWeek: Math.min(7, Math.max(1, habit.schedule.times))};
    // A contribution rule needs a goal the person already has; the bundle's own goal is not created yet, so it is left to the habit's rules.
    const rule = habit.autoRule && habit.autoRule.source !== 'contribution' ? habit.autoRule : undefined, ref = rule ? next() : undefined;
    parts.push({kind: 'create-habit', title: input.title, measurement, ...(input.target !== undefined ? {target: input.target} : {}), schedule, ...(ref ? {ref} : {})});
    if (rule && ref) parts.push({kind: 'set-auto-rule', habit: ref, source: rule.source, ...(rule.comparator === 'at-least' && rule.threshold !== undefined ? {threshold: rule.threshold} : {})});
  }
  return parts;
}
