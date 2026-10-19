import {findItemByName} from '../../checklist/commands';
import {isHealthItem, orderedItems} from '../../checklist/store';
import {latestHabitRule, habitRuleOn, type Habit} from '../../habits';
import type {ToolEnv} from '../tools/env';
import {checklistToday} from '../proactive/brief-sources';
import {listNames, shortName} from '../proactive/calm';

/**
 * Session AF (L4, P8.6): the Checklist by voice and text, decided on the device in English and Dutch. A command makes a
 * card the person adds (the usual whitelisted card, planned against the records), never a write by itself:
 * "mark push-ups done", "vink push-ups af" → checklist-tick; "add read 5 pages to my checklist", "zet 5 bladzijden lezen
 * op mijn lijst" → checklist-add-custom (or a star for a habit of that name); "favourite Read" → checklist-add-favourite;
 * "start my sleep timer", "start mijn slaaptimer" → start-night; a habit's timer and a fast likewise.
 *
 * The stop rule (anything else follows the existing routes, so the person's AI or the lookups decide): the whole message,
 * with its fillers, wake word and politeness taken off, matches one template; it has no question mark and no second clause;
 * a check names no amount; and the item it names resolves to exactly one dot on the path or one active habit (a timer: a
 * duration habit). Two equally good matches are said back as a question; no match is left to the other routes.
 */
