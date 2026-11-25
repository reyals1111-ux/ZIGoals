import {projectOn, type Projection} from '../../body-extras/predict';
import type {BodyExtras} from '../../body-extras/schema';
import {weekCompare} from '../../health-aa/trend';
import {dailyData} from '../../health-daily';
import type {HealthData} from '../../health';
import {weightChangeText, weightText, type WeightUnit} from '../../health-units';
import {readDeviceRecord} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';
import {clockFromNoon, goalPeriod, type GoalPeriodDays} from '../../sleep/engine';
import {SLEEP_GOAL_PERIOD} from '../../sleep/goal-period';
import {healthGroupIn} from '../../vault/w-homes';
import {formatNumber} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {bodyFiguresHidden} from './av2-hide-figures';
import {answer, asked, clockIn, closed, dayIn, hm, isQuestion, MIXED, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';
import {fold} from './exact/text';

/**
 * Session AW (X6; Happy Scale, Sleep as Android): NOVA's and ZIGi's on-device answers to the group's three questions, in
 * English and Dutch, each read from the feature's own pure function (the figures the page shows) and only under Health's
 * gate (`closed(env, 'health')`, as the other Health answers):
 * - "what will I weigh on 1 January", "wat weeg ik op 1 januari" (LEDGER #456): the trend's estimate on that day (or on a
 *   day the person named), IF the last 4 weeks' pace continued, with its sum; never a promise, never advice.
 * - "how was my weight this week compared with last week", "hoe was mijn gewicht deze week vergeleken met vorige week"
 *   (#458): the two 7-day means, each from 3 weigh-ins or more, else "not enough weigh-ins yet" (never 0).
 * - "how am I doing on my sleep goal", "hoe gaat het met mijn slaapdoel" (#460): the goal over 14 or 30 days (the
 *   question's period, else this device's choice), with the bedtime window. "Am I reaching my sleep goal" (the last 7
 *   days), and a goal kept only under Goals, stay with fr-answers.ts.
 * With "Hide calories and weight" on, the weight answers say so instead of a figure, as the BMI answer does. Wired into
 * engine.ts by the integrator, beside the Body answers and before `frAnswer`.
 */
export function awX6Answer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    return projectionAnswer(a) ?? weekAnswer(a) ?? sleepGoalAnswer(a);
  } catch { return null; }
}

const unitOf = (a: Asked): WeightUnit => { try { return a.env.health ? dailyData(a.env.health).preferences.weightUnit : 'kg'; } catch { return 'kg'; } };
const HIDDEN = {en: 'Your weight figures are hidden on this device, so I don’t say them; Health → “Show calories and weight” brings them back.', nl: 'Je gewichtscijfers zijn verborgen op dit apparaat, dus die noem ik niet; Health → “Show calories and weight” zet ze terug.'} as const;
const LIFTING = /\b(?:lift(?:ed|s|ing)?|volume|tilde|getild|tillen|opgetild)\b/;

// ── #456: what will I weigh on a day ──────────────────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {january: 1, jan: 1, januari: 1, february: 2, feb: 2, februari: 2, march: 3, mar: 3, maart: 3, mrt: 3, april: 4, apr: 4, may: 5, mei: 5, june: 6, jun: 6, juni: 6, july: 7, jul: 7, juli: 7,
  august: 8, aug: 8, augustus: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, oktober: 10, okt: 10, november: 11, nov: 11, december: 12, dec: 12};
