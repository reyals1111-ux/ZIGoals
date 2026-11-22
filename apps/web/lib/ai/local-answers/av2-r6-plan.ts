import type {TaskPlan} from '../../tasks/plan-record';
import type {Tasks} from '../../tasks/schema';
import {projectHeld, waitsTurn} from '../../tasks/engine';
import {nextInOrder, nextReview, projectsToReview} from '../../tasks/project-states';
import {focusName, liveFocus, readFocus} from '../../tasks/focus';
import {repeatRecord} from '../../tasks/repeat-record';
import {describeRecur} from '../../tasks/recurrence';
import {localDate} from '../../local-date';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (r6-plan, LEDGER #391–#398; OmniFocus, Capacities): NOVA's and ZIGi's on-device answers, in English and
 * Dutch, to what round 6's planning rows hold — projects on hold (and until when), projects done in order (what is next),
 * the focus, the projects whose review has come round, a repeat's record (how often done, by its day or after, the average
 * days between finishes, never "behind"), the label groups, changing several tasks at once, and repeats from the month's end.
 * Each reads its feature's own pure function under the Today switch (tasks); an answer never changes a task. The planning
 * record comes in `extra.plan` or `env.nova.taskPlan` (its `focus`).
 */
export type Av2R6PlanExtra = {plan?: TaskPlan | null};
type Ask = Asked & {plan: TaskPlan | null};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];

export function av2R6PlanAnswer(question: string, env: ToolEnv, extra: Av2R6PlanExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, plan: extra.plan ?? nova?.taskPlan ?? null};
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
const live = (r: Tasks) => (r.projects ?? []).filter(p => !p.archived);

/** "which projects are on hold", "welke projecten staan in de wacht" (LEDGER #392). */
function holdAnswer(a: Ask): LocalReply | null {
  const en = /\bprojects? (?:are |is )?(?:on hold|paused)\b|\bon hold\b.*\bprojects?\b|\bput (?:a )?project on hold\b/.test(a.f);
  const nl = /\bprojecten? (?:staat|staan|is|zijn) (?:in de wacht|on hold|gepauzeerd)\b|\bin de wacht\b.*\bproject\w*\b|\bproject\w* (?:in de wacht|pauzeren)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const held = live(got.record).filter(p => projectHeld(p, a.today));
  if (!held.length) return answer(say(a.lang, 'No project is on hold. Open a project and choose “Hold, order and review” → “Put on hold”: its tasks leave Today, Upcoming, the plans and the reminders, and come back by themselves on the day you choose.',
    'Geen project staat in de wacht. Open een project, kies “Hold, order and review” → “Put on hold”: de taken verdwijnen uit Today, Upcoming, de planning en de herinneringen, en komen vanzelf terug op de dag die je kiest.'), TASK_CALLS);
  const lines = held.slice(0, 8).map(p => `• ${clean(p.name, 60)}${p.hold?.until ? say(a.lang, ` (until ${dayIn('en', p.hold.until, a.today)})`, ` (tot ${dayIn('nl', p.hold.until, a.today)})`) : say(a.lang, ' (until you resume it)', ' (tot je het hervat)')}`);
  return answer([say(a.lang, `${count(held.length, 'en', ['project is', 'projects are'], ['', ''])} on hold; their tasks are out of Today, Upcoming and the reminders:`, `${count(held.length, 'nl', ['', ''], ['project staat', 'projecten staan'])} in de wacht; hun taken staan niet in Today, Upcoming of de herinneringen:`), ...lines].join('\n'), TASK_CALLS);
}

