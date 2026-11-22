import {addLocalDays} from '../../local-date';
import {carriedPicks, picksToday, readMyDay} from '../../tasks/my-day';
import {noteRemindersBetween} from '../../tasks/note-reminder-days';
import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #223–#229; Microsoft To Do, Google Tasks, Any.do): NOVA's and ZIGi's on-device
 * answers, in English and Dutch, to what round 2's Tasks features hold — today's My Day picks and the ones from the last
 * day, the reminders written in notes for today, the template gallery, imports from Trello and Asana, printing a list,
 * project rules and custom fields. Each reads the feature's own pure function under the Today switch (tasks; notes only
 * where NOVA's Notes scope shares them). The planning record comes in `extra.plan` or `env.nova.taskPlan`.
 */
export type Av2TasksR2Extra = {plan?: TaskPlan | null};
type Ask = Asked & {plan: TaskPlan | null};
const CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
/** "yesterday" / "gisteren", else the day in words. */
const lastDay = (lang: 'en' | 'nl', day: string, today: string) => day === addLocalDays(today, -1) ? say(lang, 'yesterday', 'gisteren') : dayIn(lang, day, today);

export function av2TasksR2Answer(question: string, env: ToolEnv, extra: Av2TasksR2Extra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, plan: extra.plan ?? nova?.taskPlan ?? null};
  for (const one of ANSWERS) {
    const r = one(ask);
    if (r) return r;
  }
  return null;
}
/** The tasks record under the Today switch, or the reply that says why not. */
function tasksOf(a: Ask): {record: Tasks} | {reply: LocalReply} | null {
  const shut = closed(a.env, 'today'); if (shut) return {reply: shut};
  const record = a.env.nova?.tasks;
  if (record === undefined) return null;
  if (!record) return {reply: answer(say(a.lang, 'Your tasks can’t be read on this device right now, so I can’t say.', 'Je taken kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), CALLS)};
  return {record};
}

/** "what is in my day", "what did I pick for today", "wat staat er in mijn dag" (Microsoft To Do's My Day; never "plan my day"). */
function myDay(a: Ask): LocalReply | null {
  if (/\bplan\b|\bplannen\b|\bplanning\b|\btoo full\b|\bte vol\b/.test(a.f)) return null;
  const en = /\b(?:in|on) my day\b|\bmy day list\b|\bpicked for today\b|\bpick(?:ed)? for my day\b/.test(a.f);
  const nl = /\b(?:in|op) mijn dag\b|\bmijn dag lijst\b|\bmijn daglijst\b|\bgekozen voor vandaag\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const md = readMyDay(a.plan?.myDay), open = new Map(got.record.tasks.filter(t => !t.doneAt).map(t => [t.id, t]));
  const done = new Map(got.record.tasks.filter(t => t.doneAt).map(t => [t.id, t]));
  const ids = picksToday(md, a.today), now = ids.map(id => open.get(id)).filter(t => !!t), finished = ids.filter(id => done.has(id)).length;
  const carried = carriedPicks(md, a.today, id => open.has(id));
  const back = carried ? say(a.lang, ` ${count(carried.ids.length, 'en', ['task', 'tasks'], ['', ''])} from ${lastDay('en', carried.day, a.today)} ${carried.ids.length === 1 ? 'is' : 'are'} still open: Plan my day offers ${carried.ids.length === 1 ? 'it' : 'them'} back.`,
    ` ${count(carried.ids.length, 'nl', ['', ''], ['taak', 'taken'])} van ${lastDay('nl', carried.day, a.today)} ${carried.ids.length === 1 ? 'staat' : 'staan'} nog open: Plan my day biedt ${carried.ids.length === 1 ? 'hem' : 'ze'} weer aan.`) : '';
  if (!now.length) return answer(say(a.lang, `Nothing is in My Day${finished ? ' still to do' : ''} today. Add a task to My Day from its editor or from Plan my day in Tasks → Today; its own day stays.${back}`,
    `Er staat vandaag niets${finished ? ' meer open' : ''} in My Day. Zet een taak in My Day met de knop in de editor, ook Plan my day in Tasks → Today biedt dat; zijn eigen dag blijft staan.${back}`), CALLS);
  const lines = now.slice(0, 10).map(t => `• ${clean(t!.title, 80)}${t!.due && t!.due !== a.today ? say(a.lang, ` (its day: ${dayIn('en', t!.due, a.today)})`, ` (eigen dag: ${dayIn('nl', t!.due, a.today)})`) : ''}`);
  return answer([say(a.lang, `${count(now.length, 'en', ['task', 'tasks'], ['', ''])} in My Day today${finished ? `, ${finished} done` : ''}:`, `${count(now.length, 'nl', ['', ''], ['taak', 'taken'])} in My Day vandaag${finished ? `, ${finished} klaar` : ''}:`), ...lines].join('\n') + back, CALLS);
}

/**
 * "which reminders from my notes are today", "welke herinneringen uit mijn notities zijn er vandaag" (LEDGER #224): the note
 * reminders of today, tomorrow or this week, as Tasks and the Agenda list them; under NOVA's Notes scope.
 */
function noteRemindersOn(a: Ask): LocalReply | null {
  const about = /\breminders?\b.*\bnotes?\b|\bnotes?\b.*\breminders?\b/.test(a.f) || /\bherinnering(?:en)?\b.*\bnotities?\b|\bnotities?\b.*\bherinnering(?:en)?\b/.test(a.f);
  const when = /\btomorrow\b|\bmorgen\b/.test(a.f) ? 'tomorrow' : /\bthis week\b|\bdeze week\b/.test(a.f) ? 'week' : /\btoday\b|\bvandaag\b|\bon my agenda\b|\bop mijn agenda\b/.test(a.f) ? 'today' : null;
  if (!about || !when) return null;
  const notes = a.env.nova?.notes, calls = [{tool: 'notes', args: {}, label: 'Notes'}];
  if (!notes) return answer(say(a.lang, 'Your notes aren’t shared here. Reminders written in notes show in Tasks → Today and Upcoming, and on the Agenda, each opening its note.', 'Je notities worden hier niet gedeeld. Herinneringen in notities staan in Tasks → Today en Upcoming en op de Agenda, elk met een link naar de notitie.'), calls);
  const from = when === 'tomorrow' ? addLocalDays(a.today, 1) : a.today, to = when === 'week' ? addLocalDays(a.today, 6) : from;
  const list = noteRemindersBetween(notes, from, to, a.today, a.env.habitZone || 'UTC', a.env.now.getTime());
  const span = when === 'tomorrow' ? say(a.lang, 'tomorrow', 'morgen') : when === 'week' ? say(a.lang, 'in the next seven days', 'de komende zeven dagen') : say(a.lang, 'today', 'vandaag');
  if (!list.length) return answer(say(a.lang, `No reminder from your notes ${span}. Write “@remind tomorrow 9:00 call the plumber” on a line of a note, and it shows in Tasks → Today and on the Agenda.`, `Geen herinnering uit je notities ${span}. Zet “@remind morgen 9:00 loodgieter bellen” op een regel van een notitie; dan staat hij in Tasks → Today en op de Agenda.`), calls);
  return answer([say(a.lang, `${count(list.length, 'en', ['reminder', 'reminders'], ['', ''])} from your notes ${span}:`, `${count(list.length, 'nl', ['', ''], ['herinnering', 'herinneringen'])} uit je notities ${span}:`),
    ...list.slice(0, 8).map(r => `• ${clean(r.what, 80)}: ${when === 'week' ? `${dayIn(a.lang, r.day, a.today)} ` : ''}${say(a.lang, 'at', 'om')} ${clockIn(a.lang, r.time)}${r.gone ? say(a.lang, ' (gone off)', ' (al geweest)') : ''}`)].join('\n'), calls);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [myDay, noteRemindersOn];
