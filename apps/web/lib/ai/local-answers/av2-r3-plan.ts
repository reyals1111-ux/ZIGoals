import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {LOOK_COLOUR_WORDS, taskLook} from '../../tasks/look';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r3-plan, LEDGER #256–#263; Structured): NOVA's and ZIGi's on-device answers, in English and Dutch, to
 * what round 3's planning features hold — the "Plan your day" reminder and the overdue count, task symbols, the Day
 * Timeline of another day, the energy of the day's tasks, notes kept with focus sessions, copying and clearing a day, the
 * cycle day on the plan (under the Health gate; days only, never advice) and the reading-friendly font. Each reads its
 * feature's own pure function under the switch its area has (tasks under Today; the cycle under Health). The planning
 * record comes in `extra.plan` or `env.nova.taskPlan`.
 */
export type Av2R3PlanExtra = {plan?: TaskPlan | null};
type Ask = Asked & {plan: TaskPlan | null};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];

export function av2R3PlanAnswer(question: string, env: ToolEnv, extra: Av2R3PlanExtra = {}): LocalReply | null {
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
  if (!record) return {reply: answer(say(a.lang, 'Your tasks can’t be read on this device right now, so I can’t say.', 'Je taken kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), TASK_CALLS)};
  return {record};
}

/**
 * "do I get a plan your day reminder", "when does plan your day come", "krijg ik een herinnering om mijn dag te plannen"
 * (LEDGER #256): the time set in Tasks → This week, and today's overdue count it carries.
 */
function planDayReminder(a: Ask): LocalReply | null {
  const en = /\bplan (?:your|my) day\b.*\b(?:reminder|notification|notify|come|comes|arrive)\b|\b(?:reminder|notification)\b.*\bplan (?:your|my) day\b|\bmorning planning\b/.test(a.f);
  const nl = /\bherinnering\b.*\bdag (?:te )?plannen\b|\bdag (?:te )?plannen\b.*\b(?:herinnering|melding)\b|\bmelding\b.*\bplan (?:je|mijn) dag\b|\bmelding\b.*\bplan your day\b|\bplan your day\b.*\bmelding\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const overdue = got.record.tasks.filter(t => !t.doneAt && t.due && t.due < a.today).length;
  const late = overdue ? say(a.lang, ` Today it would say ${count(overdue, 'en', ['task is', 'tasks are'], ['', ''])} overdue.`, ` Vandaag zou hij zeggen dat ${count(overdue, 'nl', ['', ''], ['taak', 'taken'])} over tijd ${overdue === 1 ? 'is' : 'zijn'}.`) : '';
  const time = a.plan?.planReminder?.time;
  if (!time) return answer(say(a.lang, `No “Plan your day” reminder is set. Choose its time in Tasks → This week (Your planning choices): it opens Plan my day and says how many tasks are overdue, never their names. With notifications on it reaches this device while ZIGoals is closed.${late}`,
    `Er staat geen herinnering “Plan your day” aan. Kies de tijd in Tasks → This week (Your planning choices): hij opent Plan my day en zegt hoeveel taken over tijd zijn, nooit hun namen. Met meldingen aan komt hij ook als ZIGoals dicht is.${late}`), TASK_CALLS);
  return answer(say(a.lang, `“Plan your day” comes every day at ${clockIn('en', time)} and opens Plan my day in Tasks → Today.${late} Change or remove it in Tasks → This week.`,
    `“Plan your day” komt elke dag om ${clockIn('nl', time)} en opent Plan my day in Tasks → Today.${late} Wijzig of verwijder hem in Tasks → This week.`), TASK_CALLS);
}

/** The colour's word in the answer's language. */
const NL_COLOUR: Record<string, string> = {grey: 'grijs', red: 'rood', orange: 'oranje', yellow: 'geel', green: 'groen', teal: 'blauwgroen', blue: 'blauw', violet: 'paars', pink: 'roze'};
/** "which tasks have a symbol", "welke taken hebben een symbool" (LEDGER #257): open tasks with their own symbol and colour. */
function taskSymbols(a: Ask): LocalReply | null {
  const en = /\btasks?\b.*\b(?:symbols?|icons?)\b|\b(?:symbols?|icons?)\b.*\btasks?\b/.test(a.f) && !/\bhabits?\b/.test(a.f);
  const nl = /\btaken?\b.*\b(?:symbool|symbolen|icoon|iconen|pictogram)\b|\b(?:symbool|symbolen|icoon|iconen)\b.*\btaken?\b/.test(a.f) && !/\bgewoontes?\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const marked = got.record.tasks.filter(t => !t.doneAt).flatMap(t => { const l = taskLook(t); return l ? [{t, l}] : []; });
  if (!marked.length) return answer(say(a.lang, 'No open task has a symbol yet. Edit a task and choose one under “Symbol and colour”: a symbol is suggested from its words (a dentist gets ✚, rent gets ◆), and it shows beside the title in your lists, on Today and on the timeline.',
    'Nog geen open taak heeft een symbool. Bewerk een taak en kies er een bij “Symbol and colour”: er wordt een symbool voorgesteld uit de woorden (een tandarts krijgt ✚, huur krijgt ◆), en het staat naast de titel in je lijsten, op Today en op de tijdlijn.'), TASK_CALLS);
  const lines = marked.slice(0, 10).map(({t, l}) => `• ${l.glyph} ${clean(t.title, 80)} (${a.lang === 'nl' ? NL_COLOUR[l.colour] : LOOK_COLOUR_WORDS[l.colour].toLowerCase()})`);
  return answer([say(a.lang, `${count(marked.length, 'en', ['open task has', 'open tasks have'], ['', ''])} a symbol:`, `${count(marked.length, 'nl', ['', ''], ['open taak heeft', 'open taken hebben'])} een symbool:`), ...lines].join('\n'), TASK_CALLS);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [planDayReminder, taskSymbols];
