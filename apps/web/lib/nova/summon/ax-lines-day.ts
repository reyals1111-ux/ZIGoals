import {journalTrack} from '../../ai/local-answers/exact/day';
import {habitTrack, habitsAnswer} from '../../ai/local-answers/exact/habits';
import {periodWords} from '../../ai/local-answers/exact/period';
import {streakText, trackAnswer} from '../../ai/local-answers/exact/track';
import type {Ask, Domain, Query} from '../../ai/local-answers/exact/types';
import {latestHabitRule} from '../../habits';
import {deviceDay, tasksClock} from '../../tasks/device';
import {widgetPeriod} from '../cards/ax/calendar';
import {dayScan, lifeRadar} from '../cards/ax/day-life';
import {notesConstellation} from '../cards/ax/day-notes';
import {NOVA_ANSWERS_LINE} from '../cards/ax/day-nova';
import {taskLoad, taskOverdue, taskTimeline, tasksMonth} from '../cards/ax/day-tasks';
import {streakFlames} from '../cards/ax/habit-flames';
import {YEAR_WEEKS, habitYear} from '../cards/ax/habit-lattice';
import type {AxLine} from './ax-lines';
import type {LineData, LineLang} from './lines';

/**
 * Session AS (ADR-042 Part 2): the lines of the answer widgets of this group, each from its widget's own selector (or
 * said by the exact layer itself, from the same days). The line data holds the habits, the journal's days, the tasks and
 * the notes; the focus sessions, the day's agenda and the Checklist are not in it (they are read by their pages' own
 * hooks), so a widget that shows only those has no line (null: the stage names the widget instead). The life radar and
 * the day scan say the parts the line data holds. Habits are said only while the Habits switch is open.
 */
const say = (lang: LineLang, en: string, nl: string) => lang === 'nl' ? nl : en;
const query = (domain: Domain, ask: Ask, period: string | null, lang: LineLang, read = ''): Query => ({domain, ask, shape: 'count', lang, period, weekday: null, subject: null, read});
const NO_HABITS = (lang: LineLang) => say(lang, 'You have no habits yet.', 'Je hebt nog geen gewoontes.');
const NO_TASKS = (lang: LineLang) => say(lang, 'No tasks yet.', 'Nog geen taken.');
const NO_ENTRIES = (lang: LineLang) => say(lang, 'No journal entries yet.', 'Nog niets in je dagboek.');
const count = (n: number, lang: LineLang, en: [string, string], nl: [string, string]) => `${n} ${(lang === 'nl' ? nl : en)[n === 1 ? 0 : 1]}`;
const DAYS: [[string, string], [string, string]] = [['day', 'days'], ['dag', 'dagen']], TASKS: [[string, string], [string, string]] = [['task', 'tasks'], ['taak', 'taken']], NOTES: [[string, string], [string, string]] = [['note', 'notes'], ['notitie', 'notities']];
const open = (n: number, lang: LineLang) => say(lang, `${n} open ${n === 1 ? 'task' : 'tasks'}`, `${n} open ${n === 1 ? 'taak' : 'taken'}`);
const live = (d: LineData) => (d.habits ?? []).filter(h => latestHabitRule(h).state !== 'archived');
/** Whether the Habits switch is open (asked through a kind that reads under it). */
const habitsOpen = (d: LineData) => d.gateOpen('streak-flames');
const journal = (d: LineData, lang: LineLang) => { const track = journalTrack(d.journal ?? [], d.day); return lang === 'nl' ? {...track, name: 'Dagboek'} : track; };
const none: AxLine = () => null;

