import {addLocalDays} from '../../../local-date';
import {recentNotes} from '../../../nova/holo/lists';
import {calendarDay, formatClock, formatCurrencyAmount, formatNumber, isMoneyCurrency} from '../../../visual-format';
import type {ToolEnv} from '../../tools/env';
import {text as clean} from '../../tools/format';
import {runTool} from '../../tools/registry';
import {weekStart} from '../../tools/range';
import {habitRows} from './habits';
import {stepsTrack, sleepTrack, waterTrack} from './health';
import {dayWords, periodSpan, periodWords, previousPeriod, resolvePeriod, type Period} from './period';
import {listWords, t} from './text';
import {periodFor, trackAnswer, type Track} from './track';
import type {Ask, Exact, ExactWidget, Lang, Query} from './types';

/**
 * Session AS (ADR-042, Part 1): the day's own records, exactly — tasks, the journal, focus, notes, the agenda, the
 * Checklist — and goals, NOVA itself and "how am I doing". Each reads under its own switch (index.ts `closed`); the
 * journal's words and a note's text are never said here, only days and counts.
 */
const plain = (name: string) => clean(name.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?.*$/i, '').replace(/^Example · /, '').trim() || name.trim(), 80);
const answer = (q: Query, source: [string, string]) => (text: string, facts: Record<string, unknown>, widgets: ExactWidget[]): Exact => ({kind: 'answer', text, facts: {about: q.domain, ask: q.ask, ...facts}, widgets, query: q, source: source[q.lang === 'nl' ? 1 : 0]});
const minutes = (value: number, lang: Lang) => `${formatNumber(Math.round(value))} ${lang === 'nl' ? (Math.round(value) === 1 ? 'minuut' : 'minuten') : (Math.round(value) === 1 ? 'minute' : 'minutes')}`;
const trackWidgets = (calendar: string, fallback: string) => (ask: Ask, period: Period): ExactWidget[] => ask === 'streak' ? [{id: 'streak-flames', ref: fallback, fallback}] : period.days.length > 1 ? [{id: calendar, period: period.token, fallback}] : [{id: fallback}];

export function journalTrack(entries: readonly {date: string; text?: string}[], today: string): Track {
  const by = new Map<string, number>();
  for (const e of entries) by.set(e.date, (by.get(e.date) ?? 0) + (e.text ? e.text.trim().split(/\s+/).filter(Boolean).length : 0));
  return {key: 'journal', domain: 'journal', name: 'Journal', kind: 'event', did: ['written', 'geschreven'], not: ['no entry', 'niets geschreven'], source: ['Your journal', 'Je dagboek'],
    points: days => days.map(date => ({date, value: by.get(date) ?? null, state: by.has(date) ? 'done' : date === today ? 'open' : 'none'})),
    measure: {text: (v, lang) => `${formatNumber(Math.round(v))} ${lang === 'nl' ? (Math.round(v) === 1 ? 'woord' : 'woorden') : (Math.round(v) === 1 ? 'word' : 'words')}`, kind: 'sum', target: null}, widgets: trackWidgets('journal-map', 'journal')};
}
export function focusTrack(sessions: readonly {day: string; focusedSeconds: number}[], today: string): Track {
  const by = new Map<string, number>();
  const each = new Map<string, number>();
  for (const s of sessions) { by.set(s.day, (by.get(s.day) ?? 0) + s.focusedSeconds / 60); each.set(s.day, (each.get(s.day) ?? 0) + 1); }
  return {key: 'focus', events: {count: days => days.reduce((n, d) => n + (each.get(d) ?? 0), 0), word: (n, lang) => `${n} ${lang === 'nl' ? (n === 1 ? 'focussessie' : 'focussessies') : (n === 1 ? 'focus session' : 'focus sessions')}`}, domain: 'focus', name: 'Focus', kind: 'event', did: ['a focus session', 'een focussessie'], not: ['no focus session', 'geen focussessie'], source: ['Your focus sessions', 'Je focussessies'],
    points: days => days.map(date => ({date, value: by.get(date) ?? null, state: by.has(date) ? 'done' : date === today ? 'open' : 'none'})),
    measure: {text: minutes, kind: 'sum', target: null}, widgets: trackWidgets('focus-heat', 'focus')};
}
export function journalAnswer(q: Query, env: ToolEnv): Exact | null {
  const entries = env.journal?.entries, out = answer(q, ['Your journal', 'Je dagboek']);
  if (!entries) return null;
  if (!entries.length) return out(t(q.lang, 'No journal entries yet.', 'Nog niets in je dagboek.'), {entries: 0}, [{id: 'journal'}]);
  const made = journalTrack(entries, env.habitDay), track = q.lang === 'nl' ? {...made, name: 'Dagboek'} : made;
  // "Did I write today", "which days did I not journal": the days. A count of words only where the words ask for it.
  const wordsAsked = /\b(?:words|woorden)\b/.test(q.read), ask: Ask = q.ask === 'status' || (q.ask === 'total' && !wordsAsked) ? 'done' : q.ask;
  return trackAnswer({...q, ask}, wordsAsked ? track : {...track, measure: null}, env.habitDay);
}
export function focusAnswer(q: Query, env: ToolEnv): Exact | null {
  const sessions = env.nova?.focus?.sessions, out = answer(q, ['Your focus sessions', 'Je focussessies']);
  if (!sessions) return null;
  if (!sessions.length) return out(t(q.lang, 'No focus session yet.', 'Nog geen focussessie.'), {sessions: 0}, [{id: 'focus'}]);
  const ask: Ask = q.ask === 'status' || q.ask === 'done' && q.shape !== 'dates' && q.shape !== 'count' && q.shape !== 'yes-no' ? 'total' : q.ask;
  return trackAnswer({...q, ask, period: q.period ?? (ask === 'total' ? 'this-week' : null)}, focusTrack(sessions, env.habitDay), env.habitDay);
}

