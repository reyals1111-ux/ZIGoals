import {formatNumber} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, clockIn, closed, dayIn, isQuestion, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import type {Cycle} from '../../cycle/store';
import {CYCLE_LINE} from '../../cycle/engine';
import {cycleHistory, cycleStats, type PastCycle, type Spread} from '../../cycle/history';
import {allWords, wordLabel} from '../../cycle/words';
import {compare, type CompareSources} from '../../compare/engine';
import {lateMealRule} from '../../compare/late-meal';
import {moodMarks} from '../../timeline/mood-source';
import {habitDay} from '../../habits';
import {HABIT_PARTS} from '../../notify/habit-parts';
import type {FoodPlus} from '../../food-plus/schema';
import {addLocalDays} from '../../local-date';

/**
 * Session AV lane 2 (r5-body; Bevel, Clue, Productive, Tiimo): NOVA's and ZIGi's on-device answers to the round's body and
 * through-the-day features, in English and Dutch, each read from the feature's own pure function (the same figures the
 * page shows). Health's behind its gate, and the cycle log behind its own switch too. Every pattern reads the whole
 * question; a question with an action in it is left to the model or a card. The cycle answers are a look back only:
 * never a phase, a fertile window or a forecast, never a reading of a word logged. The late-meal answer is Compare's own
 * result, never a cause. Wired into engine.ts by the lead, beside `av2R4HealthAnswer`.
 */
export function av2R5BodyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
const CYCLE_CALLS = [{tool: 'cycle_log', args: {}, label: 'Cycle log'}], HEALTH_CALLS = [{tool: 'health_summary', args: {}, label: 'Health summary'}];
const LINE_NL = 'Informatie voor jou, geen anticonceptie en geen diagnose.';
const line = (a: Asked) => say(a.lang, CYCLE_LINE, LINE_NL);
const days = (a: Asked, n: number) => { const v = Math.round(n * 10) / 10, t = a.lang === 'nl' ? v.toLocaleString('nl-NL', {maximumFractionDigits: 1}) : formatNumber(v, {maximumFractionDigits: 1}); return `${t} ${v === 1 ? say(a.lang, 'day', 'dag') : say(a.lang, 'days', 'dagen')}`; };
/** The cycle log under the Health gate and its own switch: the record, or the answer that says why not. */
function cycleOf(a: Asked): {rec: Cycle} | {reply: LocalReply} {
  const shut = closed(a.env, 'health'); if (shut) return {reply: shut};
  const rec = (a.env.nova as {cycle?: Cycle | null} | null | undefined)?.cycle;
  if (!rec || rec.on !== true) return {reply: answer(say(a.lang, `The cycle log is off or can’t be read here. Turn it on in Settings → Your pages & buttons (under Health). ${CYCLE_LINE}`, `Het cycluslogboek staat uit of kan hier niet gelezen worden. Zet het aan in Settings → Your pages & buttons (onder Health). ${LINE_NL}`), CYCLE_CALLS)};
  return {rec};
}
const NO_NEXT = /\bnext\b|\bvolgende\b|\bfertil\w*|\bovulat\w*|\bvruchtba\w*|\beisprong\b/;

