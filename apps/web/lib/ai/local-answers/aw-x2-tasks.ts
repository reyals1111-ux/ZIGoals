import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import type {FocusSessions} from '../../focus-sessions/schema';
import {DREAD_WORDS, DREAD_WORDS_NL, dreadedTasks} from '../../tasks/dread';
import {movedMost} from '../../tasks/moved';
import {daysUnchanged, longOpen} from '../../tasks/long-open';
import {dayProgress} from '../../tasks/day-progress';
import {hoursOn} from '../../tasks/work-hours';
import {hoursWords, targetProgress} from '../../tasks/time-targets';
import {STUCK_CLOSE, STUCK_GUIDE, STUCK_INTRO} from '../../tasks/stuck-guide';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {fold} from './exact/text';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AW (X2, LEDGER #432–#437, #448; Amazing Marvin): NOVA's and ZIGi's on-device answers, in English and Dutch, to
 * what the stuck-task tools hold — the tasks the person marked as dreaded, the ones put off most ("moved 4 times", a count,
 * never a judgement), the ones open a long time, how far today's tasks are next to how far the working hours have gone
 * (two facts, never "behind"), a time target ("am I on target for writing this week"), and the written guide for a stuck
 * task. Each reads its feature's own pure function under the Today switch (tasks); an answer never changes a task. The
 * planning record comes in `extra.plan` or `env.nova.taskPlan`, the focus blocks in `env.nova.focus`.
 */
export type AwX2Extra = {plan?: TaskPlan | null};
type Ask = Asked & {plan: TaskPlan | null; focus: FocusSessions | null | undefined; clock: string; dayOf: (iso: string) => string};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];
const MONEY = /\b(?:budget\w*|sav(?:e|es|ing|ings)|spend(?:ing)?|groceries|debt|money|income|sparen|spaar\w*|uitgaven|boodschappen|schuld\w*|aflos\w*|geld|inkomen)\b/;

