import {goalQty} from '../tools/format';
import {isUnitWord, unitWord} from '../../goals/goal-units';
import {ACCOUNTS, isDebtKind, type Accounts} from '../../accounts/schema';
import {DEBT_PLANNER, DEBT_PLANNER_KEY, type DebtPlannerRecord} from '../../debt-planner/store';
import {centsText, parseCents, rateE4} from '../../debt-planner/plan';
import {SAVINGS_CHALLENGES, SAVINGS_CHALLENGES_KEY, WEEKS, yearTotal, type Challenge, type SavingsChallenges} from '../../savings-challenges/challenges';
import {SUPPLEMENTS, SUPPLEMENTS_KEY, type Supplements} from '../../supplements/schema';
import {dayDoses} from '../../supplements/log';
import {AGENDA_KEY} from '../../agenda/store';
import {readDeviceRecord} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import {formatClock, formatDate, formatNumber} from '../../visual-format';
import {DEBT_MODEL, DEBT_PLANNER_WHERE, debtFreeMonth, debtMoney, debtView} from '../tools/f9-debt';
import './ak-f9-writes';
import {planNovaAction} from './plan-nova';
import type {AaHelpers} from './plan-aa';
import type {Env, PlanResult} from './plan';
import type {Action} from './schema';

/**
 * Owner follow-up 1 (F9): the planner's cases for the F4–F5 cards, in the lazy planner chunk beside plan-ak.ts. Every card
 * is `target: 'form'`: never batched, never automatic (auto-accept's never list), and each says what it changes and where
 * it is changed back (no Undo on the card: like Session AK's other device-record cards, the record's own page changes it).
 * Money is never moved, paid or signed: the debt planner's figures and a challenge are kept on this device for the
 * person's own planning; health is the person's own log, with no advice and no dose check. Names are matched against the
 * person's own records (one match, never a guess); the records come from `env.akRecords` when the caller has them, else
 * from this device's storage at the moment the card is planned.
 */
