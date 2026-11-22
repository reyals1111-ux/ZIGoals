import {addLocalDays} from '../../local-date';
import {carriedPicks, picksToday, readMyDay} from '../../tasks/my-day';
import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
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

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [myDay];
