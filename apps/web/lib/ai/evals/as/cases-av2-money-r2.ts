import type {Intent} from './cases';

/**
 * Session AV lane 2, round 2 (money; Wallet, Spendee, Emma): the questions round 2's money features raise, answered on the
 * device from each feature's own pure function (lib/ai/local-answers/av2-money-r2.ts), in English and Dutch. The lead adds
 * `AV2_MONEY_R2` to the corpus (lib/ai/evals/as/cases.ts) and records expected.json.
 */
export const AV2_MONEY_R2: readonly Intent[] = [
  {id: 'av2r2-money-saved', pillar: 'wealth', en: ['what are my saved entries', 'which saved entries do I have'], nl: ['welke opgeslagen posten heb ik', 'wat zijn mijn opgeslagen posten']},
  {id: 'av2r2-money-paid-with', pillar: 'wealth', en: ['how did I pay this month', 'how much did I spend by payment method'], nl: ['hoeveel heb ik deze maand contant betaald', 'wat gaf ik uit per betaalwijze']},
  {id: 'av2r2-money-subcategories', pillar: 'wealth', en: ['what did I spend per subcategory this month', 'show my subcategories'], nl: ['wat gaf ik uit per subcategorie', 'toon mijn subcategorieen']},
  {id: 'av2r2-money-day-left', pillar: 'wealth', en: ['how much can I spend per day', 'how much budget is left per day'], nl: ['hoeveel heb ik per dag over', 'hoeveel kan ik per dag uitgeven']},
  {id: 'av2r2-money-own-budgets', pillar: 'wealth', en: ['how are my own budgets', 'how is my holiday budget'], nl: ['hoe staan mijn eigen budgetten', 'hoe staat mijn vakantiebudget']},
  {id: 'av2r2-money-payee-budgets', pillar: 'wealth', en: ['how are my payee budgets', 'how are my shop budgets'], nl: ['hoe staan mijn winkelbudgetten', 'hoe staan mijn budgetten per winkel']},
];
