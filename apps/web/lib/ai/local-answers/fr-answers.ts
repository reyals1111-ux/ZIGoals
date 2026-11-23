import {averageProgress} from '../../average-goals/progress';
import {habitDay, latestHabitRule, type Habit} from '../../habits';
import {addLocalDays} from '../../local-date';
import {dailySeries} from '../../sleep/engine';
import {healthGroupIn} from '../../vault/w-homes';
import {isFinished} from '../../tasks/finished';
import type {Task} from '../../tasks/schema';
import {formatNumber} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {answer, asked, clockIn, closed, count, dayIn, hm, isQuestion, list, MIXED, say, type Asked, type Lang} from './av-words';
import {localAnswer, type LocalReply} from './engine';
import {fold} from './exact/text';

/**
 * Session AV lane 2 (fr-answers): the friend-readiness walks' questions the device had no answer for, each read from the
 * records the page itself shows, in English and Dutch (fr-sanne.md, fr-max.md):
 * - FR-S-5: "haal ik mijn slaapdoel", "am I reaching my sleep goal": the sleep goal (a goal that keeps an average of
 *   sleep, as Goals shows it, else Health → Sleep's own goal) against the nights logged; no goal: where to set one.
 * - FR-S-5: "hoe vaak ben ik deze week op tijd naar bed gegaan", "how often did I go to bed on time": the habit that keeps
 *   the bedtime ("Lights out by 23:00"), its done days in the week asked.
 * - FR-MAX-4: "when is Email Sam due", "wanneer is de tandarts", "wanneer moet ik Sam mailen": a task (or an Agenda event)
 *   named by the question's words, with its day and time.
 * - FR-MAX-12: "what did I finish this week", "wat heb ik deze week afgerond": the tasks finished, the answer "which tasks
 *   did I complete this week" gets (Tasks → Completed's own list).
 * Each answer reads only under its own switch (Health's gate for sleep); a question with an action in it is left alone.
 */
export function frAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of [sleepGoalAnswer, onTimeAnswer, finishedAnswer, taskWhenAnswer]) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}

// ── The week or period a question names ───────────────────────────────────────────────────────────────────────────
type Span = {from: string; to: string; words: string};
const weekStart = (day: string) => addLocalDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7));
function spanOf(a: Asked, today: string): Span {
  const lang = a.lang, between = (from: string, to: string) => `(${dayIn(lang, from, today)} ${say(lang, 'to', 't/m')} ${dayIn(lang, to, today)})`;
  if (/\b(?:last week|vorige week)\b/.test(a.f)) { const from = addLocalDays(weekStart(today), -7), to = addLocalDays(from, 6); return {from, to, words: `${say(lang, 'last week', 'vorige week')} ${between(from, to)}`}; }
  if (/\b(?:this month|deze maand)\b/.test(a.f)) { const from = `${today.slice(0, 7)}-01`; return {from, to: today, words: `${say(lang, 'this month', 'deze maand')} ${between(from, today)}`}; }
  if (/\b(?:today|vandaag)\b/.test(a.f)) return {from: today, to: today, words: `${say(lang, 'today', 'vandaag')} (${dayIn(lang, today, today)})`};
  const from = weekStart(today);
  return {from, to: today, words: `${say(lang, 'this week', 'deze week')} ${between(from, today)}`};
}