export type F9Records = {supplements?: Supplements | null; accounts?: Accounts | null; debtPlanner?: DebtPlannerRecord | null; savingsChallenges?: SavingsChallenges | null};
const UNREADABLE = 'The records for this card cannot be read on this device, so nothing was proposed.';
function read<K extends keyof F9Records>(env: Env, key: K): NonNullable<F9Records[K]> | null {
  const given = (env.akRecords as {f9?: F9Records} | undefined)?.f9;
  if (given && key in given) return (given[key] ?? null) as NonNullable<F9Records[K]> | null;
  const spec = {supplements: SUPPLEMENTS, accounts: ACCOUNTS, debtPlanner: DEBT_PLANNER, savingsChallenges: SAVINGS_CHALLENGES}[key];
  try { const r = readDeviceRecord(getAppStorage(), spec as never) as {data: unknown; unreadable: boolean}; return r.unreadable ? null : r.data as NonNullable<F9Records[K]>; } catch { return null; }
}
const fold = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
/** One match by exact name, else by a name that contains the words (or the other way round); more than one is a question. */
function byName<T extends {name: string}>(list: readonly T[], named: string): {ok: true; item: T} | {ok: false; many: boolean} {
  const key = fold(named), exact = list.filter(x => fold(x.name) === key);
  const near = exact.length ? exact : list.filter(x => fold(x.name).includes(key) || key.includes(fold(x.name)));
  return near.length === 1 ? {ok: true, item: near[0]!} : {ok: false, many: near.length > 1};
}
const cents = (n: number) => centsText(BigInt(Math.round(n * 100)));
/** Units of a goal's decimals as decimal text ("150" with 2 decimals → "1.5"). */
function decimalText(units: bigint, decimals: number): string {
  if (decimals <= 0) return units.toString();
  const raw = units.toString().padStart(decimals + 1, '0'), whole = raw.slice(0, -decimals), frac = raw.slice(-decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export function planAkF9Action(action: Action, env: Env, h: AaHelpers): PlanResult | null {
  const at = env.now.toISOString();
  switch (action.kind) {
    case 'log-supplement': {
      const record = read(env, 'supplements'); if (!record) return h.refuse(UNREADABLE);
      const day = h.resolveDay(action.day, env.healthDay, env.healthDay); if (!day.ok) return h.refuse(day.message);
      const found = byName(record.items ?? [], action.name), status = action.status;
      if (!found.ok && found.many) return h.refuse(`More than one item on your supplements list matches "${action.name.slice(0, 60)}"; name it exactly.`);
      const what = status === 'taken' ? 'Taken' : 'Skipped', when = h.dayLabel(day.day, env.healthDay);
      const common = ['Your own log: no advice and no dose check', 'Change or clear it in Health → Diary → Supplements and medication'];
      if (!found.ok) {
        // Not on the list yet: added as needed and marked at once (the person can give it times in the log).
        const id = `supp_${crypto.randomUUID()}`, name = action.name.trim().slice(0, 60), dose = action.dose?.trim().slice(0, 60) || undefined;
        return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `${what}: ${name}${dose ? ` (${dose})` : ''}`, lines: [`New on your list, as needed; ${what.toLowerCase()} ${when}`, ...common], where: 'Health → Supplements', day: day.day, estimate: false},
          write: () => ({}), undo: null, healthContent: true, ak: {button: status === 'taken' ? 'Log it' : 'Mark skipped'},
          device: {key: SUPPLEMENTS_KEY, patch: {add: {id, name, ...(dose ? {dose} : {}), kind: 'supplement', createdAt: at}, mark: {itemId: id, date: day.day, slot: 'any', status, at}}, label: `${what}: ${name}`}}};
      }
      const item = found.item, doses = dayDoses(record, day.day).filter(d => d.itemId === item.id);
      // An as-needed item has one mark a day ("any"); a planned one is marked at one of the day's times.
      if (item.times.length && !doses.length) return h.refuse(`${item.name} is not planned on ${when}. Log an extra dose in Health → Diary → Supplements and medication.`);
      let slot = 'any';
      if (item.times.length) {
        // No time named: the first dose not logged yet, else the one dose of the day when it says otherwise (a correction).
        const asked = action.time ? doses.find(d => d.slot === action.time) : doses.find(d => d.status === null) ?? (doses.length === 1 && doses[0]!.status !== status ? doses[0] : undefined);
        if (action.time && !asked) return h.refuse(`${item.name} is planned at ${doses.map(d => formatClock(d.slot)).join(', ')}; name one of those times.`);
        if (!asked) return h.refuse(`Every planned dose of ${item.name} ${when} is already logged.`);
        slot = asked.slot;
      }
      const prior = (record.log ?? []).find(m => m.itemId === item.id && m.date === day.day && m.slot === slot);
      if (prior?.status === status) return h.refuse(`${item.name} is already marked ${status} ${when}${slot === 'any' ? '' : ` at ${formatClock(slot)}`}.`);
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `${what}: ${item.name}${item.dose ? ` (${item.dose})` : ''}`, lines: [`${when}${slot === 'any' ? '' : `, the ${formatClock(slot)} dose`}${prior ? ` (was ${prior.status})` : ''}`, ...common], where: 'Health → Supplements', day: day.day, estimate: false},
        write: () => ({}), undo: null, healthContent: true, ak: {button: status === 'taken' ? 'Log it' : 'Mark skipped'},
        device: {key: SUPPLEMENTS_KEY, patch: {mark: {itemId: item.id, date: day.day, slot, status, at}}, label: `${what}: ${item.name}`}}};
    }
    case 'set-debt-plan': {
      const accounts = read(env, 'accounts'), planner = read(env, 'debtPlanner'); if (!accounts || !planner) return h.refuse(UNREADABLE);
      const today = env.habitDay, debts = accounts.items.filter(a => !a.archivedAt && isDebtKind(a.kind));
      const set: Record<string, string> = {}, lines: string[] = [];
      let currency = planner.currency;
      if (action.debt) {
        const found = byName(debts, action.debt);
        if (!found.ok) return h.refuse(found.many ? `More than one of your debts matches "${action.debt.slice(0, 60)}"; name it exactly.` : `No debt of yours is called "${action.debt.slice(0, 60)}". Add it under Wealth → Accounts, debts & net worth first.`);
        const debt = found.item; set.debtId = debt.id; currency = debt.currency; set.currency = debt.currency;
        if (action.minimum !== undefined) { const c = parseCents(cents(action.minimum)); if (c === null || c <= 0n) return h.refuse('A minimum payment is an amount above zero.'); set.minimum = centsText(c); lines.push(`Minimum payment for ${debt.name}: ${debtMoney(c, debt.currency)} a month`); }
        if (action.rate_percent !== undefined) {
          if (debt.ratePercent) return h.refuse(`${debt.name}'s yearly rate comes from its account (${debt.ratePercent} %); change it there, in Wealth → Accounts, debts & net worth.`);
          const rate = String(Math.round(action.rate_percent * 10_000) / 10_000); if (rateE4(rate) === null) return h.refuse('A yearly rate is a number from 0 to 100.');
          set.ratePercent = rate; lines.push(`Yearly rate for ${debt.name}: ${rate} %`);
        }
      }
      if (action.extra_per_month !== undefined) {
        if (!currency) { const own = [...new Set(debts.map(d => d.currency))]; if (own.length !== 1) return h.refuse('Say which debt the extra amount is for, so ZIGi knows its currency.'); currency = own[0]; set.currency = own[0]!; }
        set.extra = cents(action.extra_per_month); lines.push(action.extra_per_month > 0 ? `Extra a month, on top of the minimums: ${debtMoney(parseCents(set.extra)!, currency!)}` : 'No extra amount a month');
      }
      const kept = planner.debts?.[set.debtId ?? ''];
      if ((set.minimum === undefined || kept?.minimum === set.minimum) && (set.ratePercent === undefined || kept?.ratePercent === set.ratePercent) && (set.extra === undefined || (planner.extra ?? '0.00') === set.extra || (!planner.extra && Number(set.extra) === 0))) return h.refuse('The planner already keeps these figures.');
      // The planner with these figures, as a preview (a model, not advice).
      const after = {...planner, ...(set.currency ? {currency: set.currency} : {}), debts: {...(planner.debts ?? {}), ...(set.debtId ? {[set.debtId]: {...(kept ?? {}), ...(set.minimum ? {minimum: set.minimum} : {}), ...(set.ratePercent ? {ratePercent: set.ratePercent} : {})}} : {})}, ...(set.extra !== undefined ? {extra: set.extra} : {})};
      const view = debtView(accounts, after, today).find(v => v.currency === currency);
      const preview = view?.comparison ? (() => { const m = debtFreeMonth(today, view.comparison.avalanche.months); return m ? `With these figures: debt-free in ${m} (avalanche)` : 'With these figures the debts are not cleared within 100 years'; })() : view?.issue ? `Still needed: ${view.issue.replace(/^The planner needs /, '')}` : null;
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Debt planner figures', lines: [...lines, ...(preview ? [preview] : []), DEBT_MODEL, 'Kept on this device for the planner; your accounts are not changed and nothing is paid', `Change it in ${DEBT_PLANNER_WHERE}`], where: 'Wealth → Debt planner', day: null, estimate: false},
        write: () => ({}), undo: null, ak: {button: 'Keep these figures'}, device: {key: DEBT_PLANNER_KEY, patch: {set}, label: 'Debt planner figures kept'}}};
    }
    case 'start-savings-challenge': {
      const record = read(env, 'savingsChallenges'); if (!record) return h.refuse(UNREADABLE);
      const named = privateGoalNamed(env, h, action.goal); if (!named.ok) return h.refuse(named.message);
      const goal = env.stores.platform.goals.find(g => g.id === named.id)!;
      if (goal.status === 'closed' || goal.type === 'PROJECT') return h.refuse(`${goal.name} is ${goal.status === 'closed' ? 'closed' : 'a project goal'}; a savings challenge sits beside an open goal with an amount.`);
      if (record.goals[goal.id]) return h.refuse(`${goal.name} already has a ${record.goals[goal.id]!.kind} challenge; stop it on the goal's page first.`);
      const start = action.start && action.start >= env.habitDay ? action.start : env.habitDay;
      let challenge: Challenge, lines: string[];
      if (action.challenge === '52-week') {
        const units = BigInt(Math.round(action.step! * 10 ** Math.min(goal.decimals, 6))) * 10n ** BigInt(Math.max(0, goal.decimals - 6));
        if (units <= 0n) return h.refuse(`The step is an amount in ${isUnitWord(goal.asset) ? unitWord(goal.asset) : goal.asset} above zero.`);
        const step = decimalText(units, goal.decimals), order = action.order ?? 'up';
        challenge = {kind: '52-week', startedOn: start, step, order};
        lines = [`Week 1 puts aside ${goalQty(step, goal.asset)}, week 52 ${goalQty(decimalText(units * BigInt(WEEKS), goal.decimals), goal.asset)}${order === 'down' ? ' (counting down: the biggest week first)' : ''}`, `The year adds up to ${goalQty(decimalText(yearTotal(units), goal.decimals), goal.asset)}`];
      } else if (action.challenge === 'no-spend') {
        const target = action.target_days ?? 30; challenge = {kind: 'no-spend', startedOn: start, targetDays: target, noSpendDays: []};
        lines = [`Aiming for ${formatNumber(target)} no-spend days; you mark each day yourself (a day with nothing logged is not counted)`];
      } else {
        const roundTo = action.round_to ?? 1; challenge = {kind: 'round-up', startedOn: start, roundTo};
        lines = [`Each expense you log is rounded up to the next ${roundTo} of its currency; the round-ups add up on the goal's page`];
      }
      const title = {'52-week': '52-week savings challenge', 'no-spend': 'No-spend days', 'round-up': 'Round-ups by hand'}[action.challenge];
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `${title}: ${goal.name}`, lines: [`From ${formatDate(start)}`, ...lines, 'Progress comes only from what you record; ZIGoals never moves money or records a contribution', 'Stop it on the goal\'s page'], where: `Goals → ${goal.name}`, day: null, estimate: false},
        write: () => ({}), undo: null, ak: {button: 'Start the challenge'}, device: {key: SAVINGS_CHALLENGES_KEY, patch: {start: {goalId: goal.id, challenge}}, label: `${title} started: ${goal.name}`}}};
    }
    case 'open-agenda': {
      const view = action.view, words = view === 'day' ? 'today' : view === 'month' ? 'this month' : view === 'week' ? 'this week' : null;
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: `Open the agenda${words ? `: ${words}` : ''}`, lines: ['Your plans from every page in one calendar: habits, contributions, bills, meals, reviews; each item opens where it lives',
        'A calendar file (.ics) can be downloaded there; nothing is sent anywhere', view ? 'The view is kept as the agenda\'s choice on this device' : 'Nothing is written'], where: 'Navigation', day: null, estimate: false},
        write: () => ({}), undo: null, navigate: {href: '/app/agenda', label: 'Agenda'}, ak: {button: 'Open the agenda'}, ...(view ? {device: {key: AGENDA_KEY, patch: {view}, label: `Agenda: ${words}`}} : {})}};
    }
    case 'open-wrapped':
      return {ok: true, plan: {target: 'form', card: {kind: action.kind, title: 'Open ZIGoals Wrapped', lines: ['Your year so far from your own records; each card shows its numbers when you open it',
        'Ready from 1 December, or once the year holds 30 logged days', 'Nothing is shared or written'], where: 'Journey', day: null, estimate: false},
        write: () => ({}), undo: null, navigate: {href: '/app/journey?wrapped=open', label: 'Journey → ZIGoals Wrapped'}, ak: {button: 'Open Wrapped'}}};
    // Owner follow-up 2 (N5): NOVA's cards, in the same chunk.
    default: return planNovaAction(action, env, h);
  }
}
/** A private goal by its handle, else by its name among the person's own open goals (exactly one). */
function privateGoalNamed(env: Env, h: AaHelpers, named: string): {ok: true; id: string} | {ok: false; message: string} {
  const byHandle = h.goalOf(env, named);
  if (byHandle.ok) {
    const id = byHandle.found.id.startsWith('private:') ? byHandle.found.id.slice('private:'.length) : null;
    return id && env.stores.platform.goals.some(g => g.id === id) ? {ok: true, id} : {ok: false, message: 'That goal is not one of your own goals in Goals, so nothing was proposed.'};
  }
  const found = byName(env.stores.platform.goals.filter(g => g.status !== 'closed'), named.replace(/\s+goal$/i, ''));
  return found.ok ? {ok: true, id: found.item.id} : {ok: false, message: found.many ? `More than one goal matches "${named.slice(0, 60)}"; name it exactly.` : `No goal of yours is called "${named.slice(0, 60)}".`};
}