/** "what is my average cycle length", "hoe lang is mijn cyclus gemiddeld" (LEDGER #379, #382): the averages and their spread. */
function cycleAverages(a: Asked): LocalReply | null {
  const en = /\b(?:average|usual|typical)\b.*\b(?:cycles?|periods?)\b|\bhow long (?:are|is|do|does) (?:my )?(?:cycles?|periods?)\b|\b(?:cycle|period) (?:length|lengths)\b|\bhow (?:regular|much do) my cycles?\b/.test(a.f);
  const nl = /\bgemiddeld\w*\b.*\b(?:cyclus|cycli|menstruatie|ongesteld)\b|\b(?:cyclus|cycli|menstruatie)\b.*\bgemiddeld\w*\b|\bhoe lang (?:is|zijn|duurt|duren) (?:mijn )?(?:cyclus|cycli|menstruatie)\b|\b(?:cyclus|menstruatie)lengte\b|\bhoe regelmatig\b.*\bcycl\w*\b/.test(a.f);
  if (!(en || nl) || NO_NEXT.test(a.f)) return null;
  const got = cycleOf(a); if ('reply' in got) return got.reply;
  const h = cycleHistory(got.rec, a.env.healthDay), s = cycleStats(h);
  if (!h.length) return answer(say(a.lang, `Nothing to look back on yet: log the days of your period in Health → Diary → Cycle log, and Your cycles shows each cycle once the next one begins. ${CYCLE_LINE}`, `Nog niets om op terug te kijken: noteer de dagen van je menstruatie in Health → Diary → Cycle log, dan toont Your cycles elke cyclus zodra de volgende begint. ${LINE_NL}`), CYCLE_CALLS);
  const range = (x: Spread) => x.count < 2 ? '' : x.shortest === x.longest ? say(a.lang, ` (all ${days(a, x.shortest)})`, ` (allemaal ${days(a, x.shortest)})`) : say(a.lang, ` (${days(a, x.shortest)} to ${days(a, x.longest)}, so they vary by ${days(a, x.longest - x.shortest)})`, ` (${days(a, x.shortest)} tot ${days(a, x.longest)}, dus ze verschillen ${days(a, x.longest - x.shortest)})`);
  const cycle = s.cycle ? say(a.lang, `Your average cycle is ${days(a, s.cycle.average)}${range(s.cycle)}, from ${s.cycle.count} ${s.cycle.count === 1 ? 'cycle' : 'cycles'}.`, `Je gemiddelde cyclus is ${days(a, s.cycle.average)}${range(s.cycle)}, uit ${s.cycle.count} ${s.cycle.count === 1 ? 'cyclus' : 'cycli'}.`) : say(a.lang, 'No cycle is complete yet (the next period logged), so there is no average cycle.', 'Nog geen cyclus is compleet (de volgende menstruatie genoteerd), dus er is nog geen gemiddelde cyclus.');
  const period = s.period ? say(a.lang, ` Your average period is ${days(a, s.period.average)}${range(s.period)}.`, ` Je menstruatie duurt gemiddeld ${days(a, s.period.average)}${range(s.period)}.`) : '';
  const out = s.leftOut ? say(a.lang, ` ${s.leftOut === 1 ? '1 cycle is' : `${s.leftOut} cycles are`} left out of the averages, as you chose.`, ` ${s.leftOut === 1 ? '1 cyclus is' : `${s.leftOut} cycli zijn`} weggelaten uit de gemiddelden, zoals je koos.`) : '';
  return answer(`${cycle}${period}${out} ${say(a.lang, 'A look back at what you logged, not a forecast.', 'Een terugblik op wat je noteerde, geen voorspelling.')} ${line(a)}`, CYCLE_CALLS);
}

/** "what words do I track in my cycle log", "welke woorden houd ik bij in mijn cycluslog" (LEDGER #380, #383). */
function cycleWords(a: Asked): LocalReply | null {
  const en = /\bwhat (?:words|things|tags) (?:do|can) i (?:track|log)\b|\bmy own (?:words|tags)\b|\bcycle\b.*\b(?:words|tags)\b|\b(?:words|tags)\b.*\bcycle\b/.test(a.f);
  const nl = /\bwelke (?:woorden|dingen|tags) (?:houd|hou|kan) ik\b.*\b(?:bij|noteren|loggen)\b|\bmijn eigen (?:woorden|tags)\b|\bcyclus\w*\b.*\b(?:woorden|tags)\b|\b(?:woorden|tags)\b.*\bcyclus\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = cycleOf(a); if ('reply' in got) return got.reply;
  const rec = got.rec, words = allWords(rec), shown = words.filter(w => !w.hidden), own = words.filter(w => w.own);
  const names = (ws: typeof words) => list(ws.map(w => wordLabel(rec, w.id, a.lang)), a.lang);
  const ownLine = own.length ? say(a.lang, ` Your own: ${names(own)}.`, ` Je eigen woorden: ${names(own)}.`) : say(a.lang, ' You have no words of your own yet; add up to 30 under What you track.', ' Je hebt nog geen eigen woorden; voeg er tot 30 toe onder What you track.');
  const hidden = words.length - shown.length;
  const choices = [rec.noPeriod ? say(a.lang, '“No period” is on: no flow buttons and no next-period line.', '“No period” staat aan: geen knoppen voor bloedverlies en geen regel over de volgende menstruatie.') : '', rec.peri ? say(a.lang, 'The perimenopause words are on.', 'De woorden voor de perimenopauze staan aan.') : ''].filter(Boolean).join(' ');
  return answer(`${say(a.lang, `Words you can log for a day (${shown.length}): ${names(shown)}.`, `Woorden die je voor een dag kunt noteren (${shown.length}): ${names(shown)}.`)}${ownLine}${hidden ? say(a.lang, ` ${hidden} hidden.`, ` ${hidden} verborgen.`) : ''}${choices ? ` ${choices}` : ''} ${say(a.lang, 'Words to log, with nothing read into them.', 'Woorden om te noteren; er wordt niets uit afgeleid.')} ${line(a)}`, CYCLE_CALLS);
}

