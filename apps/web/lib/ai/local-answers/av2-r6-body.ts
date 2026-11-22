import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {healthGroupIn} from '../../vault/w-homes';
import {emptyMeditation} from '../../meditation/schema';
import {consistency, consistencyLine} from '../../meditation/consistency';
import {currentDayEnds} from '../../day-boundary-core';
import {dayEndLabel} from '../../day-boundary';
import {MAX_RANGE_DAYS} from '../../meditation/engine';
import {GROUNDING} from '../../calm/grounding';
import {liftsOf} from '../../mood-words/lifts';
import {openBringUp, type BringUp} from '../../clinician-report/bring-up';
import {tonight} from '../../sleep/tonight';
import {dailySeries} from '../../sleep/engine';
import {efficiencyOf} from '../../sleep/longer';
import {formatMinutes} from '../../zone-time';
import {countOn, nameOf, PORTION_WORDS, readPortions, weekCount, type BuiltInPortion} from '../../food-plus/portions';
import {exerciseHistory, finished} from '../../workouts/engine';
import {allExercises} from '../../workouts/library';
import {defaultsWords} from '../../workouts/r6-gym';
import {emptyWorkouts, type Workouts} from '../../workouts/schema';
import {formatClock, formatNumber} from '../../visual-format';

/**
 * Session AV lane 2, round 6 (r6-body; Medito, Moodfit, AutoSleep, Lifesum, Caliber): NOVA's and ZIGi's on-device answers
 * to the round's Health features, in English and Dutch, each read from the feature's own pure function (the same figures
 * the page shows), behind Health's gate. Every pattern reads the whole question; a question with an action in it is left
 * alone. Never a calorie figure, never a medical reading or advice; the person's low-day page is never read (only where
 * it is), and the lines to bring up are counted, not quoted. Wired into engine.ts by the lead, beside `av2R5GymAnswer`.
 * The workout log comes from the AK tool sources (`workouts`, wired); the list to bring up from `ak.bringUp` once the lead
 * wires `bringUp: one(BRING_UP)` (until then the answer says where the list is).
 */
