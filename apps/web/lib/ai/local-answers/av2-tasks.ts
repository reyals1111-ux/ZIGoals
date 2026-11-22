import {wallClock} from '../../zone-time';
import {fromCents} from '../../money-log/engine';
import {formatCurrencyAmount} from '../../visual-format';
import {addLocalDays} from '../../local-date';
import {noteReminders} from '../../notes/reminders';
import {openTasks, viewTasks} from '../../tasks/engine';
import {objectiveProgress, plannedVsActual, weekObjectives, weekStart} from '../../tasks/layouts';
import {finishesByDay, goalStreak, type TaskPlan} from '../../tasks/plan-record';
import {BUILT_IN_TEMPLATES, type TaskTemplates} from '../../tasks/templates';
import type {Tasks} from '../../tasks/schema';
import {periodRows, type BudgetPeriods} from '../../budgets/periods';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, list, money, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (tasks; Sunsama, Todoist, TickTick, Things, Notion): NOVA's and ZIGi's on-device answers, in English
 * and Dutch, to what lane 2's Tasks features hold — the week's objectives, the daily goal and its streak, time planned
 * against time spent, running timers, the day's limit, start-early tasks, areas, templates and the reminders written in
 * notes. Each reads the feature's own pure function, under the Today switch (tasks) and, for notes, only where NOVA's
 * Notes scope shares them. The planning record and the templates come in `extra` (or the env's `nova.taskPlan` /
 * `nova.taskTemplates` once the lead adds them); without them the answer says where the choice lives.
 */
export type Av2TasksExtra = {plan?: TaskPlan | null; templates?: TaskTemplates | null; /** Money N11: `zigoals:budget-periods:v1`. */ periods?: BudgetPeriods | null};
type Ask = Asked & {extra: Av2TasksExtra};
const doneDay = (zone: string) => (iso: string) => wallClock(Date.parse(iso), zone).date;
const min = (m: number, lang: Lang) => { const h = Math.floor(m / 60), r = m % 60; return lang === 'nl' ? (h ? `${h} uur${r ? ` ${r} min` : ''}` : `${r} min`) : (h ? `${h} h${r ? ` ${r} min` : ''}` : `${r} min`); };
const CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];

