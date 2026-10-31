import {addLocalDays} from '../local-date';
import {savingsChallengesSchema, type SavingsChallenges} from './challenges';

/**
 * Session AK (F5a, item 2): two fictional challenges beside the Showcase goals (lib/showcase-data.ts): a 52-week
 * challenge toward "First home deposit" (goal 9202, US dollars; its four fictional weekly contributions put it ahead of
 * the schedule) and no-spend days toward "Japan adventure" (goal 9203), with marked days checked against the Showcase
 * money log (one marked day has a logged purchase, so it is shown apart, not counted). Labelled in each `note`. The lead
 * wires it as `records[SAVINGS_CHALLENGES_KEY]`. Deterministic for a day.
 */
export function showcaseSavingsChallenges(day: string): SavingsChallenges {
  const d = (offset: number) => addLocalDays(day, offset);
  return savingsChallengesSchema.parse({version: 1, goals: {
    '9202': {kind: '52-week', startedOn: d(-27), step: '50.00', order: 'up', note: 'SHOWCASE DATA · fictional challenge'},
    '9203': {kind: 'no-spend', startedOn: d(-29), targetDays: 30, noSpendDays: [-25, -22, -20, -19, -18, -13, -12, -11, -6].map(d), note: 'SHOWCASE DATA · fictional challenge'},
  }});
}