export function av2R6BodyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Ak = {workouts?: Workouts | null; bringUp?: BringUp | null};
const ak = (a: Asked) => (a.env.ak ?? {}) as Ak;
const logOf = (a: Asked): Workouts => ak(a).workouts ?? emptyWorkouts();
const CALLS = [{tool: 'health_summary', args: {}, label: 'Health summary'}];
const meditationOf = (a: Asked) => (a.env.health ? healthGroupIn(a.env.health, 'meditation') : undefined) ?? emptyMeditation();
const sleepOf = (a: Asked) => (a.env.health ? healthGroupIn(a.env.health, 'sleep') : undefined) ?? {version: 1 as const, nights: []};
const minNl = (m: number) => formatMinutes(m);
const kg = (v: number) => `${formatNumber(Math.round(v * 10) / 10, {maximumFractionDigits: 1})} kg`;
const kgNl = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString('nl-NL')} kg`;

/** "which day does a late meditation count on", "op welke dag telt een late meditatie" (LEDGER #411). */
function medDayAnswer(a: Asked): LocalReply | null {
  const en = /\bwhich day\b.*\b(?:late|night|midnight)\b.*\bmeditat\w*\b|\bwhich day\b.*\bmeditat\w*\b.*\b(?:late|after midnight|count)\b|\bmeditat\w* after midnight\b.*\b(?:count|yesterday)\b/.test(a.f);
  const nl = /\bop welke dag\b.*\b(?:late|nachtelijke)\b.*\bmeditatie\b|\bop welke dag telt\b.*\bmeditatie\b|\bmeditatie na middernacht\b.*\b(?:telt|gisteren)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const ends = currentDayEnds().endsAt, at = dayEndLabel(ends), lang = a.lang;
  if (!ends) return answer(say(lang, 'Your day ends at midnight (Settings → My day ends at), so a session counts on the calendar day it began. With a later end, such as 3:00, a 1:00 session counts on the evening before, as your habits do.', 'Je dag eindigt om middernacht (Settings → My day ends at), dus een sessie telt op de kalenderdag waarop hij begon. Met een later einde, zoals 3:00, telt een sessie om 1:00 op de avond ervoor, net als je gewoontes.'), CALLS);
  return answer(say(lang, `Your day ends at ${at} (Settings → My day ends at), so a session that begins between midnight and ${at} counts on the evening before: in your minutes, the weekly bars, the days in a row and your weekly goal, as your habits do.`, `Je dag eindigt om ${at} (Settings → My day ends at), dus een sessie die tussen middernacht en ${at} begint telt op de avond ervoor: in je minuten, de weekbalken, de dagen op rij en je weekdoel, net als je gewoontes.`), CALLS);
}

/** "how consistent is my meditation", "hoe consequent mediteer ik" (LEDGER #413). */
function consistencyAnswer(a: Asked): LocalReply | null {
  const en = /\bhow consistent\b.*\bmeditat\w*\b|\bmeditation consistency\b|\bmy consistency\b.*\bmeditat\w*\b|\bhow many of the last (?:30|90|thirty|ninety) days\b.*\bmeditat\w*\b/.test(a.f);
  const nl = /\bhoe consequent\b.*\b(?:mediteer\w*|meditatie)\b|\bmeditatie\b.*\bconsequent\w*\b|\bhoeveel van de laatste (?:30|90) dagen\b.*\bgemediteerd\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const window = /\b(?:90|ninety)\b/.test(a.f) ? 90 : 30, c = consistency(meditationOf(a), a.env.healthDay, window), lang = a.lang;
  if (!c) return answer(say(lang, 'No meditation session is logged yet. Your consistency shows in Health → Meditation after your first one: the days with a session out of the last 30 or 90. Rest days are fine.', 'Er is nog geen meditatiesessie gelogd. Je regelmaat staat in Health → Meditation na je eerste sessie: de dagen met een sessie van de laatste 30 of 90. Rustdagen zijn prima.'), CALLS);
  return answer(`${consistencyLine(c, lang)} ${say(lang, 'A rest day only moves the window on; it never takes away a day already counted.', 'Een rustdag schuift alleen het venster op; hij haalt nooit een getelde dag weg.')}`, CALLS);
}

/** "can I log meditation for several days at once", "kan ik meditatie voor meerdere dagen tegelijk loggen" (LEDGER #415). */
function rangeAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:several|multiple|many|past|previous)\b.*\bdays?\b.*\bmeditat\w*\b|\bmeditat\w*\b.*\b(?:several|multiple|past|previous) days\b/.test(a.f) || /\bmeditatie\b.*\b(?:meerdere|vorige|eerdere) dagen\b|\b(?:meerdere|vorige|eerdere) dagen\b.*\bmeditatie\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  return answer(say(a.lang, `Yes. In Health → Meditation, under "Log mindful minutes", open "Several days": choose the first and the last day (up to ${MAX_RANGE_DAYS}), the time and the minutes. One session is logged a day; a day that already has a session at that time is skipped, and one Undo takes them all away.`, `Ja. Open in Health → Meditation onder "Log mindful minutes" het deel "Several days": kies de eerste en de laatste dag (tot ${MAX_RANGE_DAYS}), de tijd en de minuten. Er komt één sessie per dag; een dag die al een sessie op die tijd heeft wordt overgeslagen, en één keer Ongedaan maken haalt ze allemaal weg.`), CALLS);
}

/** "how does the grounding exercise work", "hoe werkt de aardingsoefening" (LEDGER #414). */
function groundingAnswer(a: Asked): LocalReply | null {
  if (!(/\bgrounding\b|\b5 4 3 2 1\b|\bfive four three two one\b/.test(a.f) || /\baardingsoefening\b|\baarden\b.*\boefening\b|\bvijf vier drie twee een\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const steps = (lang: 'en' | 'nl') => list(GROUNDING.map(s => (lang === 'nl' ? s.nl : s.en).toLowerCase()), lang);
  return answer(say(a.lang, `In Health → Meditation, "Five, four, three, two, one" takes one sense at a time: ${steps('en')}. A word for each, or skip; nothing is kept unless you save the words as a journal line. It is also in Dutch.`, `In Health → Meditation neemt "Five, four, three, two, one" één zintuig tegelijk: ${steps('nl')}. Een woord voor elk, of sla over; er wordt niets bewaard tenzij je de woorden als regel in je dagboek opslaat. Hij is er ook in het Nederlands.`), CALLS);
}

/** "what lifts me", "wat beurt mij op" (LEDGER #412): the person's own list, as written. */
function liftsAnswer(a: Asked): LocalReply | null {
  if (!(/\bwhat lifts me\b|\b(?:things|list) (?:that|of things that) lifts? me\b|\bwhat (?:things )?lift me up\b/.test(a.f) || /\bwat beurt (?:mij|me) op\b|\bdingen die (?:mij|me) opbeuren\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lines = liftsOf(a.env.energy ?? null), lang = a.lang;
  if (!lines.length) return answer(say(lang, 'Your list of what lifts you is empty. When you choose an unpleasant feeling word, "What lifts you" lets you add a few small things of your own, and on a harder day one tap makes one a task for today.', 'Je lijst met wat je opbeurt is leeg. Kies je een onprettig gevoelswoord, dan kun je bij "What lifts you" een paar kleine dingen van jezelf toevoegen, en op een zwaardere dag maakt één tik er een taak voor vandaag van.'), CALLS);
  return answer(say(lang, `Your own list of what lifts you: ${list(lines, 'en')}. It shows first when you choose an unpleasant feeling word, with "Make it a task for today".`, `Je eigen lijst met wat je opbeurt: ${list(lines, 'nl')}. Die staat bovenaan als je een onprettig gevoelswoord kiest, met een knop om er een taak voor vandaag van te maken.`), CALLS);
}

/** "where is my plan for a low day", "waar is mijn plan voor een mindere dag" (LEDGER #416): where it is; never its words. */
function lowDayAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:plan|page)\b.*\b(?:low|bad|hard|rough) day\b|\b(?:low|bad|hard|rough) day\b.*\b(?:plan|page)\b/.test(a.f) || /\b(?:plan|pagina)\b.*\b(?:mindere|slechte|zware) dag\b|\b(?:mindere|slechte|zware) dag\b.*\b(?:plan|pagina)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  return answer(say(a.lang, 'Your "On a low day" page is in Health → Meditation (also one tap from an unpleasant check-in): small things that help you, people you could message and things that can wait, in your own words. It stays on this device and is not read by ZIGi. If you might hurt yourself or are in danger, call 112 now; in the Netherlands 113 or 0800-0113, elsewhere findahelpline.com.', 'Je pagina "On a low day" staat in Health → Meditation (ook met één tik vanuit een onprettige check-in): kleine dingen die je helpen, mensen die je een bericht kunt sturen en dingen die kunnen wachten, in je eigen woorden. Hij blijft op dit apparaat en ZIGi leest hem niet. Ben je in gevaar of denk je eraan jezelf iets aan te doen, bel dan nu 112; in Nederland 113 of 0800-0113, elders findahelpline.com.'), CALLS);
}

/** "what do I want to bring up at my next appointment", "wat wil ik bespreken bij mijn volgende afspraak" (LEDGER #417). */
function bringUpAnswer(a: Asked): LocalReply | null {
  if (!(/\bbring up\b.*\b(?:appointment|visit|doctor|gp)\b|\b(?:appointment|visit)\b.*\bbring up\b|\blist to bring up\b/.test(a.f) || /\bbespreken\b.*\b(?:afspraak|bezoek|huisarts|dokter)\b|\b(?:afspraak|bezoek)\b.*\bbespreken\b|\blijst om te bespreken\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const rec = ak(a).bringUp, open = openBringUp(rec), lang = a.lang;
  const where = say(lang, 'Settings → Your data → Report for a visit → "To bring up at your next visit"; the lines print at the top of your report.', 'Settings → Your data → Report for a visit, onder "To bring up"; de regels staan bovenaan je rapport.');
  if (rec === undefined) return answer(say(lang, `Your list is in ${where}`, `Je lijst staat in ${where}`), CALLS);
  if (!open.length) return answer(say(lang, `Nothing is on your list to bring up. Add a line in ${where}`, `Er staat niets op je lijst om te bespreken. Voeg een regel toe in ${where}`), CALLS);
  return answer(say(lang, `${open.length} ${open.length === 1 ? 'line is' : 'lines are'} on your list to bring up, in ${where}`, `Er ${open.length === 1 ? 'staat 1 regel' : `staan ${open.length} regels`} op je lijst om te bespreken, in ${where}`), CALLS);
}

/** "what time is my bedtime tonight", "wanneer is mijn bedtijd vanavond" (LEDGER #419): a fact from the goal, never "you must". */
function bedtimeAnswer(a: Asked): LocalReply | null {
  if (!(/\bbedtime tonight\b|\btonight(?:'| )?s bedtime\b|\bwhat time\b.*\bbed tonight\b.*\b(?:goal|wake)\b|\bwhen\b.*\bbed tonight\b.*\b(?:sleep goal|wake)\b/.test(a.f) || /\bbedtijd vanavond\b|\bhoe laat\b.*\bvanavond naar bed\b.*\b(?:doel|wakker)\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const t = tonight(sleepOf(a), a.env.healthDay, null, a.env.healthZone), lang = a.lang;
  if (t.kind === 'no-goal') return answer(say(lang, 'Tonight’s bedtime needs your own sleep goal: set it in Health → Sleep, and the bedtime is worked out from it and your usual wake time.', 'De bedtijd van vanavond heeft je eigen slaapdoel nodig: stel het in bij Health → Sleep, dan wordt de bedtijd berekend uit dat doel en je gewone wektijd.'), CALLS);
  if (t.kind === 'window') return answer(say(lang, `Your bedtime window: ${formatClock(t.from)}–${formatClock(t.to)}, for your ${formatMinutes(t.goal)}.`, `Je bedtijdvenster: ${t.from}–${t.to}, voor je ${minNl(t.goal)}.`), CALLS);
  if (t.kind === 'needs-wake') return answer(say(lang, `Tonight’s bedtime needs your usual wake time: log 4 nights in 14 days (${t.wakes} so far), or type tomorrow's wake time in Health → Sleep → Tonight.`, `De bedtijd van vanavond heeft je gewone wektijd nodig: log 4 nachten in 14 dagen (${t.wakes} tot nu toe), of typ de wektijd van morgen in Health → Sleep → Tonight.`), CALLS);
  const fall = t.latency !== null ? say(lang, `, with your usual ${formatMinutes(t.latency)} to fall asleep`, `, met je gewone ${minNl(t.latency)} om in slaap te vallen`) : '';
  return answer(say(lang, `Bed by ${formatClock(t.bed)} for your ${formatMinutes(t.goal)} before your usual ${formatClock(t.wake)} wake${fall}. From your own sleep goal and last 14 nights; a fact, not advice.`, `Naar bed om ${t.bed} voor je ${minNl(t.goal)} vóór je gewone wektijd van ${t.wake}${fall}. Uit je eigen slaapdoel en je laatste 14 nachten; een feit, geen advies.`), CALLS);
}

