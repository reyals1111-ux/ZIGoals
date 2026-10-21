import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {ZIGI_PLANS_KEY} from '../../af-zigi-keys';

/**
 * ZIGi's plans (Session AF, L4; `TIER 3 (storage)`, ADR-028 H10): a plan ZIGi proposed as one bundle ("set me up for a
 * 10k", "plan my week", "start me on staking") and what became of each step, in `zigoals:zigi-plans:v1`. Device only,
 * never synced, in Export everything, erased with the account. Written only when the person acts on a step (adds,
 * opens, dismisses or undoes it) or forgets a plan; never on view. Titles and step labels only: no amount, no Health
 * value, no identifier of another record (a step is named by its card's fingerprint, 8 hex digits).
 *
 * Loose and versioned: a field or an outcome a newer build writes is kept on every write of this one, and an outcome
 * this build does not know reads as "proposed" for display only. Bytes that do not parse read as empty and are never
 * overwritten: every writer here refuses when the stored record is unreadable.
 */
export const MAX_PLANS = 20, MAX_PLAN_ITEMS = 12;
export const PLAN_OUTCOMES = ['proposed', 'added', 'opened', 'dismissed', 'undone'] as const;
export type PlanOutcome = (typeof PLAN_OUTCOMES)[number];
const stamp = z.iso.datetime();
export const planItemSchema = z.looseObject({sig: z.string().regex(/^[0-9a-f]{8}$/), kind: z.string().min(1).max(40), label: z.string().min(1).max(120), outcome: z.string().min(1).max(20)});
export const zigiPlanSchema = z.looseObject({id: z.string().min(1).max(80), title: z.string().min(1).max(80), createdAt: stamp, updatedAt: stamp, chatId: z.string().min(1).max(80).optional(), items: z.array(planItemSchema).max(MAX_PLAN_ITEMS), done: z.boolean().optional()});
export const zigiPlansSchema = z.looseObject({version: z.literal(1), plans: z.array(zigiPlanSchema).max(MAX_PLANS).optional()});
export type ZigiPlanItem = z.infer<typeof planItemSchema>;
export type ZigiPlan = z.infer<typeof zigiPlanSchema>;
export type ZigiPlans = z.infer<typeof zigiPlansSchema>;
export const ZIGI_PLANS: DeviceRecordSpec<ZigiPlans> = {key: ZIGI_PLANS_KEY, schema: zigiPlansSchema, empty: () => ({version: 1})};
export const knownOutcome = (value: string): PlanOutcome => (PLAN_OUTCOMES as readonly string[]).includes(value) ? value as PlanOutcome : 'proposed';
const clip = (text: string, max: number) => { const t = text.replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t || '…'; };

export type BundleInput = {id: string; title: string; chatId?: string; items: readonly {sig: string; kind: string; label: string}[]};
/** The record with this bundle in it (newest first, at most 20): a bundle seen again keeps the outcomes it already has. */
export function withBundle(record: ZigiPlans, input: BundleInput, now: Date): ZigiPlans {
  const at = now.toISOString(), plans = record.plans ?? [], existing = plans.find(p => p.id === input.id);
  const items = input.items.slice(0, MAX_PLAN_ITEMS).map(item => {
    const kept = existing?.items.find(i => i.sig === item.sig);
    return kept ? {...kept, kind: clip(item.kind, 40), label: clip(item.label, 120)} : {sig: item.sig, kind: clip(item.kind, 40), label: clip(item.label, 120), outcome: 'proposed'};
  });
  const plan: ZigiPlan = {...(existing ?? {}), id: input.id.slice(0, 80), title: clip(input.title, 80), createdAt: existing?.createdAt ?? at, updatedAt: at, ...(input.chatId ? {chatId: input.chatId.slice(0, 80)} : {}), items};
  return {...record, plans: [plan, ...plans.filter(p => p.id !== input.id)].slice(0, MAX_PLANS)};
}
/** One step's outcome; the plan is done once no step is still proposed. A plan or a step not in the record: unchanged. */
export function withOutcome(record: ZigiPlans, planId: string, sig: string, outcome: PlanOutcome, now: Date): ZigiPlans {
  const plans = record.plans ?? [], plan = plans.find(p => p.id === planId);
  if (!plan || !plan.items.some(i => i.sig === sig)) return record;
  const items = plan.items.map(i => i.sig === sig ? {...i, outcome} : i), done = items.every(i => knownOutcome(i.outcome) !== 'proposed');
  return {...record, plans: plans.map(p => p.id === planId ? {...p, items, updatedAt: now.toISOString(), done} : p)};
}
export const withoutPlan = (record: ZigiPlans, planId: string): ZigiPlans => ({...record, plans: (record.plans ?? []).filter(p => p.id !== planId)});

type Storage_ = Pick<Storage, 'getItem' | 'setItem'>;
/** Writes through the record's own reader: an unreadable record is never overwritten (null is returned, nothing written). */
function write(storage: Storage_, change: (current: ZigiPlans) => ZigiPlans): ZigiPlans | null {
  if (readDeviceRecord(storage, ZIGI_PLANS).unreadable) return null;
  return updateDeviceRecord(storage, ZIGI_PLANS, change);
}
export const recordBundle = (storage: Storage_, input: BundleInput, now = new Date()) => write(storage, r => withBundle(r, input, now));
export const markPlanItem = (storage: Storage_, input: BundleInput, sig: string, outcome: PlanOutcome, now = new Date()) => write(storage, r => withOutcome(withBundle(r, input, now), input.id, sig, outcome, now));
export const forgetPlan = (storage: Storage_, planId: string) => write(storage, r => withoutPlan(r, planId));
/** "Forget all": the key goes, as "Delete all notes" does. */
export function forgetAllPlans(storage: Pick<Storage, 'removeItem'>): void { storage.removeItem(ZIGI_PLANS_KEY); }
/** A plan as plain lines, for the zigi_plans tool and Settings: the title, each step and its outcome in words. */
export const OUTCOME_WORDS: Record<PlanOutcome, string> = {proposed: 'not decided yet', added: 'added', opened: 'opened', dismissed: 'skipped', undone: 'undone'};
export function planLines(plan: ZigiPlan): {title: string; steps: {label: string; outcome: string}[]; done: boolean} {
  return {title: plan.title, steps: plan.items.map(i => ({label: i.label, outcome: OUTCOME_WORDS[knownOutcome(i.outcome)]})), done: plan.done === true};
}
