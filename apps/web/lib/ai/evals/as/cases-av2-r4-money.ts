import type {Intent} from './cases';

/**
 * Session AV lane 2, round 4 (money; Actual Budget, Lunch Money): the questions round 4's money features raise, answered
 * on the device from each feature's own pure function (lib/ai/local-answers/av2-r4-money.ts), in English and Dutch. The
 * lead adds `AV2_R4_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R4_MONEY: readonly Intent[] = [
  {id: 'av2r4-money-calendar', pillar: 'wealth', en: ['which day did I spend the most this month', 'show the calendar of my spending'], nl: ['welke dag gaf ik deze maand het meest uit', 'toon de kalender van mijn uitgaven']},
  {id: 'av2r4-money-archived', pillar: 'wealth', en: ['which categories have I archived', 'show my archived categories'], nl: ['welke categorieën heb ik gearchiveerd', 'toon mijn gearchiveerde categorieën']},
  {id: 'av2r4-money-starter-sets', pillar: 'wealth', en: ['what starter category sets are there', 'which category templates can I start from'], nl: ['welke startsets met categorieën zijn er', 'welke categoriesets kan ik gebruiken']},
  {id: 'av2r4-money-groups', pillar: 'wealth', en: ['which groups of entries do I have', 'show my grouped transactions'], nl: ['welke groepen van invoer heb ik', 'toon mijn gegroepeerde uitgaven']},
];
