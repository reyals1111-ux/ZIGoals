import {latestHabitRule, type Habit} from '../../habits';
import {DIFFICULTY_WORDS, DIFFICULTY_XP, FOCUS_BONUS_XP, readHabitOptions, type HabitOptions} from '../../habit-options/rule';
import {areaWeekRows} from '../../habit-areas/week';
import {AREA_LABELS} from '../../habits-extras/areas-mirror';
import {THEME_DAYS, themeMonthsReached, themeProgress} from '../../game/month-theme';
import {readMuted} from '../../muted/rule';
import {loggedStrip, readCheckin, QUADRANT_IDS} from '../../checkin-extras/rule';
import {addLocalDays} from '../../local-date';
import {feelingTrends} from '../../feeling-trends/trends';
import {guideOfTheDay} from '../../meditation/guides';
import {DAILY_QUESTIONS, DAILY_QUESTIONS_NL} from '../../journal-prompts/daily';
import {JOURNAL_TEMPLATES} from '../../journal-prompts/templates';
import {PATTERNS, type BreathingPattern} from '../../meditation/breathing';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {answer, asked, closed, count, dayIn, isQuestion, list, MIXED, monthIn, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (habits pillar: habit options, areas' week, the monthly theme, rebirth, the daily check-in, written
 * practices): NOVA's and ZIGi's on-device answers, in English and Dutch, each reading the feature's own pure function
 * under its part of life's switch, as av-answers.ts and av-life.ts do. Every pattern reads the whole question, so nothing
 * else is claimed. Asked before the exact layer (the lead wires it into engine.ts beside avAnswer).
 */
export function av2HabitsAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || /^(?:bij|voor|met|in|for|on) (?:welke|which)\b/.test(a.f))) return null;
    for (const one of [wheneverHabits, neverTwiceOn, unloggedSkipped, habitDifficulty, habitOptionsOf, areasWeek, monthTheme, hiddenPrompts, dayLogged, ownWords, usualFeeling, todaysPractice]) {
      const r = one(a);
      if (r) return r;
    }
    return null;
  } catch { return null; }
}

const OPEN = [{tool: 'habits_due', args: {}, label: 'Open today'}];
const extrasOf = (a: Asked): unknown => a.env.ak?.habitExtras ?? null;
const live = (a: Asked) => a.env.habits.habits.filter(h => latestHabitRule(h).state !== 'archived');
const withOption = (a: Asked, test: (o: HabitOptions) => boolean) => { const o = readHabitOptions(extrasOf(a)); return live(a).filter(h => test(o[h.id] ?? {})); };
const names = (hs: readonly Habit[], lang: 'en' | 'nl') => list(hs.slice(0, 12).map(h => clean(h.title, 50)), lang);

