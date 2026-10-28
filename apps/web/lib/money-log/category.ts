import {EXPENSE_CATEGORIES, INCOME_CATEGORIES} from './schema';

/** Session AI: a category from the person's words ("lunch" → Food & drink), or the one they named, or Other. EN and NL. */
const WORDS: [RegExp, (typeof EXPENSE_CATEGORIES)[number]][] = [
  [/\b(?:lunch|dinner|breakfast|coffee|cafe|café|restaurant|pizza|drinks?|beer|bar|takeaway|snack|ontbijt|diner|avondeten|koffie|eten|biertje|terras)\b/i, 'Food & drink'],
  [/\b(?:groceries|grocery|supermarket|market|albert heijn|aldi|lidl|jumbo|delhaize|colruyt|boodschappen|supermarkt|markt)\b/i, 'Groceries'],
  [/\b(?:train|tram|bus|metro|taxi|uber|fuel|petrol|gas station|parking|ticket|trein|benzine|tanken|parkeren)\b/i, 'Transport'],
  [/\b(?:rent|mortgage|furniture|ikea|repair|huur|hypotheek|meubels|reparatie)\b/i, 'Home'],
  [/\b(?:energy|electricity|water bill|internet|phone bill|insurance|tax|energie|stroom|verzekering|belasting)\b/i, 'Bills'],
  [/\b(?:subscription|netflix|spotify|music|abonnement)\b/i, 'Subscriptions'],
  [/\b(?:pharmacy|doctor|dentist|gym|apotheek|dokter|tandarts|sportschool)\b/i, 'Health'],
  [/\b(?:cinema|movie|concert|game|tickets?|bioscoop|film|uitje)\b/i, 'Fun'],
  [/\b(?:clothes|shoes|shopping|kleding|schoenen|winkelen)\b/i, 'Shopping'],
  [/\b(?:gift|present|cadeau)\b/i, 'Gifts'],
];
export function expenseCategory(named: string | undefined, words: string): string {
  const exact = named ? EXPENSE_CATEGORIES.find(c => c.toLowerCase() === named.trim().toLowerCase()) : undefined;
  if (exact) return exact;
  const text = `${named ?? ''} ${words}`;
  return WORDS.find(([re]) => re.test(text))?.[1] ?? 'Other';
}
export function incomeCategory(named: string | undefined, words: string): string {
  const exact = named ? INCOME_CATEGORIES.find(c => c.toLowerCase() === named.trim().toLowerCase()) : undefined;
  if (exact) return exact;
  const text = `${named ?? ''} ${words}`;
  return /\b(?:salary|wage|paycheck|loon|salaris)\b/i.test(text) ? 'Salary' : /\b(?:freelance|invoice|client|factuur|klant)\b/i.test(text) ? 'Freelance' : /\b(?:gift|present|cadeau)\b/i.test(text) ? 'Gift' : /\b(?:refund|terugbetaling)\b/i.test(text) ? 'Refund' : 'Other income';
}
