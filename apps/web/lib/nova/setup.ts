import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {readDeviceRecord} from '../device-record';

/**
 * Session AK, owner follow-up 2 (N3, lane NC): "Build your own NOVA", the setup guide's own device record,
 * `zigoals:nova-setup:v1`. Per step: the day it was done and the verifying check's last result (ok, when, a short note);
 * the privacy mode the person chose (N3 step 2, enforced in the engine by lib/ai/privacy-mode.ts); the day the guide
 * was finished and its one-time celebration seen. Read through getAppStorage() at the call site (per account; the tab's
 * session storage in Showcase), like every Session V device record. Loose and additive: every field optional, notes
 * bounded, unknown steps of a later build kept as they are. Holds no secret, no personal data and no model output.
 */
export const NOVA_SETUP_KEY = 'zigoals:nova-setup:v1';
/** The ten planets of N3, in order. */
export const SETUP_STEPS = ['meet', 'privacy', 'brain', 'first-chat', 'scopes', 'memory', 'voice', 'briefs', 'workflows', 'yours'] as const;
export type SetupStepId = (typeof SETUP_STEPS)[number];
export const isSetupStep = (value: unknown): value is SetupStepId => typeof value === 'string' && (SETUP_STEPS as readonly string[]).includes(value);
export const PRIVACY_MODES = ['strict', 'guarded', 'relaxed'] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];
/** A check's note is a short plain line ("Found gemma4:12b on Ollama"); never a key, never a record. */
export const CHECK_NOTE_MAX = 200;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const setupCheckSchema = z.looseObject({ok: z.boolean(), at: z.iso.datetime(), note: z.string().max(CHECK_NOTE_MAX).optional()});
export type SetupCheck = z.infer<typeof setupCheckSchema>;
export const setupStepSchema = z.looseObject({doneOn: day.optional(), check: setupCheckSchema.optional()});
export type SetupStep = z.infer<typeof setupStepSchema>;
const stepShape = Object.fromEntries(SETUP_STEPS.map(id => [id, setupStepSchema.optional()])) as Record<SetupStepId, z.ZodOptional<typeof setupStepSchema>>;
export const novaSetupSchema = z.looseObject({
  version: z.literal(1),
  /** Per step; a later build's unknown steps stay as they are (loose). */
  steps: z.looseObject(stepShape).optional(),
  /** N3 step 2. Absent: the person never chose, and ZIGi behaves exactly as before NOVA (lib/ai/privacy-mode.ts). */
  privacyMode: z.enum(PRIVACY_MODES).optional(),
  /** When the mode was last chosen (a day), for the Permissions view. */
  privacyChosenOn: day.optional(),
  /** All ten done: the day, and whether the one-time celebration has played. */
  finishedOn: day.optional(),
  celebrated: z.boolean().optional(),
  /** The setup card on NOVA put away by the person before finishing (it comes back from the guide). */
  cardHidden: z.boolean().optional(),
  /**
   * Security review Z1A-7 (lane ZF): the model names Ollama's own list marked as running in Ollama's cloud (`remote_host` /
   * `remote_model` in /api/tags), so a renamed copy is still a cloud for the privacy mode (lib/ai/privacy-mode.ts). Names
   * only, at most 100; never a record of the person's life.
   */
  cloudModels: z.array(z.string().min(1).max(200)).max(100).optional().catch(undefined),
  /**
   * Session AK P4 (FIRST_RUN_REVIEW FR-22): the reply that was the first from the person's own local model on NOVA (its turn
   * id), so the one quiet "This answer came from … on your computer" line shows under that reply only, once per device.
   */
  firstLocalReply: z.string().min(1).max(100).optional().catch(undefined),
});
export type NovaSetup = z.infer<typeof novaSetupSchema>;
export const NOVA_SETUP: DeviceRecordSpec<NovaSetup> = {key: NOVA_SETUP_KEY, schema: novaSetupSchema, empty: () => ({version: 1})};

const stepOf = (record: NovaSetup, id: SetupStepId): SetupStep => (record.steps?.[id] as SetupStep | undefined) ?? {};
export const stepDone = (record: NovaSetup, id: SetupStepId): boolean => !!stepOf(record, id).doneOn;
export const stepCheck = (record: NovaSetup, id: SetupStepId): SetupCheck | null => stepOf(record, id).check ?? null;
const clip = (note: string | undefined) => note === undefined ? undefined : note.replace(/\s+/g, ' ').trim().slice(0, CHECK_NOTE_MAX);
const withStep = (record: NovaSetup, id: SetupStepId, step: SetupStep): NovaSetup => ({...record, version: 1, steps: {...(record.steps ?? {}), [id]: step}});
/** Records a check's result. A passing check marks the step done (on the day given) unless it already is; a failing one leaves a done day as it was. */
export function recordCheck(record: NovaSetup, id: SetupStepId, check: {ok: boolean; note?: string}, now: Date, today: string): NovaSetup {
  const step = stepOf(record, id), note = clip(check.note);
  const next: SetupStep = {...step, check: {ok: check.ok, at: now.toISOString(), ...(note ? {note} : {})}, ...(check.ok && !step.doneOn ? {doneOn: today} : {})};
  return finish(withStep(record, id, next), today);
}
/**
 * Session AL second pass (Professor PR-028, P-PR-13): a check made in the Showcase read the Showcase's fictional records,
 * so its note says so ("Showcase example: …"); the planet is lit for the demo only, and the person's own guide, outside
 * the Showcase, starts from its own checks.
 */