export type CommandLang = 'en' | 'nl';
export type QuickReply = {kind: 'answer' | 'refusal'; text: string; command: string};
const FILLER = /^(?:(?:hey|hi|hello|ok|okay|so|um+|uh+|euh|eh|hé|hoi|zigi|nova|please|alsjeblieft|graag|even|eens|just|now|nu|dan|then),?\s+)+/i;
const POLITE_HEAD = /^(?:(?:can|could|would|will) you\s+(?:please\s+)?|(?:kun|kan|wil|zou) je\s+(?:even\s+|alsjeblieft\s+)?|i(?:'d| would) like (?:you )?to\s+)/i;
const POLITE_TAIL = /\s*,?\s*(?:please|for me|thanks|thank you|alsjeblieft|graag|voor mij|voor me|dank je|bedankt)\s*$/i;
/** The message as a command sees it: lower case, no wake word, fillers, politeness or closing full stop. */
export function commandText(text: string): string {
  let t = text.toLowerCase().replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) t = t.replace(FILLER, '').replace(POLITE_HEAD, '').replace(POLITE_TAIL, '').replace(/[.!]+$/, '').trim();
  return t;
}
const SECOND_CLAUSE = /[,;]|\b(?:and|then|also|after that|en|dan|daarna|ook)\b/;
/** A day other than today is the other routes' (the day cue, the person's AI): a command is for now. */
const OTHER_DAY = /\b(?:yesterday|tomorrow|last|next|ago|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|gisteren|eergisteren|morgen|vorige|volgende|geleden|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b|\d{4}-\d{2}-\d{2}/;
type Template = {lang: CommandLang; re: RegExp; make: (m: RegExpExecArray) => Parsed | null};
type Parsed = {verb: 'check' | 'uncheck' | 'add' | 'favourite' | 'sleep-start' | 'sleep-end' | 'timer-start' | 'timer-stop' | 'fast-start' | 'fast-stop' | 'list'; item?: string; hours?: number};
const item = (s: string | undefined) => s?.replace(/^(?:my|the|mijn|de|het|m'n)\s+/, '').trim() || undefined;
const T = (lang: CommandLang, re: RegExp, make: Template['make']): Template => ({lang, re, make});
const TEMPLATES: readonly Template[] = [
  // ---- English ----
  T('en', /^(?:start|begin) (?:my |the )?(?:sleep(?: timer| tracking)?|night)$/, () => ({verb: 'sleep-start'})),
  T('en', /^(?:i'm|i am) going to (?:bed|sleep)(?: now)?$/, () => ({verb: 'sleep-start'})),
  T('en', /^(?:stop|end) (?:my |the )?(?:sleep(?: timer| tracking)?|night)$/, () => ({verb: 'sleep-end'})),
  T('en', /^(?:i'm|i am) (?:up|awake)(?: now)?$|^i(?: just)? woke up$/, () => ({verb: 'sleep-end'})),
  T('en', /^(?:start|begin) (?:a |my |the )?(\d{1,2})(?:-| )?(?:hours?|h|hr) fast(?:ing)?$/, m => ({verb: 'fast-start', hours: Number(m[1])})),
  T('en', /^(?:stop|end|break) (?:my |the )?fast(?:ing)?$/, () => ({verb: 'fast-stop'})),
  T('en', /^(?:start|begin) (?:the |my )?timer (?:for|on) (.{2,40})$/, m => ({verb: 'timer-start', item: item(m[1])})),
  T('en', /^(?:start|begin) (?:the |my )?(.{2,40}?) timer$/, m => ({verb: 'timer-start', item: item(m[1])})),
  T('en', /^(?:stop|end|finish) (?:the |my )?(?:(.{2,40}?) )?timer$/, m => ({verb: 'timer-stop', item: item(m[1])})),
  T('en', /^what(?:'s| is) (?:left |still )?on my (?:checklist|check list|list|path)(?: today)?$|^(?:show|read) (?:me )?my (?:checklist|check list)$/, () => ({verb: 'list'})),
  T('en', /^(?:add|put) (.{2,60}?) (?:to|on|onto) (?:my |the )?(?:checklist|check list|list|path|orbit)(?: for today| today)?$/, m => ({verb: 'add', item: item(m[1])})),
  T('en', /^(?:favou?rite|star|pin) (.{2,60}?)(?: (?:on|to) (?:my |the )?(?:checklist|check list|list|path))?$/, m => ({verb: 'favourite', item: item(m[1])})),
  T('en', /^make (.{2,60}?) a favou?rite$/, m => ({verb: 'favourite', item: item(m[1])})),
  T('en', /^(?:untick|uncheck|unmark) (.{2,60})$/, m => ({verb: 'uncheck', item: item(m[1])})),
  T('en', /^mark (.{2,60}?) (?:as )?not done$|^(.{2,60}?) (?:is )?not done$/, m => ({verb: 'uncheck', item: item(m[1] ?? m[2])})),
  T('en', /^mark (.{2,60}?) (?:as )?(?:done|complete|completed|finished)(?: for today| today)?$/, m => ({verb: 'check', item: item(m[1])})),
  T('en', /^(?:tick|check|cross)(?: off)? (.{2,60}?)(?: (?:as )?(?:done|complete|completed))?(?: for today| today)?$/, m => /^(?:tick|cross)\b/.test(m[0]) || /\boff\b|\b(?:done|complete|completed)\b/.test(m[0]) ? {verb: 'check', item: item(m[1])} : null),
  T('en', /^done with (.{2,60})$|^(.{2,60}?) (?:is |are )?(?:done|finished|complete)(?: for today| today)?$/, m => ({verb: 'check', item: item(m[1] ?? m[2])})),
  // ---- Dutch ----
  T('nl', /^(?:start|begin) (?:mijn |de |m'n )?(?:slaaptimer|slaap ?timer|slaap|nacht)$/, () => ({verb: 'sleep-start'})),
  T('nl', /^ik ga (?:nu )?(?:slapen|naar bed)$/, () => ({verb: 'sleep-start'})),
  T('nl', /^stop (?:mijn |de |m'n )?(?:slaaptimer|slaap ?timer|slaap|nacht)$/, () => ({verb: 'sleep-end'})),
  T('nl', /^ik ben (?:net )?(?:wakker|op)$/, () => ({verb: 'sleep-end'})),
  T('nl', /^start (?:een |mijn )?(?:vasten|vast|vastenperiode) van (\d{1,2}) uur$|^start (?:een )?(\d{1,2})[- ]?uurs?[- ]?vast(?:en)?$/, m => ({verb: 'fast-start', hours: Number(m[1] ?? m[2])})),
  T('nl', /^stop (?:met )?(?:mijn |het )?vasten$/, () => ({verb: 'fast-stop'})),
  T('nl', /^start (?:de |mijn )?timer (?:voor|van) (.{2,40})$/, m => ({verb: 'timer-start', item: item(m[1])})),
  T('nl', /^stop (?:de |mijn )?timer(?: (?:voor|van) (.{2,40}))?$/, m => ({verb: 'timer-stop', item: item(m[1])})),
  T('nl', /^wat staat er (?:nog )?op mijn (?:checklist|lijst|lijstje|pad)(?: vandaag)?$/, () => ({verb: 'list'})),
  T('nl', /^voeg (.{2,60}?) toe aan (?:mijn |de |m'n )?(?:checklist|lijst|lijstje|pad)$/, m => ({verb: 'add', item: item(m[1])})),
  T('nl', /^(?:zet|voeg) (.{2,60}?) (?:op|aan|bij) (?:mijn |de |m'n )?(?:checklist|lijst|lijstje|pad)(?: toe)?$/, m => ({verb: 'add', item: item(m[1])})),
  T('nl', /^maak (.{2,60}?) (?:een )?favoriet$|^zet (.{2,60}?) bij (?:mijn |de )?favorieten$/, m => ({verb: 'favourite', item: item(m[1] ?? m[2])})),
  T('nl', /^vink (.{2,60}?) uit$|^(?:maak|zet) (.{2,60}?) (?:weer )?(?:ongedaan|open)$|^(.{2,60}?) niet gedaan$/, m => ({verb: 'uncheck', item: item(m[1] ?? m[2] ?? m[3])})),
  T('nl', /^vink (.{2,60}?) af(?: voor vandaag| vandaag)?$/, m => ({verb: 'check', item: item(m[1])})),
  T('nl', /^markeer (.{2,60}?) als (?:gedaan|klaar|af)$/, m => ({verb: 'check', item: item(m[1])})),
  T('nl', /^(.{2,60}?) (?:is )?(?:gedaan|klaar)(?: voor vandaag| vandaag)?$/, m => ({verb: 'check', item: item(m[1])})),
];
const fence = (action: Record<string, unknown>) => `\`\`\`zigoals-action\n${JSON.stringify(action)}\n\`\`\``;
const active = (env: ToolEnv) => env.areas.habits ? env.habits.habits.filter(h => latestHabitRule(h).state === 'active') : [];
type Named = {kind: 'custom' | 'habit' | 'health' | 'goal'; label: string; habit?: Habit};
/** The dots on today's path and the person's active habits, by the names the person sees. */
function candidates(env: ToolEnv): Named[] {
  const out: Named[] = [], habits = active(env), seen = new Set<string>();
  const source = env.checklist && !env.checklist.unreadable ? env.checklist.record : null;
  for (const i of source ? orderedItems(source) : []) {
    if (isHealthItem(i)) { if (env.health) out.push({kind: 'health', label: i.label ?? i.input}); continue; }
    if (i.kind === 'custom' && i.label) out.push({kind: 'custom', label: i.label});
    else if (i.kind === 'habit') { const h = habits.find(x => x.id === i.ref?.habitId); if (h) { out.push({kind: 'habit', label: h.title, habit: h}); seen.add(h.id); } }
    else if (i.label) out.push({kind: 'goal', label: i.label});
  }
  for (const h of habits) if (!seen.has(h.id)) out.push({kind: 'habit', label: h.title, habit: h});
  return out;
}
/** The one thing a name means: an exact title first, then the best word match; two alike are "ambiguous". */
function resolve(list: readonly Named[], name: string): {one: Named} | {ambiguous: Named[]} | null {
  const key = name.trim().toLowerCase(), exact = list.filter(n => n.label.trim().toLowerCase() === key);
  if (exact.length === 1) return {one: exact[0]!};
  if (exact.length > 1) return {ambiguous: exact};
  const indexed = list.map((n, i) => ({id: String(i), label: n.label}));
  const hit = findItemByName(indexed, name);
  if (hit) return {one: list[Number(hit.id)]!};
  const words = key.split(/[^a-z0-9]+/).filter(w => w.length > 2), some = list.filter(n => words.some(w => n.label.toLowerCase().includes(w)));
  return some.length > 1 ? {ambiguous: some.slice(0, 4)} : null;
}
type Words = Record<'check' | 'uncheck' | 'add' | 'favourite' | 'sleep-start' | 'sleep-end' | 'timer-start' | 'timer-stop' | 'fast-start' | 'fast-stop' | 'today' | 'confirm' | 'which' | 'say', string>;
const SAY: Record<CommandLang, Words> = {
  en: {check: 'Check off', uncheck: 'Mark as not done', add: 'Add to your Checklist', favourite: 'Star on your Checklist', 'sleep-start': 'Start the night', 'sleep-end': 'End the night', 'timer-start': 'Start the timer', 'timer-stop': 'Stop the timer', 'fast-start': 'Start a fast', 'fast-stop': 'Stop the fast', today: 'today', confirm: 'Add it below when it looks right; nothing is written before.', which: 'More than one matches', say: 'Say its full name.'},
  nl: {check: 'Afvinken', uncheck: 'Niet gedaan', add: 'Op je Checklist zetten', favourite: 'Met een ster op je Checklist', 'sleep-start': 'De nacht starten', 'sleep-end': 'De nacht beëindigen', 'timer-start': 'De timer starten', 'timer-stop': 'De timer stoppen', 'fast-start': 'Een vasten starten', 'fast-stop': 'Het vasten stoppen', today: 'vandaag', confirm: 'Voeg het hieronder toe als het klopt; er wordt niets opgeslagen voor je dat doet.', which: 'Meer dan één past', say: 'Zeg de volledige naam.'},
};
/** Today's Checklist as words: "On your Checklist today: 2 of 5 done; still open: …". */
function listAnswer(env: ToolEnv, lang: CommandLang): QuickReply {
  const list = checklistToday(env);
  if (!list || !list.total) return {kind: 'answer', command: 'list', text: lang === 'nl' ? 'Je Checklist heeft vandaag nog geen stippen. Zet er iets op met “zet … op mijn lijst”, of open de Checklist.' : 'Your Checklist has no dots today yet. Add one with “add … to my checklist”, or open the Checklist.'};
  const open = list.open.length ? (lang === 'nl' ? ` Nog open: ${listNames(list.open, 5)}.` : ` Still open: ${listNames(list.open, 5)}.`) : (lang === 'nl' ? ' Alles is af.' : ' Everything is done.');
  return {kind: 'answer', command: 'list', text: `${lang === 'nl' ? `Op je Checklist vandaag: ${list.done} van ${list.total} af.` : `On your Checklist today: ${list.done} of ${list.total} done.`}${open}${list.healthHidden ? (lang === 'nl' ? ' Health-stippen worden niet met ZIGi gedeeld.' : ' Health dots are not shared with ZIGi.') : ''}`};
}
/** The device's card for a command, or null when the message is not one (the stop rule). */
export function quickCommand(text: string, env: ToolEnv): QuickReply | null {
  if (/\?/.test(text)) return null;
  const t = commandText(text);
  if (!t || t.length > 90 || OTHER_DAY.test(t)) return null;
  for (const template of TEMPLATES) {
    const m = template.re.exec(t); if (!m) continue;
    const parsed = template.make(m); if (!parsed) continue;
    const lang = template.lang, say = SAY[lang];
    // No second clause; an item of a check or a timer names no amount (an amount is a log for the other routes).
    if (parsed.item && SECOND_CLAUSE.test(parsed.item)) return null;
    if ((parsed.verb === 'check' || parsed.verb === 'uncheck' || parsed.verb === 'timer-start' || parsed.verb === 'timer-stop' || parsed.verb === 'favourite') && parsed.item && /\d/.test(parsed.item)) return null;
    const card = (title: string, action: Record<string, unknown>, verb: string): QuickReply => ({kind: 'answer', command: verb, text: `${title}. ${say.confirm}\n\n${fence(action)}`});
    switch (parsed.verb) {
      case 'list': return listAnswer(env, lang);
      case 'sleep-start': return card(say['sleep-start'], {kind: 'start-night'}, 'sleep-start');
      case 'sleep-end': return card(say['sleep-end'], {kind: 'end-night'}, 'sleep-end');
      case 'fast-start': return parsed.hours && parsed.hours >= 1 && parsed.hours <= 72 ? card(`${say['fast-start']} · ${parsed.hours} h`, {kind: 'start-fast', targetHours: parsed.hours}, 'fast-start') : null;
      case 'fast-stop': return card(say['fast-stop'], {kind: 'stop-fast'}, 'fast-stop');
      case 'add': {
        const words = parsed.item!; if (words.length > 60) return null;
        // A habit the person has is starred; anything else becomes their own item, in their words.
        const habit = active(env).find(h => h.title.trim().toLowerCase() === words.toLowerCase());
        return habit ? card(`${say.favourite} · ${shortName(habit.title)}`, {kind: 'checklist-add-favourite', item: habit.title}, 'favourite') : card(`${say.add} · ${shortName(words)}`, {kind: 'checklist-add-custom', text: words}, 'add');
      }
      case 'favourite': {
        const found = resolve(candidates(env).filter(n => n.kind === 'habit'), parsed.item!);
        if (!found) return null;
        if ('ambiguous' in found) return {kind: 'refusal', command: 'favourite', text: `${say.which}: ${listNames(found.ambiguous.map(n => shortName(n.label)))}. ${say.say}`};
        return card(`${say.favourite} · ${shortName(found.one.label)}`, {kind: 'checklist-add-favourite', item: found.one.label}, 'favourite');
      }
      case 'timer-start': case 'timer-stop': {
        const durations = active(env).filter(h => habitRuleOn(h, env.habitDay)?.measurement.kind === 'duration');
        const pool = parsed.verb === 'timer-stop' && !parsed.item ? durations.filter(h => h.timer) : durations;
        const found = parsed.item ? resolve(pool.map(h => ({kind: 'habit' as const, label: h.title, habit: h})), parsed.item) : pool.length === 1 ? {one: {kind: 'habit' as const, label: pool[0]!.title, habit: pool[0]!}} : null;
        if (!found) return null;
        if ('ambiguous' in found) return {kind: 'refusal', command: parsed.verb, text: `${say.which}: ${listNames(found.ambiguous.map(n => shortName(n.label)))}. ${say.say}`};
        return card(`${say[parsed.verb]} · ${shortName(found.one.label)}`, {kind: parsed.verb === 'timer-start' ? 'start-timer' : 'stop-timer', habit: found.one.label}, parsed.verb);
      }
      case 'check': case 'uncheck': {
        const found = resolve(candidates(env), parsed.item!);
        if (!found) return null;
        if ('ambiguous' in found) return {kind: 'refusal', command: parsed.verb, text: `${say.which}: ${listNames(found.ambiguous.map(n => shortName(n.label)))}. ${say.say}`};
        return card(`${say[parsed.verb]} · ${shortName(found.one.label)} · ${say.today}`, {kind: 'checklist-tick', item: found.one.label, ...(parsed.verb === 'uncheck' ? {done: false} : {})}, parsed.verb);
      }
    }
  }
  return null;
}
