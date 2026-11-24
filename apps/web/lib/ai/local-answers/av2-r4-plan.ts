import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {isLate, waitingFor} from '../../tasks/engine';
import {minutesWords, minutesWordsNl} from '../../tasks/minutes';
import {fitWeek} from '../../tasks/plan-week';
import {deadlineAtRisk} from '../../tasks/at-risk';
import {inPieces, piecesOf} from '../../tasks/pieces';
import {DEFAULT_WORK, WEEKDAY_ORDER, afterHours, hoursSet, weekdayHours} from '../../tasks/work-hours';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r4-plan, LEDGER #300–#305; Motion): NOVA's and ZIGi's on-device answers, in English and Dutch, to what
 * round 4's planned week holds — a plan for the next 7 days (a proposal; nothing is moved by an answer), the working hours,
 * a deadline at risk (said as a fact, never as a warning), tasks in pieces, tasks that wait for others and the repeats that
 * float in their week or month. Each reads its feature's own pure function under the Today switch (tasks). The planning
 * record comes in `extra.plan` or `env.nova.taskPlan`.
 */
export type Av2R4PlanExtra = {plan?: TaskPlan | null};
type Ask = Asked & {plan: TaskPlan | null; clock: string};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
const NL_WEEKDAY = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const;
const EN_WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const mins = (lang: Lang, n: number) => lang === 'nl' ? minutesWordsNl(n) : minutesWords(n);
/** The wall clock of `now` in the app's zone ("HH:MM"). */
function clockOf(env: ToolEnv): string {
  try { return new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: env.habitZone}).format(env.now); } catch { return '09:00'; }
}

export function av2R4PlanAnswer(question: string, env: ToolEnv, extra: Av2R4PlanExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, plan: extra.plan ?? nova?.taskPlan ?? null, clock: clockOf(env)};
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
const planOf = (a: Ask): TaskPlan => a.plan ?? {version: 1};
const blocksIn = (lang: Lang, blocks: readonly {from: string; to: string}[]) => blocks.length ? blocks.map(b => `${clockIn(lang, b.from)}–${clockIn(lang, b.to)}`).join(say(lang, ' and ', ' en ')) : say(lang, 'a day off', 'vrij');

/**
 * "how would you plan my week", "can you plan my week", "hoe zou je mijn week plannen" (LEDGER #300): where Plan my week
 * would place the open tasks with minutes over the next 7 days (timed tasks around; imported events are added on the page),
 * and what finds no room. Only words: nothing is moved.
 */
function planWeekAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:plan|schedule)\b.*\b(?:my|the|this|next) (?:week|7 days|seven days)\b/.test(a.f);
  const nl = /\b(?:plan|plannen|inplannen|indelen)\b.*\b(?:week|7 dagen|zeven dagen)\b|\b(?:mijn|de|deze) week\b.*\b(?:plannen|inplannen|indelen)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const week = fitWeek({record: got.record, plan: planOf(a), today: a.today, clock: a.clock});
  const tail = say(a.lang, 'Nothing moves until you keep it: Tasks → This week (or Today) → Plan my week, with Undo.', 'Er verschuift niets tot je het bewaart: Tasks → This week (of Today) → Plan my week, met Undo.');
  if (!week.placed.length && !week.left.length) return answer(say(a.lang, `Nothing to place this week: Plan my week places open tasks that have minutes and no time yet. Give a task its length (“Takes” in its editor), and it finds the task a day inside your working hours, the earliest deadline first.`,
    `Deze week valt er niets in te plannen: Plan my week plant open taken met minuten en nog zonder tijd. Geef een taak zijn duur (“Takes” in de editor), dan zoekt het een dag binnen je werkuren, de vroegste deadline eerst.`), TASK_CALLS);
  const tasks = new Set(week.placed.map(p => p.task.id)).size;
  const days = week.days.map(d => ({d, n: new Set(week.placed.filter(p => p.day === d).map(p => p.task.id)).size})).filter(x => x.n).map(x => `${dayIn(a.lang, x.d, a.today)} ${x.n}`).join(', ');
  const head = tasks ? say(a.lang, `A plan for the next 7 days would place ${count(tasks, 'en', ['task', 'tasks'], ['', ''])}: ${days}.`, `Een plan voor de komende 7 dagen zet ${count(tasks, 'nl', ['', ''], ['taak', 'taken'])} neer: ${days}.`) : say(a.lang, 'No task finds room in your working hours this week.', 'Geen taak past deze week in je werkuren.');
  const left = week.left.length ? ' ' + say(a.lang, `Not placed: ${week.left.slice(0, 4).map(l => `“${clean(l.task.title, 60)}” (${l.why === 'deadline' ? 'not before its deadline' : 'no free time'})`).join(', ')}.`, `Niet ingepland: ${week.left.slice(0, 4).map(l => `“${clean(l.task.title, 60)}” (${l.why === 'deadline' ? 'niet vóór de deadline' : 'geen vrije tijd'})`).join(', ')}.`) : '';
  return answer(`${head}${left} ${tail}`, TASK_CALLS);
}