/** LEDGER #50: "which habits have no schedule", "welke gewoontes hebben geen vaste dagen". */
function wheneverHabits(a: Asked): LocalReply | null {
  const en = /\bhabits?\b/.test(a.f) && /\b(?:no (?:set )?(?:schedule|days)|whenever|unscheduled|any day)\b/.test(a.f);
  const nl = /\bgewoontes?\b/.test(a.f) && /\b(?:geen (?:vast schema|schema|vaste dagen)|wanneer (?:ik )?(?:wil|maar)|ongepland|elke dag die ik wil)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const hs = withOption(a, o => !!o.whenever), lang = a.lang;
  if (!hs.length) return answer(say(lang, 'No habit is set to Whenever. On Habits, a daily habit’s Details → Habit options → “Whenever, no set days” makes one: log it any day, never due or missed.', 'Geen gewoonte staat op Whenever. Op Habits maakt Details → Habit options → “Whenever, no set days” van een dagelijkse gewoonte er een: log hem op elke dag, nooit gepland of gemist.'), OPEN);
  return answer(say(lang, `${count(hs.length, 'en', ['habit has', 'habits have'], ['', ''])} no set days (Whenever): ${names(hs, 'en')}. They are never due or missed; log them any day.`, `${count(hs.length, 'nl', ['', ''], ['gewoonte heeft', 'gewoontes hebben'])} geen vaste dagen (Whenever): ${names(hs, 'nl')}. Ze zijn nooit gepland of gemist; log ze op elke dag.`), OPEN);
}
/** LEDGER #49: "which habits keep my streak through a missed day", "bij welke gewoontes staat nooit twee keer missen aan". */
function neverTwiceOn(a: Asked): LocalReply | null {
  const en = /\bhabits?\b/.test(a.f) && /\b(?:never miss(?:ed)? twice|two day rule|2 day rule|keep (?:my )?streak through)\b/.test(a.f);
  const nl = /\bgewoontes?\b/.test(a.f) && /\b(?:nooit twee keer (?:missen|gemist)|nooit 2 keer (?:missen|gemist)|tweedagenregel|2 dagen regel)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const hs = withOption(a, o => !!o.twoDay), lang = a.lang;
  if (!hs.length) return answer(say(lang, 'No habit’s streak keeps a missed day yet: a missed day ends the streak, and “Never missed twice” shows beside it. Details → Habit options → “Never miss twice” turns it on for one habit.', 'Bij geen enkele gewoonte houdt de reeks een gemiste dag: een gemiste dag beëindigt de reeks, en “Never missed twice” staat ernaast. Details → Habit options → “Never miss twice” zet het aan voor één gewoonte.'), OPEN);
  return answer(say(lang, `Never miss twice is on for ${names(hs, 'en')}: one missed day keeps the streak, two in a row end it.`, `Nooit twee keer missen staat aan voor ${names(hs, 'nl')}: één gemiste dag houdt de reeks, twee op rij beëindigen hem.`), OPEN);
}
/** LEDGER #57: "which habits count an unlogged day as skipped". */
function unloggedSkipped(a: Asked): LocalReply | null {
  const en = /\bhabits?\b/.test(a.f) && /\b(?:unlogged|not logged|dont log|do not log|didnt log)\b/.test(a.f) && /\bskip(?:ped)?\b/.test(a.f);
  const nl = /\bgewoontes?\b/.test(a.f) && /\b(?:niet gelogde?|niet ingevulde?|niet log)\b/.test(a.f) && /\boverge?slagen\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const hs = withOption(a, o => !!o.unloggedSkip), lang = a.lang;
  if (!hs.length) return answer(say(lang, 'No habit counts an unlogged day as skipped: a past day left open counts as missed. Details → Habit options → “A day I don’t log counts as skipped” changes that for one habit.', 'Geen gewoonte telt een niet gelogde dag als overgeslagen: een open gebleven dag telt als gemist. Details → Habit options → “A day I don’t log counts as skipped” verandert dat voor één gewoonte.'), OPEN);
  return answer(say(lang, `An unlogged day counts as skipped (never breaking a streak) for ${names(hs, 'en')}.`, `Een niet gelogde dag telt als overgeslagen (de reeks blijft heel) voor ${names(hs, 'nl')}.`), OPEN);
}
/** LEDGER #45, #52: "how much XP does a hard habit give", "which habits are hard", "hoeveel XP geeft mijn gewoonte". */
function habitDifficulty(a: Asked): LocalReply | null {
  const en = /\bhabits?\b/.test(a.f) && /\b(?:difficulty|difficulties|how hard|hard habits?)\b|\bhow much xp (?:does|do) (?:a |my |each |every )?(?:\w+ )?habits? (?:give|earn)\b/.test(a.f);
  const nl = /\bgewoontes?\b/.test(a.f) && /\b(?:moeilijkheid|moeilijkheidsgraad|hoe zwaar|zware gewoontes?)\b|\bhoeveel xp (?:geeft|geven|levert|leveren) (?:een |mijn |elke )?(?:\w+ )?gewoontes?\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const o = readHabitOptions(extrasOf(a)), lang = a.lang;
  const set = live(a).filter(h => o[h.id]?.difficulty && o[h.id]!.difficulty !== 'easy');
  const rows = set.slice(0, 12).map(h => { const d = o[h.id]!.difficulty!; return `${clean(h.title, 50)} ${say(lang, DIFFICULTY_WORDS[d].en, DIFFICULTY_WORDS[d].nl).toLowerCase()} (${DIFFICULTY_XP[d]} XP)`; });
  const head = say(lang, `A done day earns ${DIFFICULTY_XP.easy} XP (Easy); Tiny ${DIFFICULTY_XP.trivial}, Medium ${DIFFICULTY_XP.medium}, Hard ${DIFFICULTY_XP.hard}. Today’s focus habit adds ${FOCUS_BONUS_XP} XP when done. XP counts with the game layer on.`, `Een gedane dag geeft ${DIFFICULTY_XP.easy} XP (Makkelijk); Heel klein ${DIFFICULTY_XP.trivial}, Gemiddeld ${DIFFICULTY_XP.medium}, Zwaar ${DIFFICULTY_XP.hard}. De focusgewoonte van vandaag geeft ${FOCUS_BONUS_XP} XP extra als hij gedaan is. XP telt met de spellaag aan.`);
  const tail = rows.length ? say(lang, ` Set: ${list(rows, 'en')}; every other habit is Easy.`, ` Ingesteld: ${list(rows, 'nl')}; elke andere gewoonte is Makkelijk.`) : say(lang, ' Every habit is Easy now; Details → Habit options → “How hard is it?” changes one.', ' Elke gewoonte is nu Makkelijk; Details → Habit options → “How hard is it?” verandert er een.');
  return answer(head + tail, OPEN);
}
/** "what are the options of my habit Walk", "welke opties heeft mijn gewoonte Walk". */
function habitOptionsOf(a: Asked): LocalReply | null {
  const m = /^(?:what|which) (?:are the |are )?options (?:(?:are )?(?:set |on )?(?:for|of) )?(?:my )?(?:habit )?(.+?)(?: habit)?$/.exec(a.f) ?? /^welke (?:opties|instellingen) (?:heeft|staan aan bij|gelden voor) (?:mijn |de )?(?:gewoonte )?(.+?)(?: gewoonte)?$/.exec(a.f);
  if (!m) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const want = m[1]!.trim(), habit = live(a).find(h => clean(h.title, 200).toLowerCase() === want || h.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === want);
  if (!habit) return null;
  const o = readHabitOptions(extrasOf(a))[habit.id] ?? {}, lang = a.lang, d = o.difficulty ?? 'easy';
  const parts = [o.whenever ? say(lang, 'Whenever (no set days)', 'Whenever (geen vaste dagen)') : null, o.twoDay ? say(lang, 'never miss twice', 'nooit twee keer missen') : null, o.unloggedSkip ? say(lang, 'an unlogged day counts as skipped', 'een niet gelogde dag telt als overgeslagen') : null, say(lang, `${DIFFICULTY_WORDS[d].en} (${DIFFICULTY_XP[d]} XP a done day)`, `${DIFFICULTY_WORDS[d].nl} (${DIFFICULTY_XP[d]} XP per gedane dag)`)].filter((p): p is string => !!p);
  return answer(say(lang, `${clean(habit.title, 60)}: ${list(parts, 'en')}. Its Details → Habit options change them.`, `${clean(habit.title, 60)}: ${list(parts, 'nl')}. Details → Habit options van de gewoonte verandert ze.`), OPEN);
}