/** "what did I log in my last cycle", "wat heb ik genoteerd in mijn vorige cyclus" (LEDGER #381): a cycle at a glance. */
function cycleGlanceAnswer(a: Asked): LocalReply | null {
  const en = /\bwhat did i (?:log|note|track)\b.*\b(?:last|this|previous|current) cycle\b|\b(?:last|this|previous|current) cycle\b.*\b(?:at a glance|day by day)\b/.test(a.f);
  const nl = /\bwat heb ik\b.*\b(?:genoteerd|gelogd|bijgehouden)\b.*\b(?:vorige|deze|laatste|huidige) cyclus\b|\bwat heb ik\b.*\b(?:vorige|deze|laatste|huidige) cyclus\b.*\b(?:genoteerd|gelogd|bijgehouden)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = cycleOf(a); if ('reply' in got) return got.reply;
  const now = /\b(?:this|current|deze|huidige)\b/.test(a.f), h = cycleHistory(got.rec, a.env.healthDay).filter(c => !c.pause);
  const c: PastCycle | undefined = now ? h[0] : h.find(x => x.complete);
  if (!c) return answer(say(a.lang, `There is no ${now ? 'cycle' : 'complete cycle'} to look back on yet. ${CYCLE_LINE}`, `Er is nog geen ${now ? 'cyclus' : 'complete cyclus'} om op terug te kijken. ${LINE_NL}`), CYCLE_CALLS);
  const counts = new Map<string, number>();
  for (let i = 0; i < c.length; i++) { const d = got.rec.days[addLocalDays(c.start, i)]; for (const w of d?.symptoms ?? []) counts.set(w, (counts.get(w) ?? 0) + 1); }
  const words = [...counts].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([w, n]) => `${wordLabel(got.rec, w, a.lang)} (${days(a, n)})`);
  const head = say(a.lang, `Your cycle from ${dayIn('en', c.start, a.today)}: ${c.complete ? days(a, c.length) : `${days(a, c.length)} so far`}, a period of ${days(a, c.periodLength)}.`, `Je cyclus vanaf ${dayIn('nl', c.start, a.today)}: ${c.complete ? days(a, c.length) : `tot nu ${days(a, c.length)}`}, een menstruatie van ${days(a, c.periodLength)}.`);
  const logged = words.length ? say(a.lang, ` Words logged: ${list(words, 'en')}.`, ` Genoteerde woorden: ${list(words, 'nl')}.`) : say(a.lang, ' No words logged in it.', ' Er zijn geen woorden in genoteerd.');
  return answer(`${head}${logged} ${say(a.lang, 'Health → Diary → Cycle log → A cycle at a glance shows it day by day beside earlier cycles. A look back, never a forecast.', 'Health → Diary → Cycle log → A cycle at a glance toont hem dag voor dag naast eerdere cycli. Een terugblik, nooit een voorspelling.')} ${line(a)}`, CYCLE_CALLS);
}

/** "can I track without a period", "kan ik bijhouden zonder menstruatie" (LEDGER #383): the two plain choices. */
function cycleChoices(a: Asked): LocalReply | null {
  const en = /\b(?:without|no) (?:a )?periods?\b|\bperimenopaus\w*\b|\bwhy\b.*\bno\b.*\b(?:next period|estimate)\b/.test(a.f);
  const nl = /\bzonder (?:een )?menstruatie\b|\bgeen menstruatie\b|\bperimenopauze\b|\bwaarom\b.*\bgeen\b.*\b(?:schatting|volgende menstruatie)\b/.test(a.f);
  if (!(en || nl)) return null;
  const got = cycleOf(a); if ('reply' in got) return got.reply;
  const rec = got.rec, state = say(a.lang, `“No period” is ${rec.noPeriod ? 'on' : 'off'}; the perimenopause words are ${rec.peri ? 'on' : 'off'}.`, `“No period” staat ${rec.noPeriod ? 'aan' : 'uit'}; de woorden voor de perimenopauze staan ${rec.peri ? 'aan' : 'uit'}.`);
  return answer(`${say(a.lang, 'Yes. In Health → Diary → Cycle log → What you track: “No period” hides the flow buttons and the next-period line and keeps every word and note; “Perimenopause words” adds hot flushes, night sweats, joint aches and brain fog to log, with nothing read into them.', 'Ja. In Health → Diary → Cycle log → What you track: “No period” verbergt de knoppen voor bloedverlies en de regel over de volgende menstruatie en bewaart elk woord en elke notitie; “Perimenopause words” voegt opvliegers, nachtzweten, gewrichtspijn en hersenmist toe om te noteren, zonder dat er iets uit wordt afgeleid.')} ${state} ${line(a)}`, CYCLE_CALLS);
}

