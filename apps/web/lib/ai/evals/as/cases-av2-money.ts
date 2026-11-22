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
  {id: 'av2-money-move-alerts', pillar: 'wealth', en: ['which move alerts do I have', 'what 24 hour alerts are set'], nl: ['welke bewegingsalarmen heb ik', 'welke procentalarmen staan er']},
  {id: 'av2-money-time-machine', pillar: 'wealth', en: ['what was my portfolio worth a month ago', 'what were my coins worth last year'], nl: ['wat was mijn portefeuille vorige maand waard', 'wat was mijn crypto vorig jaar waard']},
  {id: 'av2-money-underfunded', pillar: 'wealth', en: ['what is underfunded this month', 'which budgets are underfunded'], nl: ['welke budgetten komen tekort', 'wat komt er tekort in mijn budgetten']},
  {id: 'av2-money-flexible', pillar: 'wealth', en: ['how much flexible budget is left', 'what is my flexible spending left'], nl: ['hoeveel flexibel budget heb ik nog', 'hoeveel flexibele uitgaven heb ik nog over']},
  {id: 'av2-money-suggested-budget', pillar: 'wealth', en: ['what should my groceries budget be', 'can you suggest a budget for groceries'], nl: ['wat is een voorstel voor mijn budget voor groceries', 'wat is mijn gemiddelde budget voor groceries']},
  {id: 'av2-money-paid-off', pillar: 'wealth', en: ['which debts have I paid off', 'what debts are paid off'], nl: ['welke schulden heb ik afgelost', 'welke leningen zijn afbetaald']},
  {id: 'av2-money-paid-down', pillar: 'wealth', en: ['how much debt did I pay down this year', 'how much have I paid down'], nl: ['hoeveel schuld heb ik dit jaar afgelost', 'hoeveel heb ik afbetaald']},
  {id: 'av2-money-kept-plan', pillar: 'wealth', en: ['am I on track with my debt plan', 'am I ahead of my debt plan'], nl: ['lig ik op schema met mijn aflosplan', 'loop ik achter op mijn aflosplan']},
  {id: 'av2-money-debt-free-by', pillar: 'wealth', en: ['how much extra do I need to be debt free by 2030', 'how much extra to be debt free by 2029'], nl: ['hoeveel extra heb ik nodig om in 2030 schuldenvrij te zijn', 'hoeveel extra moet ik betalen om in 2029 schuldenvrij te zijn']},
  {id: 'av2-money-equity', pillar: 'wealth', en: ['what is my home equity', 'how much equity do I have'], nl: ['hoeveel overwaarde heb ik', 'wat is de overwaarde van mijn huis']},
  {id: 'av2-money-stale', pillar: 'wealth', en: ['which accounts need an update', 'which balances are due for an update'], nl: ['welke rekeningen moet ik bijwerken', 'welke saldi moet ik bijwerken']},
  {id: 'av2-money-one-total', pillar: 'wealth', en: ['what is my net worth in one total', 'show my wealth in one total'], nl: ['wat is mijn vermogen in één totaal', 'toon mijn vermogen in een totaal']},
  {id: 'av2-money-irr', pillar: 'wealth', en: ['what is the annual return on my investments', 'what is my irr'], nl: ['wat is het rendement van mijn beleggingen', 'wat is mijn rendement']},
];