export function showcaseCheck(check: {ok: boolean; note?: string}): {ok: boolean; note?: string} {
  const note = check.note?.trim();
  return {...check, note: note?.startsWith('Showcase example') ? note : `Showcase example (fictional records): ${note ?? (check.ok ? 'passed' : 'not passed')}`};
}
/** "Mark as not done" (once "Not done yet"): the step's done day goes; its last check stays as a record of what was seen. */
export function unmarkStep(record: NovaSetup, id: SetupStepId): NovaSetup {
  const {doneOn: _gone, ...rest} = stepOf(record, id); void _gone;
  const next = withStep(record, id, rest);
  const {finishedOn: _f, ...kept} = next; void _f;
  return kept;
}
/** Once every step is done, the day it happened (kept even if a step is later reopened, so the badge stays earned). */
function finish(record: NovaSetup, today: string): NovaSetup {
  return SETUP_STEPS.every(id => stepDone(record, id)) && !record.finishedOn ? {...record, finishedOn: today} : record;
}
/**
 * Chooses the privacy mode. Session AK lane EXF (EX-11): a different mode makes the privacy planet's check stale (it tested
 * the mode before, "Strict is on"), so the check and the lit planet go and the guide asks for a new check. Choosing the
 * same mode again keeps them. The finished day stays (the badge stays earned).
 */
export function setPrivacyMode(record: NovaSetup, mode: PrivacyMode, today: string): NovaSetup {
  const next: NovaSetup = {...record, version: 1, privacyMode: mode, privacyChosenOn: today};
  if (record.privacyMode === mode || !record.steps?.privacy) return next;
  const {doneOn: _done, check: _check, ...rest} = stepOf(record, 'privacy'); void _done; void _check;
  return withStep(next, 'privacy', rest);
}
export const markCelebrated = (record: NovaSetup): NovaSetup => ({...record, celebrated: true});
export const setCardHidden = (record: NovaSetup, hidden: boolean): NovaSetup => ({...record, cardHidden: hidden});

export type SetupProgress = {done: number; total: number; next: SetupStepId | null; finished: boolean};
export function setupProgress(record: NovaSetup): SetupProgress {
  const done = SETUP_STEPS.filter(id => stepDone(record, id)).length;
  return {done, total: SETUP_STEPS.length, next: SETUP_STEPS.find(id => !stepDone(record, id)) ?? null, finished: done === SETUP_STEPS.length};
}
/** "NOVA online": every planet lit once (the badge stays once earned). */
export const novaOnline = (record: NovaSetup): boolean => !!record.finishedOn || setupProgress(record).finished;
/** The setup card shows on NOVA until the guide is finished, unless the person put it away. */
export const showSetupCard = (record: NovaSetup): boolean => !novaOnline(record) && !record.cardHidden;

/**
 * The stored privacy mode, or null when never chosen (no record, or a record without a mode: ZIGi as before NOVA).
 * Fail-closed: a record that exists but cannot be read, or storage that refuses the read, reads as Strict, so damaged
 * bytes never quietly open the way to a cloud model.
 */
export function readPrivacyMode(storage: Pick<Storage, 'getItem'>): PrivacyMode | null {
  try { const read = readDeviceRecord(storage, NOVA_SETUP); return read.unreadable ? 'strict' : read.data.privacyMode ?? null; } catch { return 'strict'; }
}

/**
 * A labelled Showcase example for the guide (the lead wires it into the Showcase records): the first three planets lit
 * on the Showcase day, Strict chosen, every check note saying it is an example. Never mixed with real data: Showcase
 * records live in the tab's own storage.
 */
export function showcaseNovaSetup(day: string, at: string): NovaSetup {
  const step = (note: string) => ({doneOn: day, check: {ok: true, at, note: `Showcase example: ${note}`}});
  return {version: 1, privacyMode: 'strict', privacyChosenOn: day, steps: {meet: step('no API key sits in readable storage.'), privacy: step('Strict refused a test message to a cloud model.'), brain: step('a local model answered on this computer.')}};
}

/**
 * Session AK P4 (FR-22): the first reply from the person's own local model on NOVA is marked once per device, and planet 4
 * ("First conversation") lights by itself with it (it waited for a question asked in one particular place). Pure: the
 * record as it should be after `turnId` arrived, or the record unchanged.
 */
export function noteFirstLocalReply(record: NovaSetup, turnId: string, model: string, now: Date, today: string): NovaSetup {
  if (record.firstLocalReply) return record;
  let next: NovaSetup = {...record, firstLocalReply: turnId.slice(0, 100)};
  if (!stepCheck(next, 'first-chat')?.ok) next = recordCheck(next, 'first-chat', {ok: true, note: `First answer from ${model} on your computer.`.slice(0, CHECK_NOTE_MAX)}, now, today);
  return next;
}
/** The quiet line under that first reply. */
export const firstLocalReplyLine = (model: string): string => `This answer came from ${model} on your computer. Nothing left this device.`;