/** "do late meals go with my sleep", "slaap ik anders na een late maaltijd" (LEDGER #371): Compare's own result. */
function lateMealSleep(a: Asked): LocalReply | null {
  const en = /\blate (?:meals?|dinners?|eating|snacks?|food)\b.*\bsleep\w*\b|\bsleep\w*\b.*\blate (?:meals?|dinners?|eating|snacks?|food)\b|\beat(?:ing)? late\b.*\bsleep\w*\b|\bsleep\w*\b.*\beat(?:ing)? late\b/.test(a.f);
  const nl = /\blate (?:maaltijd\w*|avondeten|eten|snack\w*)\b.*\bslaap\w*\b|\bslaap\w*\b.*\blate (?:maaltijd\w*|avondeten|eten|snack\w*)\b|\blaat (?:eet|eten|gegeten)\b.*\bslaap\w*\b|\bslaap\w*\b.*\blaat (?:eet|eten|gegeten)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const food = (a.env as {foodPlus?: FoodPlus | null}).foodPlus ?? null, rule = lateMealRule(food);
  const src: CompareSources = {health: a.env.health, foodPlus: food, zone: a.env.healthZone};
  const r = compare(src, 'late-meal', 'sleep', 'same', a.env.healthDay);
  const what = say(a.lang, `${rule.kcal} kcal or more logged in the ${rule.hours === 1 ? 'hour' : `${rule.hours} hours`} before bed`, `${rule.kcal} kcal of meer gelogd in ${rule.hours === 1 ? 'het uur' : `de ${rule.hours} uur`} voor het slapengaan`);
  if (!r) return answer(say(a.lang, `There is nothing to compare yet: Compare needs food logged with its time and your nights in Health → Sleep. Then Health → Insights → Compare → “Late meal (from your food log)” sets the nights after days with ${what} beside the others.`, `Er is nog niets te vergelijken: Compare heeft eten met de tijd erbij en je nachten in Health → Sleep nodig. Dan zet Health → Insights → Compare → “Late meal” de nachten na dagen met ${what} naast de andere.`), HEALTH_CALLS);
  const h = (m: number) => `${Math.floor(Math.round(m) / 60)} h ${String(Math.round(m) % 60).padStart(2, '0')} min`;
  if (r.state === 'pending') return answer(say(a.lang, `Not enough days yet: ${r.counts} (days with ${what}), and a comparison needs ${r.need} on each side. It says what happened together, never a cause.`, `Nog niet genoeg dagen: ${r.withDays} met, ${r.withoutDays} zonder (dagen met ${what}), en een vergelijking heeft er ${r.need} aan elke kant nodig. Het zegt wat samen gebeurde, nooit een oorzaak.`), HEALTH_CALLS);
  const nums = say(a.lang, `${h(r.withValue!)} on those nights, ${h(r.withoutValue!)} on the others`, `${h(r.withValue!)} na die dagen, ${h(r.withoutValue!)} na de andere`);
  if (r.state === 'unclear') return answer(say(a.lang, `From your last 90 days (${r.counts}): ${nums}. The two are close, so this is not a finding. It is what happened together, never a cause.`, `Uit je laatste 90 dagen (${r.withDays} met, ${r.withoutDays} zonder): ${nums}. Die liggen dicht bij elkaar, dus dit is geen bevinding. Het is wat samen gebeurde, nooit een oorzaak.`), HEALTH_CALLS);
  return answer(say(a.lang, `${r.sentence} (${r.counts}, your last 90 days.) Something else could explain it: ${r.confounder}. It is what happened together, never a cause.`, `Op dagen met ${what} sliep je die nacht gemiddeld ${h(r.withValue!)}; na andere dagen ${h(r.withoutValue!)} (${r.withDays} met, ${r.withoutDays} zonder, je laatste 90 dagen). Iets anders kan het verklaren, zoals late avonden of plannen met anderen. Het is wat samen gebeurde, nooit een oorzaak.`), HEALTH_CALLS);
}

