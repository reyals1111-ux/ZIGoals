import {addLocalDays} from '../local-date';
import {editEntry, type EntryUndo} from './versions';
import {DAY_ANSWER_MAX, DAY_QUESTION_MAX, MAX_DAY_QUESTIONS, MAX_ENTRIES, MAX_TEXT, journalReminderSchema, journalSchema, type Journal, type JournalEntry, type JournalReminder} from './schema';

/**
 * Session AW (x3; LEDGER #444, The Five Minute Journal's morning and evening pages): "Morning and evening" in the Journal —
 * one day's entry written in two parts. The morning page asks its questions (the person's own, or "I am grateful for…"
 * and "What would make today great?"); the evening page shows what the morning said ("This morning you wrote …") above
 * its own two questions. The day stays one entry: its `parts` keep each page's answers, and its `text` always holds both
 * pages in words, so Search, the exports, the other answers and older builds read the whole day. Changing a page keeps the
 * words it had as an earlier version (lib/journal/versions.ts). Each page has its own reminder, both off until chosen:
 * the morning page's `morningReminder` and the evening page's, which is the journal's one `reminder`. Pure.
 */
export type PromptLang = 'en' | 'nl';
export type DayPart = 'morning' | 'evening';
export type DayAnswer = {q: string; a: string};
/** The template id a day page's entry carries (`template`); an older build reads it as no template it knows. */
export const DAY_PAGE_TEMPLATE = 'morning-evening';
export const DEFAULT_MORNING: Record<PromptLang, readonly string[]> = {en: ['I am grateful for…', 'What would make today great?'], nl: ['Ik ben dankbaar voor…', 'Wat zou vandaag mooi maken?']};
export const EVENING_QUESTIONS: Record<PromptLang, readonly string[]> = {en: ['What went well today?', 'What would have made today even better?'], nl: ['Wat ging er goed vandaag?', 'Wat had vandaag nog beter gemaakt?']};
export const PART_WORDS: Record<DayPart, Record<PromptLang, string>> = {morning: {en: 'Morning page', nl: 'Ochtendpagina'}, evening: {en: 'Evening page', nl: 'Avondpagina'}};
/** The morning page's reminder until the person chooses one: off, at 07:30, every day. */
export const DEFAULT_MORNING_REMINDER: JournalReminder = {on: false, time: '07:30', days: 127};

export const dayPagesOn = (journal: Pick<Journal, 'dayPages'>) => journal.dayPages?.on === true;
/** The morning page's questions: the person's own, else the two of the day's language. */
export const morningQuestions = (journal: Pick<Journal, 'dayPages'>, lang: PromptLang): readonly string[] => journal.dayPages?.questions?.length ? journal.dayPages.questions : DEFAULT_MORNING[lang];
export const questionsFor = (journal: Pick<Journal, 'dayPages'>, part: DayPart, lang: PromptLang) => part === 'morning' ? morningQuestions(journal, lang) : EVENING_QUESTIONS[lang];
/** The day's page: the entry of that day written as morning and evening (never a letter still to open). */
export const dayPageOf = (journal: Pick<Journal, 'entries'>, day: string): JournalEntry | null => journal.entries.find(e => e.date === day && e.template === DAY_PAGE_TEMPLATE && !e.opensOn) ?? null;
const answered = (list: readonly DayAnswer[] | undefined) => (list ?? []).filter(x => x.a.trim());
/** Whether a part of that day is written (at least one answer). */
export const partWritten = (journal: Pick<Journal, 'entries'>, day: string, part: DayPart) => answered(dayPageOf(journal, day)?.parts?.[part]).length > 0;
/** The answers of a part that say something, for "This morning you wrote …". */
export const partAnswers = (entry: Pick<JournalEntry, 'parts'> | null, part: DayPart): DayAnswer[] => answered(entry?.parts?.[part]);
/** The part to open first: the morning until it is written and before 15:00, else the evening. */
export const partToOpen = (journal: Pick<Journal, 'entries'>, day: string, hour: number): DayPart => hour < 15 && !partWritten(journal, day, 'morning') ? 'morning' : 'evening';