/** "what is next in my projects", "which tasks are waiting their turn", "wat is de volgende taak in mijn project" (LEDGER #393). */
function orderAnswer(a: Ask): LocalReply | null {
  const en = /\bwhat(?: s| is)? next in (?:my |the )?projects?\b|\btasks? (?:are |is )?waiting (?:for )?(?:its|their) turn\b|\bprojects? in order\b|\bin order projects?\b/.test(a.f);
  const nl = /\bvolgende taak in (?:mijn |het )?project\w*\b|\bwat is (?:er )?(?:de )?volgende in (?:mijn )?project\w*\b|\bwachten op (?:hun|zijn) beurt\b|\bprojecten? op volgorde\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const ordered = live(got.record).filter(p => p.inOrder);
  if (!ordered.length) return answer(say(a.lang, 'No project is done in order. Open a project, choose “Hold, order and review” and tick “Do the tasks one at a time”: only its first open task shows in Today, and finishing it brings the next forward.',
    'Geen project gaat op volgorde. Open een project, kies “Hold, order and review” en vink “Do the tasks one at a time” aan: alleen de eerste open taak staat in Today, en als die af is komt de volgende.'), TASK_CALLS);
  const lines = ordered.slice(0, 8).map(p => { const next = nextInOrder(got.record, p.id), waiting = got.record.tasks.filter(t => t.projectId === p.id && !t.parentId && !!waitsTurn(got.record, t)).length;
    return `• ${clean(p.name, 50)}: ${next ? say(a.lang, `next is ${clean(next.title, 60)}`, `de volgende is ${clean(next.title, 60)}`) : say(a.lang, 'nothing open', 'niets open')}${waiting ? say(a.lang, ` (${waiting} waiting their turn)`, ` (${waiting} wachten op hun beurt)`) : ''}`; });
  return answer([say(a.lang, 'Projects done in order, one task at a time:', 'Projecten op volgorde, één taak tegelijk:'), ...lines].join('\n'), TASK_CALLS);
}

/** "what am I focused on", "waar ben ik op gefocust" (LEDGER #394). */
function focusAnswer(a: Ask): LocalReply | null {
  const en = /\bwhat am i focus(?:s)?ed on\b|\bwhich projects? am i focus(?:s)?ed on\b|\bam i focus(?:s)?ed on\b|^(?:.* )?what is my (?:task |project )?focus$|\bhow do i focus on (?:a |one |some )?projects?\b/.test(a.f);
  const nl = /\bwaar ben ik (?:nu )?op gefocust\b|\bop welke projecten? (?:ben ik )?gefocust\b|^(?:.* )?wat is mijn (?:taak|project)?focus$|\bhoe focus ik op (?:een |mijn )?project\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const focus = liveFocus(readFocus(a.plan?.focus), got.record);
  if (!focus) return answer(say(a.lang, 'No focus is on: every project shows. In Tasks → Today (or Upcoming, the matrix, the Calendar) choose “Focus…” and pick areas or projects; only their tasks show until you choose Show all. Tasks in the Inbox are never hidden.',
    'Er staat geen focus aan: elk project is te zien. Kies in Tasks → Today (of Upcoming, de matrix, de Calendar) “Focus…” en kies gebieden of projecten; alleen hun taken zijn te zien tot je Show all kiest. Taken in de Inbox blijven altijd zichtbaar.'), TASK_CALLS);
  return answer(say(a.lang, `You are focused on ${focusName(focus, got.record)}: Today, Upcoming, the matrix, the Calendar and Plan my day show only their tasks (and the Inbox) until you choose Show all.`,
    `Je bent gefocust op ${focusName(focus, got.record, 'nl')}: Today, Upcoming, de matrix, de Calendar en Plan my day tonen alleen hun taken (en de Inbox) tot je Show all kiest.`), TASK_CALLS);
}