/** "how much of my time in bed was I asleep", "hoeveel van mijn tijd in bed sliep ik" (LEDGER #423). */
function efficiencyAnswer(a: Asked): LocalReply | null {
  if (!(/\bsleep efficiency\b|\bhow much of (?:my|the) time in bed\b.*\basleep\b|\btime asleep (?:of|out of) (?:my )?time in bed\b/.test(a.f) || /\bslaapefficientie\b|\bhoeveel van mijn tijd in bed\b.*\bsliep\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const e = efficiencyOf(dailySeries(sleepOf(a), a.env.healthDay, 7)), lang = a.lang;
  if (!e) return answer(say(lang, 'No night is logged in the last 7 days. Log one in Health → Sleep and each night shows its time asleep of its time in bed.', 'Er is de laatste 7 dagen geen nacht gelogd. Log er een in Health → Sleep en elke nacht toont zijn tijd in slaap van zijn tijd in bed.'), CALLS);
  const est = e.estimated ? say(lang, ' An estimate: on some nights the time to fall asleep or the time awake was not typed.', ' Een schatting: op sommige nachten is de tijd om in slaap te vallen of wakker te liggen niet ingevuld.') : '';
  return answer(say(lang, `Over the last 7 days (${e.nights} ${e.nights === 1 ? 'night' : 'nights'}): asleep ${formatMinutes(e.asleep)} of ${formatMinutes(e.inBed)} in bed a night on average (${e.percent} %).${est}`, `Over de laatste 7 dagen (${e.nights} ${e.nights === 1 ? 'nacht' : 'nachten'}): gemiddeld ${minNl(e.asleep)} geslapen van ${minNl(e.inBed)} in bed per nacht (${e.percent} %).${est}`), CALLS);
}

/** "how many portions of vegetables did I have today", "hoeveel porties groente heb ik vandaag gehad" (LEDGER #418). */
function portionsAnswer(a: Asked): LocalReply | null {
  if (!(/\bportions? of (?:fruit|vegetables?|veg|fish)\b|\bportions?\b.*\bcounted\b|\bportion counters?\b/.test(a.f) || /\bporties? (?:fruit|groente|vis)\b|\bporties?\b.*\bgeteld\b|\bportietellers?\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const p = readPortions(a.env.foodPlus ?? null), day = a.env.healthDay, lang = a.lang;
  if (!p.counters.length) return answer(say(lang, 'No portion counter is on. In Health → Diary, "Choose what to count" turns on fruit, vegetables, fish or up to three of your own; none is on until you choose it.', 'Er staat geen portieteller aan. In Health → Diary zet "Choose what to count" fruit, groente, vis of tot drie eigen tellers aan; er staat er geen aan tot je kiest.'), CALLS);
  const asked = (Object.keys(PORTION_WORDS) as BuiltInPortion[]).find(k => new RegExp(`\\b${PORTION_WORDS[k][lang].toLowerCase()}\\b|\\b${k === 'veg' ? 'vegetables?|veggies' : k}\\b`).test(a.f));
  const shown = asked ? p.counters.filter(c => c.id === asked) : p.counters;
  if (!shown.length) return answer(say(lang, `${PORTION_WORDS[asked!].en} is not counted. Turn it on in Health → Diary → "Change your counters".`, `${PORTION_WORDS[asked!].nl} wordt niet geteld. Zet het aan in Health → Diary, bij de portietellers.`), CALLS);
  const parts = shown.map(c => { const n = countOn(p, c.id, day), w = c.aim?.per === 'week' ? weekCount(p, c.id, day) : null; return lang === 'nl' ? `${nameOf(c, 'nl').toLowerCase()} ${n} vandaag${w !== null ? ` (${w} deze week)` : ''}${c.aim ? `, je doel ${c.aim.n} per ${c.aim.per === 'day' ? 'dag' : 'week'}` : ''}` : `${nameOf(c).toLowerCase()} ${n} today${w !== null ? ` (${w} this week)` : ''}${c.aim ? `, your aim ${c.aim.n} a ${c.aim.per}` : ''}`; });
  return answer(say(lang, `Portions counted: ${list(parts, 'en')}.`, `Getelde porties: ${list(parts, 'nl')}.`), CALLS);
}

/** "which exercises are my favourites", "welke oefeningen zijn mijn favorieten" (LEDGER #420). */
function favExercisesAnswer(a: Asked): LocalReply | null {
  if (!(/\bfavou?rite exercises?\b|\bexercises?\b.*\bfavou?rites?\b|\bstarred exercises?\b/.test(a.f) || /\bfavoriete oefeningen\b|\boefeningen\b.*\bfavorie\w*\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), names = new Map(allExercises(w.exercises).map(x => [x.id, x.name])), favs = (w.favouriteExercises ?? []).map(id => names.get(id)).filter((x): x is string => !!x), lang = a.lang;
  if (!favs.length) return answer(say(lang, 'No favourite exercises yet. Star one in Health → Workouts → "Exercises and how-tos" or in the list when you add one; favourites come first when you add an exercise.', 'Nog geen favoriete oefeningen. Geef een oefening een ster in Health → Workouts → "Exercises and how-tos" of in de lijst als je er een toevoegt; favorieten staan bovenaan als je een oefening toevoegt.'), CALLS);
  return answer(say(lang, `Your favourite exercises: ${list(favs, 'en')}. They come first when you add an exercise.`, `Je favoriete oefeningen: ${list(favs, 'nl')}. Ze staan bovenaan als je een oefening toevoegt.`), CALLS);
}

/** "which workouts are light weeks", "welke workouts zijn lichte weken" (LEDGER #421). */
function lightAnswer(a: Asked): LocalReply | null {
  if (!(/\blight weeks?\b|\bdeload\b|\bworkouts?\b.*\bleft out of (?:my )?bests\b/.test(a.f) || /\blichte weken?\b|\bdeload\b|\bworkouts?\b.*\btellen niet mee\b.*\brecords?\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const light = finished(logOf(a)).filter(x => x.light), lang = a.lang, today = a.env.healthDay;
  // Review B6Q-3: only a light week marked during the workout keeps a routine's kept weights clean (keep-weights.ts reads it at Finish).
  const when = say(lang, 'Mark a light week during the workout ("Light week (not in my bests)", above Finish workout) and a routine that keeps your last weights leaves its weights out too; marked afterwards under Health → Workouts → Your workouts, it is left out of your bests and "new best" marks only.',
    'Markeer een lichte week tijdens de workout ("Light week (not in my bests)", boven Finish workout), dan laat een routine die je laatste gewichten bewaart de gewichten ervan ook weg; markeer je hem achteraf onder Health → Workouts → Your workouts, dan blijft hij alleen buiten je records en de "new best"-markeringen.');
  if (!light.length) return answer(say(lang, `No workout is marked as a light week. ${when} Either way its sets stay in your history and volume.`, `Geen workout is als lichte week gemarkeerd. ${when} Hoe dan ook blijven de sets in je geschiedenis en volume.`), CALLS);
  const items = light.slice(0, 5).map(x => `${x.name} (${dayIn(lang, x.date, today)})`);
  return answer(say(lang, `Light weeks, left out of your bests: ${list(items, 'en')}. Their sets stay in your history and volume. ${when}`, `Lichte weken, buiten je records gelaten: ${list(items, 'nl')}. Hun sets blijven in je geschiedenis en volume. ${when}`), CALLS);
}

/** "when did I set my personal bests", "wanneer heb ik mijn persoonlijke records gezet" (LEDGER #422). */
function bestDaysAnswer(a: Asked): LocalReply | null {
  if (!(/\b(?:when|which days?|what days?)\b.*\b(?:set|reach\w*|get|got)\b.*\b(?:personal )?(?:bests|records|prs)\b|\bdays? of my (?:personal )?bests\b/.test(a.f) || /\b(?:wanneer|op welke dagen?)\b.*\b(?:persoonlijke )?records\b.*\b(?:gezet|gehaald|zette)\b|\b(?:wanneer|op welke dagen?)\b.*\b(?:zette|haalde)\b.*\brecords\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), lang = a.lang, today = a.env.healthDay, seen = new Set<string>(), rows: string[] = [];
  // Review B6P-7: at most four, across every workout (the break leaves both loops).
  workouts: for (const x of finished(w)) for (const e of x.exercises) {
    if (seen.has(e.exerciseId) || e.measure !== 'weight-reps') continue; seen.add(e.exerciseId);
    const h = exerciseHistory(w, e.exerciseId);
    if (h?.bestWeightKg && h.bestDays.bestWeightKg) rows.push(`${h.name} ${lang === 'nl' ? kgNl(h.bestWeightKg) : kg(h.bestWeightKg)} (${dayIn(lang, h.bestDays.bestWeightKg, today)})`);
    if (rows.length >= 4) break workouts;
  }
  if (!rows.length) return answer(say(lang, 'No best with a weight yet. After your first workouts each exercise in Health → Workouts → "Exercises and how-tos" shows its bests with the day you set them.', 'Nog geen record met een gewicht. Na je eerste workouts toont elke oefening in Health → Workouts → "Exercises and how-tos" zijn records met de dag waarop je ze zette.'), CALLS);
  return answer(say(lang, `Your heaviest sets and their days: ${list(rows, 'en')}. Light weeks and workouts before a fresh start are left out; each exercise's card shows all its bests.`, `Je zwaarste sets en hun dagen: ${list(rows, 'nl')}. Lichte weken en workouts vóór een nieuwe start tellen niet mee; de kaart van elke oefening toont al zijn records.`), CALLS);
}

/** "what are my exercise defaults", "wat zijn de standaardwaarden van mijn oefeningen" (LEDGER #424). */
function defaultsAnswer(a: Asked): LocalReply | null {
  if (!(/\bexercise defaults\b|\bdefaults? (?:sets|for my exercises)\b|\bexercises?\b.*\b(?:own )?defaults\b/.test(a.f) || /\bstandaardwaarden\b.*\boefening\w*\b|\boefening\w*\b.*\bstandaardwaarden\b/.test(a.f))) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const w = logOf(a), names = new Map(allExercises(w.exercises).map(x => [x.id, x.name])), lang = a.lang;
  const rows = Object.entries(w.exerciseDefaults ?? {}).map(([id, d]) => names.has(id) ? `${names.get(id)} ${defaultsWords(d)}` : null).filter((x): x is string => !!x);
  const nlRows = rows.map(r => r.replace(/min rest/, 'min rust').replace(/no rest timer/, 'geen rusttimer').replace(/ s rest/, ' s rust')); // Review B6Q-19(e): "1 set" and "3 sets" stay as defaultsWords says them
  if (!rows.length) return answer(say(lang, 'No exercise has defaults of its own. In Health → Workouts → "Exercises and how-tos", an exercise\'s "Its own defaults" keeps its sets, reps or time and rest, used when you add it with no earlier sets.', 'Geen oefening heeft eigen standaardwaarden. In Health → Workouts → "Exercises and how-tos" bewaart "Its own defaults" de sets, herhalingen of tijd en rust van een oefening, gebruikt als je hem toevoegt zonder eerdere sets.'), CALLS);
  return answer(say(lang, `Your exercises' own defaults: ${list(rows, 'en')}. They fill an exercise added with no earlier sets; your last sets still win.`, `Eigen standaardwaarden van je oefeningen: ${list(nlRows, 'nl')}. Ze vullen een oefening die je toevoegt zonder eerdere sets; je laatste sets gaan voor.`), CALLS);
}
const ANSWERS = [medDayAnswer, consistencyAnswer, rangeAnswer, groundingAnswer, liftsAnswer, lowDayAnswer, bringUpAnswer, bedtimeAnswer, efficiencyAnswer, portionsAnswer, favExercisesAnswer, lightAnswer, bestDaysAnswer, defaultsAnswer];