// ── FR-S-5: the sleep goal ────────────────────────────────────────────────────────────────────────────────────────
const SLEEP_GOAL_EN = /\b(?:do|did|am|will|have) i (?:reach|hit|meet|make|get|meeting|reaching|hitting|making|reached|met)\b.*\bsleep (?:goal|target)\b|\bam i on track\b.*\bsleep (?:goal|target)\b|\bhow (?:is|am i doing (?:on|with)) my sleep (?:goal|target)\b|\bsleep (?:goal|target)\b.*\b(?:reached|met|on track)\b/;
const SLEEP_GOAL_NL = /\bhaal ik\b.*\bslaapdoel\b|\bslaapdoel\b.*\b(?:gehaald|halen|haal)\b|\bhoe (?:gaat het met|sta ik ervoor met|staat het met) (?:mijn )?slaapdoel\b|\bhaal ik\b.*\bdoel\b.*\b(?:slaap|slapen)\b/;
function sleepGoalAnswer(a: Asked): LocalReply | null {
  if (!(SLEEP_GOAL_EN.test(a.f) || SLEEP_GOAL_NL.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, today = a.env.healthDay, health = a.env.health!, calls = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}];
  const average = (a.env.averageGoals ?? []).find(g => g.status === 'active' && g.metric === 'sleep-hours');
  if (average) {
    const p = averageProgress(average, health, today), name = clean(average.name, 60), target = formatNumber(average.target, {maximumFractionDigits: 1});
    const head = say(lang, `${name} (${target} h a night on average, over ${average.windowDays} days)`, `${name} (gemiddeld ${target} uur per nacht, over ${average.windowDays} dagen)`);
    if (p.average === null) return answer(say(lang, `${head}: no night with a value in the window yet, so it is unknown (never 0).`, `${head}: nog geen nacht met een waarde in die periode, dus onbekend (nooit 0).`), calls);
    const avg = formatNumber(Math.round(p.average * 10) / 10, {maximumFractionDigits: 1}), share = Math.round((p.share ?? 0) * 100);
    return answer(say(lang, `${head}: your average is ${avg} h over ${count(p.days, 'en', ['night', 'nights'], ['', ''])}, so the goal is ${p.met ? 'met' : `not met yet (${share}% of it)`}. As Goals shows it, from your own nights.`,
      `${head}: je gemiddelde is ${avg} uur over ${count(p.days, 'nl', ['', ''], ['nacht', 'nachten'])}, dus het doel is ${p.met ? 'gehaald' : `nog niet gehaald (${share}% ervan)`}. Zoals Goals het toont, uit je eigen nachten.`), calls);
  }
  const sleep = healthGroupIn(health, 'sleep'), goal = sleep?.goal;
  if (!sleep || !goal) return answer(say(lang, 'You have no sleep goal yet: set one in Health → Sleep (or a goal that keeps an average of sleep under Goals), and I answer from it and your logged nights.',
    'Je hebt nog geen slaapdoel: stel er een in bij Health → Sleep (of een doel dat een gemiddelde slaap bijhoudt onder Goals), dan antwoord ik uit dat doel en je gelogde nachten.'), calls);
  const nights = dailySeries(sleep, today, 7).filter(n => n.asleep !== null), reached = nights.filter(n => n.asleep! >= goal.minutes).length;
  if (!nights.length) return answer(say(lang, `Your sleep goal is ${hm(goal.minutes)} a night. No night is logged in the last 7 days, so it is unknown (never 0).`, `Je slaapdoel is ${hm(goal.minutes)} per nacht. De afgelopen 7 dagen is geen nacht gelogd, dus onbekend (nooit 0).`), calls);
  const avg = Math.round(nights.reduce((t, n) => t + n.asleep!, 0) / nights.length);
  return answer(say(lang, `Your sleep goal is ${hm(goal.minutes)} a night. The last 7 days: ${reached} of ${count(nights.length, 'en', ['logged night', 'logged nights'], ['', ''])} reached it, ${hm(avg)} asleep on average.`,
    `Je slaapdoel is ${hm(goal.minutes)} per nacht. De afgelopen 7 dagen: ${reached} van ${count(nights.length, 'nl', ['', ''], ['gelogde nacht', 'gelogde nachten'])} haalden het, gemiddeld ${hm(avg)} geslapen.`), calls);
}