/** Both pages in words, each under its heading, each answer under its question (an unanswered question is left out). */
export function dayPageText(parts: {morning?: readonly DayAnswer[]; evening?: readonly DayAnswer[]}, lang: PromptLang): string {
  return (['morning', 'evening'] as const).flatMap(p => { const list = answered(parts[p]); return list.length ? [`${PART_WORDS[p][lang]}\n${list.map(x => `${x.q}\n${x.a.trim()}`).join('\n\n')}`] : []; }).join('\n\n');
}
/** The answers as kept: each question at most 120 characters, each answer at most 900 (trimmed), at most five. */
function cleanAnswers(answers: readonly DayAnswer[]): DayAnswer[] {
  return answers.slice(0, MAX_DAY_QUESTIONS).map(x => ({q: x.q.trim().slice(0, DAY_QUESTION_MAX), a: x.a.trim()})).filter(x => x.q).map(x => {
    if (x.a.length > DAY_ANSWER_MAX) throw new Error(`An answer holds at most ${DAY_ANSWER_MAX} characters.`);
    return x;
  });
}
export type PartUndo = {kind: 'made'; entryId: string} | {kind: 'changed'; undo: EntryUndo};
/**
 * The day's page with one part written: a new entry of that day when there is none yet, else the same entry with this
 * part changed (its words before become an earlier version). At least one answer is needed.
 */
export function writePart(journal: Journal, input: {day: string; part: DayPart; answers: readonly DayAnswer[]; lang: PromptLang; now: string; id: string}): {journal: Journal; entry: JournalEntry; undo: PartUndo} {
  const answers = cleanAnswers(input.answers);
  if (!answered(answers).length) throw new Error('Write at least one answer first.');
  const existing = dayPageOf(journal, input.day), parts = {...existing?.parts, [input.part]: answers}, text = dayPageText(parts, input.lang);
  if (text.length > MAX_TEXT) throw new Error(`A day’s page holds at most ${MAX_TEXT.toLocaleString('en-US')} characters. Shorten an answer.`);
  if (!existing) {
    const entry: JournalEntry = {id: input.id, date: input.day, text, createdAt: input.now, template: DAY_PAGE_TEMPLATE, parts};
    return {journal: journalSchema.parse({...journal, entries: [...journal.entries, entry].slice(-MAX_ENTRIES)}), entry, undo: {kind: 'made', entryId: entry.id}};
  }
  const edited = editEntry(journal, existing.id, text, input.now), undo = edited.undo ?? {entry: existing, versions: (journal.versions ?? []).filter(v => v.entryId === existing.id)};
  const next = journalSchema.parse({...edited.journal, entries: edited.journal.entries.map(e => e.id === existing.id ? {...e, parts, updatedAt: input.now} : e)});
  return {journal: next, entry: next.entries.find(e => e.id === existing.id)!, undo: {kind: 'changed', undo}};
}

/** "Morning and evening" switched on or off; the person's own morning questions, one a line (none: the usual two). */
export function withDayPages(journal: Journal, change: {on?: boolean; questionsText?: string}): Journal {
  const current = journal.dayPages ?? {on: false};
  const next: {on: boolean; questions?: string[]} = {on: change.on ?? current.on};
  const lines = change.questionsText === undefined ? current.questions ?? [] : change.questionsText.split('\n').map(l => l.trim().replace(/\s+/g, ' ')).filter(Boolean);
  if (lines.length > MAX_DAY_QUESTIONS) throw new Error(`Up to ${MAX_DAY_QUESTIONS} morning questions.`);
  if (lines.some(l => l.length > DAY_QUESTION_MAX)) throw new Error(`A question holds at most ${DAY_QUESTION_MAX} characters.`);
  if (lines.length) next.questions = lines;
  return journalSchema.parse({...journal, dayPages: next});
}
export const morningReminderOf = (journal: Pick<Journal, 'morningReminder'>): JournalReminder => journal.morningReminder ?? DEFAULT_MORNING_REMINDER;
/** The journal with the morning page's reminder changed; a change that would leave no weekday, or a time that does not read, throws. */
export function withMorningReminder(journal: Journal, change: Partial<JournalReminder>): Journal {
  const next = journalReminderSchema.safeParse({...morningReminderOf(journal), ...change});
  if (!next.success) throw new Error(change.days !== undefined ? 'Keep at least one day.' : 'Choose a time, for example 07:30.');
  return journalSchema.parse({...journal, morningReminder: next.data});
}
/**
 * What the notification plan needs for the morning page: its time and weekdays and the days of the 48-hour window whose
 * morning page is written already. Null while "Morning and evening" or its reminder is off. Never a word of the journal.
 */
export function morningPlanInput(journal: Pick<Journal, 'dayPages' | 'morningReminder' | 'entries'>, today: string): {time: string; weekdays: number; written: string[]} | null {
  const r = journal.morningReminder;
  if (!dayPagesOn(journal) || !r?.on) return null;
  return {time: r.time, weekdays: r.days, written: [today, addLocalDays(today, 1)].filter(d => partWritten(journal, d, 'morning'))};
}