export const AX_DAY_LINES: Readonly<Record<string, AxLine>> = {
  'streak-flames': (params, d, lang) => {
    if (!d.habits) return null;
    const habits = live(d), one = habits.find(h => h.id === params?.ref);
    if (!habits.length) return NO_HABITS(lang);
    return (one ? trackAnswer(query('habits', 'streak', null, lang), habitTrack(one, d.day), d.day) : habitsAnswer(query('habits', 'streak', null, lang), d.habits, d.day))?.text ?? null;
  },
  'best-streaks': (_params, d, lang) => {
    if (!d.habits) return null;
    if (!live(d).length) return NO_HABITS(lang);
    const top = streakFlames(d.habits, d.day, {by: 'best'}).longest;
    if (!top) return say(lang, 'No habit has a streak yet.', 'Nog geen gewoonte heeft een reeks.');
    return say(lang, `Your longest streak ever is ${top.name}, ${top.bestText}; ${top.current ? `${top.text} in a row now` : 'no streak is running for it now'}.`,
      `Je langste reeks ooit is ${top.name}, ${streakText(top.best, top.unit, 'nl')}; ${top.current ? `nu ${streakText(top.current, top.unit, 'nl')} op rij` : 'daar loopt nu geen reeks'}.`);
  },
  'journal-streak': (_params, d, lang) => !d.journal ? null : !d.journal.length ? NO_ENTRIES(lang) : trackAnswer(query('journal', 'streak', null, lang), journal(d, lang), d.day)?.text ?? null,
  'focus-streak': none,
  'habits-lattice': (params, d, lang) => !d.habits ? null : !d.habits.length ? NO_HABITS(lang) : habitsAnswer(query('habits', 'status', params?.period ?? 'this-month', lang), d.habits, d.day)?.text ?? null,
  'habit-weekdays': (params, d, lang) => !d.habits ? null : !d.habits.length ? NO_HABITS(lang) : habitsAnswer(query('habits', 'missed', params?.period ?? null, lang, 'weekday'), d.habits, d.day)?.text ?? null,
  'habit-year': (params, d, lang) => {
    if (!d.habits) return null;
    const habits = live(d), habit = habits.find(h => h.id === params?.ref) ?? habits[0];
    if (!habit) return NO_HABITS(lang);
    const y = habitYear(habit, d.day);
    return say(lang, `${y.name}: done on ${y.done} of ${count(y.decided, 'en', ...DAYS)} due in the last ${YEAR_WEEKS} weeks; ${y.missed} missed, ${y.skipped} skipped.`,
      `${y.name}: gedaan op ${y.done} van ${count(y.decided, 'nl', ...DAYS)} gepland in de afgelopen ${YEAR_WEEKS} weken; ${y.missed} gemist, ${y.skipped} overgeslagen.`);
  },
  'focus-heat': none,
  'compare-periods': (params, d, lang) => {
    if (!d.habits) return null;
    if (!d.habits.length) return NO_HABITS(lang);
    const one = d.habits.find(h => h.id === params?.ref), q = query('habits', 'compare', params?.period ?? 'this-week', lang);
    return (one ? trackAnswer(q, habitTrack(one, d.day), d.day) : habitsAnswer(q, d.habits, d.day))?.text ?? null;
  },
  'task-timeline': (params, d, lang, now) => {
    if (!d.tasks) return null;
    if (!d.tasks.tasks.length) return NO_TASKS(lang);
    const c = taskTimeline(d.tasks, widgetPeriod(params?.period, d.day, 'this-week'), d.day, tasksClock(now), deviceDay).counts;
    if (!c.open) return say(lang, 'No open task: everything is done.', 'Geen open taak: alles is gedaan.');
    return say(lang, `${open(c.open, 'en')}: ${c.overdue} overdue, ${c.today} due today and ${c.ahead} in the week ahead.`, `${open(c.open, 'nl')}: ${c.overdue} te laat, ${c.today} voor vandaag en ${c.ahead} in de komende week.`);
  },
  'day-timeline': none,
  'tasks-calendar': (params, d, lang, now) => {
    if (!d.tasks) return null;
    if (!d.tasks.tasks.length) return NO_TASKS(lang);
    const m = tasksMonth(d.tasks, widgetPeriod(params?.period, d.day, 'this-month'), d.day, tasksClock(now), deviceDay), open = m.dueDays.length + m.overdueDays.length;
    return say(lang, `Tasks in ${m.view.title}: ${m.due} still open on ${count(open, 'en', ...DAYS)}, ${m.done} done on ${count(m.doneDays.length, 'en', ...DAYS)}.`,
      `Taken in ${m.view.title}: ${m.due} nog open op ${count(open, 'nl', ...DAYS)}, ${m.done} gedaan op ${count(m.doneDays.length, 'nl', ...DAYS)}.`);
  },
  'task-overdue': (_params, d, lang, now) => {
    if (!d.tasks) return null;
    if (!d.tasks.tasks.length) return NO_TASKS(lang);
    const v = taskOverdue(d.tasks, d.day, tasksClock(now)), n = v.rows.length, oldest = v.rows[0];
    if (!oldest) return say(lang, `No task is overdue (${v.open} open).`, `Geen taak is te laat (${v.open} open).`);
    return say(lang, `${n} ${n === 1 ? 'task is' : 'tasks are'} overdue; the oldest is ${oldest.label}, ${oldest.days > 0 ? count(oldest.days, 'en', ...DAYS) : 'due earlier today'}.`,
      `${n} ${n === 1 ? 'taak is' : 'taken zijn'} te laat; de oudste is ${oldest.label}, ${oldest.days > 0 ? count(oldest.days, 'nl', ...DAYS) : 'eerder vandaag gepland'}.`);
  },
  'checklist-orbit': none,
  'journal-map': (params, d, lang) => !d.journal ? null : !d.journal.length ? NO_ENTRIES(lang) : trackAnswer(query('journal', 'done', params?.period ?? 'this-month', lang), journal(d, lang), d.day)?.text ?? null,
  'notes-constellation': (_params, d, lang) => {
    if (!d.notes) return null;
    const sky = notesConstellation(d.notes), [inbox, daily, topic] = sky.groups.map(g => g.count) as [number, number, number];
    if (!sky.total) return say(lang, 'No notes yet.', 'Nog geen notities.');
    return say(lang, `${count(sky.total, 'en', ...NOTES)}: ${inbox} in your inbox, ${daily} daily and ${topic} topic.`, `${count(sky.total, 'nl', ...NOTES)}: ${inbox} in je inbox, ${daily} dagnotities en ${topic} onderwerpnotities.`);
  },
  'focus-gauge': none,
  'task-load': (_params, d, lang, now) => {
    if (!d.tasks) return null;
    if (!d.tasks.tasks.length) return NO_TASKS(lang);
    const c = taskLoad(d.tasks, d.day, tasksClock(now));
    if (!c.open) return say(lang, 'No open task: everything is done.', 'Geen open taak: alles is gedaan.');
    return say(lang, `${open(c.open, 'en')}: ${c.overdue} overdue, ${c.today} due today, ${c.ahead} ahead and ${c.someday} without a day.`, `${open(c.open, 'nl')}: ${c.overdue} te laat, ${c.today} voor vandaag, ${c.ahead} later en ${c.someday} zonder dag.`);
  },
  'life-radar': (params, d, lang) => {
    const habits = habitsOpen(d) ? d.habits ?? null : null, tasks = d.tasks ?? null;
    if (!habits && !tasks) return null;
    const view = lifeRadar({habits, tasks}, widgetPeriod(params?.period, d.day, 'this-week'), d.day, deviceDay), [h, t] = view.spokes, parts: string[] = [];
    const before = (n: number | undefined, of?: number) => n === undefined ? '' : say(lang, ` (${n}${of === undefined ? '' : ` of ${of}`} the period before)`, ` (${n}${of === undefined ? '' : ` van ${of}`} de periode ervoor)`);
    if (h?.now.n !== undefined) parts.push(say(lang, `habits ${h.now.n} of ${h.now.of} done`, `gewoontes ${h.now.n} van ${h.now.of} gedaan`) + before(h.before.n, h.before.of));
    if (t?.now.n !== undefined) parts.push(say(lang, `${count(t.now.n, 'en', ...TASKS)} done`, `${count(t.now.n, 'nl', ...TASKS)} gedaan`) + before(t.before.n));
    if (!parts.length) return say(lang, 'Nothing is recorded yet.', 'Er is nog niets vastgelegd.');
    return `${say(lang, 'Your records', 'Je gegevens')} ${periodWords(view.period, lang, d.day)}: ${parts.join('; ')}.`;
  },
  'day-scan': (_params, d, lang, now) => {
    const habits = habitsOpen(d) ? d.habits ?? null : null, tasks = d.tasks ?? null;
    if (!habits && !tasks) return null;
    const lanes = dayScan({habits, tasks}, d.day, tasksClock(now)), h = lanes.find(l => l.key === 'habits')?.counts, t = lanes.find(l => l.key === 'tasks')?.counts, parts: string[] = [];
    if (h) parts.push(say(lang, `${h.done} of ${h.due} habits done, ${h.open} open`, `${h.done} van ${h.due} gewoontes gedaan, ${h.open} open`));
    if (t) parts.push(say(lang, `${open(t.open ?? 0, 'en')}, ${t.overdue} overdue`, `${open(t.open ?? 0, 'nl')}, ${t.overdue} te laat`));
    if (!parts.length) return say(lang, 'Nothing is recorded for today yet.', 'Er is voor vandaag nog niets vastgelegd.');
    return `${say(lang, 'Today', 'Vandaag')}: ${parts.join('; ')}.`;
  },
  'nova-answers': (_params, _d, lang) => NOVA_ANSWERS_LINE[lang],
};
