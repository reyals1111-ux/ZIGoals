import {latestHabitRule} from '../../habits';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {runTool} from '../tools/registry';
import type {ToolOk} from '../tools/types';
import type {LocalReply, ToolCallRecord} from './engine';
import type {ReplyLanguage} from './no-model';
import {plural} from './words';

/**
 * Session AL Part 14 (lane P14-B): two of AI_SCOPE's rows answered on this device with no model.
 * - G15 (kind streak-break wording): "I broke my streak" got the examples list. Now the habit engine's own figures, said
 *   kindly: the streak ended, the days still count, one check-in starts a new one; never blame, never advice. A named
 *   habit whose streak still runs says so. With the person's own AI connected the wording is the model's
 *   (lib/ai/context/specialists.ts); its real-model check is in REAL_MODEL_TODO.md.
 * - HE17 (a meal photo with an estimate range), the assisted part: "Log a photo of my lunch" was read as a food named
 *   "Log a photo of my". The device cannot see a photo; it says what can (the person's own AI, which returns a range per
 *   nutrient and saves the middle) and offers the card that opens Health's own photo and barcode tools.
 */
const BREAK_EN = /\b(?:broke|broken|lost|ended|missed|reset|ruined|killed|snapped)\b.{0,40}\bstreaks?\b|\bstreaks?\b.{0,40}\b(?:broke|broken|is gone|was gone|ended|reset|is over|lost)\b/i;
const BREAK_NL = /\b(?:streak|reeks)\b.{0,40}\b(?:kwijt|verloren|gebroken|voorbij|weg)\b|\b(?:kwijt|verloren|gebroken)\b.{0,40}\b(?:streak|reeks)\b/i;
export const isStreakBreak = (q: string): boolean => BREAK_EN.test(q) || BREAK_NL.test(q);
type Streak = {current: number; best: number; unit: string};
const say = (lang: ReplyLanguage, en: string, nl: string) => lang === 'nl' ? nl : en;
const unitOf = (st: Streak) => st.unit.replace(/s$/, '');
/** The kind words for one habit's streak (also used by the engine when the person names the habit). */
export function streakBreakWords(title: string, st: Streak, lang: ReplyLanguage = 'en'): string {
  const u = unitOf(st);
  if (st.current > 0) return say(lang, `Your ${title} streak is still going: ${plural(st.current, u)} (longest: ${plural(st.best, u)}). A day that was not scheduled never breaks it.`,
    `Je reeks voor ${title} loopt nog: ${st.current} (langste: ${st.best}). Een dag die niet gepland was, breekt hem nooit.`);
  if (st.best > 0) return say(lang, `Your ${title} streak ended. Your longest was ${plural(st.best, u)}, and those days still count: every check-in stays in your history. One check-in starts a new streak.`,
    `Je reeks voor ${title} is gestopt. De langste was ${st.best}, en die dagen tellen nog: elke check-in blijft in je geschiedenis. Eén check-in begint een nieuwe reeks.`);
  return say(lang, `No ${title} streak yet: one check-in starts it.`, `Nog geen reeks voor ${title}: één check-in begint hem.`);
}
const streakOf = (env: ToolEnv, title: string): {st: Streak | null; record: ToolCallRecord} => {
  const args = {habit: clean(title, 60), metric: 'streak'}, result = runTool('habit_stats', args, env);
  return {st: result.ok ? ((result as ToolOk).data as {streak?: Streak}).streak ?? null : null, record: {tool: 'habit_stats', args, label: result.label}};
};
/** G15: "I broke my streak" with no habit named: the streaks that ended, kindly; or that none did. */
export function streakBreakReply(text: string, env: ToolEnv | null, lang: ReplyLanguage): LocalReply | null {
  if (!isStreakBreak(text)) return null;
  if (!env?.areas.habits) return null;
  const habits = env.habits.habits.filter(h => latestHabitRule(h).state === 'active').slice(0, 12);
  if (!habits.length) return {kind: 'answer', text: say(lang, 'No streak yet: the first check-in starts one.', 'Nog geen reeks: de eerste check-in begint er een.'), calls: []};
  const calls: ToolCallRecord[] = [], found: {title: string; st: Streak}[] = [];
  for (const h of habits) { const {st, record} = streakOf(env, h.title); calls.push(record); if (st) found.push({title: clean(h.title, 60), st}); }
  const named = found.filter(f => text.toLowerCase().includes(f.title.toLowerCase()));
  if (named.length === 1) return {kind: 'answer', text: streakBreakWords(named[0]!.title, named[0]!.st, lang), calls};
  const ended = found.filter(f => f.st.current === 0 && f.st.best > 0).sort((a, b) => b.st.best - a.st.best).slice(0, 3);
  if (!ended.length) {
    const running = found.filter(f => f.st.current > 0).sort((a, b) => b.st.current - a.st.current)[0];
    return {kind: 'answer', text: running ? say(lang, `None of your streaks has ended: ${running.title} is at ${plural(running.st.current, unitOf(running.st))}. A day that was not scheduled never breaks a streak.`, `Geen van je reeksen is gestopt: ${running.title} staat op ${running.st.current}. Een dag die niet gepland was, breekt geen reeks.`)
      : say(lang, 'No streak yet: the first check-in starts one.', 'Nog geen reeks: de eerste check-in begint er een.'), calls};
  }
  const list = ended.map(f => say(lang, `${f.title} (longest ${plural(f.st.best, unitOf(f.st))})`, `${f.title} (langste ${f.st.best})`)).join(', ');
  return {kind: 'answer', text: say(lang, `These streaks ended: ${list}. Those days still count: every check-in stays in your history, and one check-in starts each streak again.`,
    `Deze reeksen zijn gestopt: ${list}. Die dagen tellen nog: elke check-in blijft in je geschiedenis, en één check-in begint elke reeks opnieuw.`), calls};
}

const PHOTO = /\b(?:photo|picture|pic|image|snapshot|camera|foto|afbeelding)\b/i;
const MEAL = /\b(?:meal|food|lunch|dinner|breakfast|brunch|plate|snack|dish|calories|kcal|nutrition|macros|ate|eat|eaten|maaltijd|eten|ontbijt|avondeten|bord)\b/i;
/** A food label or a barcode has its own card (scan-food's label and barcode modes), never this one. */
export const isMealPhotoAsk = (q: string): boolean => PHOTO.test(q) && MEAL.test(q) && !/\b(?:label|barcode|etiket|streepjescode)\b/i.test(q);
/** HE17: a meal photo asked of the device: what can estimate it, and the card that opens Health's photo and barcode tools. */
export function mealPhotoReply(text: string, lang: ReplyLanguage): LocalReply | null {
  if (!isMealPhotoAsk(text)) return null;
  const block = '```zigoals-action\n{"kind":"scan-food","mode":"meal-photo"}\n```';
  return {kind: 'answer', calls: [], text: say(lang,
    `A photo of a meal is estimated by your own AI, once you connect one: attach the photo with the camera button and its card shows each nutrient as a range, saving the middle; nothing is logged until you add it. This device cannot see photos, so without an AI connected, log the food by its name or barcode instead.\n\n${block}`,
    `Een foto van een maaltijd schat je eigen AI, zodra je er een verbindt: voeg de foto toe met de cameraknop en de kaart toont elke voedingsstof als bereik en bewaart het midden; er wordt niets gelogd tot je het toevoegt. Dit apparaat ziet geen foto's, dus zonder AI log je het eten met de naam of de barcode.\n\n${block}`)};
}