export function tasksAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, record = env.nova?.tasks, out = answer(q, ['Your tasks', 'Je taken']), day = (d: string) => dayWords(d, today);
  if (!record) return null;
  if (!record.tasks.length) return out(t(lang, 'No tasks yet.', 'Nog geen taken.'), {tasks: 0}, [{id: 'tasks'}]);
  const r = runTool('tasks', {}, env), open = (r.ok ? r.data.open as {task: string; state: string; due?: string; time?: string; priority: string}[] | undefined : undefined) ?? [];
  const name = (x: {task: string; due?: string; time?: string}) => `${plain(x.task)}${x.due ? ` (${t(lang, 'due', 'gepland')} ${x.due === today ? t(lang, 'today', 'vandaag') : day(x.due)}${x.time ? ` ${formatClock(x.time)}` : ''})` : ''}`;
  const overdue = open.filter(x => x.state === 'overdue'), doneDay = (x: {doneAt?: string}) => x.doneAt ? calendarDay(x.doneAt, env.habitZone) : null;
  const base = {open: open.length, overdue: overdue.map(x => plain(x.task))}, timeline: ExactWidget[] = [{id: 'task-timeline', fallback: 'tasks'}];
  // Finished: how many, which, and which of them after their day.
  if (q.ask === 'done' || /\b(?:finished|completed|afgerond|voltooid|gedaan|done)\b/.test(q.read) && q.ask !== 'not-done' && q.ask !== 'open') {
    const p = periodFor({...q, shape: 'list'}, today, 'today'), hit = record.tasks.filter(x => { const d = doneDay(x); return !!d && p.days.includes(d); }), late = hit.filter(x => x.due && doneDay(x)! > x.due);
    const span = periodSpan(p, lang, today);
    if (q.ask === 'late') return out(late.length ? t(lang, `${late.length} of ${hit.length} tasks done ${span} ${late.length === 1 ? 'was' : 'were'} finished after ${late.length === 1 ? 'its' : 'their'} day: ${listWords(late.map(x => plain(x.title)), 'en')}.`, `${late.length} van de ${hit.length} taken gedaan ${span} ${late.length === 1 ? 'is' : 'zijn'} na de geplande dag afgerond: ${listWords(late.map(x => plain(x.title)), 'nl')}.`) : t(lang, `No task done ${span} was finished late (${hit.length} done).`, `Geen taak gedaan ${span} is te laat afgerond (${hit.length} gedaan).`), {...base, done: hit.length, late: late.map(x => plain(x.title))}, timeline);
    return out(hit.length ? t(lang, `${hit.length} ${hit.length === 1 ? 'task' : 'tasks'} done ${span}: ${listWords(hit.slice(0, 8).map(x => plain(x.title)), 'en')}.`, `${hit.length} ${hit.length === 1 ? 'taak' : 'taken'} gedaan ${span}: ${listWords(hit.slice(0, 8).map(x => plain(x.title)), 'nl')}.`) : t(lang, `No task done ${span}.`, `Geen taak gedaan ${span}.`), {...base, done: hit.length, tasks: hit.map(x => plain(x.title))}, timeline);
  }
  if (q.ask === 'late' || q.ask === 'missed' || q.ask === 'not-done') return out(overdue.length ? t(lang, `${overdue.length} ${overdue.length === 1 ? 'task is' : 'tasks are'} overdue: ${listWords(overdue.map(name), 'en')}.`, `${overdue.length} ${overdue.length === 1 ? 'taak is' : 'taken zijn'} te laat: ${listWords(overdue.map(name), 'nl')}.`) : t(lang, `No task is overdue (${open.length} open).`, `Geen taak is te laat (${open.length} open).`), base, [{id: 'task-overdue', fallback: 'tasks'}, ...timeline]);
  // Due on a day or in the days ahead ("tomorrow", "this week"): open tasks by their day.
  const ahead = /\b(?:tomorrow|morgen)\b/.test(q.read) ? [addLocalDays(today, 1), addLocalDays(today, 1), t(lang, 'tomorrow', 'morgen')] as const : /\b(?:this week|deze week|week)\b/.test(q.read) ? [today, addLocalDays(weekStart(today), 6), t(lang, 'the rest of this week', 'de rest van deze week')] as const : /\b(?:today|vandaag)\b/.test(q.read) ? [today, today, t(lang, 'today', 'vandaag')] as const : null;
  if (ahead) {
    const hit = open.filter(x => x.due && x.due >= ahead[0] && x.due <= ahead[1]);
    return out(hit.length ? t(lang, `${hit.length} ${hit.length === 1 ? 'task is' : 'tasks are'} due ${ahead[2]}: ${listWords(hit.map(name), 'en')}.`, `${hit.length} ${hit.length === 1 ? 'taak staat' : 'taken staan'} gepland voor ${ahead[2]}: ${listWords(hit.map(name), 'nl')}.`) + (overdue.length && ahead[0] === today ? t(lang, ` ${overdue.length} overdue.`, ` ${overdue.length} te laat.`) : '') : t(lang, `No task is due ${ahead[2]}${overdue.length ? `; ${overdue.length} overdue: ${listWords(overdue.map(name), 'en')}` : ''}.`, `Er staat geen taak gepland voor ${ahead[2]}${overdue.length ? `; ${overdue.length} te laat: ${listWords(overdue.map(name), 'nl')}` : ''}.`), {...base, due: hit.map(x => plain(x.task)), from: ahead[0], to: ahead[1]}, timeline);
  }
  if (q.ask === 'next') {
    const next = open.filter(x => x.due).sort((a, b) => `${a.due} ${a.time ?? '99'}`.localeCompare(`${b.due} ${b.time ?? '99'}`))[0] ?? open[0];
    return out(next ? t(lang, `Next: ${name(next)}.`, `De volgende: ${name(next)}.`) : t(lang, 'No open task.', 'Geen open taak.'), {...base, next: next ? plain(next.task) : null}, timeline);
  }
  const high = open.filter(x => x.priority === 'high');
  if (/\b(?:priority|important|urgent|prioriteit|belangrijk\w*|dringend\w*)\b/.test(q.read)) return out(high.length ? t(lang, `${high.length} open high-priority ${high.length === 1 ? 'task' : 'tasks'}: ${listWords(high.map(name), 'en')}.`, `${high.length} open ${high.length === 1 ? 'taak' : 'taken'} met hoge prioriteit: ${listWords(high.map(name), 'nl')}.`) : t(lang, 'No open task has high priority.', 'Geen open taak heeft hoge prioriteit.'), {...base, high: high.map(x => plain(x.task))}, [{id: 'priority-matrix'}]);
  return out(open.length ? t(lang, `${open.length} open ${open.length === 1 ? 'task' : 'tasks'}, ${overdue.length} overdue: ${listWords(open.slice(0, 6).map(name), 'en')}${open.length > 6 ? `, and ${open.length - 6} more` : ''}.`, `${open.length} open ${open.length === 1 ? 'taak' : 'taken'}, ${overdue.length} te laat: ${listWords(open.slice(0, 6).map(name), 'nl')}${open.length > 6 ? ` en nog ${open.length - 6}` : ''}.`) : t(lang, 'No open task: everything is done.', 'Geen open taak: alles is gedaan.'), {...base, tasks: open.map(x => plain(x.task))}, [{id: 'tasks'}, ...timeline]);
}

