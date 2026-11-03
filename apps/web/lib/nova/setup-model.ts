import type {PathModel, PathStep} from '../path/model';
import {stepCheck, stepDone, type NovaSetup, type SetupStepId} from './setup';
import {ORBITS, PLANETS} from './setup-guide';

/**
 * Session AK, owner follow-up 2 (N3, lane NC): the guide's ten planets as a model for the shared path engine
 * (components/path/path.tsx, the orbit look Earn's Start-here path wears): four orbits, each planet done when its check
 * passed (or the person marked it), and the end of the path as the finale, "NOVA online". Pure: the record decides.
 */
export const SETUP_PATH_ID = 'nova-setup';
export function setupPathModel(record: NovaSetup): PathModel {
  const step = (id: SetupStepId): PathStep => {
    const done = stepDone(record, id), check = stepCheck(record, id), words = PLANETS[id];
    return {id, label: words.label, ...(words.tab ? {short: words.tab} : {}), note: done ? check?.ok ? 'Checked' : 'Done' : check && !check.ok ? 'Check again' : words.short, colour: words.colour, state: done ? 'done' : 'undone', glyph: words.glyph, intent: 'value'};
  };
  return {
    id: SETUP_PATH_ID, label: 'Build your own NOVA',
    sections: ORBITS.map((o, i) => ({id: o.id, label: o.label, eyebrow: `Orbit ${i + 1}`, colour: o.colour, steps: o.steps.map(step)})),
    milestones: [{id: 'nova-online', at: 'end', label: 'NOVA online', reachedLabel: 'NOVA online'}],
  };
}
