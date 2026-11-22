import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {isCancelled, isDoing} from '../../tasks/task-state';
import {bucketGroups} from '../../tasks/plan-bucket';
import {blockProgress, blockTasks, blocksOn, leaveBy} from '../../tasks/time-blocks';
import {zoneClock, zoneDifference, zoneName} from '../../agenda/second-zone';
import {minutesWords, minutesWordsNl} from '../../tasks/minutes';
import {childrenOf} from '../../tasks/engine';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348–#354, #356, #357; Akiflow, Logseq, Tiimo): NOVA's and ZIGi's on-device answers, in
 * English and Dutch, to what round 5's planned day holds — the tasks being done and the cancelled ones, the tasks planned for
 * a week or a month without a day, today's time blocks ("2 of 4 done"), when to leave (the travel minutes the person typed),
 * where today's tasks are (their written places), playing a task's steps, changing an earlier finish, a task's link and the
 * second time zone. Each reads its feature's own pure function under the Today switch (tasks); an answer never changes a
 * task. The planning record comes in `extra.plan` or `env.nova.taskPlan`; the second zone in `extra.zone` (the UI prefs'
 * `secondZone`).
 */
export type Av2R5PlanExtra = {plan?: TaskPlan | null; zone?: string | null};
type Ask = Asked & {plan: TaskPlan | null; zone: string | null; clock: string};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
const mins = (lang: Lang, n: number) => lang === 'nl' ? minutesWordsNl(n) : minutesWords(n);
function clockOf(env: ToolEnv): string {
  try { return new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: env.habitZone}).format(env.now); } catch { return '09:00'; }
}