export function notesAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, notes = env.nova?.notes, out = answer(q, ['Your notes', 'Je notities']);
  if (!notes) return {kind: 'refusal', text: 'Notes are not shared here: NOVA reads them only when its Notes permission is on (NOVA → Permissions).', facts: {closed: 'notes'}, widgets: [], query: q, source: ''};
  const n = recentNotes(notes, 1), last = n.recent[0];
  if (!n.total) return out(t(lang, 'No notes yet.', 'Nog geen notities.'), {notes: 0}, [{id: 'notes'}]);
  const when = last ? dayWords(calendarDay(last.at, env.habitZone), env.habitDay) : '';
  return out(t(lang, `${n.total} ${n.total === 1 ? 'note' : 'notes'} in all; ${n.inbox} ${n.inbox === 1 ? 'waits' : 'wait'} in your inbox. The newest is from ${when}.`, `${n.total} ${n.total === 1 ? 'notitie' : 'notities'} in totaal; ${n.inbox} ${n.inbox === 1 ? 'wacht' : 'wachten'} in je inbox. De nieuwste is van ${when}.`), {notes: n.total, inbox: n.inbox, newest: last ? calendarDay(last.at, env.habitZone) : null}, [{id: 'notes-constellation', fallback: 'notes'}]);
}

export function agendaAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, out = answer(q, ['Your agenda', 'Je agenda']), r = runTool('agenda', {}, env);
  if (!r.ok) return null;
  const items = (r.data.items as {day: string; time?: string; what: string; kind: string; state: string}[] | undefined) ?? [];
  const tomorrow = /\b(?:tomorrow|morgen)\b/.test(q.read), week = /\b(?:week)\b/.test(q.read) || q.period === 'this-week', from = tomorrow ? addLocalDays(today, 1) : today, to = week ? addLocalDays(today, 6) : from;
  const hit = items.filter(i => i.day >= from && i.day <= to), label = tomorrow ? t(lang, 'tomorrow', 'morgen') : week ? t(lang, 'the next 7 days', 'de komende 7 dagen') : t(lang, 'today', 'vandaag');
  const name = (i: typeof items[number]) => `${i.time ? `${formatClock(i.time)} ` : ''}${plain(i.what)}`, facts = {from, to, items: hit.length, open: hit.filter(i => i.state === 'open').length, timed: hit.filter(i => i.time).length};
  const widgets: ExactWidget[] = [{id: 'day-timeline', fallback: 'hour-grid'}, {id: 'agenda-clock'}];
  if (!hit.length) return out(t(lang, `Nothing is on your agenda ${label}.`, `Er staat niets op je agenda ${label}.`), facts, widgets);
  if (q.ask === 'next') {
    const clock = `${String(env.now.getUTCHours()).padStart(2, '0')}:${String(env.now.getUTCMinutes()).padStart(2, '0')}`, next = items.filter(i => i.state === 'open' && i.time && (i.day > today || i.time >= clock)).sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`))[0];
    return out(next ? t(lang, `Next on your agenda: ${name(next)}${next.day === today ? '' : `, ${dayWords(next.day, today)}`}.`, `Het volgende op je agenda: ${name(next)}${next.day === today ? '' : `, ${dayWords(next.day, today)}`}.`) : t(lang, 'Nothing with a time is still ahead on your agenda.', 'Er staat niets met een tijd meer op je agenda.'), {...facts, next: next ? plain(next.what) : null}, widgets);
  }
  const open = hit.filter(i => i.state === 'open'), timed = open.filter(i => i.time).sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`));
  return out(t(lang, `${hit.length} ${hit.length === 1 ? 'item' : 'items'} on your agenda ${label}, ${open.length} still open${timed.length ? `: ${listWords(timed.slice(0, 5).map(name), 'en')}${open.length > timed.slice(0, 5).length ? `, and ${open.length - timed.slice(0, 5).length} more` : ''}` : ''}.`, `${hit.length} ${hit.length === 1 ? 'ding' : 'dingen'} op je agenda ${label}, ${open.length} nog open${timed.length ? `: ${listWords(timed.slice(0, 5).map(name), 'nl')}${open.length > timed.slice(0, 5).length ? ` en nog ${open.length - timed.slice(0, 5).length}` : ''}` : ''}.`), facts, widgets);
}