const AREA_NL: Record<string, string> = {health: 'Gezondheid', mind: 'Gewoontes & geest', wealth: 'Geld', relationships: 'Relaties', career: 'Werk', learning: 'Leren', fun: 'Plezier'};
const areaName = (id: string, lang: 'en' | 'nl') => lang === 'nl' ? AREA_NL[id] ?? AREA_LABELS[id] ?? id : AREA_LABELS[id] ?? id;
/** LEDGER #53: "how are my areas doing this week", "hoe gaan mijn levensgebieden deze week". */
function areasWeek(a: Asked): LocalReply | null {
  const en = /\b(?:life )?areas?\b/.test(a.f) && /\b(?:this week|weekly|milestones?)\b/.test(a.f) && !/\bspend|budget|money\b/.test(a.f);
  const nl = /\b(?:levensgebieden|gebieden|levensgebied|gebied)\b/.test(a.f) && /\b(?:deze week|wekelijks|mijlpalen|mijlpaal)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang, extras = extrasOf(a), ids = new Set(Object.values((extras as {areas?: Record<string, unknown>} | null)?.areas ?? {}).filter((v): v is string => typeof v === 'string'));
  const areas = [...Object.keys(AREA_LABELS), ...[...ids].filter(id => !(id in AREA_LABELS))].map(id => ({id, label: areaName(id, lang)}));
  const rows = areaWeekRows(a.env.habits.habits, extras, areas, a.today);
  if (!rows.length) return answer(say(lang, 'No habit has a life area yet. On Habits, a habit’s Details → “◈ Choose an area” gives it one; “Your areas this week” then shows each area’s week and milestone.', 'Nog geen gewoonte heeft een levensgebied. Op Habits geeft Details → “◈ Choose an area” van een gewoonte er een; “Your areas this week” toont dan de week en mijlpaal van elk gebied.'), OPEN);
  const line = (r: typeof rows[number]) => say(lang, `${r.label}: ${r.done} of ${r.due} this week${r.goal > 0 ? `, milestone ${r.goal}${r.reached ? ' reached' : ''}` : ''}${r.weeksInRow > 1 ? `, ${r.weeksInRow} weeks in a row` : ''}`, `${r.label}: ${r.done} van ${r.due} deze week${r.goal > 0 ? `, mijlpaal ${r.goal}${r.reached ? ' gehaald' : ''}` : ''}${r.weeksInRow > 1 ? `, ${r.weeksInRow} weken op rij` : ''}`);
  return answer([say(lang, 'Your areas this week (check-ins done of due, Monday to Sunday):', 'Je gebieden deze week (check-ins gedaan van gepland, maandag tot zondag):'), ...rows.slice(0, 10).map(r => `• ${line(r)}`)].join('\n'), OPEN);
}
/** LEDGER #55: "what is this month's theme", "wat is het thema van deze maand". */
function monthTheme(a: Asked): LocalReply | null {
  const en = /\b(?:this months?|monthly|months) theme\b|\btheme (?:of|for) (?:this|the) month\b|\btheme month\b/.test(a.f);
  const nl = /\bthema (?:van|voor) (?:deze|de) maand\b|\bmaandthema\b|\bthema deze maand\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'habits'); if (shut) return shut;
  const lang = a.lang;
  if (a.env.game && !a.env.game.enabled) return answer(say(lang, 'The monthly theme is part of the game layer, which is off. Journey turns it on; nothing is stored but the switch.', 'Het maandthema hoort bij de spellaag, en die staat uit. Journey zet hem aan; er wordt alleen de schakelaar bewaard.'));
  if (a.env.game?.monthTheme === false) return answer(say(lang, 'The monthly theme is hidden. Journey → This month’s theme shows it again.', 'Het maandthema is verborgen. Journey → This month’s theme toont het weer.'));
  const month = a.today.slice(0, 7), p = themeProgress(a.env.habits.habits, extrasOf(a), month, a.today), t = p.theme, area = areaName(t.area, lang);
  const reached = themeMonthsReached(a.env.habits.habits, extrasOf(a), a.today);
  const where = p.inArea ? say(lang, `check-ins on your ${area} habits count`, `check-ins op je gewoontes in ${area} tellen`) : say(lang, `every habit counts, as none is in ${area} yet`, `elke gewoonte telt, want er staat er nog geen in ${area}`);
  const done = Math.min(p.days, THEME_DAYS);
  const past = reached.length ? say(lang, ` Months reached: ${list(reached.slice(-4).map(m => monthIn('en', m)), 'en')}.`, ` Gehaalde maanden: ${list(reached.slice(-4).map(m => monthIn('nl', m)), 'nl')}.`) : '';
  return answer(say(lang, `${monthIn('en', month)}’s theme: ${t.en}. ${t.lineEn} ${done} of ${THEME_DAYS} days with a check-in so far (${where})${p.reached ? '; reached, the Theme month badge is yours' : ''}.${past}`, `Het thema van ${monthIn('nl', month)}: ${t.nl}. ${t.lineNl} Tot nu toe ${done} van ${THEME_DAYS} dagen met een check-in (${where})${p.reached ? '; gehaald, de badge Theme month is van jou' : ''}.${past}`), OPEN);
}
/** LEDGER #56: "what have I hidden from my prompts", "welke vragen heb ik verborgen". */
function hiddenPrompts(a: Asked): LocalReply | null {
  const en = /\b(?:hidden|muted|hid|hide)\b/.test(a.f) && /\b(?:prompts?|questions?|templates?|breathing|patterns?|exercises?)\b/.test(a.f);
  const nl = /\b(?:verborgen|verstopt|uitgezet)\b/.test(a.f) && /\b(?:vragen|vraag|sjablonen|sjabloon|ademhaling|ademoefeningen|patronen|oefeningen)\b/.test(a.f);
  if (!en && !nl) return null;
  const lang = a.lang, m = readMuted(extrasOf(a));
  const qs = [...m.questions].sort((x, y) => x - y).map(i => (lang === 'nl' ? DAILY_QUESTIONS_NL : DAILY_QUESTIONS)[i]).filter((q): q is string => !!q).map(q => `“${q}”`);
  const ts = JOURNAL_TEMPLATES.filter(t => m.templates.has(t.id)).map(t => t.title[lang]);
  const bs = (Object.keys(PATTERNS) as BreathingPattern[]).filter(p => m.breathing.has(p)).map(p => PATTERNS[p].label);
  if (!qs.length && !ts.length && !bs.length) return answer(say(lang, 'Nothing is hidden: every daily question, template and breathing pattern is offered. “Don’t ask this again” under today’s question, or Journal → Start from a prompt → Hidden prompts and exercises, hides one.', 'Er is niets verborgen: elke dagvraag, elk sjabloon en elk ademhalingspatroon wordt aangeboden. “Don’t ask this again” onder de vraag van vandaag, of Journal → Start from a prompt → Hidden prompts and exercises, verbergt er een.'));
  const parts = [qs.length ? say(lang, `${count(qs.length, 'en', ['daily question', 'daily questions'], ['', ''])} (${list(qs.slice(0, 5), 'en')})`, `${count(qs.length, 'nl', ['', ''], ['dagvraag', 'dagvragen'])} (${list(qs.slice(0, 5), 'nl')})`) : null,
    ts.length ? say(lang, `templates: ${list(ts, 'en')}`, `sjablonen: ${list(ts, 'nl')}`) : null, bs.length ? say(lang, `breathing patterns: ${list(bs, 'en')}`, `ademhalingspatronen: ${list(bs, 'nl')}`) : null].filter((p): p is string => !!p);
  return answer(say(lang, `Hidden on this device: ${parts.join('; ')}. Journal → Start from a prompt → Hidden prompts and exercises brings them back.`, `Verborgen op dit apparaat: ${parts.join('; ')}. Journal → Start from a prompt → Hidden prompts and exercises haalt ze terug.`));
}
/** LEDGER #60, #68: "did I log today", "which days did I not log", "heb ik vandaag ingecheckt". Under the Health gate. */
function dayLogged(a: Asked): LocalReply | null {
  const en = /\b(?:day logged|log(?:ged)? (?:my|the) day|evening check ?in|check ?in (?:done|finished))\b|\bdid i (?:check in|log) (?:today|yesterday)\b|\bwhich days (?:did i not|didnt i|have i not) (?:log|check in)\b|\bdays? (?:not|i didnt) logged\b/.test(a.f);
  const nl = /\b(?:dag gelogd|avondcheck ?in|ingecheckt|dag afgerond)\b|\bwelke dagen (?:heb ik niet|niet) (?:gelogd|ingecheckt)\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, c = readCheckin(a.env.energy ?? null), strip = loggedStrip(c, a.today, 14, addLocalDays);
  const gaps = strip.filter(s => !s.logged).map(s => s.day), todayLogged = !!c.logged[a.today];
  if (gaps.length === 14) return answer(say(lang, 'No day is marked logged in the last 14 days. Health → Diary → Evening check-in goes through the day in six skippable steps and marks it “Day logged” at the end.', 'In de laatste 14 dagen is geen dag als gelogd gemarkeerd. Health → Diary → Evening check-in loopt de dag door in zes stappen die je kunt overslaan en markeert hem aan het eind als “Day logged”.'));
  const missing = gaps.slice(-5).map(d => dayIn(lang, d, a.today));
  return answer(say(lang, `${todayLogged ? 'Today is logged.' : 'Today is not logged yet.'} Last 14 days: ${14 - gaps.length} logged${gaps.length ? `; not yet: ${list(missing, 'en')}${gaps.length > 5 ? ` and ${gaps.length - 5} more` : ''}` : ''}.`, `${todayLogged ? 'Vandaag is gelogd.' : 'Vandaag is nog niet gelogd.'} Laatste 14 dagen: ${14 - gaps.length} gelogd${gaps.length ? `; nog niet: ${list(missing, 'nl')}${gaps.length > 5 ? ` en nog ${gaps.length - 5}` : ''}` : ''}.`));
}
/** LEDGER #61: "what are my own feeling words", "welke eigen gevoelswoorden heb ik". Under the Health gate. */
function ownWords(a: Asked): LocalReply | null {
  const en = /\b(?:my )?own (?:feeling |mood )?words\b|\bfeeling words (?:i|did i) add(?:ed)?\b/.test(a.f);
  const nl = /\beigen (?:gevoels)?woorden\b|\beigen gevoelswoord(?:en)?\b/.test(a.f);
  if (!en && !nl) return null;
  const shut = closed(a.env, 'health'); if (shut) return shut;
  const lang = a.lang, c = readCheckin(a.env.energy ?? null);
  const CORNER: Record<string, [string, string]> = {'high-unpleasant': ['high energy, unpleasant', 'veel energie, onprettig'], 'high-pleasant': ['high energy, pleasant', 'veel energie, prettig'], 'low-unpleasant': ['low energy, unpleasant', 'weinig energie, onprettig'], 'low-pleasant': ['low energy, pleasant', 'weinig energie, prettig']};
  const rows = QUADRANT_IDS.filter(q => c.ownWords[q].length).map(q => `${CORNER[q]![lang === 'nl' ? 1 : 0]}: ${list(c.ownWords[q].map(w => clean(w, 32)), lang)}`);
  if (!rows.length) return answer(say(lang, 'You have not added a feeling word of your own yet. In the feeling-word grid, open a corner and use “Your own word”.', 'Je hebt nog geen eigen gevoelswoord toegevoegd. Open in het raster met gevoelswoorden een hoek en gebruik “Your own word”.'));
  return answer(say(lang, `Your own feeling words: ${rows.join('; ')}.`, `Je eigen gevoelswoorden: ${rows.join('; ')}.`));
}
/** LEDGER #66: "how is my mood compared to usual", "hoe is mijn energie vergeleken met normaal". Mood and energy only (symptoms stay unread here). */
function usualFeeling(a: Asked): LocalReply | null {
  const enM = /\b(?:mood|energy|moods)\b/.test(a.f) && /\b(?:usual|normal|normally|baseline|trend|trends|last 90 days|compared)\b/.test(a.f);
  const nlM = /\b(?:stemming|humeur|energie)\b/.test(a.f) && /\b(?:normaal|gewoonlijk|meestal|trend|vergeleken|laatste 90 dagen)\b/.test(a.f);
  if (!enM && !nlM) return null;
  const shut = closed(a.env, 'health'); if (shut || !a.env.health) return shut;
  const lang = a.lang, {ready, pending} = feelingTrends({health: a.env.health, energy: a.env.energy ?? null}, a.today);
  const DIR = {up: ['up', 'hoger'], down: ['down', 'lager'], same: ['about the same', 'ongeveer gelijk']} as const;
  const NAME: Record<string, [string, string]> = {mood: ['Mood', 'Stemming'], energy: ['Energy', 'Energie']};
  const n = (v: number) => (Math.round(v * 10) / 10).toLocaleString(lang === 'nl' ? 'nl-NL' : 'en-US');
  const rows = ready.filter(t => t.id === 'mood' || t.id === 'energy').map(t => say(lang, `${NAME[t.id]![0]}: ${DIR[t.direction][0]} — last 90 days ${n(t.recent.value)} of 5 (${t.recent.days} days), your usual ${n(t.usual.value)} (${t.usual.days} days)`, `${NAME[t.id]![1]}: ${DIR[t.direction][1]} — laatste 90 dagen ${n(t.recent.value)} van 5 (${t.recent.days} dagen), je gewoonlijke ${n(t.usual.value)} (${t.usual.days} dagen)`));
  const waiting = pending.filter(p => p.id === 'mood' || p.id === 'energy').map(p => say(lang, `${NAME[p.id]![0]}: ${p.recentDays} of ${p.needRecent} days in the last 90, ${p.yearDays} of ${p.needYear} in the year`, `${NAME[p.id]![1]}: ${p.recentDays} van ${p.needRecent} dagen in de laatste 90, ${p.yearDays} van ${p.needYear} in het jaar`));
  if (!rows.length && !waiting.length) return answer(say(lang, 'No mood or energy is answered yet, so there is no usual to compare with. The day’s mood in Health → Diary and the energy rating fill it in.', 'Er is nog geen stemming of energie ingevuld, dus er is geen gewoonlijke waarde om mee te vergelijken. De stemming van de dag in Health → Diary en de energiescore vullen het in.'));
  const head = rows.length ? `${rows.join('. ')}.` : '';
  const tail = waiting.length ? say(lang, ` Not enough days yet: ${waiting.join('; ')}.`, ` Nog niet genoeg dagen: ${waiting.join('; ')}.`) : '';
  return answer(`${head}${tail}`.trim() + say(lang, ' Up or down describes your own answers, not whether that is good.', ' Hoger of lager beschrijft je eigen antwoorden, niet of dat goed is.'));
}
/** LEDGER #71, #77: "what is today's meditation", "wat is de meditatie van vandaag" — the written practice of the day (no record read). */
function todaysPractice(a: Asked): LocalReply | null {
  const en = /\btodays (?:meditation|practice|guided meditation)\b|\bmeditation (?:of|for) (?:the day|today)\b|\bdaily meditation\b/.test(a.f);
  const nl = /\bmeditatie van (?:vandaag|de dag)\b|\boefening van vandaag\b|\bdagelijkse meditatie\b/.test(a.f);
  if (!en && !nl) return null;
  const g = guideOfTheDay(a.today), lang = a.lang, t = g[lang];
  return answer(say(lang, `Today’s practice: “${t.title}”, ${g.minutes} minutes. It begins: ${t.steps[0]} Health → Meditation → Today’s practice has all of it, “Another one”, and Begin with the bell.`, `De oefening van vandaag: “${t.title}”, ${g.minutes} minuten. Hij begint zo: ${t.steps[0]} Health → Meditation → Today’s practice heeft de hele oefening, “Another one” en Begin met de bel.`));
}
