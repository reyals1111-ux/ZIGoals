import {billsThisMonth, dueBeforePayday, nextPayday} from '../../bills/month';
import {monthlyEstimate, yearlyEstimate} from '../../bills/store';
import {monthKey, monthView, shiftMonth} from '../../budgets/engine';
import {budgetPace} from '../../budgets/pace';
import {monthRecap} from '../../budgets/recap';
import {watchRows} from '../../budgets/watch';
import {emptyCountdownExtras, shownDate} from '../../countdowns/extras';
import {daysUntil, type Countdown} from '../../countdowns/schema';
import {addLocalDays} from '../../local-date';
import {moneyAttention} from '../../money-attention';
import {incomeFlow} from '../../money-insights/income-flow';
import {vsLastMonth} from '../../money-insights/month-compare';
import {cents} from '../../money-log/engine';
import type {MoneyEntry} from '../../money-log/schema';
import {searchEntries} from '../../money-log/search';
import {summarizeSelection} from '../../money-log/selection';
import {budgetsCard} from '../../nova/cards/budgets';
import {planSuggestions} from '../../tasks/plan-day';
import {REMINDER_CHOICES, reminderInstants} from '../../tasks/reminders';
import {wallClock} from '../../zone-time';
import {DEBT_MODEL, DEBT_PLANNER_WHERE, DEBT_PLANNER_WHERE_NL, debtMoney, debtView} from '../tools/f9-debt';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {avLifeAnswer} from './av-life';
import {answer, asked, clockIn, closed, count, dayIn, isQuestion, list, MIXED, money, monthIn, say, titleWords, typedWords, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {exactQuery} from './exact';
import {fold} from './exact/text';

/**
 * Session AV (owner follow-up 2, item 1c; the fresh reviewers' check 5 in docs/review/session-av/quality/q1.md–q4.md):
 * the on-device answers to the questions the AV features raise, which NOVA and ZIGi answered with something else or with
 * the examples list. Each reads the feature's own pure function (the same figures the page shows), in English and Dutch,
 * under the switch of its part of life, and is asked before the exact layer (lib/ai/local-answers/engine.ts): every
 * pattern reads the whole question, so nothing else is claimed. This file: Today (task reminders, the weekly review's
 * intention, countdowns, planning the day) and Wealth (bills a year, paid this month, payday, budget targets and pace,
 * spending against last month, where income went, the debt schedule, what asks for a look, a payee's total, watched
 * categories, price alerts, last month in short). av-life.ts: Health, the Journal and Habits.
 */
export function avAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f)) return null;
    for (const one of [taskReminders, weeklyIntention, payday, countdowns, billsYear, billsPaid, budgetTargets, nearLimit, spendingVsLast, incomeWent, debtSchedule, moneyLook, payeeTotal, watched, priceAlerts, monthInShort]) {
      const r = one(a);
      if (r) return r;
    }
    return avLifeAnswer(a);
  } catch { return null; }
}

// ── Today ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const REMIND_EN = /\btask reminders?\b|\breminders?\b.*\btasks?\b|\btasks?\b.*\breminders?\b/;
const REMIND_NL = /\btaakherinnering(?:en)?\b|\bherinnering(?:en)?\b.*\b(?:taak|taken)\b|\b(?:taak|taken)\b.*\bherinnering(?:en)?\b/;
const BEFORE_NL: Record<number, string> = {0: 'op het moment zelf', 60: '1 uur van tevoren', 120: '2 uur van tevoren', 1440: '1 dag van tevoren', 2880: '2 dagen van tevoren', 10_080: '1 week van tevoren'};
const beforeWords = (before: number, lang: Lang) => lang === 'nl' ? BEFORE_NL[before] ?? `${before} minuten van tevoren` : (REMINDER_CHOICES.find(c => c.before === before)?.label ?? `${before} minutes before`).toLowerCase();
/** q1 #1: "which task reminders do I have", "when is my next task reminder": the reminders still ahead, soonest first. */
function taskReminders(a: Asked): LocalReply | null {
  if (!(REMIND_EN.test(a.f) || REMIND_NL.test(a.f)) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const record = a.env.nova?.tasks, calls = [{tool: 'tasks', args: {}, label: 'Tasks'}], lang = a.lang;
  if (record === undefined) return null;
  if (!record) return answer(say(lang, 'Your tasks can’t be read on this device right now, so I can’t say.', 'Je taken kunnen nu niet gelezen worden op dit apparaat, dus dat kan ik niet zeggen.'), calls);
  const zone = a.env.habitZone || 'UTC', all = reminderInstants(record, zone), ahead = all.filter(r => r.at > a.env.now.getTime());
  if (!all.length) return answer(say(lang, 'No open task has a reminder yet. In Tasks, open a task with a day and choose a Reminder (at the time, or a while before).', 'Nog geen open taak heeft een herinnering. Open in Tasks een taak met een dag en kies een Reminder (op het moment zelf, of wat eerder).'), calls);
  if (!ahead.length) return answer(say(lang, `No task reminder is still ahead (${count(all.length, 'en', ['reminder has', 'reminders have'], ['', ''])} already gone off).`, `Er staat geen taakherinnering meer te gaan (${count(all.length, 'nl', ['', ''], ['herinnering is', 'herinneringen zijn'])} al afgegaan).`), calls);
  const when = (at: number) => { const w = wallClock(at, zone); return lang === 'nl' ? `${w.date === a.today ? 'vandaag' : dayIn('nl', w.date, a.today)} om ${clockIn('nl', w.clock)}` : `${w.date === a.today ? 'today' : dayIn('en', w.date, a.today)} at ${clockIn('en', w.clock)}`; };
  const line = (r: (typeof ahead)[number]) => `${clean(r.task.title, 80)}: ${when(r.at)} (${beforeWords(r.before, lang)})`;
  const head = say(lang, `${count(ahead.length, 'en', ['task reminder', 'task reminders'], ['', ''])} still ahead. The next: ${line(ahead[0]!)}.`, `${count(ahead.length, 'nl', ['', ''], ['taakherinnering', 'taakherinneringen'])} nog te gaan. De volgende: ${line(ahead[0]!)}.`);
  return answer([head, ...ahead.slice(1, 6).map(r => `• ${line(r)}`)].join('\n'), calls);
}

/** q1 #12: "what was my intention for this week": the intention of the last weekly review that kept one. */
function weeklyIntention(a: Asked): LocalReply | null {
  const en = /\bintentions?\b/.test(a.f) && /\bweek(?:ly)?\b|\breview\b/.test(a.f), nl = /\b(?:voornemen|voornemens|intentie)\b/.test(a.f) && /\bweek\b|\bweekreview\b|\bweekoverzicht\b|\bterugblik\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'today', 'weekly_review'); if (shut) return shut;
  const calls = [{tool: 'weekly_review', args: {}, label: 'Weekly review'}], lang = a.lang;
  const kept = [...(a.env.weekly?.reviews ?? [])].filter(r => r.completedAt && r.notes?.intention?.trim()).sort((x, y) => y.weekStart.localeCompare(x.weekStart))[0];
  if (!kept) return answer(say(lang, 'No weekly review with an intention is kept yet: the weekly review asks for one as its last step.', 'Er is nog geen weekreview met een voornemen: de weekreview vraagt er als laatste stap om.'), calls);
  const day = dayIn(lang, kept.completedAt!.slice(0, 10), a.today), words = clean(kept.notes!.intention!, 200);
  return answer(say(lang, `Your intention from the weekly review you finished on ${day}: “${words}”.`, `Je voornemen uit de weekreview die je op ${day} afrondde: “${words}”.`), calls);
}

