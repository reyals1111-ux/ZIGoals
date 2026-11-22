import {latestHabitRule, type Habit} from '../../habits';
import {DIFFICULTY_WORDS, DIFFICULTY_XP, FOCUS_BONUS_XP, readHabitOptions, type HabitOptions} from '../../habit-options/rule';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {answer, asked, closed, count, isQuestion, list, MIXED, say, type Asked} from './av-words';
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
    for (const one of [wheneverHabits, neverTwiceOn, unloggedSkipped, habitDifficulty, habitOptionsOf]) {
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