const MONTH = Object.keys(MONTHS).sort((x, y) => y.length - x.length).join('|');
const pad = (n: number) => String(n).padStart(2, '0');
/** A real calendar day, or null. */
function real(y: number, m: number, d: number): string | null {
  const day = `${y}-${pad(m)}-${pad(d)}`, t = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.getUTCMonth() + 1 === m && t.getUTCDate() === d ? day : null;
}
/** The next such day on or after tomorrow when no year is said ("1 January" asked in November is next year's). */
function next(m: number, d: number, today: string): string | null {
  const y = Number(today.slice(0, 4)), first = real(y, m, d);
  return first && first > today ? first : real(y + 1, m, d);
}
/** The day a folded question names: an ISO date, "1 january (2027)", "january 1st", "1 januari", New Year's Day, Christmas. */
export function dayAsked(f: string, today: string): string | null {
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(f);
  if (iso) return real(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dm = new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th|e|ste|de)?\s+(?:of\s+)?(${MONTH})\b(?:\s+(\d{4}))?`).exec(f);
  const md = dm ? null : new RegExp(String.raw`\b(${MONTH})\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:\s+(\d{4}))?`).exec(f);
  const hit = dm ? {d: Number(dm[1]), m: MONTHS[dm[2]!]!, y: dm[3]} : md ? {d: Number(md[2]), m: MONTHS[md[1]!]!, y: md[3]} : null;
  if (hit) return hit.y ? real(Number(hit.y), hit.m, hit.d) : next(hit.m, hit.d, today);
  if (/\bnew years? (?:day|eve)?\b|\bnieuwjaars?(?:dag)?\b|\boud en nieuw\b/.test(f)) return next(1, 1, today);
  if (/\bchristmas\b|\bxmas\b|\bkerst(?:mis|dag)?\b/.test(f)) return next(12, 25, today);
  return null;
}
const PROJ_EN = /\b(?:what|how much) will i weigh\b|\bwhat (?:will|would) my weight be\b|\bwhere will my weight be\b|\bwhat would i weigh\b|\bhow much would i weigh\b/;
const PROJ_NL = /\b(?:wat|hoeveel) (?:weeg|zal ik wegen|ga ik wegen|zou ik wegen)\b|\bwat (?:is|wordt|zal) mijn gewicht\b|\bhoe zwaar (?:ben|zal|word) ik\b/;
const NO_HEALTH = {weights: [], targets: {weightGrams: null}} as unknown as Pick<HealthData, 'weights' | 'targets'>;
const namedDaysOf = (a: Asked) => ((a.env.ak as {bodyExtras?: BodyExtras | null} | undefined)?.bodyExtras?.namedDays ?? []);
function projectionAnswer(a: Asked): LocalReply | null {
  if (LIFTING.test(a.f)) return null;
  const en = PROJ_EN.test(a.f), nl = PROJ_NL.test(a.f);
  if (!(en || nl)) return null;
  const named = namedDaysOf(a).find(d => { const n = fold(d.name); return n.length >= 2 && new RegExp(`(?:^|\\s)${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(a.f); });
  const on = named?.on ?? dayAsked(a.f, a.env.healthDay);
  // "hoeveel weeg ik" (today) is the weight answer's: a Dutch present tense needs a day ("op 1 januari") to be this one.
  if (!on && !(en && /\b(?:on|by)\b/.test(a.f))) return null;
  // A day already passed ("wat is mijn gewicht op 3 maart") asks for a reading, which the weight answers give.
  if (on && !named && on <= a.env.healthDay) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, calls = [{tool: 'health_summary', args: {}, label: 'Weight trend'}];
  if (!on) return answer(say(lang, 'Name the day, for example “what will I weigh on 1 January”, or keep days by name in Health → Weight → “A day you name”.', 'Noem de dag, bijvoorbeeld “wat weeg ik op 1 januari”, of bewaar dagen met een naam in Health → Weight → “A day you name”.'), calls);
  if (bodyFiguresHidden()) return answer(HIDDEN[lang], calls);
  const unit = unitOf(a), p = projectOn(a.env.health ?? NO_HEALTH, a.env.healthDay, on);
  const day = `${named ? `“${clean(named.name, 40)}” (${dayIn(lang, on, a.today)})` : dayIn(lang, on, a.today)}`;
  return answer(projectionText(p, day, unit, lang), calls);
}
export function projectionText(p: Projection, day: string, unit: WeightUnit, lang: Lang): string {
  if (p.kind === 'estimate') {
    const weeks = formatNumber(p.weeks, {maximumFractionDigits: 1});
    return say(lang, `If the last 4 weeks’ pace continued, your trend would be about ${weightText(p.grams, unit)} on ${day}: ${weightText(p.nowGrams, unit)} now, ${weightChangeText(p.weeklyGrams, unit)} a week, ${weeks} ${p.weeks === 1 ? 'week' : 'weeks'}. An estimate, not medical advice, and not a promise.`,
      `Als het tempo van de afgelopen 4 weken zo doorging, zou je trend op ${day} ongeveer ${weightText(p.grams, unit)} zijn: nu ${weightText(p.nowGrams, unit)}, ${weightChangeText(p.weeklyGrams, unit)} per week, ${weeks} ${p.weeks === 1 ? 'week' : 'weken'}. Een schatting, geen medisch advies en geen belofte.`);
  }
  if (p.kind === 'no-rate') return say(lang, `There is no 4-week pace yet to estimate ${day} from: it needs weigh-ins at least seven days apart in the last 4 weeks.`, `Er is nog geen tempo over 4 weken om ${day} uit te schatten: daarvoor zijn wegingen nodig die minstens zeven dagen uit elkaar liggen, in de afgelopen 4 weken.`);
  if (p.kind === 'passed') return say(lang, `${day} is not ahead, so there is nothing to estimate; your weigh-ins say what it was.`, `${day} ligt niet in de toekomst, dus er valt niets te schatten; je wegingen zeggen wat het was.`);
  if (p.kind === 'too-far') return say(lang, `${day} is more than a year ahead: a 4-week pace says nothing that far out, so I give no figure.`, `${day} is meer dan een jaar vooruit: een tempo van 4 weken zegt zo ver niets, dus ik noem geen getal.`);
  return say(lang, `Carried as far as ${day}, the last 4 weeks’ pace leaves any likely weight, so I give no figure.`, `Doorgetrokken tot ${day} komt het tempo van de afgelopen 4 weken buiten elk aannemelijk gewicht, dus ik noem geen getal.`);
}