const UNTIL_EN = /\b(?:how many (?:more )?days (?:is it |are there |left )?(?:until|till|til|to|before)|how long (?:is it |left )?(?:until|till|til|before)|days (?:left )?(?:until|till|to)|when is)\s+(.+)$/;
const UNTIL_NL = /\b(?:hoeveel dagen (?:is het |zijn het )?(?:nog )?(?:tot|voor)|hoe lang (?:is het |duurt het )?(?:nog )?(?:tot|voor)|wanneer is)\s+(.+)$/;
const EVENT = /\b(?:birthday|bday|anniversary|wedding|holiday|holidays|vacation|trip|christmas|xmas|party|concert|exam|verjaardag|jarig|jubileum|bruiloft|vakantie|reis|kerst|feest|examen)\b/;
const SAME: Record<string, string> = {mama: 'mum', mam: 'mum', moeder: 'mum', mom: 'mum', mother: 'mum', papa: 'dad', vader: 'dad', father: 'dad', verjaardag: 'birthday', jarig: 'birthday', bday: 'birthday', reis: 'trip', vakantie: 'holiday', vacation: 'holiday', bruiloft: 'wedding', lissabon: 'lisbon', kerst: 'christmas', xma: 'christmas', feest: 'party'};
const STOP = new Set(['my', 'mijn', 'mn', 'the', 'de', 'het', 'een', 'a', 'an', 'of', 'van', 'to', 'tot', 'is', 'it', 'nog', 'next', 'volgende', 'our', 'ons', 'onze', 'days', 'dagen']);
const canon = (w: string) => SAME[w] ?? w;
/** q1 #44: "how many days until mum's birthday", "which countdowns do I have": Today's "Days until", yearly ones on their next day. */
function countdowns(a: Asked): LocalReply | null {
  const listAsk = /\b(?:which|what|show|list|my)\b.*\bcountdowns?\b|\bdays until list\b/.test(a.f) || /\b(?:welke|wat|toon|mijn)\b.*\b(?:aftellers?|countdowns?)\b/.test(a.f);
  const until = UNTIL_EN.exec(a.f) ?? UNTIL_NL.exec(a.f);
  if (!listAsk && !until) return null;
  const record = a.env.nova?.countdowns, extras = a.env.nova?.countdownExtras ?? emptyCountdownExtras(), lang = a.lang;
  const items = (record?.items ?? []).map(c => ({c, shown: shownDate(c, extras, a.today)}));
  const words = until ? until[1]!.split(' ').map(w => canon(w.replace(/(?<=\w{2})s$/, ''))).filter(w => w.length >= 2 && !STOP.has(w)) : [];
  const hits = until ? items.filter(i => { const t = titleWords(i.c.title).map(canon); return words.length > 0 && words.every(w => t.includes(w)); }) : items;
  // "When is my next bill", "how many days until payday": not a countdown; those have their own answers.
  if (until && !listAsk && !hits.length && !EVENT.test(until[1]!)) return null;
  const shut = closed(a.env, 'today', 'agenda'); if (shut) return shut;
  const line = ({c, shown}: {c: Countdown; shown: string}) => {
    const n = daysUntil(shown, a.today), e = extras.items[c.id], when = lang === 'nl' ? (n === 0 ? 'vandaag' : n === 1 ? 'morgen' : n > 1 ? `over ${n} dagen` : `${-n} dagen geleden`) : countdownDay(shown, a.today);
    const more = [e?.yearly ? say(lang, 'every year', 'elk jaar') : '', e?.remindDays ? say(lang, `a reminder ${e.remindDays === 7 ? 'a week' : e.remindDays === 1 ? 'a day' : `${e.remindDays} days`} before`, `een herinnering ${e.remindDays === 7 ? 'een week' : e.remindDays === 1 ? 'een dag' : `${e.remindDays} dagen`} van tevoren`) : ''].filter(Boolean);
    return `${clean(c.title, 80)}: ${when}, ${say(lang, 'on', 'op')} ${dayIn(lang, shown, a.today)}${more.length ? ` (${more.join('; ')})` : ''}`;
  };
  if (!hits.length) return answer(until && !listAsk
    ? say(lang, `No countdown for “${clean(typedWords(a.raw, until[1]!) ?? until[1]!, 60)}” is kept. Today → Days until adds one (with “Every year” for a birthday).`, `Er staat geen countdown voor “${clean(typedWords(a.raw, until[1]!) ?? until[1]!, 60)}”. Today → Days until voegt er een toe (met “Every year” voor een verjaardag).`)
    : say(lang, 'No countdown is kept yet. Today → Days until adds one.', 'Er staat nog geen countdown. Today → Days until voegt er een toe.'));
  const sorted = [...hits].sort((x, y) => x.shown.localeCompare(y.shown));
  if (until && !listAsk && sorted.length === 1) return answer(`${line(sorted[0]!)}.`);
  return answer([say(lang, `${count(sorted.length, 'en', ['countdown', 'countdowns'], ['', ''])}:`, `${count(sorted.length, 'nl', ['', ''], ['countdown', 'countdowns'])}:`), ...sorted.slice(0, 8).map(i => `• ${line(i)}`)].join('\n'));
}
const countdownDay = (date: string, today: string) => { const n = daysUntil(date, today); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n > 1 ? `in ${n} days` : `${-n} days ago`; };

const PLAN_NL = /^(?:(?:help me|kun je|wil je|graag)\s+)?(?:plan|planning (?:voor|van))\s+(?:mijn|m n|de|het)?\s*(?:dag|vandaag)\b|^maak (?:een )?(?:planning|plan) (?:voor|van) (?:mijn dag|vandaag|de dag)\b|^wat (?:moet|zal) ik vandaag (?:eerst )?doen\b/;
/**
 * q1 #38: "plan my day" / "plan mijn dag" with no model: the open tasks worth a look today (overdue, a deadline within
 * three days, priority 1 or 2 with no day; lib/tasks/plan-day.ts, as Today's "Plan my day" shows them), each with why.
 * With a model connected the question is the model's: this is asked from the no-model path only.
 */