export function av2R5PlanAnswer(question: string, env: ToolEnv, extra: Av2R5PlanExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, plan: extra.plan ?? nova?.taskPlan ?? null, zone: extra.zone ?? null, clock: clockOf(env)};
  for (const one of ANSWERS) { const r = one(ask); if (r) return r; }
  return null;
}
function tasksOf(a: Ask): {record: Tasks} | {reply: LocalReply} | null {
  const shut = closed(a.env, 'today'); if (shut) return {reply: shut};
  const record = a.env.nova?.tasks;
  if (record === undefined) return null;
  if (!record) return {reply: answer(say(a.lang, 'Your tasks can’t be read on this device right now, so I can’t say.', 'Je taken kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), TASK_CALLS)};
  return {record};
}
const planOf = (a: Ask): TaskPlan => a.plan ?? {version: 1};

/** "what am I doing right now", "which tasks am I doing", "waar ben ik nu mee bezig" (LEDGER #350). */
function doingAnswer(a: Ask): LocalReply | null {
  const en = /\bwhat am i (?:doing|working on)\b|\b(?:tasks?|things?) (?:am i|i am|i m) (?:doing|working on)\b|\bwhich tasks? (?:are|is) (?:in progress|doing)\b/.test(a.f);
  const nl = /\bwaar ben ik (?:nu )?mee bezig\b|\bwelke taken? ben ik (?:nu )?(?:aan het doen|mee bezig)\b|\bwat ben ik aan het doen\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const doing = got.record.tasks.filter(isDoing);
  if (!doing.length) return answer(say(a.lang, 'No task is marked Doing. In a task’s editor, “Doing now” puts it first in Tasks → Today, with the day you began.', 'Geen taak staat op Doing. In de editor van een taak zet “Doing now” hem bovenaan in Tasks → Today, met de dag waarop je begon.'), TASK_CALLS);
  const lines = doing.slice(0, 8).map(t => `• ${clean(t.title, 60)} ${say(a.lang, `(since ${dayIn('en', t.state!.at.slice(0, 10), a.today)})`, `(sinds ${dayIn('nl', t.state!.at.slice(0, 10), a.today)})`)}`);
  return answer([say(a.lang, `You are doing ${count(doing.length, 'en', ['task', 'tasks'], ['', ''])}:`, `Je bent bezig met ${count(doing.length, 'nl', ['', ''], ['taak', 'taken'])}:`), ...lines].join('\n'), TASK_CALLS);
}

/** "which tasks did I cancel", "welke taken heb ik geannuleerd" (LEDGER #350): never counted as done. */
function cancelledAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:cancell?ed|cancell?ing)\b.*\btasks?\b|\btasks?\b.*\b(?:cancell?ed|did i cancel)\b|\bwhat did i cancel\b/.test(a.f);
  const nl = /\bgeannuleerd\w*\b|\bgeschrapt\w*\b/.test(a.f) && /\btaa?k\w*\b|\bwat heb ik\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const gone = got.record.tasks.filter(isCancelled).sort((x, y) => y.doneAt!.localeCompare(x.doneAt!));
  if (!gone.length) return answer(say(a.lang, 'No task is cancelled in the last 30 days. “Cancel the task” in a task’s editor closes it without counting it as done: it stays out of your done chart, your daily goal and its streak.', 'Geen taak is geannuleerd in de laatste 30 dagen. “Cancel the task” in de editor sluit een taak zonder dat hij als gedaan telt: niet in je grafiek, je dagdoel of je reeks.'), TASK_CALLS);
  const lines = gone.slice(0, 8).map(t => `• ${clean(t.title, 60)} (${dayIn(a.lang, t.doneAt!.slice(0, 10), a.today)})`);
  return answer([say(a.lang, `${count(gone.length, 'en', ['task is', 'tasks are'], ['', ''])} cancelled (not counted as done):`, `${count(gone.length, 'nl', ['', ''], ['taak is', 'taken zijn'])} geannuleerd (niet als gedaan geteld):`), ...lines].join('\n'), TASK_CALLS);
}

/** "what did I plan for this week without a day", "wat heb ik voor deze maand gepland" (LEDGER #349). */
function bucketAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:planned|plan|put) (?:for|in) (?:this|next) (?:week|month)\b|\b(?:this|next) (?:week|month)s? list\b|\bwithout a day\b/.test(a.f);
  const nl = /\b(?:voor|in) (?:deze|volgende) (?:week|maand) gepland\b|\bgepland voor (?:deze|volgende) (?:week|maand)\b|\bzonder dag\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const groups = bucketGroups(got.record, a.today);
  if (!groups.length) return answer(say(a.lang, 'No task is planned for a week or a month without a day. In a task’s editor, “Plan for” puts a task with no day in this week or this month; it shows in Upcoming until it is done or gets a day.', 'Geen taak staat zonder dag op een week of maand. In de editor zet “Plan for” een taak zonder dag in deze week of deze maand; hij staat in Upcoming tot hij af is of een dag krijgt.'), TASK_CALLS);
  const lines = groups.flatMap(g => [`${g.kind === 'week' ? say(a.lang, `Week of ${dayIn('en', g.of, a.today)}`, `Week van ${dayIn('nl', g.of, a.today)}`) : say(a.lang, `Month from ${dayIn('en', g.of, a.today)}`, `Maand vanaf ${dayIn('nl', g.of, a.today)}`)}:`, ...g.tasks.slice(0, 6).map(t => `• ${clean(t.title, 60)}`)]);
  return answer([say(a.lang, 'Planned for a week or a month, any day:', 'Gepland voor een week of maand, welke dag ook:'), ...lines].join('\n'), TASK_CALLS);
}

/** "what time blocks do I have today", "welke tijdblokken heb ik vandaag" (LEDGER #348). */
function blocksAnswer(a: Ask): LocalReply | null {
  const en = /\btime ?blocks?\b|\bblocks? of time\b|\btime ?slots?\b/.test(a.f);
  const nl = /\btijdblok\w*\b|\btijdsblok\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const blocks = blocksOn(planOf(a), a.today);
  if (!blocks.length) return answer(say(a.lang, `${(planOf(a).blocks ?? []).length ? 'No time block today.' : 'You have no time blocks yet.'} In Tasks → This week → Time blocks, name a block (“Deep work, 9:00–11:00”) once or on weekdays; tasks dropped into it are placed inside it by Plan my day.`, `${(planOf(a).blocks ?? []).length ? 'Vandaag is er geen tijdblok.' : 'Je hebt nog geen tijdblokken.'} In Tasks → This week → Time blocks geef je een blok een naam (“Deep work, 9:00–11:00”), eenmalig of op weekdagen; taken die je erin zet plant Plan my day binnen het blok.`), TASK_CALLS);
  const lines = blocks.map(b => { const p = blockProgress(blockTasks(got.record, b, a.today)); return `• ${clean(b.name, 60)}, ${clockIn(a.lang, b.from)}–${clockIn(a.lang, b.to)}: ${p.total ? say(a.lang, `${p.done} of ${p.total} done`, `${p.done} van ${p.total} gedaan`) : say(a.lang, 'no tasks in it yet', 'nog geen taken erin')}`; });
  return answer([say(a.lang, `Today’s time blocks:`, `Je tijdblokken vandaag:`), ...lines].join('\n'), TASK_CALLS);
}

