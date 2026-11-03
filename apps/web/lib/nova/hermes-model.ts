import type {PathColour} from '../path/colours';
import type {PathModel, PathStep} from '../path/model';
import {hermesStepCheck, hermesStepDone, type HermesStepId, type NovaHermes} from './hermes-record';

/**
 * Session AK, owner follow-up 3 (N11; lane NC): "Connect your Hermes Agent", ten planets on the same shared path engine
 * and orbit look as "Build your own NOVA" (and Earn's Start-here path). Pure: the record decides each planet.
 */
// `tab` (Session AK M7, layout audit): the shorter name a planet's tab shows on the path where the full one ran past a 320 px
// card; `label` stays its full name (the planet's accessible name, its title, the guide's heading).
export const HERMES_PLANETS: Readonly<Record<HermesStepId, {label: string; short: string; tab?: string; glyph: string; colour: PathColour}>> = {
  what: {label: 'Meet Hermes Agent', short: 'What it is and the privacy picture', glyph: 'sparkle', colour: 'teal'},
  install: {label: 'Install Hermes', short: 'hermes --version', glyph: 'code', colour: 'teal'},
  model: {label: 'Choose its model', short: 'Local recommended', glyph: 'orbit', colour: 'teal'},
  api: {label: 'Turn on its API server', short: 'A strong key of your own', glyph: 'lock', colour: 'blue'},
  gateway: {label: 'Start the gateway', short: 'hermes gateway', tab: 'Gateway', glyph: 'flag', colour: 'blue'},
  browser: {label: 'Let the browser reach it', short: 'This site allowed', glyph: 'target', colour: 'blue'},
  connect: {label: 'Connect it in ZIGoals', short: 'Address and key, tested', glyph: 'check', colour: 'purple'},
  privacy: {label: 'Confirm the privacy mode', short: 'Strict only with a local model', tab: 'Privacy mode', glyph: 'lock', colour: 'purple'},
  'first-run': {label: 'First run', short: 'Ask your Hermes', glyph: 'chat', colour: 'gold'},
  further: {label: 'Go further', short: 'Your summary, skills, docs', glyph: 'star', colour: 'gold'},
};
export const HERMES_ORBITS: readonly {id: string; label: string; colour: PathColour; steps: readonly HermesStepId[]}[] = [
  {id: 'hermes-get', label: 'Get Hermes', colour: 'teal', steps: ['what', 'install', 'model']},
  {id: 'hermes-open', label: 'Open its door', colour: 'blue', steps: ['api', 'gateway', 'browser']},
  {id: 'hermes-link', label: 'Link it to NOVA', colour: 'purple', steps: ['connect', 'privacy']},
  {id: 'hermes-use', label: 'Work together', colour: 'gold', steps: ['first-run', 'further']},
];
export function hermesPathModel(record: NovaHermes): PathModel {
  const step = (id: HermesStepId): PathStep => {
    const done = hermesStepDone(record, id), check = hermesStepCheck(record, id), w = HERMES_PLANETS[id];
    return {id: `hermes-${id}`, label: w.label, ...(w.tab ? {short: w.tab} : {}), note: done ? 'Checked' : check && !check.ok ? 'Check again' : w.short, colour: w.colour, state: done ? 'done' : 'undone', glyph: w.glyph, intent: 'value'};
  };
  return {id: 'nova-hermes', label: 'Connect your Hermes Agent', sections: HERMES_ORBITS.map((o, i) => ({id: o.id, label: o.label, eyebrow: `Orbit ${i + 1}`, colour: o.colour, steps: o.steps.map(step)})), milestones: [{id: 'hermes-online', at: 'end', label: 'Hermes linked', reachedLabel: 'Hermes linked'}]};
}