export function planDayLines(env: ToolEnv, lang: Lang): string[] | null {
  const record = env.nova?.tasks;
  if (!record || env.areas.today === false || (env.todayTools && !env.todayTools.has('tasks'))) return null;
  const today = env.habitDay, picks = planSuggestions(record, today);
  if (!picks.length) return [say(lang, 'No open task asks to be planned in today (nothing overdue, no deadline within three days, no top-priority task without a day).', 'Geen open taak vraagt om vandaag ingepland te worden (niets te laat, geen deadline binnen drie dagen, geen taak met hoge prioriteit zonder dag).')];
  const why = (p: (typeof picks)[number]) => lang === 'en' ? p.words : p.why === 'overdue' ? `stond gepland voor ${dayIn('nl', p.task.due!, today)}` : p.why === 'priority' ? `prioriteit ${p.words.match(/\d/)?.[0] ?? ''}, nog geen dag` : p.words.startsWith('Deadline passed') ? `deadline verstreken op ${dayIn('nl', p.task.deadline!, today)}` : p.words === 'Deadline today' ? 'deadline vandaag' : `deadline ${dayIn('nl', p.task.deadline!, today)}`;
  return [say(lang, 'Worth a look when you plan today (Today → Plan my day):', 'Het bekijken waard als je vandaag plant (Today → Plan my day):'), ...picks.map(p => `• ${clean(p.task.title, 80)} — ${why(p)}`)];
}
export function planDayDutch(question: string, env: ToolEnv): LocalReply | null {
  const a = asked(question, env);
  if (!a || !PLAN_NL.test(a.f)) return null;
  const shut = closed(env, 'today'); if (shut) return shut;
  const lines = planDayLines(env, 'nl');
  if (!lines) return null;
  const today = (env.nova?.tasks?.tasks ?? []).filter(t => !t.doneAt && !t.parentId && t.due === a.today).length;
  return answer([`Er samen een plan van maken vraagt je eigen AI; zonder AI maak ik er geen plan of taak van. Gepland voor vandaag: ${count(today, 'nl', ['', ''], ['taak', 'taken'])}.`, ...lines].join('\n'), [{tool: 'tasks', args: {}, label: 'Tasks'}]);
}

// ── Wealth ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
/** The currency most of a set of entries is in (never added across currencies). */
function leading(entries: readonly MoneyEntry[], kind?: MoneyEntry['kind']): string | null {
  const by = new Map<string, number>();
  for (const e of entries) if (!kind || e.kind === kind) by.set(e.currency, (by.get(e.currency) ?? 0) + cents(e.amount));
  return [...by].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
}
const plainTitle = (title: string) => clean(title.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?.*$/i, '').trim() || title, 60);
const NO_BILLS = ['No bill reminders yet.', 'Nog geen rekeningen als herinnering.'] as const;

/** q1 F-YEAR: "how much are my bills a year": the yearly estimate the Bills page shows, per currency. */
function billsYear(a: Asked): LocalReply | null {
  const en = /\bbills?\b|\bsubscriptions?\b/.test(a.f) && /\b(?:a|per|each|every|in a|over a|for a|for the) year\b|\byearly\b|\bannual(?:ly)?\b|\bper annum\b/.test(a.f) && /\bhow much\b|\bcosts?\b|\btotal\b|\bcome to\b|\bspend\b|\bpay\b/.test(a.f);
  const nl = /\b(?:rekening(?:en)?|vaste lasten|abonnementen)\b/.test(a.f) && /\bper jaar\b|\bjaarlijks\b|\bin een jaar\b|\bop jaarbasis\b|\bper jaar\b/.test(a.f) && /\bhoeveel\b|\bkost(?:en)?\b|\btotaal\b|\bbetaal\b|\bwat\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.ak?.bills, calls = [{tool: 'bills', args: {}, label: 'Bills'}], lang = a.lang;
  if (!record?.bills.length) return answer(NO_BILLS[lang === 'nl' ? 1 : 0], calls);
  const year = list(yearlyEstimate(record).map(t => money(t.cents, t.currency)), lang), month = list(monthlyEstimate(record).map(t => money(t.cents, t.currency)), lang);
  return answer(say(lang, `Your bills come to about ${year} a year (an estimate from each bill’s own cadence: weekly ×52, monthly ×12, every 3 months ×4, yearly ×1; never converted); about ${month} in a typical month.`,
    `Je rekeningen komen op ongeveer ${year} per jaar (een schatting uit het ritme van elke rekening: wekelijks ×52, maandelijks ×12, elke 3 maanden ×4, jaarlijks ×1; nooit omgerekend); ongeveer ${month} in een gewone maand.`), calls);
}

/** q2 #42: "which bills have I paid this month": this month's bill dates, seen in the money log or not (ZIGoals pays nothing). */
function billsPaid(a: Asked): LocalReply | null {
  const en = /\bbills?\b/.test(a.f) && /\bpaid\b|\b(?:left|still) to pay\b|\bstill (?:due|open|left)\b|\bleft this month\b/.test(a.f);
  const nl = /\brekening(?:en)?\b/.test(a.f) && /\bbetaald\b|\bnog (?:te )?betalen\b|\bnog open\b|\bnog over\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.ak?.bills, calls = [{tool: 'bills', args: {}, label: 'Bills'}], lang = a.lang;
  if (!record?.bills.length) return answer(NO_BILLS[lang === 'nl' ? 1 : 0], calls);
  const {lines} = billsThisMonth(record, entriesOf(a.env), a.today), month = monthIn(lang, a.today.slice(0, 7));
  if (!lines.length) return answer(say(lang, `No bill falls due in ${month}.`, `In ${month} valt geen rekening.`), calls);
  const item = (l: (typeof lines)[number]) => `${plainTitle(l.title)} ${money(l.cents, l.currency)} (${dayIn(lang, l.due, a.today)})`;
  const seen = lines.filter(l => l.state === 'seen'), passed = lines.filter(l => l.state === 'passed'), coming = lines.filter(l => l.state === 'coming');
  const parts = lang === 'nl'
    ? [`${seen.length} gezien in je geldlog${seen.length ? `: ${list(seen.map(item), 'nl')}` : ''}`, ...(passed.length ? [`${passed.length} voorbij zonder passende uitgave in je log: ${list(passed.map(item), 'nl')}`] : []), ...(coming.length ? [`${coming.length} nog te komen: ${list(coming.map(item), 'nl')}`] : [])]
    : [`${seen.length} seen in your money log${seen.length ? `: ${list(seen.map(item), 'en')}` : ''}`, ...(passed.length ? [`${passed.length} passed with no matching entry in your log: ${list(passed.map(item), 'en')}`] : []), ...(coming.length ? [`${coming.length} still to come: ${list(coming.map(item), 'en')}`] : [])];
  return answer(say(lang, `Bills in ${month}: ${parts.join('; ')}. ZIGoals pays nothing: “seen” means your money log has a matching expense.`, `Rekeningen in ${month}: ${parts.join('; ')}. ZIGoals betaalt niets: “gezien” betekent dat je geldlog een passende uitgave heeft.`), calls);
}