/** "when do I need to leave", "hoe laat moet ik vertrekken" (LEDGER #353): from the travel minutes the person typed. */
function leaveAnswer(a: Ask): LocalReply | null {
  const en = /\bwhen (?:do|should|must) i (?:need to )?(?:leave|set off|go)\b|\bleave by\b|\btravel (?:times?|minutes)\b/.test(a.f);
  const nl = /\bhoe laat moet ik (?:weg|vertrekken|gaan)\b|\bwanneer moet ik (?:weg|vertrekken)\b|\breistijd\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const legs = got.record.tasks.filter(t => !t.doneAt && t.due === a.today && t.time && t.travel).map(t => ({t, leave: leaveBy(t.time!, t.travel!)})).filter(x => x.leave && x.leave >= a.clock).sort((x, y) => x.leave!.localeCompare(y.leave!));
  if (!legs.length) return answer(say(a.lang, 'Nothing today has travel minutes before it. In a task’s editor (with a day and a time), type “Travel before”: it is kept free before the task, Plan my day counts it, and a “Leave by” reminder comes when task reminders are on. Nothing is worked out from a route.', 'Niets vandaag heeft reistijd ervoor. Typ in de editor van een taak (met dag en tijd) “Travel before”: die tijd blijft vrij vóór de taak, Plan my day telt hem mee, en er komt een “Leave by”-herinnering als taakherinneringen aan staan. Er wordt geen route berekend.'), TASK_CALLS);
  const lines = legs.slice(0, 6).map(({t, leave}) => `• ${say(a.lang, `Leave by ${clockIn('en', leave!)} for`, `Vertrek om ${clockIn('nl', leave!)} voor`)} ${clean(t.title, 60)} (${clockIn(a.lang, t.time!)}, ${mins(a.lang, t.travel!)}${t.place ? `, ${clean(t.place, 60)}` : ''})`);
  return answer(lines.join('\n'), TASK_CALLS);
}

/** "where do I need to be today", "waar moet ik vandaag zijn" (LEDGER #354): the written places of today's tasks. */
function placeAnswer(a: Ask): LocalReply | null {
  const en = /\bwhere (?:do i (?:need|have) to be|am i going|are my tasks)\b|\bplaces? of (?:my|today s) tasks\b/.test(a.f);
  const nl = /\bwaar moet ik (?:vandaag |morgen )?zijn\b|\bwaar moet ik heen\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const here = got.record.tasks.filter(t => !t.doneAt && t.place && t.due === a.today).sort((x, y) => (x.time ?? '99').localeCompare(y.time ?? '99'));
  if (!here.length) return answer(say(a.lang, 'None of today’s tasks has a place. In a task’s editor, “Place” takes an address or a link as you type it; it shows on the task’s row and goes into a calendar export. Nothing is looked up.', 'Geen taak van vandaag heeft een plek. In de editor neemt “Place” een adres of een link zoals je hem typt; die staat bij de taak en gaat mee in een agenda-export. Er wordt niets opgezocht.'), TASK_CALLS);
  return answer([say(a.lang, 'Where today’s tasks are:', 'Waar de taken van vandaag zijn:'), ...here.slice(0, 8).map(t => `• ${t.time ? `${clockIn(a.lang, t.time)} ` : ''}${clean(t.title, 60)}: ${clean(t.place!, 80)}`)].join('\n'), TASK_CALLS);
}

/** "how do I play the steps of a task", "hoe speel ik de stappen van een taak af" (LEDGER #351). */
function stepsAnswer(a: Ask): LocalReply | null {
  const en = /\bplay (?:the |my )?steps\b|\btimers? (?:on|for) (?:the |my )?steps\b|\bsteps? (?:one|a step) at a time\b/.test(a.f);
  const nl = /\bstappen\b.*\b(?:afspelen|timer|een voor een|één voor één|na elkaar)\b|\bspeel\b.*\bstappen\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const withSteps = got.record.tasks.filter(t => !t.doneAt && !t.parentId && childrenOf(got.record, t.id).some(c => !c.doneAt)).slice(0, 5);
  const how = say(a.lang, 'Open a task that has subtasks and choose “Play the steps”: the current step counts down from its own minutes, Next ticks it and adds the time to it, and the done and coming steps are listed.', 'Open een taak met subtaken en kies “Play the steps”: de huidige stap telt af vanaf zijn eigen minuten, Next vinkt hem af en telt de tijd erbij, en de gedane en komende stappen staan eronder.');
  return answer(withSteps.length ? `${how} ${say(a.lang, `Tasks with steps to play: ${withSteps.map(t => `“${clean(t.title, 50)}”`).join(', ')}.`, `Taken met stappen: ${withSteps.map(t => `“${clean(t.title, 50)}”`).join(', ')}.`)}` : `${how} ${say(a.lang, 'No open task has subtasks yet.', 'Nog geen open taak heeft subtaken.')}`, TASK_CALLS);
}

