import type {Intent} from './cases';

/**
 * Session AV lane 2, round 4 (money; Actual Budget, Lunch Money): the questions round 4's money features raise, answered
 * on the device from each feature's own pure function (lib/ai/local-answers/av2-r4-money.ts), in English and Dutch. The
 * lead adds `AV2_R4_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R4_MONEY: readonly Intent[] = [
  {id: 'av2r4-money-calendar', pillar: 'wealth', en: ['which day did I spend the most this month', 'show the calendar of my spending'], nl: ['welke dag gaf ik deze maand het meest uit', 'toon de kalender van mijn uitgaven']},
];
