import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../af-checklist-keys';
import {findItemByName} from '../../checklist/commands';
import {CHECKLIST_LIMIT_MESSAGE, MAX_PATH_ITEMS, isFavourite, isHealthItem, orderedItems} from '../../checklist/store';
import {latestHabitRule, type Habit} from '../../habits';
import {ZIGI_KEY} from '../store/keys';
import type {Handle} from '../context/types';
import {CHECKLIST_UNREADABLE} from './checklist-writes';
import {amountText, VALOPER, type StakingPrefillValues} from './staking-prefill';
import type {AaHelpers} from './plan-aa';
import type {Env, PlanResult} from './plan';
import type {Action} from './schema';

/**
 * Session AF (L4; ADR-028 D7, H47, H73): the planner's cases for this session's kinds, in the lazy planner chunk (loaded
 * with plan-aa.ts, so no new request at page load). Every write goes through its owner's own path: a habit dot is the
 * habit's own check-in plan (exact Undo), a Checklist item and a star are the Checklist lane's device entries
 * (checklist-writes.ts), the brief's choices are ZIGi's own record, and the staking card only fills in the Staking page's
 * review (`staking`, a hand-off like the money pre-fills: `target: 'form'`, no write, never batched, never automatic).
 */
export type AfHelpers = AaHelpers & {plan: (action: Action, env: Env) => PlanResult};
const SYNTHETIC = 'h999';
const active = (env: Env) => env.stores.habits.habits.filter(h => latestHabitRule(h).state === 'active');
/** A habit by its handle (the reply's context), else by its title among the person's active habits (one, never a guess). */
function habitNamed(env: Env, h: AfHelpers, named: string): Habit | null {
  const byHandle = h.habitOf(env, named); if (byHandle.ok) return byHandle.habit;
  const key = named.trim().toLowerCase(), habits = active(env);
  const exact = habits.filter(x => x.title.trim().toLowerCase() === key); if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  const found = findItemByName(habits.map(x => ({id: x.id, label: x.title})), named);
  return found ? habits.find(x => x.id === found.id) ?? null : null;
}
/** The habit's own check-in plan, named through a handle only this plan uses (the reply's handles stay as they are). */
function checkInPlan(env: Env, h: AfHelpers, habit: Habit, done: boolean, day: string): PlanResult {
  const handles: Handle[] = [...env.handles.filter(x => x.handle !== SYNTHETIC), {handle: SYNTHETIC, kind: 'habit', id: habit.id, label: habit.title}];
  return h.plan({kind: 'check-in', habit: SYNTHETIC, day, ...(done ? {} : {value: 0})} as Action, {...env, handles});
}
const checklistOf = (env: Env, h: AfHelpers): {ok: true; value: NonNullable<Env['checklist']>} | {ok: false; result: PlanResult} => {
  if (!env.checklist) return {ok: false, result: h.refuse('The Checklist is not on this device yet, so nothing was proposed.')};
  if (env.checklist.unreadable) return {ok: false, result: h.refuse(CHECKLIST_UNREADABLE)};
  return {ok: true, value: env.checklist};
};
export function planAfAction(action: Action, env: Env, h: AfHelpers): PlanResult | null {
  switch (action.kind) {
    case 'checklist-tick': {
      const day = h.resolveDay(action.day, env.habitDay, env.habitDay); if (!day.ok) return h.refuse(day.message);
      const list = env.checklist && !env.checklist.unreadable ? env.checklist : null;
      if (list) {
        // The dots on today's path: the person's own items by their words, habit dots by the habit's title.
        const items = orderedItems(list.record).map(item => {
          const habit = !isHealthItem(item) && item.kind === 'habit' ? env.stores.habits.habits.find(x => x.id === item.ref?.habitId) : undefined;
          return {id: item.id, kind: isHealthItem(item) ? 'health' : item.kind, label: habit?.title ?? item.label ?? '', habit};
        }).filter(i => i.label);
        const hit = findItemByName(items, action.item);
        if (hit?.kind === 'custom') {
          if (day.day !== list.date) return h.refuse('Your own Checklist items are ticked for today only; tick another day on the Checklist itself.');
          return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `${action.done ? 'Tick' : 'Untick'} on your Checklist: ${hit.label}`, lines: [action.done ? 'Your own item, marked done for today' : 'Your own item, marked not done for today', 'Tap the dot again on the Checklist to change it back'], where: 'Checklist', day: h.dayLabel(day.day, env.habitDay), estimate: false},
            write: () => ({}), undo: null, device: {key: CHECKLIST_DAYS_KEY, patch: {check: {item: hit.label, done: action.done, day: list.date}}, label: `${action.done ? 'Ticked' : 'Unticked'} on your Checklist: ${hit.label}`}}};
        }
        if (hit?.kind === 'habit' && hit.habit) {
          const p = checkInPlan(env, h, hit.habit, action.done, action.day); if (!p.ok) return p;
          return {ok: true, plan: {...p.plan, card: {...p.plan.card, kind: action.kind, lines: [...p.plan.card.lines, 'Your Checklist dot follows the check-in']}}};
        }
        if (hit?.kind === 'health') return h.refuse(`${hit.label} logs a Health entry: say how much ("log a glass of water"), or tick it on the Checklist itself.`);
        if (hit) return h.refuse(`${hit.label} is a goal step: tick it on the Checklist itself or in Goals.`);
      }
      // Not on the path (or no Checklist on this device): a habit of that name is checked in itself.
      const habit = habitNamed(env, h, action.item);
      if (!habit) return h.refuse(`No Checklist item or habit is called "${action.item}".`);
      const p = checkInPlan(env, h, habit, action.done, action.day); if (!p.ok) return p;
      return {ok: true, plan: {...p.plan, card: {...p.plan.card, kind: action.kind, lines: [...p.plan.card.lines, list ? 'Not on your Checklist: this checks in the habit itself' : 'A habit check-in']}}};
    }
    case 'checklist-add-favourite': {
      const list = checklistOf(env, h); if (!list.ok) return list.result;
      const habit = habitNamed(env, h, action.item);
      if (!habit) return h.refuse(`No habit is called "${action.item}". Star a goal from Goals, or add your own item ("add … to my checklist").`);
      if (isFavourite(list.value.record, {kind: 'habit', habitId: habit.id})) return h.refuse(`${habit.title} is already on your Checklist.`);
      if (list.value.record.items.length >= MAX_PATH_ITEMS) return h.refuse(CHECKLIST_LIMIT_MESSAGE);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Star on your Checklist: ${habit.title}`, lines: ['A dot on your path; ticking it checks in the habit', 'Take it off on the Checklist (Edit path) to change it back'], where: 'Checklist', day: null, estimate: false},
        write: () => ({}), undo: null, device: {key: CHECKLIST_KEY, patch: {star: {habitId: habit.id, label: habit.title}}, label: `On your Checklist: ${habit.title}`}}};
    }
    case 'checklist-add-custom': {
      const list = checklistOf(env, h); if (!list.ok) return list.result;
      const words = action.text.replace(/\s+/g, ' ').trim(), key = words.toLowerCase();
      if (orderedItems(list.value.record).some(i => !isHealthItem(i) && i.kind === 'custom' && (i.label ?? '').trim().toLowerCase() === key)) return h.refuse(`"${words}" is already on your Checklist.`);
      if (list.value.record.items.length >= MAX_PATH_ITEMS) return h.refuse(CHECKLIST_LIMIT_MESSAGE);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Add to your Checklist: ${words}`, lines: ['Your own item, a dot you tick on the path', 'Take it off on the Checklist (Edit path) to change it back'], where: 'Checklist', day: null, estimate: false},
        write: () => ({}), undo: null, device: {key: CHECKLIST_KEY, patch: {add: {text: words}}, label: `On your Checklist: ${words}`}}};
    }
    case 'set-brief': {
      const {kind, ...change} = action; void kind;
      const lines = [
        ...(change.morning !== undefined ? [`Morning brief on Today: ${change.morning ? 'on' : 'off'}`] : []),
        ...(change.evening !== undefined ? [`Evening recap: ${change.evening ? 'on' : 'off'}`] : []),
        ...(change.eveningTime ? [`Evening recap from ${change.eveningTime}`] : []),
        ...(change.earning !== undefined ? [`Earning line in the brief: ${change.earning ? 'on' : 'off'}`] : []),
        ...(change.readAloud !== undefined ? [`A brief you ask for by voice is ${change.readAloud ? 'read aloud' : 'not read aloud'}`] : []),
        'Kept on this device; change it again in Settings → ZIGi · Your day',
      ];
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Change your brief', lines, where: 'ZIGi · Your day', day: null, estimate: false},
        write: () => ({}), undo: null, device: {key: ZIGI_KEY, patch: {brief: change}, label: 'Your brief choices changed'}}};
    }
    case 'prefill-staking': {
      // The validator by its address, or by the name the Earn page read in this visit; never one ZIGi chose.
      const named = action.validator?.trim(), validators = env.earn?.validators ?? [];
      const byName = named && !VALOPER.test(named) ? validators.filter(v => v.moniker.trim().toLowerCase() === named.toLowerCase()) : [];
      const validator = named && VALOPER.test(named) ? named : byName.length === 1 ? byName[0]!.operator : undefined;
      const amount = action.action === 'claim' ? null : amountText(action.amount);
      if (action.amount !== undefined && action.action !== 'claim' && !amount) return h.refuse('That amount cannot go on the staking review; say it in ZIG, such as 100 or 12.5.');
      const staking: StakingPrefillValues = {network: action.network, action: action.action, ...(validator ? {validator} : {}), ...(amount ? {amount} : {})};
      const verb = {delegate: 'Stake', undelegate: 'Unstake', redelegate: 'Move stake', claim: 'Claim rewards'}[action.action];
      const who = validator ? (byName[0]?.moniker ?? `${validator.slice(0, 16)}…${validator.slice(-6)}`) : named ? `you choose (no validator named “${named}” in the list the Earn page read)` : 'you choose on the review';
      const lines = [
        `${verb}${amount ? ` ${amount} ZIG` : ''} · ${action.network === 'practice' ? 'practice network (no real value)' : 'real network (real ZIG; the review asks you to confirm the real network first)'}`,
        `Validator: ${who}`,
        'Opens the Staking page with these fields filled in; nothing is signed or sent until you review it there and sign in your own wallet',
        'ZIGi never signs, sends or holds keys',
      ];
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Fill in the staking review', lines, where: 'Staking · review', day: null, estimate: false}, write: () => ({}), undo: null, staking}};
    }
    default: return null;
  }
}