// ── FR-S-5: on time to bed ────────────────────────────────────────────────────────────────────────────────────────
const ON_TIME_EN = /\bhow (?:often|many (?:times|days|nights|evenings))\b.*\b(?:to bed|in bed|lights out|asleep)\b.*\bon time\b|\bhow (?:often|many (?:times|days|nights))\b.*\bon time\b.*\b(?:to bed|in bed)\b|\bhow (?:often|many (?:times|days|nights))\b.*\blights out\b/;
const ON_TIME_NL = /\b(?:hoe vaak|hoeveel (?:keer|dagen|avonden|nachten))\b.*\bop tijd\b.*\b(?:naar bed|in bed|slapen|gaan slapen)\b|\b(?:hoe vaak|hoeveel (?:keer|dagen|avonden|nachten))\b.*\b(?:naar bed|in bed)\b.*\bop tijd\b|\b(?:hoe vaak|hoeveel (?:keer|dagen|avonden))\b.*\blights out\b/;
const BED_HABIT = /\blights? out\b|\bbedtime\b|\b(?:to|in) bed\b|\bnaar bed\b|\bbedtijd\b|\bslapen om\b|\bsleep by\b/i;
function onTimeAnswer(a: Asked): LocalReply | null {
  if (!(ON_TIME_EN.test(a.f) || ON_TIME_NL.test(a.f))) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang, today = a.env.habitDay, calls = [{tool: 'habit_checkins', args: {}, label: 'Check-ins'}];
  const habit = a.env.habits.habits.find((h: Habit) => latestHabitRule(h).state === 'active' && BED_HABIT.test(h.title));
  if (!habit) return answer(say(lang, 'No habit keeps your bedtime yet (such as “Lights out by 23:00”), so going to bed on time is not recorded. Habits → New habit adds one; Health → Sleep shows when you went to bed each night.',
    'Nog geen gewoonte houdt je bedtijd bij (zoals “Lights out by 23:00”), dus op tijd naar bed staat nergens. Habits → New habit voegt er een toe; Health → Sleep toont wanneer je elke nacht naar bed ging.'), calls);
  const s = spanOf(a, today), done: string[] = [];
  let due = 0;
  for (let d = s.from; d <= s.to; d = addLocalDays(d, 1)) {
    const day = habitDay(habit, d, today);
    if (!day.scheduled || day.status === 'not-scheduled' || day.status === 'skipped' || day.status === 'planned-skip' || day.status === 'not-started' || day.status === 'future') continue;
    due++;
    if (day.status === 'complete') done.push(d);
  }
  const title = clean(habit.title, 60), days = list(done.map(d => dayIn(lang, d, today)), lang);
  return answer(say(lang, `${title}: done on ${done.length} of ${count(due, 'en', ['day', 'days'], ['', ''])} ${s.words}${done.length ? `: ${days}` : ''}. From your own check-ins.`,
    `${title}: gedaan op ${done.length} van ${count(due, 'nl', ['', ''], ['dag', 'dagen'])} ${s.words}${done.length ? `: ${days}` : ''}. Uit je eigen check-ins.`), calls);
}

// ── FR-MAX-12: what was finished ──────────────────────────────────────────────────────────────────────────────────
// "Which tasks did I complete …" keeps its own answer (the corpus's tasks-done-week); this is the plain "what did I finish".
const FINISHED_EN = /\bwhat (?:did|have) i (?:finish|finished|complete|completed|get done|got done)\b/;
const FINISHED_NL = /\bwat heb ik\b.*\b(?:afgerond|afgemaakt|gedaan gekregen|voltooid|afgewerkt)\b/;
const tasksCalls = [{tool: 'tasks', args: {}, label: 'Tasks'}];
/** "What did I finish this week" is the corpus's "which tasks did I complete this week" (tasks-done-week): asked in those words, so one answer says it. */
function finishedAnswer(a: Asked): LocalReply | null {
  if (!(FINISHED_EN.test(a.f) || FINISHED_NL.test(a.f)) || /\bhabits?\b|\bgewoontes?\b|\bgoals?\b|\bdoelen\b/.test(a.f)) return null;
  const period = /\b(?:last week|vorige week)\b/.test(a.f) ? ['last week', 'vorige week'] : /\b(?:today|vandaag)\b/.test(a.f) ? ['today', 'vandaag'] : /\b(?:this month|deze maand)\b/.test(a.f) ? ['this month', 'deze maand'] : /\b(?:yesterday|gisteren)\b/.test(a.f) ? ['yesterday', 'gisteren'] : ['this week', 'deze week'];
  const again = a.lang === 'nl' ? `welke taken heb ik ${period[1]} gedaan` : `which tasks did I complete ${period[0]}`;
  let r: LocalReply = {kind: 'none'};
  try { r = localAnswer(again, a.env); } catch { return null; }
  return r.kind === 'answer' || r.kind === 'refusal' ? r : null;
}

