import type {Intent} from './cases';

/**
 * Session AV lane 2, round 6 (money; EveryDollar, Banktivity): the questions round 6's money features raise, answered on the
 * device from each feature's own pure function (lib/ai/local-answers/av2-r6-money.ts), in English and Dutch. The lead adds
 * `AV2_R6_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_R6_MONEY: readonly Intent[] = [
  {id: 'av2r6-money-refunds', pillar: 'wealth', en: ['how much did I get refunded this month', 'does a refund count as income'], nl: ['hoeveel geld heb ik deze maand terug gekregen', 'is een terugbetaling inkomsten']},
  {id: 'av2r6-money-paychecks', pillar: 'wealth', en: ['what is left of each paycheck', 'show my paycheck plan'], nl: ['wat staat er per salaris gepland', 'toon mijn salarisplan']},
  {id: 'av2r6-money-streak', pillar: 'wealth', en: ['what is my money streak', 'how many days in a row i looked at my money'], nl: ['wat is mijn geldreeks', 'hoeveel dagen op rij heb ik naar mijn geld gekeken']},
  {id: 'av2r6-money-set-aside', pillar: 'wealth', en: ['what did I set aside for next month', 'are next months budgets covered already'], nl: ['wat heb ik opzij gezet voor volgende maand', 'is volgende maand al gedekt']},
  {id: 'av2r6-money-order', pillar: 'wealth', en: ['how do I reorder my budgets', 'can I put my budgets in my own order'], nl: ['hoe zet ik mijn budgetten in een andere volgorde', 'kan ik mijn budgetten herschikken']},
  {id: 'av2r6-money-check', pillar: 'wealth', en: ['is anything wrong in my money records', 'are there duplicate entries in my money log'], nl: ['zijn er fouten in mijn geldgegevens', 'zijn er dubbele boekingen in mijn geldlog']},
  {id: 'av2r6-money-put-away', pillar: 'wealth', en: ['how do I put old entries away', 'which years did I put away'], nl: ['hoe berg ik oude boekingen op', 'welke jaren heb ik opgeborgen']},
];
