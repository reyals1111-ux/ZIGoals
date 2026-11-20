/**
 * Session AV Part 7 (ADR-045 F-PROMPT; Day One's daily prompt): one question a day for the Journal, the same for everyone
 * on a given day, chosen by the date alone (no randomness, nothing stored, nothing sent). "Another question" steps to the
 * next one; using it only puts the question in the entry's text, where the person can change or remove it.
 */
export const DAILY_QUESTIONS: readonly string[] = [
  'What made you smile today?',
  'What did you learn today, even something small?',
  'What are you looking forward to this week?',
  'Who helped you lately, and how?',
  'What took more energy than you expected?',
  'What would make tomorrow a good day?',
  'What are you proud of from this week?',
  'Where did you feel most like yourself today?',
  'What is one thing you can let go of today?',
  'What did your body need today?',
  'What surprised you today?',
  'What is a small win you almost missed?',
  'What did you do today that future you will thank you for?',
  'What would you tell a friend who had your day?',
  'What are three things you can see, hear or feel right now?',
  'What did you spend your best hour on today?',
  'What is something you want to remember about today?',
  'What drained you, and what filled you up?',
  'Which habit felt easy today, and which felt hard?',
  'What is one kind thing you did, or saw?',
  'What is on your mind that you have not said out loud?',
  'What would a calm version of today have looked like?',
  'What did you choose not to do today, and why?',
  'What is going better than a month ago?',
  'What do you need more of this week?',
  'Who would you like to spend more time with?',
  'What made today different from yesterday?',
  'What is one question you would like answered?',
];
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
/** The question for `date` (YYYY-MM-DD), `step` questions further on ("Another question"). */
export function questionOfTheDay(date: string, step = 0): string {
  const n = DAILY_QUESTIONS.length, i = (((dayNumber(date) + step) % n) + n) % n;
  return DAILY_QUESTIONS[Number.isFinite(i) ? i : 0]!;
}
/** The entry's text with the question as its first line (an entry that already holds words keeps them under it). */
export const withQuestion = (current: string, question: string) => current.trim() ? `${question}\n${current}` : `${question}\n`;
