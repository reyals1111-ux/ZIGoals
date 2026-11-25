import type {Intent} from './cases';

/**
 * Session AW, round 7 X7 (money; Cashew, Money Manager): the questions this group's money features raise, answered on the
 * device from each feature's own pure function (lib/ai/local-answers/aw-x7-money.ts), in English and Dutch, under the
 * Wealth gate. The integrator adds `AW_X7_MONEY` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AW_X7_MONEY: readonly Intent[] = [
  {id: 'awx7-money-removed', pillar: 'wealth', en: ['what did I remove recently', 'which money entries did I delete lately'], nl: ['wat heb ik onlangs verwijderd', 'welke boekingen heb ik onlangs verwijderd']},
  {id: 'awx7-money-bill-ends', pillar: 'wealth', en: ['when does my phone contract bill end', 'how many payments are left on my bills'], nl: ['wanneer stopt mijn telefoonabonnement', 'hoeveel termijnen heb ik nog voor mijn rekeningen']},
  {id: 'awx7-money-card-payment', pillar: 'wealth', en: ['how much is my next credit card payment', 'what is on my credit card so far this statement'], nl: ['hoeveel is mijn volgende creditcardbetaling', 'wat staat er tot nu toe op mijn creditcard']},
];
