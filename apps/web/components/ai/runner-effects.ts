import {zigiSchema, type ZigiRecord} from '../../lib/ai/store/records';
import {ZIGI_KEY} from '../../lib/ai/store/keys';
import {confirmDeleteHash} from '../../lib/confirm-delete';

/**
 * Session Z-Cloud Gate B (Z-Local's handoff, Part 5 entries; ADR-019 "Handoff applied"): the three effects a plan from
 * Z-Local's planner can hand the runner, read structurally, so this file compiles against `main`'s `Plan` (which has
 * none of them) and Z-Local's (which has all three). Every one is a form-like card (`target: 'form'`): batches and
 * auto-accept never take it.
 * - `navigate: {href, label}`: the card's Add opens an app page. Status "Opened: <label>".
 * - `confirm: {href, what, id, label}`: the card's Add opens the record's page and that page's own delete confirmation
 *   (lib/confirm-delete.ts); it deletes nothing. Status "Opened the confirmation on <label>".
 * - `device: {key, patch}`: ZIGi's own look (`zigoals:zigi:v1`), the top-level look keys only, `knock` merged, never
 *   replaced. Status "ZIGi's look changed".
 * Anything else, or a value outside these shapes, is no effect: the list then says the values could not be handed over.
 */
export type RunnerEffect =
  | {kind: 'navigate'; href: string; label: string}
  | {kind: 'confirm'; href: string; what: string; id: string; label: string}
  | {kind: 'device'; patch: Partial<Pick<ZigiRecord, 'skin' | 'animation' | 'side' | 'size' | 'greeting' | 'edgeTab'>> & {knock?: {enabled: boolean}}};
/** The records a card may ask to delete (Z-Local's `DELETE_TARGETS`). */
export const DELETE_TARGETS = ['habit', 'goal', 'water-entry', 'weight', 'diary-entry', 'food', 'recipe', 'meal-plan', 'counter', 'night', 'session', 'fast', 'link', 'widget', 'note'] as const;
/** An app page, with an optional query and hash: never another origin, a protocol or a path outside /app. */
const APP_HREF = /^\/app(?:\/[a-z0-9-]+)*\/?(?:\?[A-Za-z0-9=&_.%-]*)?(?:#[A-Za-z0-9=:_.%-]*)?$/;
const LOOK_KEYS = ['skin', 'animation', 'side', 'size', 'greeting', 'edgeTab'] as const;
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function runnerEffect(plan: unknown): RunnerEffect | null {
  if (!object(plan)) return null;
  const {navigate, confirm, device} = plan;
  if (object(navigate) && text(navigate.href, 200) && APP_HREF.test(navigate.href) && text(navigate.label, 120)) return {kind: 'navigate', href: navigate.href, label: navigate.label};
  if (object(confirm) && text(confirm.href, 200) && APP_HREF.test(confirm.href) && !confirm.href.includes('#') && text(confirm.what, 20) && (DELETE_TARGETS as readonly string[]).includes(confirm.what)
    && text(confirm.id, 80) && /^[A-Za-z0-9_-]+$/.test(confirm.id) && text(confirm.label, 120)) return {kind: 'confirm', href: confirm.href, what: confirm.what, id: confirm.id, label: confirm.label};
  if (object(device) && device.key === ZIGI_KEY && object(device.patch)) {
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(device.patch)) {
      if ((LOOK_KEYS as readonly string[]).includes(key)) patch[key] = value;
      else if (key === 'knock' && object(value) && Object.keys(value).length === 1 && typeof value.enabled === 'boolean') patch.knock = {enabled: value.enabled};
      else return null;
    }
    // The patch must keep the record valid (a known animation, side, size, greeting; a skin name of the record's form).
    if (!Object.keys(patch).length || !zigiSchema.safeParse({version: 1, ...patch}).success) return null;
    return {kind: 'device', patch: patch as Extract<RunnerEffect, {kind: 'device'}>['patch']};
  }
  return null;
}
/** Where a confirm effect goes: the record's page with the hash its confirmation reads. */
export const confirmHref = (effect: Extract<RunnerEffect, {kind: 'confirm'}>) => effect.href + confirmDeleteHash(effect.what, effect.id);
/** The look record after the patch: top-level keys replaced, `knock` merged. */
export function lookPatched(record: ZigiRecord, patch: Extract<RunnerEffect, {kind: 'device'}>['patch']): ZigiRecord {
  const {knock, ...rest} = patch;
  return {...record, ...rest, ...(knock ? {knock: {...(record.knock ?? {}), ...knock}} : {})};
}
export function effectStatus(effect: RunnerEffect): string {
  return effect.kind === 'navigate' ? `Opened: ${effect.label}` : effect.kind === 'confirm' ? `Opened the confirmation on ${effect.label}` : 'ZIGi’s look changed';
}
