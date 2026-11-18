/**
 * Session AS (ADR-042 Part 2): what NOVA answers, as a card. Static words that ship with the app: six groups, each with
 * two example questions as plain text (questions the exact layer answers from the person's own records, on this device:
 * lib/ai/local-answers/exact). It reads no record.
 */
export type AnswerGroup = {key: string; label: string; asks: readonly [string, string]};
export const NOVA_ANSWER_GROUPS: readonly AnswerGroup[] = [
  {key: 'habits', label: 'Habits', asks: ['Which days did I skip meditation this month?', 'How many habits did I miss this week?']},
  {key: 'health', label: 'Health', asks: ['How did I sleep last week?', 'How much water did I drink today?']},
  {key: 'goals', label: 'Goals', asks: ['Which goal is closest to done?', 'Is any goal behind plan?']},
  {key: 'money', label: 'Money', asks: ['How much did I spend last week?', 'Which bills are due this month?']},
  {key: 'tasks', label: 'Tasks and agenda', asks: ['Which tasks are overdue?', 'What is on my agenda today?']},
  {key: 'mind', label: 'Journal and focus', asks: ['Which days did I write this month?', 'How long did I focus this week?']},
];
export const NOVA_ANSWERS_LINE: Readonly<Record<'en' | 'nl', string>> = {
  en: 'Ask me what you did, missed or skipped, on which days and how much. I answer from your own records, on this device.',
  nl: 'Vraag me wat je hebt gedaan, gemist of overgeslagen, op welke dagen en hoeveel. Ik antwoord uit je eigen gegevens, op dit apparaat.',
};
