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
/** Session AV (owner follow-up 1, F-OWN-TEMPLATES; Day One): the same questions in Dutch, in the same order (one per day). */
export const DAILY_QUESTIONS_NL: readonly string[] = [
  'Waar moest je vandaag om glimlachen?',
  'Wat heb je vandaag geleerd, al is het iets kleins?',
  'Waar kijk je deze week naar uit?',
  'Wie heeft je onlangs geholpen, en hoe?',
  'Wat kostte meer energie dan je had verwacht?',
  'Wat zou morgen een goede dag maken?',
  'Waar ben je trots op van deze week?',
  'Waar voelde je je vandaag het meest jezelf?',
  'Wat kun je vandaag loslaten?',
  'Wat had je lichaam vandaag nodig?',
  'Wat verraste je vandaag?',
  'Welke kleine overwinning had je bijna gemist?',
  'Wat deed je vandaag waar je toekomstige zelf je dankbaar voor is?',
  'Wat zou je zeggen tegen een vriend die jouw dag had gehad?',
  'Welke drie dingen kun je nu zien, horen of voelen?',
  'Waar besteedde je vandaag je beste uur aan?',
  'Wat wil je onthouden van vandaag?',
  'Wat putte je uit, en wat gaf je energie?',
  'Welke gewoonte ging vandaag makkelijk, en welke moeilijk?',
  'Wat is één vriendelijk ding dat je deed, of zag?',
  'Wat speelt er in je hoofd dat je nog niet hardop hebt gezegd?',
  'Hoe zou een rustige versie van vandaag eruit hebben gezien?',
  'Wat heb je vandaag bewust niet gedaan, en waarom?',
  'Wat gaat beter dan een maand geleden?',
  'Waar heb je deze week meer van nodig?',
  'Met wie zou je meer tijd willen doorbrengen?',
  'Wat maakte vandaag anders dan gisteren?',
  'Op welke vraag zou je graag een antwoord hebben?',
];
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
/** The question for `date` (YYYY-MM-DD), `step` questions further on ("Another question"). */
export function questionOfTheDay(date: string, step = 0, lang: 'en' | 'nl' = 'en'): string {
  const list = lang === 'nl' ? DAILY_QUESTIONS_NL : DAILY_QUESTIONS, n = list.length, i = (((dayNumber(date) + step) % n) + n) % n;
  return list[Number.isFinite(i) ? i : 0]!;
}
/** The entry's text with the question as its first line (an entry that already holds words keeps them under it). */
export const withQuestion = (current: string, question: string) => current.trim() ? `${question}\n${current}` : `${question}\n`;
