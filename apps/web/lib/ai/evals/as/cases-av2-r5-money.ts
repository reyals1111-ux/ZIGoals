import type {Intent} from './cases';

/**
 * Session AV lane 2, round 5 (money; Tiller, PocketSmith): the questions round 5's money features raise, answered on the
 * device from each feature's own pure function (lib/ai/local-answers/av2-r5-money.ts), in English and Dutch. The lead
 * adds `AV2_R5_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R5_MONEY: readonly Intent[] = [
  {id: 'av2r5-money-yesterday', pillar: 'wealth', en: ['what was yesterday\'s money', 'give me my money summary for yesterday'], nl: ['wat was mijn geld van gisteren', 'geef me het geldoverzicht van gisteren']},
  {id: 'av2r5-money-year-budgets', pillar: 'wealth', en: ['how are my budgets doing this year so far', 'show my budgets year to date'], nl: ['hoe staan mijn budgetten dit jaar tot nu toe', 'toon mijn budgetten van dit jaar tot nu toe']},
];
