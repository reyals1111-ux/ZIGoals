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
  {id: 'av2-money-transfers', pillar: 'wealth', en: ['which card payments are marked as transfers', 'what transfers between my accounts do I have'], nl: ['welke overboekingen tussen mijn rekeningen zijn er', 'welke creditcardbetalingen heb ik']},
  {id: 'av2-money-payees', pillar: 'wealth', en: ['which payees am I watching', 'what are my watched payees'], nl: ['welke winkels volg ik', 'welke winkels houd ik in de gaten']},
  {id: 'av2-money-challenges', pillar: 'wealth', en: ['how is my spending challenge going', 'how are my money challenges'], nl: ['hoe gaat mijn uitdaging', 'hoe staan mijn uitdagingen ervoor']},
  {id: 'av2-money-until-payday', pillar: 'wealth', en: ['how much will I have left until payday', 'what will I have left before my next payday'], nl: ['hoeveel houd ik over tot mijn salaris', 'hoeveel heb ik over tot de volgende salarisdag']},
  {id: 'av2-money-low-line', pillar: 'wealth', en: ['will my cash go below my line', 'when will my balance drop below my low-balance line'], nl: ['zakt mijn geld onder mijn grens', 'komt mijn saldo onder mijn grens']},
  {id: 'av2-money-year', pillar: 'wealth', en: ['how was my year for money', 'show my year in review'], nl: ['hoe was mijn jaar voor mijn geld', 'toon mijn jaar in cijfers']},
  {id: 'av2-money-account-notes', pillar: 'wealth', en: ['what notes do I have on my accounts', 'show my account notes'], nl: ['welke notities heb ik bij mijn rekeningen', 'toon mijn notities bij mijn rekeningen']},
];
