import type {Intent} from './cases';

/**
 * Session AW (fr-money; persona Tom, FR-AW-3, FR-AW-4, FR-AW-11): the money questions a friend who pays off a card asks,
 * answered on the device in English and Dutch under the Wealth gate. The integrator adds `AW_FR_MONEY` to the corpus
 * (lib/ai/evals/as/cases.ts) and records expected.json.
 * - paid off in a period: the payments recorded on the debts (lib/ai/local-answers/aw-fr-money.ts), never the spending;
 *   the Showcase (17 Nov 2026) holds a 300.00 payment on the Car loan on Sun 15 Nov, none on Mon 16 or Tue 17 Nov;
 * - what is owed: the balance less the payments recorded since it, the figure Wealth's row shows (owedAfterPayments);
 * - a loan to pay a card, "is it smart": the no-advice line (lib/ai/safety-guard.ts LOAN_ADVICE), never the task list.
 */
export const AW_FR_MONEY: readonly Intent[] = [
  {id: 'awfr-money-paid-month', pillar: 'wealth', en: ['how much have I paid off this month', 'how much did I pay off on my debts this month'], nl: ['hoeveel heb ik deze maand afgelost', 'hoeveel schuld heb ik deze maand afbetaald'], never: ['spent', 'uitgegeven', 'Groceries']},
  {id: 'awfr-money-paid-week', pillar: 'wealth', en: ['how much have I paid off this week', 'how much debt did I pay down this week'], nl: ['hoeveel heb ik deze week afgelost', 'hoeveel schuld heb ik deze week afbetaald'], never: ['spent', 'uitgegeven', 'Groceries']},
  {id: 'awfr-money-owed', pillar: 'wealth', en: ['how much do I owe', 'how much is left on my credit card'], nl: ['hoeveel schuld heb ik', 'hoeveel moet ik nog aflossen'], never: ['spent', 'uitgegeven']},
  {id: 'awfr-money-loan-advice', pillar: 'wealth', en: ['is it smart to take a loan to pay my card', 'should I take out a loan to pay off my credit card'], nl: ['is het slim om een lening te nemen voor mijn creditcard', 'moet ik een lening afsluiten om mijn creditcard af te lossen'], never: ['task', 'taak', 'overdue']},
];