export function av2TasksAnswer(question: string, env: ToolEnv, extra: Av2TasksExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskPlan?: TaskPlan | null; taskTemplates?: TaskTemplates | null}) | null | undefined;
  const ask: Ask = {...a, extra: {plan: extra.plan ?? nova?.taskPlan ?? null, templates: extra.templates ?? nova?.taskTemplates ?? null}};
  for (const one of [payPeriod, noteReminderAnswer, objectives, dailyGoal, spentTime, timers, dayLimit, startEarly, areas, templates]) {
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

/** "what are my objectives this week", "wat zijn mijn weekdoelen" (Sunsama's weekly objectives). */
function objectives(a: Ask): LocalReply | null {
  const en = /\b(?:weekly )?objectives?\b/.test(a.f) || /\bgoals? for (?:this|the) week\b.*\btasks?\b/.test(a.f);
  const nl = /\bweekdoel(?:en)?\b|\bdoelstelling(?:en)?\b.*\bweek\b|\bweek\b.*\bdoelstelling(?:en)?\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const next = /\bnext week\b|\bvolgende week\b/.test(a.f), week = next ? addLocalDays(weekStart(a.today), 7) : weekStart(a.today), list_ = weekObjectives(got.record, week);
  if (!list_.length) return answer(say(a.lang, `No objectives for ${next ? 'next' : 'this'} week yet. Add them in Tasks → This week, then link the tasks that move them on.`, `Nog geen weekdoelen voor ${next ? 'volgende' : 'deze'} week. Voeg ze toe in Tasks → This week en koppel de taken die ze vooruit helpen.`), CALLS);
  const lines = list_.map(o => { const p = objectiveProgress(got.record, o.id); return `• ${clean(o.title, 80)}${o.doneAt ? say(a.lang, ' (reached)', ' (gehaald)') : ''}${p.tasks.length ? say(a.lang, ` — ${p.done} of ${p.tasks.length} tasks done`, ` — ${p.done} van ${p.tasks.length} taken klaar`) : ''}`; });
  const done = list_.filter(o => o.doneAt).length;
  return answer([say(a.lang, `${count(list_.length, 'en', ['objective', 'objectives'], ['', ''])} for ${next ? 'next' : 'this'} week, ${done} reached:`, `${count(list_.length, 'nl', ['', ''], ['weekdoel', 'weekdoelen'])} voor ${next ? 'volgende' : 'deze'} week, ${done} gehaald:`), ...lines].join('\n'), CALLS);
}

/** "how many tasks did I finish today", "what is my task streak", "hoeveel taken heb ik vandaag afgerond", "mijn takenreeks". */
function dailyGoal(a: Ask): LocalReply | null {
  const en = /\btasks?\b.*\b(?:finish|finished|done|complete|completed)\b.*\btoday\b|\b(?:task|daily) (?:streak|goal)\b|\bstreak\b.*\btasks?\b/.test(a.f);
  const nl = /\btaken\b.*\b(?:afgerond|gedaan|klaar|afgevinkt)\b.*\bvandaag\b|\btaken\b.*\bvandaag\b.*\b(?:afgerond|gedaan|klaar|afgevinkt)\b|\bvandaag\b.*\btaken\b.*\b(?:afgerond|gedaan|klaar)\b|\btakenreeks\b|\bdagdoel\b|\breeks\b.*\btaken\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const plan = a.extra.plan ?? {version: 1 as const}, byDay = finishesByDay(plan, got.record, doneDay(a.env.habitZone || 'UTC')), done = byDay.get(a.today) ?? 0, goal = plan.dailyGoal;
  // Lead (batch 1): with no daily goal, "how many tasks did I finish today" stays Tasks' own answer (LA-021: the list of
  // what was done); this one speaks only of a goal or a streak, or when a goal is set.
  if (!goal && !/\b(?:streak|goal)\b|\b(?:reeks|takenreeks|dagdoel)\b/.test(a.f)) return null;
  if (!goal) return answer(say(a.lang, `${count(done, 'en', ['task', 'tasks'], ['', ''])} finished today. No daily goal is set: choose one in Tasks → This week to count a streak.`, `Vandaag ${count(done, 'nl', ['', ''], ['taak', 'taken'])} afgerond. Er is geen dagdoel: kies er een in Tasks → This week om een reeks te tellen.`), CALLS);
  const s = goalStreak(byDay, goal, a.today);
  return answer(say(a.lang, `${done} of your daily goal of ${goal} done today${s.reached ? ' — reached' : ''}. Streak: ${count(s.current, 'en', ['day', 'days'], ['', ''])} in a row (best ${s.best}).`,
    `Vandaag ${done} van je dagdoel van ${goal} afgerond${s.reached ? ' — gehaald' : ''}. Reeks: ${count(s.current, 'nl', ['', ''], ['dag', 'dagen'])} op rij (beste ${s.best}).`), CALLS);
}

/** "how much time did I spend on tasks today", "planned vs actual", "hoeveel tijd heb ik vandaag aan taken besteed". */
function spentTime(a: Ask): LocalReply | null {
  const en = /\b(?:time|minutes|hours)\b.*\b(?:spent|spend|worked)\b.*\btasks?\b|\bplanned (?:vs|versus|against) (?:actual|spent)\b|\btime spent\b/.test(a.f);
  const nl = /\b(?:tijd|minuten|uren)\b.*\b(?:besteed|gewerkt|gespendeerd)\b|\bgepland (?:tegen|vs|versus) (?:besteed|werkelijk)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const week = /\bweek\b/.test(a.f), dd = doneDay(a.env.habitZone || 'UTC'), from = week ? weekStart(a.today) : a.today;
  const tasks = got.record.tasks.filter(t => !t.parentId && ((t.doneAt ? dd(t.doneAt) : t.due ?? '') >= from) && ((t.doneAt ? dd(t.doneAt) : t.due ?? '') <= a.today));
  const p = plannedVsActual(tasks), when = week ? say(a.lang, 'this week', 'deze week') : say(a.lang, 'today', 'vandaag');
  if (!p.planned && !p.actual) return answer(say(a.lang, `No minutes planned or spent ${when} yet. Give a task its minutes in its editor, and time it with Start timer in Tasks → Today.`, `${when[0]!.toUpperCase()}${when.slice(1)} nog geen minuten gepland of besteed. Geef een taak minuten in de editor en tijd hem met Start timer in Tasks → Today.`), CALLS);
  return answer(say(a.lang, `${when[0]!.toUpperCase()}${when.slice(1)}: planned ${min(p.planned, 'en')}, spent ${min(p.actual, 'en')}${p.actual > p.planned && p.planned ? ` (${min(p.actual - p.planned, 'en')} more than planned)` : ''}.`,
    `${when[0]!.toUpperCase()}${when.slice(1)}: gepland ${min(p.planned, 'nl')}, besteed ${min(p.actual, 'nl')}${p.actual > p.planned && p.planned ? ` (${min(p.actual - p.planned, 'nl')} meer dan gepland)` : ''}.`), CALLS);
}

/** "which timers are running", "welke timers lopen er". */
function timers(a: Ask): LocalReply | null {
  if (!/\btimers?\b/.test(a.f)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const running = (a.extra.plan?.timers ?? []).map(t => ({t, task: got.record.tasks.find(x => x.id === t.taskId)})).filter(x => x.task);
  if (!running.length) return answer(say(a.lang, 'No task timer is running. Start one in Tasks → Today (Fit my day), several at once if you like.', 'Er loopt geen taaktimer. Start er een in Tasks → Today (Fit my day), ook meerdere tegelijk.'), CALLS);
  const now = a.env.now.getTime();
  return answer([say(a.lang, `${count(running.length, 'en', ['timer', 'timers'], ['', ''])} running:`, `${count(running.length, 'nl', ['', ''], ['timer loopt', 'timers lopen'])}:`), ...running.map(x => `• ${clean(x.task!.title, 80)}: ${min(Math.max(1, Math.round((now - x.t.since) / 60_000)), a.lang)}`)].join('\n'), CALLS);
}

/** "is my day too full", "am I overcommitted today", "is mijn dag te vol". */
function dayLimit(a: Ask): LocalReply | null {
  const en = /\b(?:day|today)\b.*\b(?:too full|overbooked|overcommitted|too much|over my limit)\b|\b(?:overcommitted|overbooked)\b/.test(a.f);
  const nl = /\b(?:dag|vandaag)\b.*\b(?:te vol|overvol|te veel)\b|\boverboekt\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const shown = viewTasks(got.record, {kind: 'today'}, a.today), load = shown.filter(t => !t.parallel && !t.parentId).reduce((n, t) => n + (t.minutes ?? 0), 0), limit = a.extra.plan?.dayLimit;
  if (!limit) return answer(say(a.lang, `About ${min(load, 'en')} of tasks planned today. Set how much your day holds in Tasks → This week, and Today warns past it.`, `Vandaag zo’n ${min(load, 'nl')} aan taken gepland. Stel in Tasks → This week in hoeveel je dag aankan; Today waarschuwt daarboven.`), CALLS);
  return answer(load > limit ? say(a.lang, `Yes: about ${min(load, 'en')} planned, ${min(load - limit, 'en')} more than the ${min(limit, 'en')} your day holds. Move a task to tomorrow, or let one go.`, `Ja: zo’n ${min(load, 'nl')} gepland, ${min(load - limit, 'nl')} meer dan de ${min(limit, 'nl')} die je dag aankan. Schuif een taak naar morgen of laat er een gaan.`)
    : say(a.lang, `No: about ${min(load, 'en')} of the ${min(limit, 'en')} your day holds.`, `Nee: zo’n ${min(load, 'nl')} van de ${min(limit, 'nl')} die je dag aankan.`), CALLS);
}

/** "which tasks start early", "welke taken beginnen eerder". */
function startEarly(a: Ask): LocalReply | null {
  if (!(/\bstart(?:s|ing)? early\b/.test(a.f) || /\b(?:eerder|vroeg) (?:beginnen|starten)\b|\bbeginnen eerder\b/.test(a.f))) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const early = openTasks(got.record, a.today).filter(t => t.early && t.due);
  if (!early.length) return answer(say(a.lang, 'No task starts early. In a task’s editor, “Start early” shows it in Today some days before its day.', 'Geen taak begint eerder. In de editor van een taak zet “Start early” hem een paar dagen voor zijn dag al in Today.'), CALLS);
  return answer([say(a.lang, `${count(early.length, 'en', ['task starts', 'tasks start'], ['', ''])} early:`, `${count(early.length, 'nl', ['', ''], ['taak begint', 'taken beginnen'])} eerder:`), ...early.slice(0, 8).map(t => `• ${clean(t.title, 80)}: ${dayIn(a.lang, t.due!, a.today)}, ${say(a.lang, `in Today from ${t.early} ${t.early === 1 ? 'day' : 'days'} before`, `in Today vanaf ${t.early} ${t.early === 1 ? 'dag' : 'dagen'} ervoor`)}`)].join('\n'), CALLS);
}

/** "what are my areas", "welke gebieden heb ik" (Things' Areas). */
function areas(a: Ask): LocalReply | null {
  if (!(/\b(?:my|task|project) areas?\b|\bareas? (?:of|in) (?:my )?tasks\b/.test(a.f) || /\b(?:gebieden|gebied|domeinen)\b/.test(a.f))) return null;
  const got = tasksOf(a); if (!got) return null; if ('reply' in got) return got.reply;
  const all = got.record.areas ?? [];
  if (!all.length) return answer(say(a.lang, 'No areas yet. In Tasks → Areas and templates, add one (Work, Home) and put projects in it.', 'Nog geen gebieden. Voeg er in Tasks → Areas and templates een toe (Werk, Thuis) en zet er projecten in.'), CALLS);
  const live = (got.record.projects ?? []).filter(p => !p.archived);
  return answer([say(a.lang, `${count(all.length, 'en', ['area', 'areas'], ['', ''])}:`, `${count(all.length, 'nl', ['', ''], ['gebied', 'gebieden'])}:`), ...all.map(x => { const ps = live.filter(p => p.areaId === x.id).map(p => clean(p.name, 40)); return `• ${clean(x.name, 60)}${ps.length ? `: ${list(ps, a.lang)}` : say(a.lang, ' (no projects yet)', ' (nog geen projecten)')}`; })].join('\n'), CALLS);
}

/** "which task templates do I have", "welke sjablonen heb ik voor taken". */
function templates(a: Ask): LocalReply | null {
  if (!(/\b(?:task |project )?templates?\b/.test(a.f) && /\btasks?\b|\bprojects?\b|\btemplates\b/.test(a.f)) && !/\bsjablonen?\b|\btemplates?\b.*\b(?:taken|project)/.test(a.f)) return null;
  if (/\bjournal|dagboek\b/.test(a.f)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const own = a.extra.templates?.items ?? [], names = [...BUILT_IN_TEMPLATES.map(t => t.name), ...own.map(t => clean(t.name, 60))];
  return answer(say(a.lang, `${names.length} templates for a new project: ${list(names, 'en')}${own.length ? ` (${own.length} your own)` : ''}. Use one in Tasks → Areas and templates; save a project as one there too.`,
    `${names.length} sjablonen voor een nieuw project: ${list(names, 'nl')}${own.length ? ` (${own.length} van jezelf)` : ''}. Gebruik er een in Tasks → Areas and templates; daar bewaar je ook een project als sjabloon.`), CALLS);
}

/** Money N11 (Goodbudget): "how much is left in my budgets this pay period", "hoeveel heb ik nog over deze periode". */
function payPeriod(a: Ask): LocalReply | null {
  const en = /\b(?:pay ?period|this period|until payday|till payday|before payday)\b/.test(a.f) && /\bbudgets?\b|\bleft\b/.test(a.f);
  const nl = /\b(?:deze periode|tot (?:mijn )?salaris|tot de salarisdag|loonperiode)\b/.test(a.f) && /\bbudget(?:ten)?\b|\bover\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth', 'budgets'); if (shut) return shut;
  const budgets = a.env.nova?.budgets, calls = [{tool: 'budgets', args: {}, label: 'Budgets'}];
  if (budgets === undefined) return null;
  if (!budgets?.budgets.length) return answer(say(a.lang, 'No budgets yet. Add one in Wealth → Budgets; under “Pay periods and fills” choose the day your budget month starts.', 'Nog geen budgetten. Voeg er een toe in Wealth → Budgets; kies onder “Pay periods and fills” de dag waarop je budgetmaand begint.'), calls);
  const rows = periodRows(a.env.moneyLog?.entries ?? [], budgets, a.extra.periods ?? {version: 1}, a.today);
  // Review b1 #16: a Dutch answer writes its money the Dutch way ("€ 62,90"), as its dates are.
  const cash = (cents: number, currency: string) => a.lang === 'nl' ? formatCurrencyAmount(fromCents(cents), currency, 'nl-NL') : money(cents, currency);
  return answer([say(a.lang, 'Left in each budget, in its own period:', 'Over in elk budget, in zijn eigen periode:'), ...rows.slice(0, 10).map(r => `• ${clean(r.budget.category, 40)}: ${r.left >= 0 ? cash(r.left, r.budget.currency) : `-${cash(-r.left, r.budget.currency)}`} ${say(a.lang, 'of', 'van')} ${cash(r.amount, r.budget.currency)} (${dayIn(a.lang, r.start, a.today)} – ${dayIn(a.lang, r.end, a.today)})`)].join('\n'), calls);
}

/** "which reminders are in my notes", "welke herinneringen staan in mijn notities" (Notion's @remind), under NOVA's Notes scope. */
function noteReminderAnswer(a: Ask): LocalReply | null {
  const en = /\breminders?\b.*\bnotes?\b|\bnotes?\b.*\breminders?\b/.test(a.f), nl = /\bherinnering(?:en)?\b.*\bnotities?\b|\bnotities?\b.*\bherinnering(?:en)?\b/.test(a.f);
  if (!(en || nl)) return null;
  const notes = a.env.nova?.notes, calls = [{tool: 'notes', args: {}, label: 'Notes'}];
  if (!notes) return answer(say(a.lang, 'Your notes aren’t shared here. Reminders written in notes (“@remind tomorrow 9:00 …”) are listed on the Notes page, under “Reminders in your notes”.', 'Je notities worden hier niet gedeeld. Herinneringen in notities (“@remind morgen 9:00 …”) staan op de pagina Notes, onder “Reminders in your notes”.'), calls);
  const zone = a.env.habitZone || 'UTC', ahead = noteReminders(notes, a.today, zone, a.env.now.getTime(), {pastMs: 0});
  if (!ahead.length) return answer(say(a.lang, 'No reminder is written in your notes. Put “@remind tomorrow 9:00 call the plumber” on a line of any note.', 'Er staat geen herinnering in je notities. Zet “@remind morgen 9:00 loodgieter bellen” op een regel van een notitie.'), calls);
  return answer([say(a.lang, `${count(ahead.length, 'en', ['reminder', 'reminders'], ['', ''])} in your notes:`, `${count(ahead.length, 'nl', ['', ''], ['herinnering', 'herinneringen'])} in je notities:`), ...ahead.slice(0, 8).map(r => `• ${clean(r.what, 80)}: ${dayIn(a.lang, r.day, a.today)} ${say(a.lang, 'at', 'om')} ${clockIn(a.lang, r.time)}`)].join('\n'), calls);
}