export function checklistAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, out = answer(q, ['Your Checklist', 'Je Checklist']), r = runTool('checklist_today', {}, env);
  if (!r.ok) return null;
  const widgets: ExactWidget[] = [{id: 'checklist-orbit', fallback: 'orbit'}];
  if (typeof r.data.total !== 'number') return out(t(lang, 'No Checklist path on this device yet.', 'Er is nog geen Checklist op dit apparaat.'), {total: 0}, widgets);
  const total = r.data.total, done = r.data.done as number, open = (r.data.open as string[] | undefined) ?? [];
  return out(open.length ? t(lang, `Checklist today: ${done} of ${total} done; still open: ${listWords(open.slice(0, 8), 'en')}.`, `Checklist vandaag: ${done} van ${total} gedaan; nog open: ${listWords(open.slice(0, 8), 'nl')}.`) : t(lang, `Checklist today: all ${total} done.`, `Checklist vandaag: alle ${total} gedaan.`), {total, done, open}, widgets);
}

type GoalRow = {handle: string; name: string; status: string; progress: string; now?: string; target?: string; remaining?: string; funding?: string; targetDate?: string; nextPlannedDate?: string; type?: string};
const amountOf = (text: string | undefined) => { if (!text) return ''; const i = text.lastIndexOf(' '), value = text.slice(0, i), unit = text.slice(i + 1); return i > 0 && isMoneyCurrency(unit) ? formatCurrencyAmount(value, unit) : text; };
const FUNDING_NL: Record<string, string> = {ahead: 'voor op schema', 'on track': 'op schema', behind: 'achter op schema', completed: 'gehaald', 'no plan': 'geen plan'};
export function goalsAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, out = answer(q, ['Your goals', 'Je doelen']), r = runTool('list_goals', {}, env);
  if (!r.ok) return null;
  const all = ((r.data.goals as GoalRow[] | undefined) ?? []).map(g => ({...g, name: plain(g.name)})), active = all.filter(g => g.status === 'active'), widgets: ExactWidget[] = [{id: 'goal-orbits', fallback: 'goals-hud'}];
  if (!all.length) return out(t(lang, 'You have no goals yet.', 'Je hebt nog geen doelen.'), {goals: 0}, [{id: 'goals-hud'}]);
  const pct = (g: GoalRow) => `${formatNumber(Math.round(Number.parseFloat(g.progress)))}%`, pace = (g: GoalRow) => g.funding ? (lang === 'nl' ? FUNDING_NL[g.funding] ?? g.funding : g.funding === 'ahead' ? 'ahead of plan' : g.funding === 'behind' ? 'behind plan' : g.funding) : '';
  const line = (g: GoalRow) => `${g.name} ${pct(g)}${g.funding && g.funding !== 'completed' ? ` (${pace(g)})` : ''}`;
  const rows = all.map(g => ({goal: g.name, status: g.status, percent: Math.round(Number.parseFloat(g.progress)), funding: g.funding ?? null, targetDate: g.targetDate && g.targetDate !== 'none' ? g.targetDate : null})), facts = {active: active.length, goals: rows};
  const one = q.subject?.kind === 'goal' ? all.find(g => g.name === plain(q.subject!.name)) : null;
  if (one) {
    const date = one.targetDate && one.targetDate !== 'none' ? t(lang, `; target date ${dayWords(one.targetDate, today)}`, `; streefdatum ${dayWords(one.targetDate, today)}`) : '';
    return out(t(lang, `${one.name}: ${amountOf(one.now)} of ${amountOf(one.target)} (${pct(one)})${one.funding ? `, ${pace(one)}` : ''}; ${amountOf(one.remaining)} to go${date}.`, `${one.name}: ${amountOf(one.now)} van ${amountOf(one.target)} (${pct(one)})${one.funding ? `, ${pace(one)}` : ''}; nog ${amountOf(one.remaining)} te gaan${date}.`), {...facts, goal: one.name, percent: Math.round(Number.parseFloat(one.progress)), funding: one.funding ?? null}, [{id: 'goal-gauge', ref: q.subject!.id, fallback: 'goal-focus'}]);
  }
  if (q.ask === 'late' || q.ask === 'missed' || q.ask === 'worst' && /\b(?:behind|achter)\b/.test(q.read)) {
    const behind = active.filter(g => g.funding === 'behind');
    return out(behind.length ? t(lang, `${behind.length} of ${active.length} active goals ${behind.length === 1 ? 'is' : 'are'} behind plan: ${listWords(behind.map(line), 'en')}.`, `${behind.length} van je ${active.length} actieve doelen ${behind.length === 1 ? 'loopt' : 'lopen'} achter op schema: ${listWords(behind.map(line), 'nl')}.`) : t(lang, `No active goal is behind plan (${active.length} active).`, `Geen actief doel loopt achter op schema (${active.length} actief).`), {...facts, behind: behind.map(g => g.name)}, widgets);
  }
  if (q.ask === 'done') { const done = all.filter(g => g.status === 'completed'); return out(done.length ? t(lang, `${done.length} ${done.length === 1 ? 'goal' : 'goals'} reached: ${listWords(done.map(g => g.name), 'en')}.`, `${done.length} ${done.length === 1 ? 'doel' : 'doelen'} gehaald: ${listWords(done.map(g => g.name), 'nl')}.`) : t(lang, `No goal is reached yet (${active.length} active).`, `Nog geen doel gehaald (${active.length} actief).`), {...facts, reached: done.map(g => g.name)}, widgets); }
  if ((q.ask === 'best' || q.ask === 'worst') && /\b(?:closest|nearest|furthest|farthest|progress|done|dichtst|verst|voortgang|klaar|best|worst|beste|slechtste)\b/.test(q.read)) {
    const ranked = [...active].sort((a, b) => Number.parseFloat(b.progress) - Number.parseFloat(a.progress)), hit = q.ask === 'best' ? ranked[0] : ranked.at(-1);
    if (!hit) return out(t(lang, 'No active goal.', 'Geen actief doel.'), facts, widgets);
    return out(q.ask === 'best' ? t(lang, `Closest to done: ${line(hit)}, ${amountOf(hit.remaining)} to go.`, `Het dichtst bij klaar: ${line(hit)}, nog ${amountOf(hit.remaining)} te gaan.`) : t(lang, `Furthest from done: ${line(hit)}, ${amountOf(hit.remaining)} to go.`, `Het verst van klaar: ${line(hit)}, nog ${amountOf(hit.remaining)} te gaan.`), {...facts, goal: hit.name}, widgets);
  }
  if (q.ask === 'next') {
    const dated = active.filter(g => g.targetDate && g.targetDate !== 'none' && g.targetDate >= today).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!))[0];
    return out(dated ? t(lang, `The next target date is ${dayWords(dated.targetDate!, today)}: ${line(dated)}.`, `De eerstvolgende streefdatum is ${dayWords(dated.targetDate!, today)}: ${line(dated)}.`) : t(lang, 'No active goal has a target date ahead.', 'Geen actief doel heeft een streefdatum in de toekomst.'), {...facts, goal: dated?.name ?? null, targetDate: dated?.targetDate ?? null}, [{id: 'goal-dates', fallback: 'goals-hud'}]);
  }
  return out(active.length ? t(lang, `${active.length} active ${active.length === 1 ? 'goal' : 'goals'}: ${listWords(active.slice(0, 6).map(line), 'en')}${active.length > 6 ? `, and ${active.length - 6} more` : ''}.`, `${active.length} ${active.length === 1 ? 'actief doel' : 'actieve doelen'}: ${listWords(active.slice(0, 6).map(line), 'nl')}${active.length > 6 ? ` en nog ${active.length - 6}` : ''}.`) : t(lang, 'No active goal right now.', 'Er is nu geen actief doel.'), facts, widgets);
}