/** q2 #42: "how much is due before payday": the next payday as the money log's regular income shows it, and the bills before it. */
function payday(a: Asked): LocalReply | null {
  const en = /\bpay ?day\b|\bnext (?:salary|pay ?check|paycheque|wage|pay)\b|\bbefore (?:i get paid|my (?:salary|pay))\b|\buntil (?:i get paid|my salary)\b/.test(a.f);
  const nl = /\bsalarisdag\b|\bloondag\b|\bvolgende (?:salaris|loon|uitbetaling)\b|\bvoor (?:mijn |m n |het )?salaris\b|\btot (?:mijn |het )?salaris\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = [{tool: 'bills', args: {}, label: 'Bills'}], lang = a.lang, pay = nextPayday(entriesOf(a.env), a.today);
  if (!pay) return answer(say(lang, 'Your money log shows no regular monthly income yet (two entries from one source about a month apart), so there is no payday to count to.', 'Je geldlog toont nog geen vast maandinkomen (twee keer van dezelfde bron, ongeveer een maand uit elkaar), dus er is geen salarisdag om naartoe te tellen.'), calls);
  const record = a.env.ak?.bills, due = record?.bills.length ? dueBeforePayday(record, entriesOf(a.env), a.today, pay.date) : [], days = daysUntil(pay.date, a.today);
  const head = say(lang, `Your next payday, as your money log shows it: ${dayIn('en', pay.date, a.today)} (${clean(pay.source, 60)}, in ${days} ${days === 1 ? 'day' : 'days'}).`, `Je volgende salarisdag, zoals je geldlog hem toont: ${dayIn('nl', pay.date, a.today)} (${clean(pay.source, 60)}, over ${days} ${days === 1 ? 'dag' : 'dagen'}).`);
  const before = due.length ? say(lang, `Before it: ${list(due.map(d => `${money(d.cents, d.currency)} in ${count(d.count, 'en', ['bill', 'bills'], ['', ''])}`), 'en')} not yet seen in your log.`, `Daarvoor: ${list(due.map(d => `${money(d.cents, d.currency)} in ${count(d.count, 'nl', ['', ''], ['rekening', 'rekeningen'])}`), 'nl')} nog niet gezien in je log.`)
    : say(lang, 'No bill falls due before it.', 'Daarvoor valt geen rekening.');
  return answer(`${head} ${before}`, calls);
}

