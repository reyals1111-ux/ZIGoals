import {GOAL_WIZARD_DRAFT_KEY} from '../../goals/nl-bundle-create';
import {AK_SOUNDSCAPES} from './schema-ak';

/**
 * Session AK (Part 12): the two effects of this session's cards that only the runner can perform, read structurally (as
 * runner-effects.ts reads Z-Local's), so a plan can never hand the runner anything else:
 * - `soundscape`: one of the three presets, started by the card's own tap (components/music/soundscape-start.ts);
 * - `stash`: the Goal wizard's own draft (`zigoals:draft:goal-wizard:v1`, sessionStorage), only its known text fields, kept
 *   before the card opens /app/goals/new; nothing is saved until the person creates the goal in the wizard.
 * Anything else, or a value outside these shapes, is no effect.
 */
export type AkRunnerEffect = {soundscape?: (typeof AK_SOUNDSCAPES)[number]; stash?: {key: typeof GOAL_WIZARD_DRAFT_KEY; value: Record<string, string>}};
export const AK_SOUNDSCAPE_STATUS = 'Starting the soundscape. Stop it from the music button.';
const DRAFT_FIELDS = new Set(['from', 'name', 'type', 'target', 'date', 'notes', 'milestones', 'category', 'asset', 'planAmount', 'planAsset', 'cadence']);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function akEffect(plan: unknown): AkRunnerEffect | null {
  if (!object(plan) || !object(plan.ak)) return null;
  const {soundscape, stash} = plan.ak, out: AkRunnerEffect = {};
  if (soundscape !== undefined) { if (!(AK_SOUNDSCAPES as readonly unknown[]).includes(soundscape)) return null; out.soundscape = soundscape as AkRunnerEffect['soundscape']; }
  if (stash !== undefined) {
    if (!object(stash) || stash.key !== GOAL_WIZARD_DRAFT_KEY || !object(stash.value) || !object(plan.navigate) || plan.navigate.href !== '/app/goals/new') return null;
    const entries = Object.entries(stash.value);
    if (!entries.length || entries.some(([k, v]) => !DRAFT_FIELDS.has(k) || typeof v !== 'string' || v.length > 2000) || stash.value.from !== 'words') return null;
    out.stash = {key: GOAL_WIZARD_DRAFT_KEY, value: stash.value as Record<string, string>};
  }
  return out.soundscape || out.stash ? out : null;
}