const AREAS: readonly [keyof ToolEnv['areas'], string][] = [['today', 'Today'], ['goals', 'Goals'], ['habits', 'Habits'], ['health', 'Health'], ['wealth', 'Wealth']];
export function novaAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, out = answer(q, ['NOVA', 'NOVA']), r = q.read;
  if (/\b(?:model|brain|brein|online|connected|verbonden|which ai|welke ai|what did i ask|my requests|my questions|wat heb ik gevraagd|mijn vragen)\b/.test(r)) return null;
  if (/\b(?:private|safe|send|share|data go|prive|veilig|stuur|deel)\b/.test(r)) return out(t(lang, 'Your records stay on this device, and I answer from them here. Nothing is sent anywhere unless you connect a model of your own, and then only what the switches in Permissions allow.', 'Je gegevens blijven op dit apparaat en ik antwoord er hier uit. Er wordt niets verstuurd, tenzij je zelf een model verbindt, en dan alleen wat de schakelaars bij Permissions toestaan.'), {private: true}, [{id: 'nova-sees'}]);
  if (/\b(?:see|read|know|zien|zie|lezen|weet)\b/.test(r)) {
    const open = AREAS.filter(([key]) => key === 'health' ? !!env.health && env.areas.health !== false : env.areas[key] !== false).map(([, name]) => name), shut = AREAS.map(([, name]) => name).filter(name => !open.includes(name));
    return out(t(lang, `I can read ${open.length ? listWords(open, 'en') : 'nothing'} here${shut.length ? `; ${listWords(shut, 'en')} ${shut.length === 1 ? 'is' : 'are'} off` : ''}. You change that in Permissions.`, `Ik kan hier ${open.length ? listWords(open, 'nl') : 'niets'} lezen${shut.length ? `; ${listWords(shut, 'nl')} ${shut.length === 1 ? 'staat' : 'staan'} uit` : ''}. Dat verander je bij Permissions.`), {open, off: shut}, [{id: 'nova-sees'}]);
  }
  if (/\b(?:who are you|what are you|wie ben je|wat ben je)\b/.test(r)) return out(t(lang, 'I answer questions about your own records, on this device: your habits, health, goals, money, tasks, journal, agenda and focus.', 'Ik beantwoord vragen over je eigen gegevens, op dit apparaat: je gewoontes, gezondheid, doelen, geld, taken, dagboek, agenda en focus.'), {}, [{id: 'nova-answers', fallback: 'nova-sees'}]);
  return out(t(lang, 'Ask me what you did, missed or skipped, on which days, and how much: habits, sleep, steps, water, weight, workouts, goals, spending, budgets, bills, tasks, journal, agenda and focus. For example: "Which days did I skip meditation this month?" or "How much did I spend last week?"', 'Vraag me wat je hebt gedaan, gemist of overgeslagen, op welke dagen en hoeveel: gewoontes, slaap, stappen, water, gewicht, workouts, doelen, uitgaven, budgetten, rekeningen, taken, dagboek, agenda en focus. Bijvoorbeeld: "Welke dagen heb ik deze maand niet gemediteerd?" of "Hoeveel heb ik vorige week uitgegeven?"'), {}, [{id: 'nova-answers', fallback: 'requests'}]);
}