/** "which projects need a review", "welke projecten moet ik nakijken" (LEDGER #395). */
function reviewAnswer(a: Ask): LocalReply | null {
  const en = /\bprojects? (?:to |(?:that )?needs? (?:a )?|due for (?:a )?)review\b|\bprojects? (?:do i|should i) review\b|\bwhich projects? (?:need|needs) reviewing\b|\bproject reviews?\b/.test(a.f);
  const nl = /\bprojecten? (?:moet ik |te )?(?:nakijken|nalopen|reviewen|bekijken)\b|\bprojectreview\w*\b|\bwelke projecten? (?:zijn )?aan de beurt\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const set = live(got.record).filter(p => p.review), due = projectsToReview(got.record, a.today);
  if (!set.length) return answer(say(a.lang, 'No project has a review yet. Open a project, choose “Hold, order and review” and set “Review it every … weeks”: when its turn comes it is listed in Tasks → Review.',
    'Nog geen project heeft een review. Open een project, kies “Hold, order and review” en zet “Review it every … weeks”: als het aan de beurt is staat het in Tasks → Review.'), TASK_CALLS);
  if (!due.length) { const next = [...set].sort((x, y) => nextReview(x, a.today)!.localeCompare(nextReview(y, a.today)!))[0]!;
    return answer(say(a.lang, `No project’s review has come round. Next: ${clean(next.name, 60)} on ${dayIn('en', nextReview(next, a.today)!, a.today)}.`, `Geen project is aan de beurt voor een review. Hierna: ${clean(next.name, 60)} op ${dayIn('nl', nextReview(next, a.today)!, a.today)}.`), TASK_CALLS); }
  return answer([say(a.lang, `${count(due.length, 'en', ['project is', 'projects are'], ['', ''])} up for review in Tasks → Review:`, `${count(due.length, 'nl', ['', ''], ['project is', 'projecten zijn'])} aan de beurt in Tasks → Review:`), ...due.slice(0, 8).map(p => `• ${clean(p.name, 60)}`)].join('\n'), TASK_CALLS);
}

/** "how often did I do my repeating tasks", "hoe vaak heb ik mijn herhalende taken gedaan" (LEDGER #396). */
function recordAnswer(a: Ask): LocalReply | null {
  const en = /\bhow often did i do (?:my )?(?:repeating|recurring) tasks?\b|\b(?:repeating|recurring) tasks?(?: s)? record\b|\baverage (?:days )?between (?:finishes|times)\b|\bhow (?:regular|often) (?:am i|have i been) (?:with|doing) (?:my )?(?:repeating|recurring) tasks?\b/.test(a.f);
  const nl = /\bhoe vaak heb ik (?:mijn )?herhalende taken? gedaan\b|\bhoe vaak doe ik (?:mijn )?herhalende taken?\b|\bgemiddeld\w* (?:tussen|om de)\b.*\bherhal\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const doneDay = (iso: string) => localDate(new Date(iso));
  const rows = got.record.tasks.filter(t => t.recur && !t.doneAt).map(t => ({t, r: repeatRecord(t, a.today, doneDay)!})).sort((x, y) => y.r.done - x.r.done).slice(0, 8);
  if (!rows.length) return answer(say(a.lang, 'You have no repeating task. Type “every Monday” or “every 2 weeks” with a task; its editor then shows how often it was done in the last 3 months.',
    'Je hebt geen herhalende taak. Typ “elke maandag” of “om de week” bij een taak; de editor toont dan hoe vaak die de laatste 3 maanden gedaan is.'), TASK_CALLS);
  const avg = (n: number | null) => n === null ? '' : say(a.lang, `, on average every ${n} ${n === 1 ? 'day' : 'days'}`, `, gemiddeld om de ${String(n).replace('.', ',')} ${n === 1 ? 'dag' : 'dagen'}`);
  const lines = rows.map(({t, r}) => `• ${clean(t.title, 50)} (${say(a.lang, describeRecur(t.recur!).replace(/ \(\d+ left\)$/, '').toLowerCase(), 'herhaalt')}): ${say(a.lang, `done ${r.done === 1 ? 'once' : `${r.done} times`}`, `${r.done} keer gedaan`)}${r.onDay || r.late ? say(a.lang, ` (${r.onDay} by its day, ${r.late} after it)`, ` (${r.onDay} op of voor de dag, ${r.late} erna)`) : ''}${avg(r.average)}`);
  return answer([say(a.lang, 'Your repeating tasks over the last 3 months:', 'Je herhalende taken over de laatste 3 maanden:'), ...lines].join('\n'), TASK_CALLS);
}