/** "how do I change an earlier finish of a repeating task", "hoe pas ik een eerdere keer van een herhalende taak aan" (LEDGER #352). */
function earlierAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:earlier|past|previous|old) (?:finish|finishes|occurrences?|ticks?|times?)\b.*\b(?:repeat|repeating|recurring)\b|\b(?:undo|take back|change|move) (?:a |an )?(?:tick|finish)\b/.test(a.f);
  const nl = /\b(?:eerdere|vorige|oude) (?:keer|keren|afvinking)\b.*\bherhal\w*\b|\b(?:afvinking|vinkje) (?:terugdraaien|ongedaan|verplaatsen)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  return answer(say(a.lang, 'In Tasks → Completed, each earlier finish of a repeating task has “Change”: “It was not done” takes the tick back, and “It was done on …” moves it to the day it really was. The task’s next day stays as it is, and Undo puts it back.', 'In Tasks → Completed heeft elke eerdere keer van een herhalende taak “Change”: “It was not done” haalt het vinkje weg en “It was done on …” zet het op de dag waarop het echt gebeurde. De volgende dag van de taak blijft zoals hij is, en Undo zet het terug.'), TASK_CALLS);
}

/** "how do I link to a task", "hoe link ik naar een taak" (LEDGER #356). */
function linkAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:link|url) (?:to|for|of) (?:a |this |my )?task\b|\bcopy (?:a |the )?task(?:s)? link\b/.test(a.f);
  const nl = /\blink (?:ik )?(?:naar|van) (?:een |deze |mijn )?taak\b|\btaaklink\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  return answer(say(a.lang, 'Open the task’s editor and choose “Copy link”. Paste it into a note or the journal: it opens that task in Tasks, on this device.', 'Open de editor van de taak en kies “Copy link”. Plak hem in een notitie of het dagboek: hij opent die taak in Tasks, op dit apparaat.'), TASK_CALLS);
}

/** "what time is it in my second time zone", "hoe laat is het in mijn tweede tijdzone" (LEDGER #357). */
function zoneAnswer(a: Ask): LocalReply | null {
  const en = /\bsecond (?:time ?zone|zone)\b|\bother time ?zone\b/.test(a.f);
  const nl = /\btweede tijd(?:s)?zone\b|\bandere tijd(?:s)?zone\b/.test(a.f);
  if (!(en || nl)) return null;
  if (!a.zone) return answer(say(a.lang, 'You have not chosen a second time zone. On the Agenda’s hour grid, “Show a second time zone” puts its hours beside yours there and on the Day Timeline.', 'Je hebt geen tweede tijdzone gekozen. Op het uurrooster van de Agenda zet “Show a second time zone” de uren ervan naast de jouwe, daar en op de Day Timeline.'), []);
  const there = zoneClock(a.today, a.clock, a.zone);
  if (!there) return null;
  const diff = zoneDifference(a.today, a.zone), nlDiff = diff.replace('the same time', 'dezelfde tijd').replace(/\bhours?\b/, 'uur').replace('ahead', 'later').replace('behind', 'eerder');
  return answer(say(a.lang, `In ${zoneName(a.zone)} it is ${clockIn('en', there.clock)}${there.date !== a.today ? (there.date > a.today ? ', tomorrow' : ', yesterday') : ''} (${diff}).`, `In ${zoneName(a.zone)} is het ${clockIn('nl', there.clock)}${there.date !== a.today ? (there.date > a.today ? ', morgen' : ', gisteren') : ''} (${nlDiff}).`), []);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [doingAnswer, cancelledAnswer, bucketAnswer, blocksAnswer, leaveAnswer, placeAnswer, stepsAnswer, earlierAnswer, linkAnswer, zoneAnswer];