/** "what are my working hours", "wat zijn mijn werkuren" (LEDGER #301): each weekday's hours and the evening hours. */
function hoursAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:working|work|planning) hours\b|\bhours\b.*\b(?:tasks?|plan)\b.*\bplaced\b/.test(a.f);
  const nl = /\bwerk(?:uren|tijden|tijd)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const plan = planOf(a), names = a.lang === 'nl' ? NL_WEEKDAY : EN_WEEKDAY;
  const lines = WEEKDAY_ORDER.map(d => `• ${names[d]}: ${blocksIn(a.lang, weekdayHours(plan, d))}`);
  const eve = afterHours(plan);
  const head = hoursSet(plan) ? say(a.lang, 'Your working hours, where Plan my day and Plan my week place tasks:', 'Je werkuren, waarin Plan my day en Plan my week taken plaatsen:') : say(a.lang, `You have not set working hours yet, so tasks are placed in the usual ${blocksIn('en', DEFAULT_WORK)} every day:`, `Je hebt nog geen werkuren ingesteld, dus taken komen elke dag in de gewone uren ${blocksIn('nl', DEFAULT_WORK)}:`);
  const foot = say(a.lang, `Evening hours for “after hours” tasks: ${blocksIn('en', [eve])}. Change them in Tasks → This week → Working hours.`, `Avonduren voor taken “after hours”: ${blocksIn('nl', [eve])}. Wijzigen kan in Tasks → This week → Working hours.`);
  return answer([head, ...lines, foot].join('\n'), TASK_CALLS);
}

/**
 * "will I make my deadlines", "is there enough time for my deadlines", "kan ik mijn deadlines halen" (LEDGER #302): the first
 * deadline whose tasks need more minutes than the free working hours until it, said as a fact; otherwise that they fit.
 */
function riskAnswer(a: Ask): LocalReply | null {
  const en = /\bdeadlines?\b.*\b(?:at risk|make|fit|enough time|in time|on time|room)\b|\b(?:make|meet|reach)\b.*\bdeadlines?\b|\benough time\b.*\bdeadlines?\b/.test(a.f);
  const nl = /\bdeadlines?\b.*\b(?:halen|haal|redden|red|passen|past|op tijd|genoeg tijd|ruimte)\b|\b(?:haal|halen|red|redden)\b.*\bdeadlines?\b|\bgenoeg tijd\b.*\bdeadlines?\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const withDeadline = got.record.tasks.filter(t => !t.doneAt && t.deadline && t.deadline >= a.today).length;
  if (!withDeadline) return answer(say(a.lang, 'No open task has a deadline ahead. Give a task a deadline (and its minutes) in its editor, and Upcoming says it quietly when the free hours before it look short.', 'Geen open taak heeft een deadline in het verschiet. Geef een taak een deadline (en zijn minuten) in de editor; Upcoming zegt het rustig als de vrije uren ervoor krap lijken.'), TASK_CALLS);
  const risk = deadlineAtRisk({record: got.record, plan: planOf(a), today: a.today, clock: a.clock});
  if (!risk) return answer(say(a.lang, `Your ${count(withDeadline, 'en', ['task', 'tasks'], ['', ''])} with a deadline in the next two weeks fit in your free working hours before ${withDeadline === 1 ? 'it' : 'them'} (counting the tasks that have minutes).`, `Je ${count(withDeadline, 'nl', ['', ''], ['taak', 'taken'])} met een deadline in de komende twee weken ${withDeadline === 1 ? 'past' : 'passen'} in je vrije werkuren ervoor (de taken met minuten meegeteld).`), TASK_CALLS);
  const names = risk.tasks.slice(0, 4).map(t => `“${clean(t.title, 60)}”`).join(', ');
  return answer(say(a.lang, `About ${mins('en', risk.need)} of tasks are due by ${dayIn('en', risk.deadline, a.today)} (${names}), and about ${mins('en', risk.free)} of your working hours are free before then. Moving the deadline, more hours, or letting one go would make room; Plan my week places what fits.`,
    `Ongeveer ${mins('nl', risk.need)} aan taken moet af op ${dayIn('nl', risk.deadline, a.today)} (${names}), en ongeveer ${mins('nl', risk.free)} van je werkuren is daarvoor vrij. De deadline verzetten, meer uren, of er een laten gaan geeft ruimte; Plan my week plant wat past.`), TASK_CALLS);
}

