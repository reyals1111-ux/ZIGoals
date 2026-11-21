/**
 * Session AS (ADR-042, Part 1): the exact layer's types. A question is read into a `Query` — which part of the person's
 * life (`domain`), what is asked about it (`ask`: missed, done, skipped, late, …), the shape of the answer (`shape`: a
 * count, a list, dates, an amount, …) and the period — and the `Query` is answered from the records as `Exact`: the
 * words, the same facts as data (what a connected model receives as a tool result), and the widgets of that answer.
 */
export type Lang = 'en' | 'nl';
export const DOMAINS = ['habits', 'water', 'steps', 'sleep', 'weight', 'calories', 'protein', 'workouts', 'meditation', 'vitals', 'health', 'goals', 'networth', 'spending', 'income', 'budgets', 'bills', 'debts', 'tasks', 'notes', 'journal', 'agenda', 'checklist', 'focus', 'nova', 'life'] as const;
export type Domain = (typeof DOMAINS)[number];
export const ASKS = ['missed', 'not-done', 'skipped', 'done', 'late', 'open', 'total', 'average', 'best', 'worst', 'streak', 'compare', 'trend', 'status', 'last', 'next', 'why'] as const;
export type Ask = (typeof ASKS)[number];
export const SHAPES = ['count', 'list', 'dates', 'amount', 'yes-no', 'overview'] as const;
export type Shape = (typeof SHAPES)[number];
/** The area switch a domain reads under (Health: its own three-part gate; `none`: nothing of the person's records). */
export type Gate = 'today' | 'goals' | 'habits' | 'health' | 'wealth' | 'notes' | 'journal' | 'none';
export const DOMAIN_GATE: Readonly<Record<Domain, Gate>> = {
  habits: 'habits', water: 'health', steps: 'health', sleep: 'health', weight: 'health', calories: 'health', protein: 'health', workouts: 'health', meditation: 'health', vitals: 'health', health: 'health',
  goals: 'goals', networth: 'wealth', spending: 'wealth', income: 'wealth', budgets: 'wealth', bills: 'wealth', debts: 'wealth',
  tasks: 'today', notes: 'notes', journal: 'journal', agenda: 'today', checklist: 'today', focus: 'today', nova: 'none', life: 'none',
};
/** A named record the question is about (a habit, a goal, a budget's category, a bill). */
export type QuerySubject = {kind: 'habit' | 'goal' | 'category' | 'bill'; id: string; name: string};
export type Query = {
  domain: Domain; ask: Ask; shape: Shape; lang: Lang;
  /** The period's token (lib/ai/local-answers/exact/period.ts); null: the question named none (each answer has its default). */
  period: string | null;
  /** A second period, for "this week vs last week". */
  versus?: string | null;
  /** 0 (Sunday) to 6: "on Mondays". */
  weekday: number | null;
  subject: QuerySubject | null;
  /** A habit the words also fit, by a word people use for it ("gesport" for a habit called Exercise): asked when the part of life the words name holds nothing. */
  alt?: QuerySubject;
  /** More than one record fits the name equally: the answer is a question back. */
  choices?: QuerySubject[];
  /** The question as it was understood, after typo fixes (for the tests and the tool's label). */
  read: string;
};
export type ExactWidget = {id: string; ref?: string; period?: string; range?: 'week' | 'month' | 'quarter' | 'year';
  /** The widget that stands in while `id` is not in this build's catalogue. */
  fallback?: string};
export type Exact = {
  kind: 'answer' | 'refusal' | 'choices' | 'honest';
  text: string;
  /** The same facts as data: counts, dates (ISO), rows. What `life_facts` returns and what the corpus checks. */
  facts: Record<string, unknown>;
  widgets: ExactWidget[];
  query: Query;
  /** Where the figures come from, in words ("Your habits"). */
  source: string;
};
