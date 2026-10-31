import {AGENDA, AGENDA_KEY, setAgendaView, type AgendaRecord} from '../../agenda/store';
import {AGENDA_VIEWS} from '../../agenda/build';
import {DEBT_PLANNER, DEBT_PLANNER_KEY, debtPlannerSchema, type DebtPlannerRecord} from '../../debt-planner/store';
import {SAVINGS_CHALLENGES, SAVINGS_CHALLENGES_KEY, challengeSchema, setChallenge, type SavingsChallenges} from '../../savings-challenges/challenges';
import {SUPPLEMENTS, SUPPLEMENTS_KEY, SUPPLEMENT_KINDS, type Supplements} from '../../supplements/schema';
import {addSupplement, markSupplement} from '../../supplements/log';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Owner follow-up 1 (F9): four more device records a ZIGi card may change, each through its owner's own functions and
 * with one fixed patch shape, checked again here (a card's patch can never widen what it does):
 * - `zigoals:supplements:v1` `{mark}` or `{add, mark}`: one dose taken or skipped (markSupplement), after adding the item
 *   when the card names one the list does not have yet (addSupplement, as needed);
 * - `zigoals:debt-planner:v1` `{set: {debtId?, minimum?, ratePercent?, extra?, currency?}}`: the planner's own figures, the
 *   way its "Keep" stores them (the accounts record is never touched);
 * - `zigoals:savings-challenges:v1` `{start: {goalId, challenge}}`: a challenge beside a goal that has none yet;
 * - `zigoals:agenda:v1` `{view}`: the agenda's chosen view (a display choice).
 * Changing any of them back happens where it is listed (the supplements log, the planner, the goal's page, the agenda).
 * Registered by the planner chunk (plan-ak-f9.ts) before any of these cards can exist.
 */
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const NOT_A_CARD = 'That change is not one a card can make.';
const DAY = /^\d{4}-\d{2}-\d{2}$/, CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/, AMOUNT = /^\d{1,13}(\.\d{1,2})?$/, RATE = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,4})?$/;
const stamp = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const only = (patch: Record<string, unknown>, keys: readonly string[]) => Object.keys(patch).every(k => keys.includes(k));

export const supplementsEntry: Entry<Supplements> = {spec: SUPPLEMENTS, apply: (record, patch) => {
  if (!object(patch) || !object(patch.mark) || !only(patch, ['mark', 'add'])) throw new Error(NOT_A_CARD);
  const m = patch.mark;
  if (typeof m.itemId !== 'string' || typeof m.date !== 'string' || !DAY.test(m.date) || !(m.slot === 'any' || (typeof m.slot === 'string' && CLOCK.test(m.slot))) || (m.status !== 'taken' && m.status !== 'skipped') || !stamp(m.at)) throw new Error(NOT_A_CARD);
  let next = record;
  if (patch.add !== undefined) {
    const a = patch.add;
    if (!object(a) || a.id !== m.itemId || typeof a.name !== 'string' || !stamp(a.createdAt) || (a.dose !== undefined && typeof a.dose !== 'string') || !(SUPPLEMENT_KINDS as readonly unknown[]).includes(a.kind ?? 'supplement')) throw new Error(NOT_A_CARD);
    const name = a.name as string, dose = a.dose as string | undefined;
    if ((record.items ?? []).some(i => i.name.trim().toLowerCase() === name.trim().toLowerCase())) throw new Error(`${name.slice(0, 60)} is already on your list; ask again to log it.`);
    next = addSupplement(next, {name, ...(dose ? {dose} : {}), kind: (a.kind ?? 'supplement') as (typeof SUPPLEMENT_KINDS)[number]}, a.createdAt as string, m.itemId);
  }
  return markSupplement(next, m.itemId, m.date, m.slot, m.status, m.at);
}};
export const debtPlannerEntry: Entry<DebtPlannerRecord> = {spec: DEBT_PLANNER, apply: (record, patch) => {
  if (!object(patch) || !object(patch.set) || !only(patch, ['set'])) throw new Error(NOT_A_CARD);
  const s = patch.set;
  if (!only(s, ['debtId', 'minimum', 'ratePercent', 'extra', 'currency']) || !Object.keys(s).length) throw new Error(NOT_A_CARD);
  if ((s.debtId !== undefined && (typeof s.debtId !== 'string' || !s.debtId || s.debtId.length > 100)) || (s.minimum !== undefined && (typeof s.minimum !== 'string' || !AMOUNT.test(s.minimum)))
    || (s.ratePercent !== undefined && (typeof s.ratePercent !== 'string' || !RATE.test(s.ratePercent))) || (s.extra !== undefined && (typeof s.extra !== 'string' || !AMOUNT.test(s.extra)))
    || (s.currency !== undefined && (typeof s.currency !== 'string' || !/^[A-Z]{3}$/.test(s.currency))) || ((s.minimum !== undefined || s.ratePercent !== undefined) && s.debtId === undefined)) throw new Error(NOT_A_CARD);
  const debts = {...(record.debts ?? {})};
  if (typeof s.debtId === 'string') debts[s.debtId] = {...(debts[s.debtId] ?? {}), ...(s.minimum !== undefined ? {minimum: s.minimum} : {}), ...(s.ratePercent !== undefined ? {ratePercent: s.ratePercent} : {})};
  const {extra: _e, ...rest} = record; void _e;
  const extra = s.extra !== undefined ? s.extra : record.extra;
  // Like the planner's "Keep": an extra of zero is no extra.
  return debtPlannerSchema.parse({...rest, ...(s.currency ? {currency: s.currency} : {}), debts, ...(extra && Number(extra) > 0 ? {extra} : {})});
}};
export const savingsChallengesEntry: Entry<SavingsChallenges> = {spec: SAVINGS_CHALLENGES, apply: (record, patch) => {
  if (!object(patch) || !object(patch.start) || !only(patch, ['start'])) throw new Error(NOT_A_CARD);
  const {goalId, challenge} = patch.start;
  if (typeof goalId !== 'string' || !/^\d{1,80}$/.test(goalId)) throw new Error(NOT_A_CARD);
  const parsed = challengeSchema.safeParse(challenge);
  if (!parsed.success) throw new Error(NOT_A_CARD);
  if (record.goals[goalId]) throw new Error('This goal already has a challenge; stop it on the goal\'s page first.');
  return setChallenge(record, goalId, parsed.data);
}};
export const agendaEntry: Entry<AgendaRecord> = {spec: AGENDA, apply: (record, patch) => {
  if (!object(patch) || !only(patch, ['view']) || !(AGENDA_VIEWS as readonly unknown[]).includes(patch.view)) throw new Error(NOT_A_CARD);
  return setAgendaView(record, patch.view as (typeof AGENDA_VIEWS)[number]);
}};
registerDeviceWrite(SUPPLEMENTS_KEY, supplementsEntry);
registerDeviceWrite(DEBT_PLANNER_KEY, debtPlannerEntry);
registerDeviceWrite(SAVINGS_CHALLENGES_KEY, savingsChallengesEntry);
registerDeviceWrite(AGENDA_KEY, agendaEntry);