/** "which tasks are waiting for another task", "welke taken wachten op een andere taak" (LEDGER #304). */
function waitingAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:waiting|wait|blocked)\b.*\btasks?\b|\btasks?\b.*\b(?:waiting|waits|wait for|blocked)\b/.test(a.f);
  const nl = /\btaken?\b.*\bwacht\w*\b|\bwacht\w*\b.*\btaken?\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const waiting = got.record.tasks.filter(t => !t.doneAt).map(t => ({t, on: waitingFor(got.record, t)})).filter(w => w.on.length);
  if (!waiting.length) return answer(say(a.lang, 'No task is waiting for another. In a task’s editor, “Waits for” names up to three tasks: until they are done it stays out of Today and out of a plan, then it joins its day.', 'Geen taak wacht op een andere. In de editor van een taak noemt “Waits for” tot drie taken: tot die af zijn blijft hij uit Today en uit een plan, daarna komt hij op zijn dag.'), TASK_CALLS);
  const lines = waiting.slice(0, 8).map(({t, on}) => `• ${clean(t.title, 60)} ${say(a.lang, 'waits for', 'wacht op')} ${on.map(b => `“${clean(b.title, 50)}”`).join(', ')}`);
  return answer([say(a.lang, `${count(waiting.length, 'en', ['task is', 'tasks are'], ['', ''])} waiting (not in Today, not placed):`, `${count(waiting.length, 'nl', ['', ''], ['taak wacht', 'taken wachten'])} (niet in Today, niet ingepland):`), ...lines].join('\n'), TASK_CALLS);
}

/** "how do I split a long task", "which tasks are in pieces", "hoe splits ik een lange taak" (LEDGER #303). */
function piecesAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:split|pieces|chunks?|parts)\b.*\btasks?\b|\btasks?\b.*\b(?:split|pieces|chunks?)\b|\blong task\b/.test(a.f);
  const nl = /\b(?:splits|splitsen|opsplitsen|stukken|delen)\b.*\btaa?k\w*\b|\btaa?k\w*\b.*\b(?:splitsen|opsplitsen|stukken)\b|\blange taak\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const split = got.record.tasks.filter(t => !t.doneAt && inPieces(t));
  const how = say(a.lang, 'In a task’s editor, give it its minutes (“Takes”) and a piece length under “In pieces of”: Plan my day and Plan my week then place it piece by piece (“part 2 of 4”), and time spent counts against the whole.', 'Geef een taak in de editor zijn minuten (“Takes”) en een stuklengte bij “In pieces of”: Plan my day en Plan my week plaatsen hem dan stuk voor stuk (“part 2 of 4”), en bestede tijd telt mee voor het geheel.');
  if (!split.length) return answer(say(a.lang, `No task is in pieces yet. ${how}`, `Nog geen taak is in stukken verdeeld. ${how}`), TASK_CALLS);
  const lines = split.slice(0, 8).map(t => { const p = piecesOf(t); return `• ${clean(t.title, 60)}: ${say(a.lang, `${p.pieces.length} ${p.pieces.length === 1 ? 'piece' : 'pieces'} left of ${mins('en', t.chunk!)}`, `nog ${p.pieces.length} ${p.pieces.length === 1 ? 'stuk' : 'stukken'} van ${mins('nl', t.chunk!)}`)}${p.done ? say(a.lang, ` (${p.done} done)`, ` (${p.done} gedaan)`) : ''}`; });
  return answer([say(a.lang, `${count(split.length, 'en', ['task goes', 'tasks go'], ['', ''])} in pieces:`, `${count(split.length, 'nl', ['', ''], ['taak gaat', 'taken gaan'])} in stukken:`), ...lines].join('\n'), TASK_CALLS);
}

/** "which tasks are once a week", "what do I still do once this week", "welke taken zijn een keer per week" (LEDGER #305). */
function floatingAnswer(a: Ask): LocalReply | null {
  const en = /\bonce (?:a|this|per|each) (?:week|month)\b|\bany day (?:this|of the|in the) (?:week|month)\b/.test(a.f);
  const nl = /\b(?:een keer|eens|1x|één keer) per (?:week|maand)\b|\bwillekeurige dag\b|\bdeze week nog een keer\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const open = got.record.tasks.filter(t => !t.doneAt && t.recur?.flex && t.due).sort((x, y) => x.due!.localeCompare(y.due!));
  if (!open.length) return answer(say(a.lang, 'No task repeats once a week or a month, any day. Type “once a week” or “once a month” as a task’s repeat: it stays in Tasks → This week until done, then comes back; a missed week is one overdue task, never a pile.', 'Geen taak herhaalt een keer per week of maand op een willekeurige dag. Typ “once a week” of “once a month” als herhaling: de taak blijft in Tasks → This week tot hij af is en komt dan terug; een gemiste week is één taak over tijd, nooit een stapel.'), TASK_CALLS);
  const lines = open.slice(0, 8).map(t => `• ${clean(t.title, 60)}: ${isLate(t, a.today) ? say(a.lang, `open since ${dayIn('en', t.due!, a.today)}`, `open sinds ${dayIn('nl', t.due!, a.today)}`) : say(a.lang, `once a ${t.recur!.flex}, by ${dayIn('en', t.due!, a.today)}`, `een keer per ${t.recur!.flex === 'week' ? 'week' : 'maand'}, uiterlijk ${dayIn('nl', t.due!, a.today)}`)}`);
  return answer([say(a.lang, `${count(open.length, 'en', ['task floats', 'tasks float'], ['', ''])} in its week or month:`, `${count(open.length, 'nl', ['', ''], ['taak zweeft', 'taken zweven'])} binnen de week of maand:`), ...lines].join('\n'), TASK_CALLS);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [planWeekAnswer, hoursAnswer, riskAnswer, waitingAnswer, piecesAnswer, floatingAnswer];