function clockOf(env: ToolEnv): string {
  try { return new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: env.habitZone}).format(env.now); } catch { return '09:00'; }
}
function dayOfZone(env: ToolEnv): (iso: string) => string {
  let f: Intl.DateTimeFormat | null = null;
  try { f = new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit', timeZone: env.habitZone}); } catch { f = null; }
  return iso => { try { return f ? f.format(new Date(iso)) : iso.slice(0, 10); } catch { return iso.slice(0, 10); } };
}
export function awX2TasksAnswer(question: string, env: ToolEnv, extra: AwX2Extra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, plan: extra.plan ?? nova?.taskPlan ?? null, focus: nova?.focus, clock: clockOf(env), dayOf: dayOfZone(env)};
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

/** "what am I dreading", "waar zie ik tegenop" (LEDGER #432). */
function dreadAnswer(a: Ask): LocalReply | null {
  const en = /\bwhat am i dreading\b|\bwhich tasks? am i dreading\b|\bwhat (?:tasks? )?do i dread\b|\bmy dreaded tasks?\b|\bwhich tasks? (?:did i|have i) mark(?:ed)? as dreaded\b/.test(a.f);
  const nl = /\bwaar zie ik (?:het (?:meest|ergst) )?tegen ?op\b|\btegen welke taken? zie ik (?:het (?:meest )?)?op\b|\bwelke taken? zie ik tegen ?op\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const list = dreadedTasks(got.record);
  if (!list.length) return answer(say(a.lang, 'No task is marked as dreaded. In a task’s editor, “I’m dreading this” takes a little, quite a bit or a lot — only for you, never counted against you. Plan my day’s “Hardest first” can then give the most dreaded one the first free time, and “Stuck? Help me start” has a way in.',
    'Geen taak is gemarkeerd als iets waar je tegenop ziet. In de editor van een taak kies je bij “I’m dreading this” een beetje, nogal of erg — alleen voor jou, het telt nooit tegen je. “Hardest first” in Plan my day geeft de zwaarste dan de eerste vrije tijd, en “Stuck? Help me start” helpt je op weg.'), TASK_CALLS);
  const lines = list.slice(0, 6).map(t => `• “${clean(t.title, 60)}” (${a.lang === 'nl' ? DREAD_WORDS_NL[t.dread as 1 | 2 | 3] : DREAD_WORDS[t.dread as 1 | 2 | 3].toLowerCase()}${t.due ? say(a.lang, `, ${dayIn('en', t.due, a.today)}`, `, ${dayIn('nl', t.due, a.today)}`) : ''})`);
  return answer([say(a.lang, `You marked ${count(list.length, 'en', ['task', 'tasks'], ['', ''])} as dreaded, the most first:`, `Je hebt bij ${count(list.length, 'nl', ['', ''], ['taak', 'taken'])} aangegeven dat je ertegenop ziet, de zwaarste eerst:`), ...lines,
    say(a.lang, 'Plan my day’s “Hardest first” gives the top one the first free time; “Stuck? Help me start” in its editor has a way in.', '“Hardest first” in Plan my day geeft de bovenste de eerste vrije tijd; “Stuck? Help me start” in de editor helpt je op weg.')].join('\n'), TASK_CALLS);
}

/** "what have I put off most", "wat heb ik het vaakst uitgesteld" (LEDGER #433). */
function movedAnswer(a: Ask): LocalReply | null {
  const en = /\bwhat (?:have i|did i) (?:put off|postpone(?:d)?|move(?:d)?) (?:the )?most\b|\bwhich tasks? (?:have i|did i) (?:put off|postpone(?:d)?|move(?:d)?|reschedule(?:d)?) (?:the )?most\b|\bwhich tasks? do i keep (?:putting off|postponing|moving)\b/.test(a.f);
  const nl = /\bwat heb ik het (?:vaakst|meest) (?:uitgesteld|verschoven|verzet)\b|\bwelke taken? heb ik het (?:vaakst|meest) (?:uitgesteld|verschoven|verzet)\b|\bwelke taken? blijf ik (?:uitstellen|verschuiven)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const {items, more} = movedMost(got.record);
  if (!items.length) return answer(say(a.lang, 'No open task has been put off more than once. Each time you move a task’s day later, its row counts it (“Moved 3 times”), as a fact, never a warning; Tasks → Review lists the ones moved most, with a day, no day or remove to choose from.',
    'Geen open taak is vaker dan één keer uitgesteld. Elke keer dat je de dag van een taak later zet, telt de taak dat (“Moved 3 times”), als feit, nooit als waarschuwing; Tasks → Review toont de taken die het vaakst verschoven zijn, met een dag, geen dag of weghalen als keuze.'), TASK_CALLS);
  const lines = items.slice(0, 6).map(t => `• “${clean(t.title, 60)}”: ${say(a.lang, `moved ${t.moved} times`, `${t.moved} keer verschoven`)}${t.due ? say(a.lang, `, now ${dayIn('en', t.due, a.today)}`, `, nu ${dayIn('nl', t.due, a.today)}`) : ''}`);
  return answer([say(a.lang, 'The tasks whose day you moved later most often:', 'De taken waarvan je de dag het vaakst later hebt gezet:'), ...lines, ...(more ? [say(a.lang, `…and ${more} more.`, `…en nog ${more}.`)] : []),
    say(a.lang, 'Tasks → Review offers each one a day that fits, no day for now, or remove. Moving a task is never counted against you.', 'In Tasks → Review kies je per taak een dag die past, voorlopig geen dag, of weghalen. Verschuiven telt nooit tegen je.')].join('\n'), TASK_CALLS);
}

/** "which tasks have been open the longest", "welke taken staan het langst open" (LEDGER #434). */
function longOpenAnswer(a: Ask): LocalReply | null {
  const en = /\bwhich tasks? (?:have been|has been|are) open (?:the )?longest\b|\bwhat tasks? (?:have been|are) open (?:the )?longest\b|\btasks? (?:that )?(?:have )?sat (?:for )?a long time\b|\bmy oldest open tasks?\b/.test(a.f);
  const nl = /\bwelke taken? (?:staan|staat|liggen|ligt) (?:er )?het langst open\b|\bwelke taken? liggen (?:er )?al (?:heel )?lang\b|\bmijn oudste open taken?\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const {items, all} = longOpen(got.record, a.today, 60, a.dayOf);
  if (!items.length) return answer(say(a.lang, 'No open task has gone 60 days without a change. Tasks that do show in Tasks → Review under “Open a long time”, oldest first, with Keep, Give it a day and Remove.',
    'Geen open taak is 60 dagen of langer onveranderd gebleven. Taken die dat wel zijn, staan in Tasks → Review onder “Open a long time”, de oudste eerst, met Keep, Give it a day en Remove.'), TASK_CALLS);
  const lines = items.slice(0, 6).map(t => `• “${clean(t.title, 60)}”: ${say(a.lang, `unchanged for ${daysUnchanged(t, a.today, a.dayOf)} days`, `${daysUnchanged(t, a.today, a.dayOf)} dagen onveranderd`)}`);
  return answer([say(a.lang, `${count(all, 'en', ['open task has', 'open tasks have'], ['', ''])} not changed for 60 days or more, oldest first:`, `${count(all, 'nl', ['', ''], ['open taak is', 'open taken zijn'])} 60 dagen of langer niet veranderd, de oudste eerst:`), ...lines,
    say(a.lang, 'In Tasks → Review you can keep each one (asked again in 60 days), give it a day, or remove it.', 'In Tasks → Review kun je elke taak houden (over 60 dagen weer gevraagd), een dag geven of weghalen.')].join('\n'), TASK_CALLS);
}

/** "how far am I with today's plan", "hoe ver ben ik met mijn planning van vandaag" (LEDGER #436). */
function dayAnswer(a: Ask): LocalReply | null {
  const en = /\bhow far (?:am i|along am i|have i got(?:ten)?) (?:with|in) (?:today s|todays|my today s|my) (?:plan|tasks|task list)\b|\bhow far through (?:my|the) day am i\b|\bhow much of today s plan (?:have i done|is done)\b/.test(a.f);
  const nl = /\bhoe ver ben ik met (?:mijn )?(?:planning|plan|taken) van vandaag\b|\bhoe ver ben ik met (?:mijn )?(?:dagplanning|takenlijst van vandaag)\b|\bhoeveel van (?:mijn )?(?:planning|taken) van vandaag (?:heb ik gedaan|is af)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const blocks = hoursOn(a.plan ?? {}, a.today), p = dayProgress(got.record, a.today, a.clock, blocks, a.dayOf);
  if (!p) return answer(say(a.lang, 'Nothing is planned for today yet, so there is no progress to tell. Give a task today’s day (or add one in Tasks → Today); Today’s heading line then shows how many are done next to how far your working hours have gone.',
    'Er staat voor vandaag nog niets gepland, dus er is geen voortgang te melden. Geef een taak de dag van vandaag (of voeg er een toe in Tasks → Today); de kopregel van Today laat dan zien hoeveel er af zijn naast hoe ver je werkuren zijn.'), TASK_CALLS);
  const hours = blocks.map(b => `${clockIn(a.lang, b.from)}–${clockIn(a.lang, b.to)}`).join(say(a.lang, ' and ', ' en '));
  const tasks = p.done === p.total ? say(a.lang, `All ${p.total} of today’s tasks are done`, `Alle ${p.total} taken van vandaag zijn af`) : say(a.lang, `${p.done} of ${p.total} of today’s tasks are done`, `${p.done} van de ${p.total} taken van vandaag zijn af`);
  const day = p.hours === 'off' ? say(a.lang, 'today is a day off in your working hours', 'vandaag is een vrije dag in je werkuren')
    : p.hours === 'before' ? say(a.lang, `your working hours start at ${clockIn('en', p.starts!)}`, `je werkuren beginnen om ${clockIn('nl', p.starts!)}`)
      : p.hours === 'after' ? say(a.lang, `your working hours (${hours}) are over for today`, `je werkuren (${hours}) zitten er voor vandaag op`)
        : say(a.lang, `the day is ${p.share} % through your working hours (${hours})`, `de dag is voor ${p.share} % door je werkuren (${hours})`);
  return answer(say(a.lang, `${tasks}, and ${day}. Two facts side by side, nothing to keep up with.`, `${tasks}, en ${day}. Twee feiten naast elkaar, niets om bij te houden.`), TASK_CALLS);
}

/** "am I on target for writing this week", "ben ik op koers voor schrijven deze week" (LEDGER #437). */
function targetAnswer(a: Ask): LocalReply | null {
  const en = /\bam i on target (?:for|with) (.+?) this (?:week|month)$|\bhow are my time targets\b|\bwhat are my time targets\b|\bam i on (?:target|track) (?:for|with) my time targets?\b/.exec(a.f);
  const nl = /\bben ik op koers (?:voor|met) (.+?) deze (?:week|maand)$|\bhoe staan mijn tijddoelen(?: ervoor)?\b|\bwat zijn mijn tijddoelen\b/.exec(a.f);
  const m = en ?? nl;
  // Money has its own targets and plans (budgets, savings, a debt plan): those questions are left to their answers.
  if (!m || MONEY.test(a.f)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const named = (m[1] ?? '').replace(/^(?:my|mijn|the|het|de|@)\s*/, '').trim();
  const targets = a.plan?.timeTargets ?? [];
  const howTo = say(a.lang, 'In Tasks → This week, under Time targets, choose a project, an area or a label and the hours a week or a month; the focus blocks started on its tasks count towards it.',
    'In Tasks → This week, onder Time targets, kies je een project, een gebied of een label en het aantal uren per week of per maand; de focusblokken die je op die taken start tellen mee.');
  if (!targets.length) return answer(say(a.lang, `You have no time targets yet. ${howTo}`, `Je hebt nog geen tijddoelen. ${howTo}`), TASK_CALLS);
  const progress = targets.map(t => targetProgress(t, got.record, a.focus, a.today));
  const line = (p: (typeof progress)[number]) => {
    const name = p.name ?? say(a.lang, 'a project no longer here', 'een project dat er niet meer is'), per = p.target.per === 'week' ? say(a.lang, 'this week', 'deze week') : say(a.lang, 'this month', 'deze maand');
    return `• “${clean(name, 60)}”: ${hoursWords(p.spent)} ${say(a.lang, 'of', 'van')} ${hoursWords(p.target.minutes)} ${per}${p.spent >= p.target.minutes ? say(a.lang, ' (reached)', ' (gehaald)') : ''}`;
  };
  const want = named && !/^(?:target|targets|track|koers|tijddoel(?:en)?)$/.test(named) ? fold(named) : '';
  const match = want ? progress.filter(p => { const n = fold((p.name ?? '').replace(/^@/, '')); return n === want || n.includes(want) || (want.length >= 4 && want.includes(n) && n.length >= 3); }) : [];
  const note = say(a.lang, 'Counted from the focus blocks on their tasks; a target not met yet is simply how far it is.', 'Geteld uit de focusblokken op die taken; een doel dat nog niet gehaald is, is gewoon hoe ver het is.');
  if (want && match.length) return answer([...match.map(line), note].join('\n'), TASK_CALLS);
  const head = want ? say(a.lang, `There is no time target for “${clean(named, 40)}”. Your time targets:`, `Er is geen tijddoel voor “${clean(named, 40)}”. Je tijddoelen:`) : say(a.lang, 'Your time targets:', 'Je tijddoelen:');
  return answer([head, ...progress.map(line), note].join('\n'), TASK_CALLS);
}

/** "how do I get started on a stuck task", "hoe begin ik aan een taak waar ik op vastloop" (LEDGER #448). */
function stuckAnswer(a: Ask): LocalReply | null {
  const en = /\bhow (?:do|can) i (?:get )?start(?:ed)? (?:on |with )?(?:a |my )?(?:stuck task|task i (?:am|m) stuck on)\b|\bwhat can i do when i (?:am|m) stuck on a task\b|\bhow do i get unstuck on a task\b/.test(a.f);
  const nl = /\bhoe begin ik (?:aan )?een taak waar ik (?:op )?vast ?loop\b|\bwat kan ik doen als ik vast ?zit (?:met|op) een taak\b|\bhoe kom ik los (?:met|van) een taak\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const lang = a.lang;
  const lines = STUCK_GUIDE.map(x => `• ${x.question[lang]} ${x.strategy[lang][0]}`);
  return answer([STUCK_INTRO[lang], ...lines, say(lang, 'In a task’s editor, “Stuck? Help me start” walks you through it and leads to splitting it into steps, a first step, a short focus block or a better day.', 'In de editor van een taak loopt “Stuck? Help me start” dit met je door en leidt naar stappen, een eerste stap, een kort focusblok of een betere dag.'), STUCK_CLOSE[lang]].join('\n'), TASK_CALLS);
}

const ANSWERS = [dreadAnswer, movedAnswer, longOpenAnswer, dayAnswer, targetAnswer, stuckAnswer] as const;