const categoriesIn = (a: Asked) => (a.env.nova?.budgets?.budgets ?? []).filter(b => new RegExp(`\\b${fold(b.category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(a.f));
/** q2 #9: "am I on track for my groceries target", "wat zijn mijn budgetdoelen": the budgets' targets as the Budgets row says them. */
function budgetTargets(a: Asked): LocalReply | null {
  const named = categoriesIn(a);
  const en = /\bbudget targets?\b|\btargets? (?:of|for|on) (?:my )?budgets?\b/.test(a.f) || (named.length > 0 && /\btargets?\b/.test(a.f));
  const nl = /\bbudgetdoel(?:en)?\b|\bdoel(?:en)? (?:van|voor|bij) (?:mijn |m n )?budget(?:ten)?\b/.test(a.f) || (named.length > 0 && /\bdoel\b/.test(a.f));
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, calls = [{tool: 'budgets', args: {}, label: 'Budgets'}], lang = a.lang;
  if (!record?.budgets.length) return answer(say(lang, 'No budget is set yet, so there is no target. Wealth → Budgets sets them.', 'Er is nog geen budget, dus ook geen doel. Wealth → Budgets stelt ze in.'), calls);
  const lines = budgetsCard(record, entriesOf(a.env), a.today, m => monthIn('nl', m)).lines, ids = new Set(named.map(b => b.id)), pick = ids.size ? lines.filter(l => ids.has(l.id)) : lines;
  const withTarget = pick.filter(l => l.target), without = pick.filter(l => !l.target).map(l => l.category);
  if (!withTarget.length) return answer(say(lang, `${list(without, 'en')} ${without.length === 1 ? 'has' : 'have'} no target. A target is set on a budget in Wealth → Budgets.`, `${list(without, 'nl')} ${without.length === 1 ? 'heeft' : 'hebben'} geen doel. Een doel stel je in op een budget in Wealth → Budgets.`), calls);
  const rows = withTarget.map(l => `${l.category}: ${l.target![lang]}`);
  const rest = without.length && !ids.size ? say(lang, ` ${list(without, 'en')} ${without.length === 1 ? 'has' : 'have'} no target.`, ` ${list(without, 'nl')} ${without.length === 1 ? 'heeft' : 'hebben'} geen doel.`) : '';
  return answer(rows.length === 1 ? `${rows[0]}.${rest}` : [say(lang, 'Your budget targets:', 'Je budgetdoelen:'), ...rows.map(r => `• ${r}`)].join('\n') + rest, calls);
}

/** q2 #37: "which budget is near its limit": from 80 % spent, and faster than the month (lib/budgets/pace.ts). */
function nearLimit(a: Asked): LocalReply | null {
  const en = /\b(?:near|close to|nearly at|almost at|almost (?:over|used up))\b.*\b(?:limit|budget)\b|\bbudgets?\b.*\b(?:near|close to|almost)\b.*\blimit\b|\brunning (?:out|low)\b.*\bbudget/.test(a.f);
  const nl = /\bbijna (?:aan|op|over) (?:de |het |zijn |haar )?(?:limiet|grens|budget)\b|\bbudget\w*\b.*\bbijna\b|\bdicht bij (?:de |het |zijn )?(?:limiet|grens)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, calls = [{tool: 'budgets', args: {}, label: 'Budgets'}], lang = a.lang;
  if (!record?.budgets.length) return answer(say(lang, 'No budget is set yet. Wealth → Budgets sets them.', 'Je hebt nog geen budgetten. Wealth → Budgets stelt ze in.'), calls);
  const month = monthKey(a.today), rows = monthView(entriesOf(a.env), record, month, a.today).rows.map(r => ({r, p: budgetPace(r, month, a.today)}));
  const pct = (n: number) => `${Math.round(n * 100)}%`, of = (x: (typeof rows)[number]) => `${x.r.category} ${pct(x.p?.spentShare ?? x.r.spent / Math.max(1, x.r.available))}`;
  const over = rows.filter(x => x.r.over), near = rows.filter(x => x.p?.state === 'near'), fast = rows.filter(x => x.p?.state === 'fast'), gone = rows.find(x => x.p)?.p?.monthShare;
  const parts: string[] = [];
  if (over.length) parts.push(say(lang, `Over: ${list(over.map(x => x.r.category), 'en')}.`, `Over het budget: ${list(over.map(x => x.r.category), 'nl')}.`));
  if (near.length) parts.push(say(lang, `Near the limit (80% or more spent): ${list(near.map(of), 'en')}.`, `Bijna aan de limiet (80% of meer uitgegeven): ${list(near.map(of), 'nl')}.`));
  const fullest = !near.length && !over.length ? [...rows].sort((x, y) => (y.r.spent / Math.max(1, y.r.available)) - (x.r.spent / Math.max(1, x.r.available)))[0]! : null, others = fast.filter(x => x !== fullest);
  if (others.length) parts.push(say(lang, `Faster than the month${gone !== undefined ? ` (${pct(gone)} of it gone)` : ''}: ${list(others.map(of), 'en')}.`, `Sneller dan de maand${gone !== undefined ? ` (${pct(gone)} ervan voorbij)` : ''}: ${list(others.map(of), 'nl')}.`));
  if (fullest) {
    const quick = fast.includes(fullest) ? say(lang, ': faster than the month', ': sneller dan de maand') : '';
    parts.unshift(say(lang, `No budget is near its limit (80%) this month. The fullest: ${of(fullest)} spent${gone !== undefined ? `, with ${pct(gone)} of the month gone` : ''}${quick}.`, `Geen budget zit deze maand bijna aan de limiet (80%). Het volste: ${of(fullest)} uitgegeven${gone !== undefined ? `, met ${pct(gone)} van de maand voorbij` : ''}${quick}.`));
  }
  return answer(parts.join(' '), calls);
}

/** q2 #7: "how does my spending compare to last month": this month so far against last month by the same day. */
function spendingVsLast(a: Asked): LocalReply | null {
  const en = /\bspen(?:ding|t|d)\b|\bexpenses\b/.test(a.f) && /\blast month\b/.test(a.f) && /\bcompare[sd]?\b|\bcomparison\b|\bvs\b|\bversus\b|\bagainst\b|\bstack up\b|\bdiffer/.test(a.f) && !/\bthis month\b/.test(a.f);
  const nl = /\buitgaven\b|\buitgegeven\b|\buitgeven\b/.test(a.f) && /\bvorige maand\b/.test(a.f) && /\bverhouden\b|\bvergeleken\b|\bvergelijk\w*\b|\btegenover\b|\bten opzichte\b|\bverschil\b/.test(a.f) && !/\bdeze maand\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a) || categoriesIn(a).length) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = [{tool: 'spending', args: {}, label: 'Spending'}], lang = a.lang, entries = entriesOf(a.env), month = monthKey(a.today), prev = shiftMonth(month, -1);
  const cur = leading(entries.filter(e => e.kind === 'expense' && (e.date.startsWith(month) || e.date.startsWith(prev))), 'expense');
  if (!cur) return answer(say(lang, 'No spending logged this month or last, so there is nothing to compare.', 'Geen uitgaven gelogd deze maand of vorige maand, dus er is niets te vergelijken.'), calls);
  const v = vsLastMonth(entries, cur, a.today), now = money(v.totals.thisMonth, cur), upTo = dayIn(lang, a.today, a.today);
  if (!v.previousRecorded) return answer(say(lang, `${now} spent this month so far (to ${upTo}). Last month has no entry in ${cur}, so there is nothing to set beside it (unknown, not zero).`, `${now} uitgegeven deze maand tot nu toe (t/m ${upTo}). Vorige maand heeft geen invoer in ${cur}, dus er staat niets naast (onbekend, niet nul).`), calls);
  const same = v.totals.lastBySameDay!, diff = v.totals.thisMonth - same, cutDay = `${prev}-${String(v.cut).padStart(2, '0')}`;
  const top = v.rows.filter(r => r.thisMonth > 0).slice(0, 3).map(r => `${r.category} ${money(r.thisMonth, cur)} (${say(lang, 'then', 'toen')} ${money(r.lastBySameDay ?? 0, cur)})`);
  return answer(say(lang,
    `This month so far (to ${upTo}) you spent ${now}; last month by the same day (to ${dayIn('en', cutDay, a.today)}) ${money(same, cur)}${diff === 0 ? ', the same' : `, ${money(Math.abs(diff), cur)} ${diff > 0 ? 'more' : 'less'}`}. All of last month: ${money(v.totals.lastMonth!, cur)}.${top.length ? ` Most this month: ${list(top, 'en')}.` : ''} In ${cur}, never converted.`,
    `Deze maand tot nu toe (t/m ${upTo}) gaf je ${now} uit; vorige maand op dezelfde dag (t/m ${dayIn('nl', cutDay, a.today)}) ${money(same, cur)}${diff === 0 ? ', gelijk' : `, ${money(Math.abs(diff), cur)} ${diff > 0 ? 'meer' : 'minder'}`}. Heel vorige maand: ${money(v.totals.lastMonth!, cur)}.${top.length ? ` Het meest deze maand: ${list(top, 'nl')}.` : ''} In ${cur}, nooit omgerekend.`), calls);
}

/** q2 #14: "where did my income go this month": the month's income and where it went (lib/money-insights/income-flow.ts). */
function incomeWent(a: Asked): LocalReply | null {
  const en = /\bwhere (?:did|does|has|is) (?:all )?(?:my |the )?(?:income|salary|pay|earnings|money i (?:earned|made))\b.*\bgo(?:ne|ing)?\b|\bincome flow\b|\bwhat did i do with my (?:income|salary)\b/.test(a.f);
  const nl = /\bwaar (?:is|ging|gaat|bleef|blijft) (?:mijn |m n |het )?(?:inkomen|salaris|loon|inkomsten)\b|\b(?:inkomen|inkomsten|salaris)\b.*\b(?:heen|naartoe|gebleven)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = [{tool: 'spending', args: {}, label: 'Spending'}], lang = a.lang, entries = entriesOf(a.env);
  const month = /\blast month\b|\bvorige maand\b/.test(a.f) ? shiftMonth(monthKey(a.today), -1) : monthKey(a.today), name = monthIn(lang, month);
  const cur = leading(entries.filter(e => e.kind === 'income' && e.date.startsWith(month)), 'income');
  if (!cur) return answer(say(lang, `No income is logged in ${name}, so there is nothing to follow.`, `Er staat geen inkomen gelogd in ${name}, dus er is niets te volgen.`), calls);
  const flow = incomeFlow(entries, cur, month, 4), cats = flow.parts.filter(p => p.kind === 'category').map(p => `${p.label === 'Other categories' ? say(lang, 'other categories', 'andere categorieën') : p.label} ${money(p.cents, cur)}`);
  const left = flow.parts.find(p => p.kind === 'left'), beyond = flow.spent - flow.income;
  const rest = left ? say(lang, `${money(left.cents, cur)} is left (income minus the spending recorded, not a savings figure)`, `${money(left.cents, cur)} blijft over (inkomen min de gelogde uitgaven, geen spaarbedrag)`)
    : beyond > 0 ? say(lang, `spending went ${money(beyond, cur)} beyond it`, `de uitgaven gingen er ${money(beyond, cur)} overheen`) : say(lang, 'nothing is left', 'er blijft niets over');
  return answer(say(lang, `${money(flow.income, cur)} came in in ${name}; ${money(flow.spent, cur)} of it went to spending${cats.length ? `: ${list(cats, 'en')}` : ''}; ${rest}. In ${cur}, never converted.`,
    `${money(flow.income, cur)} kwam binnen in ${name}; ${money(flow.spent, cur)} ging naar uitgaven${cats.length ? `: ${list(cats, 'nl')}` : ''}; ${rest}. In ${cur}, nooit omgerekend.`), calls);
}

const plusMonths = (month: string, n: number) => { const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1 + n; return `${y + Math.floor(m / 12)}-${String(((m % 12) + 12) % 12 + 1).padStart(2, '0')}`; };
/** q2 #16: "show my debt payoff schedule": each debt's payoff month in the planner's order, and what is still owed after 3, 6 and 12 months. */
function debtSchedule(a: Asked): LocalReply | null {
  const en = /\b(?:payoff|pay off|repayment|paying off)\b.*\b(?:schedule|timeline|order)\b|\bdebts?\b.*\bschedule\b|\bschedule\b.*\bdebts?\b|\bwhen (?:is|will) (?:each|every) (?:debt|loan)\b/.test(a.f);
  const nl = /\baflos(?:sing)?s?(?:schema|planning|volgorde)\b|\bschema\b.*\bschuld|\bschuld\w*\b.*\bschema\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = [{tool: 'debt_plan', args: {}, label: 'Debt payoff plan'}], lang = a.lang, views = debtView(a.env.accounts, a.env.ak?.debtPlanner, a.today);
  if (!views.length) return answer(say(lang, 'No debt with a balance is recorded on this device, so there is no payoff schedule. A loan, mortgage or credit card goes under Wealth → Accounts, debts & net worth.', 'Er staat op dit apparaat geen schuld met een saldo, dus er is geen aflosschema. Een lening, hypotheek of creditcard zet je onder Wealth → Accounts, debts & net worth.'), calls);
  const month = a.today.slice(0, 7), out: string[] = [];
  for (const v of views.slice(0, 3)) {
    if (v.issue || !v.comparison) { out.push(`${v.currency}: ${v.issue ?? say(lang, 'not worked out', 'niet uitgerekend')}`); continue; }
    const plan = v.comparison.custom ?? v.comparison.avalanche, how = v.comparison.custom ? say(lang, 'your own order', 'je eigen volgorde') : say(lang, 'avalanche', 'lawine'), m = (k: number) => monthIn(lang, plusMonths(month, k));
    const paid = plan.payoffs.map(p => `${clean(p.name, 60)} ${say(lang, 'in', 'in')} ${m(p.month)}`), after = [3, 6, 12].filter(k => k < plan.balances.length).map(k => `${say(lang, `after ${k} months`, `na ${k} maanden`)} ${debtMoney(plan.balances[k]!, v.currency)}`);
    out.push(say(lang, `${v.currency} (${how}${v.extra > 0n ? `, ${debtMoney(v.extra, v.currency)} extra a month` : ''}): paid off ${list(paid, 'en')}${plan.months ? `; debt-free in ${m(plan.months)}` : ''}. Still owed ${list(after, 'en')}.`,
      `${v.currency} (${how}${v.extra > 0n ? `, ${debtMoney(v.extra, v.currency)} extra per maand` : ''}): afgelost ${list(paid, 'nl')}${plan.months ? `; schuldenvrij in ${m(plan.months)}` : ''}. Nog te betalen ${list(after, 'nl')}.`));
  }
  return answer([say(lang, 'Your payoff schedule, from your own figures:', 'Je aflosschema, uit je eigen bedragen:'), ...out.map(o => `• ${o}`), say(lang, `The month-by-month table is in ${DEBT_PLANNER_WHERE}. ${DEBT_MODEL} Nothing is paid or moved.`, `De tabel per maand staat in ${DEBT_PLANNER_WHERE_NL}. Een model, geen advies: het gaat ervan uit dat rentes en betalingen gelijk blijven en dat je niets bijleent. Er wordt niets betaald of verplaatst.`)].join('\n'), calls);
}

/** q2 #20: "does anything in my money need attention": imports to review, budgets over or near, bills due within three days. */
function moneyLook(a: Asked): LocalReply | null {
  const en = /\b(?:need|needs|needing) (?:my |a |any )?(?:attention|look)\b|\b(?:anything|something)\b.*\b(?:look at|check|attention)\b/.test(a.f) && /\bmoney\b|\bwealth\b|\bfinances?\b|\bbudgets?\b|\bbills?\b|\bspending\b/.test(a.f);
  const nl = /\baandacht\b|\bnaar kijken\b|\bnakijken\b|\bop letten\b/.test(a.f) && /\bgeld\b|\bvermogen\b|\bfinancien\b|\bfinancieel\b|\bbudget\w*\b|\brekening\w*\b|\buitgaven\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, x = moneyAttention({entries: entriesOf(a.env), review: a.env.ak?.moneyReview ?? null, budgets: a.env.nova?.budgets ?? null, bills: a.env.ak?.bills ?? null, today: a.today});
  const calls = [{tool: 'budgets', args: {}, label: 'Budgets'}, {tool: 'bills', args: {}, label: 'Bills'}];
  if (!x.count) return answer(say(lang, 'Nothing in your money asks for a look today: no imported entry waiting for review, no budget over or near its limit, no bill due in the next 3 days.', 'Niets in je geld vraagt vandaag om aandacht: geen geïmporteerde invoer die wacht, geen budget over of bijna aan de limiet, geen rekening in de komende 3 dagen.'), calls);
  const when = (d: number) => lang === 'nl' ? d <= 0 ? 'vandaag' : d === 1 ? 'morgen' : `over ${d} dagen` : d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
  const bits = [...(x.review ? [say(lang, `${count(x.review, 'en', ['imported entry', 'imported entries'], ['', ''])} to review`, `${count(x.review, 'nl', ['', ''], ['geïmporteerde invoer', 'geïmporteerde invoeren'])} na te kijken`)] : []),
    ...x.over.map(o => say(lang, `${o.category} over budget`, `${o.category} over het budget`)), ...x.near.map(n => say(lang, `${n.category} near its limit`, `${n.category} bijna aan de limiet`)),
    ...x.bills.map(b => say(lang, `${plainTitle(b.title)} due ${when(b.days)}`, `${plainTitle(b.title)} ${when(b.days)}`))];
  return answer(say(lang, `In your money today: ${list(bits, 'en')}. From your own records; nothing is judged.`, `In je geld vandaag: ${list(bits, 'nl')}. Uit je eigen gegevens; er wordt niets beoordeeld.`), calls);
}

const PAYEE_EN = /^(?:how much|what) (?:did|have) i (?:spen[dt]|paid|pay) (?:in total |altogether )?(?:at|with|to|from) (.+?)(?: (this|last) (month|week|year)| (today|yesterday)| in total| so far| altogether| overall)?$/;
const PAYEE_NL = /^(?:hoeveel|wat) (?:heb|had) ik (?:(?:in totaal|deze maand|vorige maand|dit jaar|deze week|vandaag|gisteren) )?bij (.+?) (?:uitgegeven|betaald)(?: (deze|vorige) (maand|week)| (dit) (jaar)| (vandaag|gisteren))?$|^(?:hoeveel|wat) (?:heb|had) ik (?:(?:in totaal|deze maand|vorige maand|dit jaar|deze week) )?(?:uitgegeven|betaald) bij (.+?)(?: (deze|vorige) (maand|week)| (dit) (jaar)| (vandaag|gisteren)| in totaal)?$/;
/**
 * q2 #21: "how much did I spend at Café Noël", "hoeveel heb ik uitgegeven bij de markt": the money log searched by the
 * words (its notes and categories, lib/money-log/search.ts) and totalled per currency (lib/money-log/selection.ts), the way
 * Wealth → Spending's search does; the whole log unless a period is named. A category by its name keeps its own answer.
 */
function payeeTotal(a: Asked): LocalReply | null {
  const m = PAYEE_EN.exec(a.f) ?? PAYEE_NL.exec(a.f);
  if (!m) return null;
  const payeeAt = m[1] !== undefined ? 1 : 7, what = (m[payeeAt] ?? '').replace(/^(?:the|my|de|het|mijn)\s+/, '').trim();
  if (!what || what.length > 40) return null;
  const subject = exactQuery(a.raw, a.env)?.subject;
  if (subject?.kind === 'category' && fold(subject.name) === what) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, rest = m.slice(1).filter((g, i) => g && i + 1 !== payeeAt).join(' '), today = a.today, month = monthKey(today);
  const span: [string, string] | null = /\b(?:this|deze) month|\bdeze maand/.test(rest) || /\bdeze maand\b/.test(a.f) ? [`${month}-01`, today] : /\blast month|\bvorige maand/.test(rest) || /\bvorige maand\b/.test(a.f) ? [`${shiftMonth(month, -1)}-01`, addLocalDays(`${month}-01`, -1)]
    : /\bthis week|\bdeze week/.test(rest) || /\bdeze week\b/.test(a.f) ? [addLocalDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7)), today] : /\b(?:this year|dit jaar)\b/.test(`${rest} ${a.f}`) ? [`${today.slice(0, 4)}-01-01`, today]
      : /\b(?:today|vandaag)\b/.test(rest) ? [today, today] : /\b(?:yesterday|gisteren)\b/.test(rest) ? [addLocalDays(today, -1), addLocalDays(today, -1)] : null;
  const entries = entriesOf(a.env), byWords = searchEntries(entries, {text: what, kind: 'expense', ...(span ? {from: span[0], to: span[1]} : {})});
  // The category a single word names ("supermarkt" → Groceries) stands in only when the notes hold nothing: "Café Noël" is a payee, never all of Food & drink.
  const byCategory = subject?.kind === 'category' && !byWords.length && !what.includes(' ') ? searchEntries(entries, {category: subject.name, kind: 'expense', ...(span ? {from: span[0], to: span[1]} : {})}) : [];
  const hits = [...new Map([...byWords, ...byCategory].map(e => [e.id, e])).values()].sort((x, y) => y.date.localeCompare(x.date));
  const where = span ? say(lang, `from ${dayIn('en', span[0], today)} to ${dayIn('en', span[1], today)}`, `van ${dayIn('nl', span[0], today)} t/m ${dayIn('nl', span[1], today)}`) : say(lang, 'in your whole money log', 'in je hele geldlog');
  const calls = [{tool: 'money_selection', args: {words: what.slice(0, 40), kind: 'expense', from: span?.[0] ?? addLocalDays(today, -366), to: span?.[1] ?? today}, label: `Spending log total · "${clean(what, 30)}"`}];
  // The words as they were typed ("Café Noël"), not folded.
  const shown = clean(typedWords(a.raw, what) ?? what, 40);
  if (!hits.length) return answer(say(lang, `Nothing ${where} matches “${shown}” (its notes and categories were searched).`, `Niets ${where} past bij “${shown}” (de notities en categorieën zijn doorzocht).`), calls);
  const sum = summarizeSelection(hits, hits.map(e => e.id)), totals = list(sum.totals.map(t => money(Math.abs(t.cents), t.currency)), lang);
  const days = hits.length <= 3 ? `: ${list(hits.map(e => dayIn(lang, e.date, today)), lang)}` : say(lang, `, the latest on ${dayIn('en', hits[0]!.date, today)}`, `, de laatste op ${dayIn('nl', hits[0]!.date, today)}`);
  const cat = byCategory.length ? ` (${subject!.name})` : '';
  return answer(say(lang, `${totals} spent at “${shown}”${cat} ${where}: ${count(hits.length, 'en', ['entry', 'entries'], ['', ''])}${days}. Per currency, never converted.`, `${totals} uitgegeven bij “${shown}”${cat} ${where}: ${count(hits.length, 'nl', ['', ''], ['invoer', 'invoeren'])}${days}. Per valuta, nooit omgerekend.`), calls);
}

/** q2 #31: "which categories am I watching": each watched category this month against last month by the same day. */
function watched(a: Asked): LocalReply | null {
  const en = /\bcategor(?:y|ies)\b.*\bwatch(?:ing|ed)?\b|\bwatch(?:ing|ed)? (?:categories|category|list)\b/.test(a.f);
  const nl = /\bcategorie(?:en)?\b.*\b(?:volg|volgt|gevolgd|in de gaten)\b|\bgevolgde categorie/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, lang = a.lang, rows = record ? watchRows(record, entriesOf(a.env), a.today) : [], calls = [{tool: 'budgets', args: {}, label: 'Budgets'}];
  if (!rows.length) return answer(say(lang, 'You don’t watch a category yet. In Wealth → Budgets, “Watch a category” follows one without a budget, this month against last month by the same day.', 'Je volgt nog geen categorie. In Wealth → Budgets volgt “Watch a category” er een zonder budget, deze maand tegenover vorige maand op dezelfde dag.'), calls);
  const line = (r: (typeof rows)[number]) => `${r.category} ${money(r.thisMonth, r.currency)}${r.lastBySameDay === null ? say(lang, ' (last month unknown)', ' (vorige maand onbekend)') : say(lang, ` (last month by the same day ${money(r.lastBySameDay, r.currency)})`, ` (vorige maand op dezelfde dag ${money(r.lastBySameDay, r.currency)})`)}`;
  return answer(say(lang, `You watch ${count(rows.length, 'en', ['category', 'categories'], ['', ''])} this month: ${list(rows.map(line), 'en')}.`, `Je volgt ${count(rows.length, 'nl', ['', ''], ['categorie', 'categorieën'])} deze maand: ${list(rows.map(line), 'nl')}.`), calls);
}

/** q2 #35: "what price alerts do I have": the coin, goal and portfolio-value alerts, waiting or gone off. */
function priceAlerts(a: Asked): LocalReply | null {
  const en = /\b(?:price|value|coin|portfolio|crypto) alerts?\b|\balerts? (?:on|for) (?:my )?(?:coins?|prices?|portfolios?|crypto)\b|\bmy alerts\b/.test(a.f);
  const nl = /\bkoersalarm(?:en)?\b|\bprijsalarm(?:en)?\b|\bwaardealarm(?:en)?\b|\bkoersmelding(?:en)?\b|\balarm(?:en)? (?:op|voor) (?:mijn )?(?:munten|koersen|portefeuille|crypto)\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.ak?.priceAlerts, lang = a.lang, calls = [{tool: 'price_alerts', args: {}, label: 'Price alerts'}];
  const state = (x: {active: boolean; firedAt?: string}) => x.firedAt ? say(lang, `went off on ${dayIn('en', x.firedAt.slice(0, 10), a.today)}`, `afgegaan op ${dayIn('nl', x.firedAt.slice(0, 10), a.today)}`) : x.active ? say(lang, 'waiting', 'wacht') : say(lang, 'paused', 'gepauzeerd');
  const dir = (d: string | undefined) => d === 'below' ? say(lang, 'below', 'onder') : say(lang, 'above', 'boven');
  const rows = [...(record?.alerts ?? []).map(x => x.kind === 'goal' ? `${clean(x.coinName, 40)} ${say(lang, `puts ${clean(x.goalName ?? 'a goal', 40)} at ${x.percent}%`, `brengt ${clean(x.goalName ?? 'een doel', 40)} op ${x.percent}%`)} (${state(x)})` : `${clean(x.coinName, 40)} ${dir(x.direction)} ${x.price} ${x.currency} (${state(x)})`),
    ...(record?.portfolio ?? []).map(x => `${clean(x.portfolioName, 40)} ${say(lang, 'worth', 'waard')} ${dir(x.direction)} ${x.value} ${x.currency} (${state(x)})`)];
  if (!rows.length) return answer(say(lang, 'No price alert is set yet. A coin’s page on Markets, or Portfolio, sets one (in the app only; nothing is bought or sold).', 'Er staat nog geen koersalarm. De pagina van een munt in Markets, of Portfolio, zet er een (alleen in de app; er wordt niets gekocht of verkocht).'), calls);
  return answer([say(lang, `${count(rows.length, 'en', ['alert', 'alerts'], ['', ''])}:`, `${count(rows.length, 'nl', ['', ''], ['alarm', 'alarmen'])}:`), ...rows.slice(0, 10).map(r => `• ${r}`), say(lang, 'Checked against the last price the app read; nothing is bought or sold.', 'Getoetst aan de laatste koers die de app las; er wordt niets gekocht of verkocht.')].join('\n'), calls);
}

/** q2 #49: "how did last month go for my money": the month in short (lib/budgets/recap.ts). */
function monthInShort(a: Asked): LocalReply | null {
  const en = /\bhow (?:did|was) (?:last|this) month\b.*\b(?:money|finances?|spending|budgets?)\b|\bhow did my (?:money|finances|spending) (?:do|go) (?:last|this) month\b|\b(?:last|this) months? (?:money )?recap\b|\bmonth(?:ly)? (?:money )?recap\b/.test(a.f);
  const nl = /\bhoe (?:ging|was|verliep) (?:vorige|deze) maand\b.*\b(?:geld|financien|uitgaven|budget\w*)\b|\bhoe ging (?:het met )?(?:mijn )?geld (?:vorige|deze) maand\b|\bmaandoverzicht\b.*\bgeld\b/.test(a.f);
  if (!(en || nl) || !isQuestion(a)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, calls = [{tool: 'spending', args: {period: /\bthis month\b|\bdeze maand\b/.test(a.f) ? 'this-month' : 'last-month'}, label: 'Spending'}];
  const month = /\bthis month\b|\bdeze maand\b/.test(a.f) ? monthKey(a.today) : shiftMonth(monthKey(a.today), -1), name = monthIn(lang, month), before = monthIn(lang, shiftMonth(month, -1));
  const recap = monthRecap(entriesOf(a.env), a.env.nova?.budgets ?? {version: 1, budgets: []}, month, a.today).sort((x, y) => y.spent - x.spent);
  if (!recap.length || (!recap[0]!.spent && !recap[0]!.income)) return answer(say(lang, `Nothing is logged in ${name}.`, `Er is niets gelogd in ${name}.`), calls);
  const r = recap[0]!, c = r.currency, diff = r.spent - r.previousSpent;
  const top = r.top.map(x => `${x.category} ${money(x.cents, c)}`), largest = r.largest ? say(lang, ` The largest single expense: ${clean(r.largest.note, 60)} ${money(r.largest.cents, c)} (${dayIn('en', r.largest.date, a.today)}).`, ` De grootste uitgave: ${clean(r.largest.note, 60)} ${money(r.largest.cents, c)} (${dayIn('nl', r.largest.date, a.today)}).`) : '';
  const budgets = r.budgets.of ? say(lang, ` Budgets: ${r.budgets.kept} of ${r.budgets.of} kept within their amount.`, ` Budgetten: ${r.budgets.kept} van ${r.budgets.of} binnen hun bedrag gebleven.`) : '';
  return answer(say(lang, `${name}: ${money(r.spent, c)} spent and ${money(r.income, c)} came in; ${diff === 0 ? `the same as ${before}` : `${money(Math.abs(diff), c)} ${diff > 0 ? 'more' : 'less'} spent than in ${before}`}.${top.length ? ` Most on ${list(top, 'en')}.` : ''}${largest}${budgets} In ${c}, never converted.`,
    `${name}: ${money(r.spent, c)} uitgegeven en ${money(r.income, c)} binnengekomen; ${diff === 0 ? `gelijk aan ${before}` : `${money(Math.abs(diff), c)} ${diff > 0 ? 'meer' : 'minder'} uitgegeven dan in ${before}`}.${top.length ? ` Het meest aan ${list(top, 'nl')}.` : ''}${largest}${budgets} In ${c}, nooit omgerekend.`), calls);
}