// ── #458: this week against the week before ───────────────────────────────────────────────────────────────────────

function weekAnswer(a: Asked): LocalReply | null {
  if (LIFTING.test(a.f)) return null;
  const en = /\b(?:weight|weigh(?:ed)?|weigh ins?)\b/.test(a.f) && /\bthis week\b/.test(a.f) && /\b(?:last week|previous week|(?:the )?week before|prior week)\b/.test(a.f);
  const nl = /\b(?:gewicht|gewogen|woog|weeg|wegingen)\b/.test(a.f) && /\bdeze week\b/.test(a.f) && /\b(?:vorige week|week ervoor|week daarvoor|week hiervoor)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, calls = [{tool: 'health_summary', args: {}, label: 'Weigh-ins'}];
  if (bodyFiguresHidden()) return answer(HIDDEN[lang], calls);
  const c = weekCompare(a.env.health?.weights ?? [], a.env.healthDay), unit = unitOf(a);
  if (!c.ready) return answer(say(lang, `Not enough weigh-ins yet to compare this week with the week before: it needs 3 or more in each 7 days (this week ${c.thisCount}, the week before ${c.prevCount}).`,
    `Nog niet genoeg wegingen om deze week met de week ervoor te vergelijken: daarvoor zijn er 3 of meer per 7 dagen nodig (deze week ${c.thisCount}, de week ervoor ${c.prevCount}).`), calls);
  const gap = weightText(Math.abs(c.diff), unit), same = gap === weightText(0, unit);
  return answer(say(lang, `This week ${weightText(c.thisMean, unit)} on average (${c.thisCount} weigh-ins), ${same ? 'the same as' : `${gap} ${c.diff < 0 ? 'under' : 'over'}`} the week before (${weightText(c.prevMean, unit)}, ${c.prevCount} weigh-ins). The mean of each 7 days’ weigh-ins, as Health → Weight shows it.`,
    `Deze week gemiddeld ${weightText(c.thisMean, unit)} (${c.thisCount} wegingen), ${same ? 'gelijk aan' : `${gap} ${c.diff < 0 ? 'lager dan' : 'hoger dan'}`} de week ervoor (${weightText(c.prevMean, unit)}, ${c.prevCount} wegingen). Het gemiddelde van de wegingen van elke 7 dagen, zoals Health → Weight het toont.`), calls);
}

// ── #460: the sleep goal over 14 or 30 days ───────────────────────────────────────────────────────────────────────

