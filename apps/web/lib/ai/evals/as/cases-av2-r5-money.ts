import type {Intent} from './cases';

/**
 * Session AV lane 2, round 5 (money; Tiller, PocketSmith): the questions round 5's money features raise, answered on the
 * device from each feature's own pure function (lib/ai/local-answers/av2-r5-money.ts), in English and Dutch. The lead
 * adds `AV2_R5_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R5_MONEY: readonly Intent[] = [
  {id: 'av2r5-money-yesterday', pillar: 'wealth', en: ['what was yesterday\'s money', 'give me my money summary for yesterday'], nl: ['wat was mijn geld van gisteren', 'geef me het geldoverzicht van gisteren']},
  {id: 'av2r5-money-year-budgets', pillar: 'wealth', en: ['how are my budgets doing this year so far', 'show my budgets year to date'], nl: ['hoe staan mijn budgetten dit jaar tot nu toe', 'toon mijn budgetten van dit jaar tot nu toe']},
  {id: 'av2r5-money-paid-early', pillar: 'wealth', en: ['did I pay any bill early', 'which bill did I pay ahead of its due date'], nl: ['welke rekeningen zijn te vroeg afgeschreven', 'welke rekening ging eerder af dan de vervaldag']},
  {id: 'av2r5-money-merge-accounts', pillar: 'wealth', en: ['how do I merge two accounts', 'can I merge my accounts'], nl: ['hoe voeg ik twee rekeningen samen', 'kan ik mijn rekeningen samenvoegen']},
  {id: 'av2r5-money-what-if', pillar: 'wealth', en: ['what changes have I tried on my forecast', 'show my what if scenarios'], nl: ['welke wijzigingen heb ik op mijn prognose geprobeerd', 'toon mijn wat als scenario\'s']},
];
