import type {Intent} from './cases';

/**
 * Session AV lane 2 (money): the questions the money pillar's lane 2 features raise, answered on the device from each
 * feature's own pure function (lib/ai/local-answers/av2-money.ts), in English and Dutch. The lead adds `AV2_MONEY` to the
 * corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_MONEY: readonly Intent[] = [
  {id: 'av2-money-left-out', pillar: 'wealth', en: ['what did I leave out of my spending', 'which entries are not counted in my totals'], nl: ['wat telt niet mee in mijn uitgaven', 'welke posten zijn weggelaten uit mijn totalen']},
  {id: 'av2-money-tax', pillar: 'wealth', en: ['what is tax deductible this year', 'which entries are tax-deductible'], nl: ['wat is aftrekbaar dit jaar', 'welke posten zijn aftrekbaar']},
  {id: 'av2-money-own-categories', pillar: 'wealth', en: ['what are my own categories', 'which custom categories do I have'], nl: ['welke eigen categorieën heb ik', 'wat zijn mijn eigen categorieen']},
];
