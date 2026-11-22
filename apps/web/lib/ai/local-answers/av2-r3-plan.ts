import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {LOOK_COLOUR_WORDS, taskLook} from '../../tasks/look';
import {text as clean} from '../tools/format';
import {habitDay, habitRuleOn} from '../../habits';
import {addLocalDays} from '../../local-date';
import {taskTimelineItems} from '../../tasks/timeline-source';
import {dayEnergy} from '../../tasks/energy-load';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
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
    `“Plan your day” komt elke dag om ${clockIn('nl', time)} en opent Plan my day in Tasks → Today.${late} Wijzigen en weghalen kan in Tasks → This week.`), TASK_CALLS);
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

const PART_WORDS: Record<string, [string, string]> = {morning: ['morning', 'ochtend'], afternoon: ['afternoon', 'middag'], evening: ['evening', 'avond'], anytime: ['any time', 'wanneer je wilt']};
/**
 * "what is on my timeline tomorrow", "wat staat er morgen op mijn tijdlijn" (LEDGER #258): tomorrow's tasks (with their time)
 * and the habits due tomorrow (under the Habits switch), as the Day Timeline for tomorrow lists them.
 */
function timelineTomorrow(a: Ask): LocalReply | null {
  const en = /\btimeline\b.*\btomorrow\b|\btomorrow\b.*\btimeline\b|\bplan(?:ned)? for tomorrow\b/.test(a.f);
  const nl = /\btijdlijn\b.*\bmorgen\b|\bmorgen\b.*\btijdlijn\b|\bgepland voor morgen\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const day = addLocalDays(a.today, 1);
  const tasks = taskTimelineItems(got.record, day, a.today, iso => iso.slice(0, 10)).filter(t => !t.done);
  const habits = closed(a.env, 'habits') ? [] : a.env.habits.habits.filter(h => h.title && habitRuleOn(h, day) && habitDay(h, day, day).scheduled);
  const when = dayIn(a.lang, day, a.today);
  if (!tasks.length && !habits.length) return answer(say(a.lang, `Nothing is planned for tomorrow (${when}) yet. Open the Day Timeline and choose Tomorrow to plan it: give a task that day, and move a habit or a meal to the time you want; a move there keeps that date only.`,
    `Voor morgen (${when}) staat nog niets gepland. Open de Day Timeline en kies Tomorrow om hem te plannen: geef een taak die dag, en zet een gewoonte en een maaltijd op de tijd die je wilt; zo'n verplaatsing geldt alleen voor die dag.`), [...TASK_CALLS, {tool: 'list_habits', args: {}, label: 'Habits'}]);
  const lines = [
    ...tasks.sort((x, y) => (x.time ?? '99').localeCompare(y.time ?? '99')).slice(0, 10).map(t => `• ${t.time ? `${clockIn(a.lang, t.time)} ` : ''}${clean(t.title, 80)}${say(a.lang, ' (task)', ' (taak)')}`),
    ...habits.slice(0, 10).map(h => `• ${clean(h.title, 80)}${say(a.lang, ` (habit, ${PART_WORDS[h.timeOfDay]?.[0] ?? 'any time'})`, ` (gewoonte, ${PART_WORDS[h.timeOfDay]?.[1] ?? 'wanneer je wilt'})`)}`),
  ];
  const head = say(a.lang, `Tomorrow (${when}): ${count(tasks.length, 'en', ['task', 'tasks'], ['', ''])} and ${count(habits.length, 'en', ['habit', 'habits'], ['', ''])} due.`, `Morgen (${when}): ${count(tasks.length, 'nl', ['', ''], ['taak', 'taken'])} en ${count(habits.length, 'nl', ['', ''], ['gewoonte', 'gewoontes'])}.`);
  const tail = say(a.lang, 'The Day Timeline shows them by the hour when you choose Tomorrow.', 'De Day Timeline zet ze op hun uur als je Tomorrow kiest.');
  return answer([head, ...lines, tail].join('\n'), [...TASK_CALLS, {tool: 'list_habits', args: {}, label: 'Habits'}]);
}

/**
 * "how much energy does my day take", "hoeveel energie kost mijn dag" (LEDGER #259): today's open tasks' energy against the
 * amount set in Tasks → This week, in calm words (never a warning).
 */
function dayEnergyAnswer(a: Ask): LocalReply | null {
  const en = /\benergy\b.*\b(?:day|today|tasks?)\b/.test(a.f) && /\b(?:how much|how full|room|amount|monitor|take|takes|ask|asks)\b/.test(a.f);
  const nl = /\benergie\b.*\b(?:dag|vandaag|taken?)\b/.test(a.f) && /\b(?:hoeveel|hoe vol|ruimte|kost|kosten|vraagt|vragen)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const todays = got.record.tasks.filter(t => t.due && t.due <= a.today);
  const e = dayEnergy(todays, a.plan?.energyAmount);
  if (!e.rated) return answer(say(a.lang, `No task of today has an energy yet. In a task's editor choose restful, neutral, light, medium or heavy; Tasks → Today then adds up the day against your amount (${e.amount}), in calm words.`,
    `Nog geen taak van vandaag heeft een energie. Kies in de editor van een taak een van deze: restful, neutral, light, medium, heavy; Tasks → Today telt dan de dag op tegen je hoeveelheid (${e.amount}), in rustige woorden.`), TASK_CALLS);
  const words = e.state === 'room' ? say(a.lang, 'room for more', 'ruimte voor meer') : e.state === 'near' ? say(a.lang, 'near your amount', 'dicht bij je hoeveelheid') : say(a.lang, 'more than your amount; a restful task or moving one to another day gives some room', 'meer dan je hoeveelheid; een rustgevende taak geeft wat ruimte, net als een taak naar een andere dag zetten');
  const left = e.unrated ? say(a.lang, ` ${count(e.unrated, 'en', ['task has', 'tasks have'], ['', ''])} no energy yet.`, ` ${count(e.unrated, 'nl', ['', ''], ['taak heeft', 'taken hebben'])} nog geen energie.`) : '';
  return answer(say(a.lang, `Today's tasks come to about ${e.total} of your ${e.amount}: ${words}.${left}`, `De taken van vandaag komen op ongeveer ${e.total} van je ${e.amount}: ${words}.${left}`), TASK_CALLS);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [planDayReminder, taskSymbols, timelineTomorrow, dayEnergyAnswer];