const PART_NL: Record<string, string> = {morning: 'ochtend', afternoon: 'middag', evening: 'avond'};
/** "can I get one reminder for each part of the day", "kan ik één herinnering per dagdeel krijgen" (LEDGER #369). */
function habitParts(a: Asked): LocalReply | null {
  const en = /\b(?:one|a single) reminder\b.*\b(?:part of the day|parts of the day|morning|afternoon|evening)\b|\breminders? (?:for|per|each) part of the day\b|\bparts? of the day\b.*\breminders?\b/.test(a.f);
  const nl = /\been herinnering\b.*\b(?:dagdeel|dagdelen|ochtend|middag|avond)\b|\bherinnering\w* (?:per|voor elk) dagdeel\b|\bdagde\w*\b.*\bherinnering\w*\b/.test(a.f);
  if (!(en || nl)) return null;
  const how = say(a.lang, 'Yes: Settings → Notifications → under Habits due, tick “One reminder for each part of the day”. At the start of the morning, the afternoon and the evening (times you set) it says how many of that part’s habits are still open, in place of one reminder per habit; Anytime habits keep their own. Names only if names are on; quiet hours apply.',
    'Ja: Settings → Notifications → onder Habits due, vink “One reminder for each part of the day” aan. Aan het begin van de ochtend, de middag en de avond (tijden die je kiest) zegt die hoeveel gewoontes van dat dagdeel nog open staan, in plaats van één herinnering per gewoonte; Anytime-gewoontes houden hun eigen. Namen alleen als namen aan staan; stille uren gelden.');
  if (closed(a.env, 'habits') || !a.env.habits) return answer(how);
  const today = a.env.habitDay, open = HABIT_PARTS.map(p => ({p, n: a.env.habits!.habits.filter(h => h.timeOfDay === p && ['due', 'partial'].includes(habitDay(h, today, today).status)).length}));
  const now = open.map(o => a.lang === 'nl' ? `${PART_NL[o.p]} ${o.n}` : `${o.p} ${o.n}`).join(', ');
  return answer(`${how} ${say(a.lang, `Still open today: ${now}.`, `Nog open vandaag: ${now}.`)}`, [{tool: 'list_habits', args: {}, label: 'Habits'}]);
}

const MOOD_NL = ['Zwaar', 'Laag', 'Oké', 'Goed', 'Top'];
/** "can I see my moods on the timeline", "zie ik mijn stemming op de tijdlijn" (LEDGER #370): today's marks, in words. */
function moodTimeline(a: Asked): LocalReply | null {
  const en = /\b(?:moods?|feelings?|check ?ins?)\b.*\btimeline\b|\btimeline\b.*\b(?:moods?|feelings?|check ?ins?)\b/.test(a.f);
  const nl = /\b(?:stemming\w*|gevoel\w*|check ?ins?)\b.*\btijdlijn\b|\btijdlijn\b.*\b(?:stemming\w*|gevoel\w*|check ?ins?)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const day = a.env.healthDay, marks = moodMarks(day, a.env.health, a.env.energy ?? null, a.env.healthZone);
  const how = say(a.lang, 'Yes: the Day Timeline shows the day’s mood, energy and feeling words as small marks at the time you gave them, in words as well as colour, while Health is shown.', 'Ja: de Day Timeline toont de stemming, energie en gevoelswoorden van de dag als kleine markeringen op het moment dat je ze gaf, in woorden en in kleur, zolang Health zichtbaar is.');
  if (!marks.length) return answer(`${how} ${say(a.lang, 'Nothing is noted for today yet.', 'Voor vandaag is er nog niets genoteerd.')}`, HEALTH_CALLS);
  const nlTitle = (t: string) => t.replace(/^Mood: (\w+) \((\d) of 5\)$/, (_, _w, n) => `Stemming: ${MOOD_NL[Number(n) - 1]} (${n} van 5)`).replace(/^Energy: (\d) of 5$/, 'Energie: $1 van 5').replace(/^Feeling: /, 'Gevoel: ').replace(/\(a little\)/g, '(een beetje)').replace(/\(quite\)/g, '(best)').replace(/\(very\)/g, '(heel)');
  const items = marks.map(m => `${a.lang === 'nl' ? nlTitle(m.title) : m.title}${m.time ? say(a.lang, ` at ${clockIn('en', m.time)}`, ` om ${m.time}`) : ''}`);
  return answer(`${how} ${say(a.lang, `Today: ${list(items, 'en')}.`, `Vandaag: ${list(items, 'nl')}.`)}`, HEALTH_CALLS);
}

const ANSWERS: readonly ((a: Asked) => LocalReply | null)[] = [cycleGlanceAnswer, cycleAverages, cycleWords, cycleChoices, lateMealSleep, habitParts, moodTimeline];
