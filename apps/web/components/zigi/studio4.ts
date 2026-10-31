/**
 * Studio-4 preparation (Session AK Part 12; ADR-036 D6): the pieces that work before the art arrives and fall back to
 * today's art until it does. Pure, imported by tests and by the surfaces that need them (never by the launcher shell).
 * - `checklistCelebrationArt`: the X030 cheer slot for the Checklist's day celebration. PROTECTED (the Checklist and AG
 *   Polish 1–3): until X030 lands the answer is today's clip, the very same constant, so nothing about the Checklist's
 *   look or celebration changes; the switch to the cheer is Part 13's, with the owner's review.
 * - `studio4SlotProblems`: a schema-tolerant check of the Studio-4 slots of a manifest: every slot optional, each either
 *   null or a clip of the documented shape; today's manifest (all slots empty) passes, and so does an older one.
 */
import {CELEBRATION_CLIP} from '../../lib/checklist/celebration-clip';
import {cheerOf, type ExtraClip, type Skin} from './manifest';

export type ChecklistCelebrationArt = {source: 'studio4-x030'; clip: ExtraClip} | {source: 'today'; clip: typeof CELEBRATION_CLIP};
/** The Checklist celebration's clip: Studio-4's X030 cheer once it has landed, else today's clip, unchanged. */
export function checklistCelebrationArt(skin: Skin): ChecklistCelebrationArt {
  const cheer = cheerOf(skin);
  return cheer ? {source: 'studio4-x030', clip: cheer} : {source: 'today', clip: CELEBRATION_CLIP};
}

const FILE_KEYS = ['1x', '2x', 'large', 'animated', 'animatedFallback'] as const;
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** A clip slot: null (not landed) or {name, files, kind, durationMs[, pool]} with public paths for files. */
function clipProblems(where: string, value: unknown): string[] {
  if (value === null) return [];
  if (!isRecord(value)) return [`${where}: not a clip or null`];
  const out: string[] = [];
  if (typeof value.name !== 'string' || !/^[A-Z]\d{3}-[a-z0-9-]+$/.test(value.name)) out.push(`${where}.name: not a studio clip name`);
  if (value.kind !== 'loop' && value.kind !== 'one-shot') out.push(`${where}.kind: loop or one-shot`);
  if (typeof value.durationMs !== 'number' || !Number.isFinite(value.durationMs) || value.durationMs < 0) out.push(`${where}.durationMs: a number of milliseconds (0 when unknown)`);
  if (value.pool !== undefined && typeof value.pool !== 'string') out.push(`${where}.pool: a pool name`);
  if (!isRecord(value.files)) out.push(`${where}.files: missing`);
  else for (const [key, file] of Object.entries(value.files)) {
    if (key === 'durationMs') { if (typeof file !== 'number') out.push(`${where}.files.durationMs: a number`); continue; }
    if (!(FILE_KEYS as readonly string[]).includes(key)) { out.push(`${where}.files.${key}: unknown file key`); continue; }
    if (file !== null && (typeof file !== 'string' || !file.startsWith('/brand/figures/zigi/'))) out.push(`${where}.files.${key}: not a ZIGi figure path`);
  }
  return out;
}
const slotRecord = (where: string, value: unknown): string[] => value === undefined ? [] : isRecord(value) ? Object.entries(value).flatMap(([k, v]) => clipProblems(`${where}.${k}`, v)) : [`${where}: not a record`];
/** Every problem with a manifest's Studio-4 slots; an empty list means they read. Missing slots are fine (optional). */
export function studio4SlotProblems(manifest: unknown): string[] {
  if (!isRecord(manifest) || !isRecord(manifest.skins)) return ['manifest: no skins'];
  const out: string[] = [];
  if (manifest.reactionTriggers !== undefined) {
    if (!isRecord(manifest.reactionTriggers)) out.push('reactionTriggers: not a record');
    else for (const [code, trigger] of Object.entries(manifest.reactionTriggers)) if (!/^R0\d\d$/.test(code) || (trigger !== null && (typeof trigger !== 'string' || !/^[a-z_]+$/.test(trigger)))) out.push(`reactionTriggers.${code}: a reaction code with a semantic event name or null`);
  }
  for (const [name, skin] of Object.entries(manifest.skins)) {
    if (!isRecord(skin)) { out.push(`${name}: not a skin`); continue; }
    if (isRecord(skin.states)) for (const [state, files] of Object.entries(skin.states)) if (isRecord(files) && files.durationMs !== undefined && (typeof files.durationMs !== 'number' || !(files.durationMs > 0))) out.push(`${name}.states.${state}.durationMs: a positive number`);
    const extras = skin.extras;
    if (extras === undefined) continue;
    if (!isRecord(extras)) { out.push(`${name}.extras: not a record`); continue; }
    const at = `${name}.extras`;
    out.push(...slotRecord(`${at}.reactions`, extras.reactions), ...slotRecord(`${at}.idleVariants`, extras.idleVariants), ...slotRecord(`${at}.variants`, extras.variants), ...slotRecord(`${at}.celebrations`, extras.celebrations), ...slotRecord(`${at}.gaze`, extras.gaze));
    if (extras.transitions !== undefined) {
      if (!isRecord(extras.transitions)) out.push(`${at}.transitions: not a record`);
      else {
        out.push(...clipProblems(`${at}.transitions.greetingInPlace`, extras.transitions.greetingInPlace ?? null));
        const chain = extras.transitions.chain;
        if (chain !== undefined && !Array.isArray(chain)) out.push(`${at}.transitions.chain: a list`);
        else for (const [i, clip] of (chain ?? []).entries()) out.push(...(clip === null ? [`${at}.transitions.chain.${i}: a clip`] : clipProblems(`${at}.transitions.chain.${i}`, clip)));
      }
    }
  }
  return out;
}