/** "what label groups do I have", "welke labelgroepen heb ik" (LEDGER #397). */
function groupsAnswer(a: Ask): LocalReply | null {
  const en = /\blabel groups?\b|\bgroups? of labels\b|\bonly one label (?:of|from) a group\b/.test(a.f);
  const nl = /\blabelgroep\w*\b|\bgroep(?:en)? (?:van|met) labels\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const groups = got.record.labelGroups ?? [];
  if (!groups.length) return answer(say(a.lang, 'You have no label group. In Tasks → Areas and templates → Label groups, make one such as “Where: @home @office @errand”: a task then carries one of them, and giving it another takes the first away.',
    'Je hebt geen labelgroep. Maak er een in Tasks, onder “Areas and templates → Label groups”, zoals “Waar: @thuis @kantoor @boodschap”: een taak heeft er dan één, en een andere geven haalt de eerste weg.'), TASK_CALLS);
  return answer([say(a.lang, 'Your label groups (a task carries one label of each):', 'Je labelgroepen (een taak heeft één label van elke groep):'), ...groups.slice(0, 10).map(g => `• ${clean(g.name, 40)}: ${g.labels.map(l => `@${l}`).join(', ')}`)].join('\n'), TASK_CALLS);
}

/** "how do I change several tasks at once", "hoe pas ik meerdere taken tegelijk aan" (LEDGER #391). */
function bulkAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:change|edit|move|label|update|reschedule) (?:several|many|multiple|lots of|a few) tasks?(?: at once| together)?\b|\b(?:several|multiple) tasks at once\b/.test(a.f);
  const nl = /\bmeerdere taken (?:tegelijk|in een keer|ineens)\b|\b(?:veel|meer) taken tegelijk\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  return answer(say(a.lang, 'In Tasks, choose Select and tick the tasks. The bar then finishes them, sets a priority, gives them any day (or no day), moves them, adds a label or takes one off, or removes them — each as one change with one Undo. A repeating task keeps its day.',
    'Kies in Tasks Select en vink de taken aan. De balk maakt ze af, geeft een prioriteit, een dag (of geen dag), verplaatst ze, zet er een label bij of haalt er een af, of verwijdert ze — elk als één wijziging met één Undo. Een herhalende taak houdt haar dag.'), TASK_CALLS);
}

/** "can a task repeat on the second-to-last Friday", "kan een taak herhalen op de voorlaatste vrijdag" (LEDGER #398). */
function fromEndAnswer(a: Ask): LocalReply | null {
  const en = /\b(?:second|next) (?:to )?last (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday)\b|\bpenultimate\b|\blast (?:working|business) day of (?:the|a|each) month\b|\blast workday\b/.test(a.f);
  const nl = /\bvoorlaatste (?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b|\blaatste werkdag\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const using = got.record.tasks.filter(t => !t.doneAt && (t.recur?.fromEnd || t.recur?.workday));
  const head = say(a.lang, 'Yes. Type “every second-to-last Friday” or “every last workday” with a task, or as its repeat in the editor: it comes back each month on that day (Monday to Friday counts as working days).',
    'Ja. Typ “elke voorlaatste vrijdag” of “elke laatste werkdag” bij een taak, of als herhaling in de editor: hij komt elke maand op die dag terug (maandag tot vrijdag tellen als werkdagen).');
  if (!using.length) return answer(head, TASK_CALLS);
  return answer([head, say(a.lang, 'Yours now:', 'Die van jou nu:'), ...using.slice(0, 6).map(t => `• ${clean(t.title, 60)}${t.due ? say(a.lang, `, next on ${dayIn('en', t.due, a.today)}`, `, volgende op ${dayIn('nl', t.due, a.today)}`) : ''}`)].join('\n'), TASK_CALLS);
}

const ANSWERS: readonly ((a: Ask) => LocalReply | null)[] = [holdAnswer, orderAnswer, focusAnswer, reviewAnswer, recordAnswer, groupsAnswer, bulkAnswer, fromEndAnswer];