/**
 * "How am I doing", "how was my week": what the records hold, beside the same days of the period before (addition A3:
 * facts and the person's own past, never a score, a grade or a judgement). Only the parts whose switch is open.
 */
export function lifeAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, out = answer(q, ['Your records on this device', 'Je gegevens op dit apparaat']), parts: string[] = [], facts: Record<string, unknown> = {};
  const week = /\b(?:week)\b/.test(q.read) || q.period === 'this-week' || q.period === 'last-week', p = resolvePeriod(q.period ?? (week ? 'this-week' : 'today'), today)!, before = previousPeriod(p, today), words = periodWords(p, lang, today);
  if (env.areas.habits !== false && env.habits.habits.length) {
    const sum = (period: Period) => { const rows = habitRows(env.habits.habits, period, today); return {done: rows.reduce((n, r) => n + r.T.done, 0), due: rows.reduce((n, r) => n + r.T.due - r.T.skipped, 0), open: rows.reduce((n, r) => n + r.T.open, 0)}; };
    const a = sum(p), b = before ? sum(before) : null;
    facts.habits = {now: a, before: b};
    if (a.due) parts.push(t(lang, `habits ${a.done} of ${a.due} done${a.open ? `, ${a.open} still open` : ''}${b && b.due && p.days.length > 1 ? ` (${b.done} of ${b.due} the period before)` : ''}`, `gewoontes ${a.done} van ${a.due} gedaan${a.open ? `, ${a.open} nog open` : ''}${b && b.due && p.days.length > 1 ? ` (${b.done} van ${b.due} de periode ervoor)` : ''}`));
  }
  if (env.areas.today !== false && env.nova?.tasks?.tasks.length) {
    const r = runTool('tasks', {}, env), counts = r.ok ? r.data.counts as {open: number; overdue: number} | undefined : undefined;
    if (counts) { facts.tasks = counts; parts.push(t(lang, `${counts.open} open ${counts.open === 1 ? 'task' : 'tasks'}, ${counts.overdue} overdue`, `${counts.open} open ${counts.open === 1 ? 'taak' : 'taken'}, ${counts.overdue} te laat`)); }
  }
  if (env.health && env.areas.health !== false) {
    for (const [track, label] of [[stepsTrack(env.health, today), ['steps', 'stappen']], [waterTrack(env.health, today), ['water', 'water']], [sleepTrack(env.health, today), ['sleep', 'slaap']]] as const) {
      const points = track.points(p.days).filter(x => x.value !== null), m = track.measure!;
      if (!points.length) continue;
      const total = points.reduce((n, x) => n + x.value!, 0), value = m.kind === 'sum' && p.days.length === 1 ? total : total / points.length;
      facts[track.key] = {value, days: points.length};
      parts.push(`${label[lang === 'nl' ? 1 : 0]} ${m.text(value, lang)}${p.days.length > 1 ? t(lang, ' a day', ' per dag') : ''}`);
    }
  }
  if (!parts.length) return out(t(lang, 'Nothing is recorded yet. Add a habit, a task or a goal and ask me again.', 'Er is nog niets vastgelegd. Voeg een gewoonte, taak of doel toe en vraag het me opnieuw.'), {empty: true}, [{id: 'glance'}]);
  const head = p.days.length === 1 ? t(lang, `Your day so far (${dayWords(today, today)})`, `Je dag tot nu toe (${dayWords(today, today)})`) : t(lang, `Your records ${words}`, `Je gegevens ${words}`);
  return out(`${head}: ${parts.join('; ')}.`, {period: {token: p.token, from: p.from, to: p.to}, ...facts}, p.days.length === 1 ? [{id: 'day-scan', fallback: 'glance'}] : [{id: 'life-radar', period: p.token, fallback: 'glance'}, {id: 'habit-week'}]);
}
