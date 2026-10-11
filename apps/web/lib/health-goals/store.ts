import {HEALTH_GOALS_KEY, MAX_HEALTH_GOALS, emptyHealthGoals, healthGoalsSchema, type HealthGoal, type HealthGoals} from './schema';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
let last: {raw: string; data: HealthGoals} | null = null;
/** What this device holds: unreadable or invalid data reads as no goals (`unreadable` says so) and is never touched by any automatic path. */
export function readHealthGoals(storage: Read): {data: HealthGoals; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(HEALTH_GOALS_KEY); } catch { return {data: emptyHealthGoals(), unreadable: true}; }
  if (raw === null) return {data: emptyHealthGoals(), unreadable: false};
  if (last?.raw === raw) return {data: last.data, unreadable: false};
  try {
    const parsed = healthGoalsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return {data: emptyHealthGoals(), unreadable: true};
    last = {raw, data: parsed.data};
    return {data: parsed.data, unreadable: false};
  } catch { return {data: emptyHealthGoals(), unreadable: true}; }
}
/** Applies a change and writes the result. Throws, and writes nothing, when the result is invalid, the key is unreadable or storage refuses. */
export function updateHealthGoals(storage: ReadWrite, change: (current: HealthGoals) => HealthGoals): HealthGoals {
  const current = readHealthGoals(storage);
  if (current.unreadable) throw Error('Your saved health goals on this device could not be read. They were not changed.');
  const next = healthGoalsSchema.parse(change(current.data));
  const raw = JSON.stringify(next);
  storage.setItem(HEALTH_GOALS_KEY, raw);
  last = {raw, data: next};
  return next;
}
/** The person's explicit choice to replace unreadable goals: the old bytes are copied to a recovery key first. */
export function startOverHealthGoals(storage: ReadWrite): HealthGoals {
  const previous = storage.getItem(HEALTH_GOALS_KEY);
  if (previous !== null) storage.setItem(`${HEALTH_GOALS_KEY}:recovery:${crypto.randomUUID()}`, previous);
  const next = emptyHealthGoals();
  storage.setItem(HEALTH_GOALS_KEY, JSON.stringify(next));
  last = null;
  return next;
}
export type HealthGoalDraft = Omit<HealthGoal, 'version' | 'id' | 'status' | 'createdAt' | 'updatedAt'>;
export function addHealthGoal(current: HealthGoals, draft: HealthGoalDraft, now = new Date(), id = crypto.randomUUID()): HealthGoals {
  if (current.goals.length >= MAX_HEALTH_GOALS) throw Error(`This device holds ${MAX_HEALTH_GOALS} health goals, the most it keeps. Close or remove one first.`);
  return {...current, goals: [...current.goals, {version: 1, id, ...draft, status: 'active', createdAt: now.toISOString(), updatedAt: now.toISOString()}]};
}
export function editHealthGoal(current: HealthGoals, id: string, draft: HealthGoalDraft, now = new Date()): HealthGoals {
  if (!current.goals.some(g => g.id === id)) throw Error('This health goal is no longer available.');
  return {...current, goals: current.goals.map(g => g.id === id ? {...g, ...draft, updatedAt: now.toISOString()} : g)};
}
export function setHealthGoalStatus(current: HealthGoals, id: string, status: HealthGoal['status'], now = new Date()): HealthGoals {
  if (!current.goals.some(g => g.id === id)) throw Error('This health goal is no longer available.');
  return {...current, goals: current.goals.map(g => g.id === id ? {...g, status, updatedAt: now.toISOString()} : g)};
}
export function removeHealthGoal(current: HealthGoals, id: string): HealthGoals { return {...current, goals: current.goals.filter(g => g.id !== id)}; }
