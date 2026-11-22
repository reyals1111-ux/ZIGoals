import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, MAX_ARCHIVED, type MoneyEntry, type MoneyLog} from './schema';
import {allCategories} from './counted';

/** Session AI: a category from the person's words ("lunch" → Food & drink), or the one they named, or Other. EN and NL. */
const WORDS: [RegExp, (typeof EXPENSE_CATEGORIES)[number]][] = [
  [/\b(?:lunch|dinner|breakfast|coffee|cafe|café|restaurant|pizza|drinks?|beer|bar|takeaway|snack|ontbijt|diner|avondeten|koffie|eten|biertje|terras)\b/i, 'Food & drink'],
  [/\b(?:groceries|grocery|grocers?|greengrocer|bakery|baker|butcher|supermarket|market|albert heijn|ekoplaza|dirk|spar|groenteboer|bakker|bakkerij|slager|aldi|lidl|jumbo|delhaize|colruyt|boodschappen|supermarkt|markt)\b/i, 'Groceries'],
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

/**
 * Session AV lane 2, round 4 (money; Lunch Money's archived categories, LEDGER #342): "Archive" takes a category — one of
 * the usual ones or the person's own — out of the pickers (the entry form, budgets, To review, Split, a change to several
 * at once) without touching any entry: its entries keep it, and reports, insights and search still show it. "Bring back"
 * offers it again. Kept on the (space's own) money log's loose `archived` list. Pure.
 */
type Kind = MoneyEntry['kind'];
const listOf = (log: Pick<MoneyLog, 'archived'>, kind: Kind): readonly string[] => (kind === 'expense' ? log.archived?.expense : log.archived?.income) ?? [];
export const archivedOf = listOf;
export const isArchived = (log: Pick<MoneyLog, 'archived'>, kind: Kind, name: string) => listOf(log, kind).some(c => c.toLowerCase() === name.trim().toLowerCase());
export function archiveCategory(log: MoneyLog, kind: Kind, name: string): MoneyLog {
  const found = allCategories(log, kind).find(c => c.toLowerCase() === name.trim().toLowerCase()) ?? name.trim();
  if (!found) throw new Error('Choose a category to archive.');
  if (isArchived(log, kind, found)) return log;
  const list = listOf(log, kind);
  if (list.length >= MAX_ARCHIVED) throw new Error(`Up to ${MAX_ARCHIVED} archived categories of each kind.`);
  const visible = allCategories(log, kind).filter(c => !isArchived(log, kind, c));
  if (visible.length <= 1 && visible.some(c => c.toLowerCase() === found.toLowerCase())) throw new Error('Keep at least one category to choose from.');
  return {...log, archived: {...log.archived, [kind]: [...list, found.slice(0, 40)]}};
}
export function unarchiveCategory(log: MoneyLog, kind: Kind, name: string): MoneyLog {
  const list = listOf(log, kind).filter(c => c.toLowerCase() !== name.trim().toLowerCase());
  return {...log, archived: {...log.archived, [kind]: list}};
}
/** How many entries carry a category (as their own or in a part), so "Archive" can say they stay. */
export const entriesIn = (entries: readonly MoneyEntry[], kind: Kind, name: string) => entries.filter(e => e.kind === kind && (e.category.toLowerCase() === name.toLowerCase() || e.parts?.some(p => p.category?.toLowerCase() === name.toLowerCase()))).length;