// ── FR-MAX-4: when a task (or an Agenda event) is ─────────────────────────────────────────────────────────────────
const WHEN_EN = /^(?:(?:so|and|ok|hey|nova|zigi)\s+)*(?:when|what time|what day)\b(?! did\b| was\b| were\b| have\b)/;
const WHEN_NL = /^(?:(?:en|dus|hoi|nova|zigi)\s+)*(?:wanneer|hoe laat|welke dag|op welke dag)\b(?! heb\b| had\b| was\b| deed\b| ben\b)/;
const STOP = new Set('when what time day is are the a an my do i have to need should must due by it its for on at this next scheduled planned deadline wanneer hoe laat welke dag op is de het een mijn moet ik ben staat gepland klaar af voor me mn tijd'.split(' '));
/** A few Dutch words for the English task titles people write ("Book the dentist" for "de tandarts"). */
const NL_EN: Record<string, string> = {tandarts: 'dentist', mailen: 'email', emailen: 'email', mail: 'email', mailtje: 'email', bellen: 'call', opbellen: 'call', huisarts: 'doctor', dokter: 'doctor', kapper: 'haircut', boodschappen: 'groceries', betalen: 'pay', verjaardag: 'birthday', afspraak: 'appointment', tuin: 'garden', schetsen: 'sketch', boeken: 'book', reserveren: 'book'};
const norm = (w: string) => { const x = NL_EN[w] ?? w; return x === 'mail' ? 'email' : x.length > 3 ? x.replace(/s$/, '') : x; };
const wordsOf = (text: string) => fold(text).replace(/\bexample\b|\bshowcase data\b/g, ' ').split(' ').filter(w => w.length >= 2).map(norm);
const near = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a)));
function taskWhenAnswer(a: Asked): LocalReply | null {
  if (!(WHEN_EN.test(a.f) || WHEN_NL.test(a.f))) return null;
  const asked_ = wordsOf(a.f).filter(w => !STOP.has(w) && !/^\d+$/.test(w));
  if (!asked_.length || asked_.length > 5) return null;
  const named = (title: string) => { const t = wordsOf(title); return asked_.every(q => t.some(w => near(w, q))); };
  const record = a.env.nova?.tasks, tasks = (record?.tasks ?? []).filter(t => t.state?.kind !== 'cancelled' && named(t.title));
  const events = (a.env.nova?.calendar?.calendars ?? []).flatMap(c => c.events).filter(e => named(e.title));
  if (!tasks.length && !events.length) return null;
  if (tasks.length && closed(a.env, 'today', 'tasks')) return closed(a.env, 'today', 'tasks');
  const lang = a.lang, today = a.env.habitDay;
  const open = tasks.filter(t => !isFinished(t)), shown = (open.length ? open : tasks).slice(0, 3);
  const lines = shown.map(t => taskLine(t, lang, today));
  const upcoming = events.filter(e => !e.rule && e.start.slice(0, 10) >= today).sort((x, y) => x.start.localeCompare(y.start)).slice(0, 2);
  for (const e of upcoming) { const day = e.start.slice(0, 10), clock = e.allDay || e.start.length <= 10 ? '' : e.start.slice(11, 16); lines.push(say(lang, `“${clean(e.title, 60)}” is in your Agenda on ${dayIn('en', day, today)}${clock ? ` at ${clockIn('en', clock)}` : ''}.`, `“${clean(e.title, 60)}” staat in je agenda op ${dayIn('nl', day, today)}${clock ? ` om ${clock}` : ''}.`)); }
  for (const e of events.filter(x => x.rule).slice(0, 1)) lines.push(say(lang, `“${clean(e.title, 60)}” repeats in your Agenda; its days are on the Agenda page.`, `“${clean(e.title, 60)}” herhaalt zich in je agenda; de dagen staan op de Agenda-pagina.`));
  if (!lines.length) return null;
  return answer(lines.join('\n'), [...(tasks.length ? tasksCalls : []), ...(events.length ? [{tool: 'agenda', args: {}, label: 'Agenda'}] : [])]);
}
function taskLine(t: Task, lang: Lang, today: string): string {
  const title = `“${clean(t.title, 60)}”`, time = t.time ? say(lang, ` at ${clockIn('en', t.time)}`, ` om ${t.time}`) : '';
  const deadline = t.deadline ? say(lang, `; its deadline is ${dayIn('en', t.deadline, today)}`, `; de deadline is ${dayIn('nl', t.deadline, today)}`) : '';
  if (isFinished(t)) return say(lang, `${title} is done (${dayIn('en', t.doneAt!.slice(0, 10), today)}).`, `${title} is af (${dayIn('nl', t.doneAt!.slice(0, 10), today)}).`);
  if (!t.due) return say(lang, `${title} has no day in Tasks yet${deadline}.`, `${title} heeft nog geen dag in Tasks${deadline}.`);
  return t.due < today ? say(lang, `${title} was due ${dayIn('en', t.due, today)}${time}${deadline}; it is still open.`, `${title} stond gepland op ${dayIn('nl', t.due, today)}${time}${deadline}; hij staat nog open.`)
    : say(lang, `${title} is due ${t.due === today ? `today (${dayIn('en', t.due, today)})` : dayIn('en', t.due, today)}${time}${deadline}.`, `${title} staat gepland ${t.due === today ? `voor vandaag (${dayIn('nl', t.due, today)})` : `op ${dayIn('nl', t.due, today)}`}${time}${deadline}.`);
}