const GOAL_EN = /\bhow (?:am i doing|are things going|is it going) (?:on|with) my sleep (?:goal|target)\b|\bhow is my sleep (?:goal|target)(?: going)?\b|\bmy sleep (?:goal|target) over (?:the )?(?:last |past )?(?:14|30|two weeks|fourteen days|thirty days|a month|month)\b/;
const GOAL_NL = /\bhoe (?:gaat het met|sta ik ervoor met|staat het met|gaat) (?:mijn )?slaapdoel\b|\bmijn slaapdoel (?:over|van) (?:de )?(?:afgelopen |laatste )?(?:14|30|twee weken|veertien dagen|dertig dagen|een maand|maand)\b/;
/** The period a question names, else this device's choice (14 days unless 30 was chosen in Health → Sleep). */
function periodOf(f: string): GoalPeriodDays {
  if (/\b30\b|\bthirty\b|\bdertig\b|\bmonth\b|\bmaand\b/.test(f)) return 30;
  if (/\b14\b|\bfourteen\b|\bveertien\b|\btwo weeks\b|\btwee weken\b/.test(f)) return 14;
  try { return typeof window === 'undefined' ? 14 : readDeviceRecord(getAppStorage(), SLEEP_GOAL_PERIOD).data.days; } catch { return 14; }
}
function sleepGoalAnswer(a: Asked): LocalReply | null {
  if (!(GOAL_EN.test(a.f) || GOAL_NL.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const sleep = healthGroupIn(a.env.health!, 'sleep'), average = (a.env.averageGoals ?? []).find(g => g.status === 'active' && g.metric === 'sleep-hours');
  const lang = a.lang, days = periodOf(a.f), calls = [{tool: 'sleep_summary', args: {}, label: 'Sleep summary'}];
  if (!sleep?.goal) {
    // Only a goal kept under Goals (an average of sleep): fr-answers.ts answers from it, as before.
    if (average) return null;
    return answer(say(lang, `You have no sleep goal yet: set one in Health → Sleep → Your sleep goal, and I answer from it and your logged nights over the last ${days} days.`, `Je hebt nog geen slaapdoel: stel er een in bij Health → Sleep → Your sleep goal, dan antwoord ik uit dat doel en je gelogde nachten van de afgelopen ${days} dagen.`), calls);
  }
  // A goal under Goals as well: named in one line, so neither is mistaken for the other.
  const also = average ? say(lang, ` Your goal under Goals, “${clean(average.name, 60)}”, is on Goals.`, ` Je doel onder Goals, “${clean(average.name, 60)}”, staat bij Goals.`) : '';
  const p = goalPeriod(sleep, a.env.healthDay, days);
  if (!p) return answer(say(lang, `Your sleep goal is ${hm(sleep.goal.minutes)} a night. No night is logged in the last ${days} days, so it is unknown (never 0).`, `Je slaapdoel is ${hm(sleep.goal.minutes)} per nacht. De afgelopen ${days} dagen is geen nacht gelogd, dus onbekend (nooit 0).`) + also, calls);
  const bed = p.bedtime, est = p.estimated ? say(lang, ' (an estimate)', ' (een schatting)') : '';
  const bedEn = bed ? ` Bedtime on average ${clockIn('en', clockFromNoon(bed.average))}, ${Math.abs(bed.fromEnd) < 1 ? 'right at' : `${hm(Math.abs(bed.fromEnd))} ${bed.fromEnd < 0 ? 'before' : 'after'}`} the end of your window (${clockIn('en', bed.to)}); ${bed.inside} of ${bed.nights} nights inside ${clockIn('en', bed.from)}–${clockIn('en', bed.to)}.` : '';
  const bedNl = bed ? ` Bedtijd gemiddeld ${clockIn('nl', clockFromNoon(bed.average))}, ${Math.abs(bed.fromEnd) < 1 ? 'precies op' : `${hm(Math.abs(bed.fromEnd))} ${bed.fromEnd < 0 ? 'vóór' : 'na'}`} het einde van je venster (${bed.to}); ${bed.inside} van ${bed.nights} nachten binnen ${bed.from}–${bed.to}.` : '';
  return answer(say(lang, `Your sleep goal over the last ${days} days: ${hm(p.asleep)} asleep on average${est}, against your goal of ${hm(p.goal)}; ${p.atOrAbove} of ${p.nights} logged ${p.nights === 1 ? 'night' : 'nights'} at or above it.${bedEn} From your own logged nights; Health → Sleep → Your sleep goal shows it.${also}`,
    `Je slaapdoel over de afgelopen ${days} dagen: gemiddeld ${hm(p.asleep)} geslapen${est}, tegen je doel van ${hm(p.goal)}; ${p.atOrAbove} van ${p.nights} gelogde ${p.nights === 1 ? 'nacht' : 'nachten'} haalden het of meer.${bedNl} Uit je eigen gelogde nachten; Health → Sleep → Your sleep goal toont het.${also}`), calls);
}
