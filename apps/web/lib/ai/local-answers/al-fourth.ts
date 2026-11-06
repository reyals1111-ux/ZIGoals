import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {runTool} from '../tools/registry';
import type {ToolOk} from '../tools/types';
import {summaries} from '../tools/goals';
import {latestHabitRule, type Habit} from '../../habits';
import {addLocalDays} from '../../local-date';
import {checklistToday} from '../proactive/brief-sources';
import {shortName, listNames} from '../proactive/calm';
import {quickCommand} from '../quick-commands/commands';
import {quickLogContext} from '../../quick-log/context';
import {quickLogReply} from '../../quick-log/multi';
import {localAnswer, zigiOverview, type LocalReply} from './engine';
import {novaEnvInfo} from './nova-env';
import {amount, plural} from './words';
import {actionSchema} from '../actions/schema';
import {memoryCategory} from './al-more';

/**
 * Session AL fourth pass (lane L7-4b; GROK53_REPLAY_L7_1, the rows still open on c521574f): what ZIGi's and NOVA's no-model
 * path still got wrong or answered with the examples list. Every answer reads the same tools, and so the same stores and
 * area switches, as the pages; a write is only ever a card the person adds (non-custodial: nothing is written here).
 *
 * - `fourthFirst` runs before the commands and the quick-log reading (lib/ai/local-answers/no-model.ts), so a plan, a
 *   question about the path, a habit edit or a goal sentence is never read as a task or a log line ("plan my evening" was
 *   a task card, "check in Read" a task, "I walked 2 dogs" a 2-step walk, "save 5.000 by next Friday" a log composer).
 * - `fourthAnswer` runs last, before the examples list: the phrasing families the replay found (lesson 6 in
 *   docs/architecture/ADR-037-session-al.md), each answered from the records with where to go, in English and Dutch.
 * - `checklistAnswer` is the Checklist's own counter, orbits, yesterday and history (lib/ai/local-answers/al-more.ts asks
 *   it): one source with the page and "Show my checklist" (lib/ai/proactive/brief-sources.ts `checklistToday`).
 */
type Lang = 'en' | 'nl';
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const fence = (action: Record<string, unknown>) => `\n\n\`\`\`zigoals-action\n${JSON.stringify(action)}\n\`\`\``;
const open = (page: string, view?: string) => fence({kind: 'open-page', page, ...(view ? {view} : {})});
const run = (tool: string, args: Record<string, unknown>, env: ToolEnv) => { const result = runTool(tool, args, env); return {result, record: {tool, args, label: result.label}}; };
const dataOf = (r: ReturnType<typeof runTool>): Data => (r as ToolOk).data as Data;
const norm = (raw: string) => raw.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');
const fold = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const money = (value: unknown) => { const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(String(value ?? '')); return m ? amount(m[1]!, m[2]!) : String(value ?? ''); };
const who = (env: ToolEnv | null) => env && novaEnvInfo(env) ? 'NOVA' : 'ZIGi';
const brainPlace = (env: ToolEnv | null, lang: Lang) => env && novaEnvInfo(env) ? say(lang, 'NOVA → setup (“Build NOVA’s brain”)', 'NOVA → setup (“Build NOVA’s brain”)') : say(lang, 'Settings → ZIGi · Your Personal AI Companion', 'Settings → ZIGi · Your Personal AI Companion');

/** The device's own answer to a question in its words (the lookups, then the overview ZIGi shares with NOVA), or null. */
export function deviceAnswer(question: string, env: ToolEnv): LocalReply | null {
  let r: LocalReply = {kind: 'none'};
  try { r = localAnswer(question, env); } catch { r = {kind: 'none'}; }
  if (r.kind === 'answer' || r.kind === 'choices' || r.kind === 'refusal') return r;
  if (novaEnvInfo(env)) return null;
  try { return zigiOverview(question, env); } catch { return null; }
}

// ---- names: one habit, one goal, one task, by the words the person used ----
const STOP = new Set(['the', 'my', 'a', 'an', 'and', 'for', 'today', 'all', 'done', 'with', 'habit', 'goal', 'task', 'to', 'of', 'in', 'on', 'do', 'did', 'i']);
const stemOf = (w: string) => w.replace(/(?:ing|ed|es|s)$/, '');
function oneByName<T>(list: readonly T[], label: (t: T) => string, said: string): T | null {
  const key = fold(said); if (!key) return null;
  const exact = list.filter(t => fold(label(t)) === key);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  const words = key.split(' ').filter(w => w.length > 2 && !STOP.has(w));
  if (!words.length) return null;
  const hits = list.filter(t => { const own = fold(label(t)).split(' '); return words.every(w => own.some(o => o === w || (stemOf(w).length >= 4 && (o.startsWith(stemOf(w)) || stemOf(o) === stemOf(w))))); });
  return hits.length === 1 ? hits[0]! : null;
}
const activeHabits = (env: ToolEnv): Habit[] => env.areas.habits ? env.habits.habits.filter(h => latestHabitRule(h).state === 'active') : [];
const habitNamed = (env: ToolEnv, said: string) => oneByName(activeHabits(env), h => h.title, said);
const openGoals = (env: ToolEnv) => env.areas.goals ? summaries(env).filter(g => g.status !== 'closed') : [];
function goalNamed(env: ToolEnv, said: string) {
  const goals = openGoals(env), key = fold(said.replace(/\s+goal$/i, ''));
  const exact = goals.filter(g => fold(g.name) === key || fold(g.name) === `${key} goal`);
  if (exact.length === 1) return exact[0]!;
  // A slip in the name ("emergancy fund") still names the one goal within two letters of it.
  const near = goals.filter(g => { const a = fold(g.name), b = key; return Math.abs(a.length - b.length) <= 2 && editDistance(a, b) <= 2; });
  if (near.length === 1) return near[0]!;
  return oneByName(goals, g => g.name, key);
}
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const row = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let prev = row[0]!; row[0] = i; for (let j = 1; j <= b.length; j++) { const t = row[j]!; row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return row[b.length]!;
}
const openTasks = (env: ToolEnv): Data[] => { const r = runTool('tasks', {}, env); return r.ok ? ((r as ToolOk).data.open ?? []) as Data[] : []; };

// ---- the Checklist: one source with the page and "Show my checklist" ----
const CHECKLIST = /\bchecklist\b|\bcheck list\b|\b(?:how many|which)\b[^.?!]{0,30}\b(?:items|planets|dots)\b[^.?!]{0,30}\b(?:done|complete|completed|left|open)\b|\bperfect orbit\b|\borbits?\b|\b(?:on|next on|left on) my path\b/i;
export const isChecklistAsk = (q: string) => CHECKLIST.test(q);
export function checklistAnswer(question: string, env: ToolEnv, lang: Lang): LocalReply | null {
  const q = norm(question);
  if (!CHECKLIST.test(q)) return null;
  const calls = [{tool: 'checklist_today', args: {}, label: 'Checklist · today'}];
  // A how-to about the Checklist's button is not its counter (Lisbon #335/336).
  if (/\b(?:hide|remove|turn off|show|move)\b[^.?!]{0,20}\b(?:the )?checklist (?:button|page|tab|icon|link)\b|\bhow (?:do|can) i (?:hide|turn off|remove)\b[^.?!]{0,20}\bchecklist\b/i.test(q))
    return {kind: 'answer', text: say(lang, 'Settings → Your app → Your pages & buttons: switch the Checklist off there and its button leaves the menu; your path and its history stay on this device.', 'Settings → Your app → Your pages & buttons: zet de Checklist daar uit en de knop verdwijnt uit het menu; je pad en de geschiedenis blijven op dit apparaat.') + open('settings', 'pages'), calls: []};
  // "add to my checklist" with nothing named asks what to add (Lisbon #337/338); "add stretch to my evening checklist" adds it.
  const add = /^(?:please\s+)?(?:add|put)\s+(.{0,60}?)\s*(?:to|on|onto|in)\s+(?:my|the)\s+(?:(morning|afternoon|evening|anytime)\s+)?(?:checklist|check list|path|orbit)(?:\s+(?:every|each)\s+(?:morning|afternoon|evening|day))?\s*[.!]?$/i.exec(q)
    ?? /^(?:please\s+)?(?:add|put)\s+(.{1,60}?)\s+(?:to|on|onto|in)\s+(?:my|the)\s+(morning|afternoon|evening)\s+(?:orbit|path)\s*[.!]?$/i.exec(q);
  if (add) {
    const what = (add[1] ?? '').replace(/^["“']|["”']$/g, '').trim(), orbit = (add[2] ?? /\b(morning|afternoon|evening)\b/i.exec(q)?.[1] ?? '').toLowerCase();
    if (!what) return {kind: 'answer', text: say(lang, 'What should go on your Checklist? Name it, for example “add Read 10 pages to my checklist” or “add Floss teeth to my morning orbit”.', 'Wat moet er op je Checklist? Noem het, bijvoorbeeld “zet 10 bladzijden lezen op mijn lijst”.'), calls: []};
    const habit = habitNamed(env, what), where = orbit ? say(lang, ` It lands in Anytime; drag it into the ${orbit[0]!.toUpperCase()}${orbit.slice(1)} orbit on the Checklist (the card holds no orbit).`, ` Hij komt in Anytime; sleep hem op de Checklist naar de ${orbit}-baan (de kaart kent geen baan).`) : '';
    if (habit) return {kind: 'answer', text: say(lang, `Star ${shortName(habit.title)} on your Checklist, added only when you add it.${where}`, `${shortName(habit.title)} met een ster op je Checklist, pas toegevoegd als je hem toevoegt.${where}`) + fence({kind: 'checklist-add-favourite', item: habit.title}), calls: []};
    if (what.length > 60) return {kind: 'answer', text: say(lang, 'That is too long for one item on the path: 60 characters at most. Say it shorter.', 'Dat is te lang voor één stip: hoogstens 60 tekens. Zeg het korter.'), calls: []};
    return {kind: 'answer', text: say(lang, `Your own item on the Checklist, “${what}”, added only when you add it.${where}`, `Je eigen stip op de Checklist, “${what}”, pas toegevoegd als je hem toevoegt.${where}`) + fence({kind: 'checklist-add-custom', text: what[0]!.toUpperCase() + what.slice(1)}), calls: []};
  }
  const list = checklistToday(env);
  if (!env.checklist || env.checklist.unreadable) return {kind: 'answer', text: say(lang, 'No Checklist path on this device yet. The Checklist page starts one: star habits or add your own items.', 'Er is nog geen Checklist-pad op dit apparaat. De Checklist-pagina begint er een: geef gewoontes een ster of voeg eigen stippen toe.') + open('checklist'), calls};
  const hidden = list?.habitsHidden ? say(lang, ` ${plural(list.habitsHidden, 'habit dot')} not shared (Habits is off).`, ` ${list.habitsHidden} gewoonte-stippen niet gedeeld (Habits staat uit).`) : '';
  const healthHidden = list?.healthHidden ? say(lang, ` ${plural(list.healthHidden, 'Health dot')} not shared with ${who(env)}.`, ` ${list.healthHidden} Health-stippen niet gedeeld.`) : '';
  // Yesterday and earlier: the day history the Checklist keeps as counts (Lisbon #047, #334).
  if (/\byesterday\b|\bgisteren\b/i.test(q)) {
    const day = addLocalDays(env.checklist.date, -1), past = env.checklist.days.days?.[day];
    if (!past) return {kind: 'answer', text: say(lang, `No Checklist day is kept for yesterday (${day}), so I can’t say how it went (unknown, not zero). Only today’s path is shown live; days are counted once the Checklist was open on them.`, `Voor gisteren (${day}) is geen Checklist-dag bewaard, dus ik weet niet hoe het ging (onbekend, niet nul).`), calls};
    return {kind: 'answer', text: say(lang, `Yesterday on your Checklist: ${past.done} of ${past.total} done${past.perfect ? ', a perfect orbit' : ''}.`, `Gisteren op je Checklist: ${past.done} van ${past.total} gedaan${past.perfect ? ', een perfecte baan' : ''}.`), calls};
  }
  // The week, the history, the 12 weeks: the kept day counts.
  const days = Object.entries(env.checklist.days.days ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (/\bhow long\b|\bsince when\b|\b(?:this|last) week\b|\bweek\b|\bhistory\b/i.test(q)) {
    if (/\bhow long\b|\bsince when\b/i.test(q)) {
      const first = env.checklist.record.items.map(i => i.addedAt).filter(Boolean).sort()[0];
      return {kind: 'answer', text: say(lang, `${first ? `Your path began on ${first.slice(0, 10)}` : 'Your path has no start date kept'}; ${days.length ? `${plural(days.length, 'day')} are counted in its history` : 'no earlier day is counted in its history yet'}. Today: ${list?.done ?? 0} of ${list?.total ?? 0} done.`, `${first ? `Je pad begon op ${first.slice(0, 10)}` : 'Je pad heeft geen startdatum'}; ${days.length} dagen in de geschiedenis. Vandaag: ${list?.done ?? 0} van ${list?.total ?? 0} gedaan.`), calls};
    }
    const from = addLocalDays(env.checklist.date, -6), week = days.filter(([d]) => d >= from && d < env.checklist!.date), perfect = week.filter(([, s]) => s.perfect).length;
    return {kind: 'answer', text: say(lang, `This week on your Checklist (${week.length} earlier ${week.length === 1 ? 'day' : 'days'} kept): ${week.map(([d, s]) => `${d.slice(5)} ${s.done} of ${s.total}`).join(', ') || 'no earlier day kept yet'}${week.length ? `; ${plural(perfect, 'perfect orbit')}` : ''}. Today so far: ${list?.done ?? 0} of ${list?.total ?? 0}.`, `Deze week op je Checklist: ${week.map(([d, s]) => `${d.slice(5)} ${s.done} van ${s.total}`).join(', ') || 'nog geen eerdere dag bewaard'}. Vandaag: ${list?.done ?? 0} van ${list?.total ?? 0}.`), calls};
  }
  if (!list || !list.total) return {kind: 'answer', text: say(lang, `Your Checklist has no dots today yet.${hidden}${healthHidden} Add one with “add … to my checklist”, or open the Checklist.`, `Je Checklist heeft vandaag nog geen stippen.${hidden}${healthHidden}`) + open('checklist'), calls};
  const dots = list.dots ?? [];
  // An orbit asked for by name: its dots, in path order (Lisbon #013, #254/255).
  const orbitAsked = /\b(morning|afternoon|evening|anytime)\b/i.exec(q)?.[1]?.toLowerCase();
  if (orbitAsked) {
    const inOrbit = dots.filter(d => d.orbit.toLowerCase().startsWith(orbitAsked));
    const name = `${orbitAsked[0]!.toUpperCase()}${orbitAsked.slice(1)}${orbitAsked === 'anytime' ? '' : ' orbit'}`;
    return {kind: 'answer', text: inOrbit.length ? say(lang, `${name}: ${inOrbit.map(d => `${d.name}${d.done ? ' (done)' : ''}`).join(', ')}.`, `${name}: ${inOrbit.map(d => `${d.name}${d.done ? ' (gedaan)' : ''}`).join(', ')}.`) : say(lang, `Nothing is in the ${name} today.${hidden}`, `Er staat vandaag niets in de ${name}.${hidden}`), calls};
  }
  // "What's next on my path?": the first open dot in path order (Lisbon #003).
  if (/\bnext\b/i.test(q)) {
    const next = dots.find(d => !d.done);
    return {kind: 'answer', text: next ? say(lang, `Next on your path: ${next.name} (${next.orbit}). ${list.done} of ${list.total} done today.`, `Volgende op je pad: ${next.name} (${next.orbit}). ${list.done} van ${list.total} gedaan vandaag.`) : say(lang, `Everything on today’s path is done: ${list.done} of ${list.total}.`, `Alles op het pad van vandaag is gedaan: ${list.done} van ${list.total}.`), calls};
  }
  if (/\bperfect\b/i.test(q)) return {kind: 'answer', text: list.perfect ? say(lang, `Yes: all ${list.total} done in path order, a perfect orbit today.`, `Ja: alle ${list.total} in volgorde gedaan, een perfecte baan vandaag.`) : say(lang, `Not yet: ${list.done} of ${list.total} done today; a perfect orbit is every dot, in path order.`, `Nog niet: ${list.done} van ${list.total} gedaan vandaag; een perfecte baan is elke stip, in volgorde.`), calls};
  const openLine = list.open.length ? say(lang, ` Still open, in path order: ${listNames(list.open, 6)}.`, ` Nog open, in de volgorde van het pad: ${listNames(list.open, 6)}.`) : say(lang, ' Everything on today’s path is done.', ' Alles op het pad van vandaag is gedaan.');
  return {kind: 'answer', text: say(lang, `Checklist today: ${list.done} of ${list.total} done.`, `Checklist vandaag: ${list.done} van ${list.total} gedaan.`) + openLine + hidden + healthHidden, calls};
}

// ---- before the commands and the quick-log reading ----
const PLAN_ASK = /^(?:please\s+|can you\s+|could you\s+)*(?:plan|organi[sz]e|map out|schedule|structure)\s+(?:out\s+)?(?:my|the|this)\s+(evening|morning|afternoon|night|day|week|weekend|tonight)\b|^(?:please\s+)?brief me\b(?!$)|^(?:please\s+)?plan (?:tonight|today|tomorrow)\b/i;
const PRIORITY_ASK = /\b(?:give|set|add|assign)\b[^.?!]{0,20}\btasks?\b[^.?!]{0,12}\bpriorit\w*|\bprioriti[sz]e (?:my |the )?tasks\b|\bsort my tasks by priority\b/i;
const ORDINAL = /^(?:please\s+)?(?:tick|check|mark|do|complete|finish)\s+(?:off\s+)?(?:the\s+)?(first|second|third|last|next|other)\s+one\b/i;
const NOT_UNITS = /^(?:steps?|km|kms|kilomet(?:er|re)s?|k|miles?|mi|minutes?|mins?|min|hours?|hrs?|h|m|meters?|metres?|laps?|rounds?)$/i;
const WALK_NOUN = /\b(?:walked|ran|run|walk|biked|cycled|swam)\s+(?:the\s+|my\s+)?(\d+(?:[.,]\d+)?|a|an|one|two|three|four|five)\s+([a-z]+)/i;
const SAVE_BY = /^(?:i\s+)?(?:want to\s+|would like to\s+|wanna\s+|need to\s+|help me\s+)?save\s+(?:up\s+)?(?:[$€£]\s?)?(\d[\d.,\s]*)\s*(k|thousand|eur|euros?|usd|dollars?|[$€£])?\s*(?:(?:by|before|until|till|in)\s+(.{2,40}?))?\s*[.!]?$/i;
const WANT_SAVE_AND_SPEND = /\b(?:want|wanna|plan|going)\s+to\s+save\b/i;
const GOAL_WANT = /^(?:i\s+)?(?:want|would like|wanna|plan|hope|aim)\s+to\s+(read|run|walk|learn|finish|write|visit|cook|swim)\s+(.{2,60}?)\s*(?:this year|this month|by .{2,30}|in \d{4})?\s*[.!]?$/i;
const FOREIGN_TICK: readonly {lang: 'fr' | 'de' | 'es'; re: RegExp; note: string}[] = [
  {lang: 'fr', re: /^(?:coche|cocher|marque|marquer|valide)\s+(.{2,60}?)\s+(?:comme\s+)?(?:fait|faite|terminée?)\s*[.!]?$/i, note: 'Pour l’instant, je réponds en anglais (et en néerlandais). En anglais : “Mark {x} as done”. La carte ci-dessous le coche ; rien n’est écrit avant que tu l’ajoutes.'},
  {lang: 'de', re: /^(?:hak|hake|haken)\s+(.{2,60}?)\s+ab\s*[.!]?$|^(?:markiere|erledige)\s+(.{2,60}?)(?:\s+als\s+erledigt)?\s*[.!]?$/i, note: 'Im Moment antworte ich auf Englisch (und Niederländisch). Auf Englisch: “Mark {x} as done”. Die Karte unten hakt es ab; nichts wird geschrieben, bevor du sie hinzufügst.'},
  {lang: 'es', re: /^(?:marca|marcar)\s+(.{2,60}?)\s+(?:como\s+)?(?:hecho|hecha|hecho hoy|completado|completada)\s*[.!]?$/i, note: 'Por ahora respondo en inglés (y en neerlandés). En inglés: “Mark {x} as done”. La tarjeta de abajo lo marca; no se escribe nada antes de que la añadas.'},
];
const NUMBER_WORDS: Record<string, number> = {one: 1, once: 1, two: 2, twice: 2, three: 3, four: 4, five: 5, six: 6, seven: 7};

export function fourthFirst(question: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  const q = norm(question);
  if (!q || q.length > 300 || !env) return null;
  // "What do you know about me?" is the notes kept, not the capability blurb (Denver DVR:Z-069, Z-020; Moscow ZP-39, NP-31).
  if (RECALL_ALL.test(q) || RECALL_DIET.test(q)) return recall(env, lang, RECALL_DIET.test(q));
  // The chain's voting period and deposit are read live on Governance; never guessed here (Berlin BN-058, BN-060, ZIGi-F3).
  if (/\bvoting period\b|\bhow long (?:does|do|is)\b[^.?!]{0,20}\bvot\w*|\bdeposit (?:for|of|to (?:make|submit)) a proposal\b|\bminimum deposit\b|\bproposal deposit\b|\bhow much (?:zig )?(?:is )?the deposit\b/i.test(q))
    return {kind: 'answer', text: say(lang, 'The voting period and the minimum deposit are the chain’s own settings: open Governance to see them as the network reports them, with each proposal’s own end time. I don’t read them in a chat, so I give no figure rather than a guess. Voting needs ZIG staked with an active validator; you sign every vote in your wallet.', 'De stemperiode en de minimale storting zijn instellingen van de chain: Governance toont ze zoals het netwerk ze meldt. In een chat lees ik ze niet, dus ik noem geen getal in plaats van te gokken.'), calls: []};
  // "Start meditating": the meditation timer is on Health, or a habit's own timer (Lisbon #314/315).
  if (/^(?:please\s+)?(?:start|begin)\s+(?:a\s+|my\s+)?(?:meditating|meditation|meditate)\b/i.test(q)) {
    const timed = activeHabits(env).find(h => /meditat/i.test(h.title) && latestHabitRule(h).measurement.kind === 'duration');
    if (timed) { const card = quickCommand(`start the ${timed.title} timer`, env); if (card) return {kind: card.kind, text: card.text, calls: []}; }
    return {kind: 'answer', text: say(lang, 'A meditation runs on Health → Meditation: start the timer there and it is saved when you stop it. A habit with minutes (“Create a habit called Meditate for 10 minutes”) gets its own timer here.', 'Een meditatie loopt op Health → Meditation: start daar de timer.') + open('health', 'meditation'), calls: []};
  }
  // "What can you do with my goals?" asks what ZIGi does there, never for the list (Denver N-050).
  const withArea = /^\s*what can you do (?:with|for|about|on) my (goals?|habits?|money|wealth|health|tasks?|checklist)\s*\??\s*$/i.exec(q);
  if (withArea) {
    const area = withArea[1]!.toLowerCase().replace(/s$/, '');
    const words: Record<string, string> = {
      goal: 'With your goals I answer how far each is, what is left, its target date and next planned contribution, and I prepare cards you add: a contribution form filled in, a milestone, closing a goal. Deleting a goal is done on its page.',
      habit: 'With your habits I answer what is open today, streaks, your most consistent habit and the week’s check-ins, and I prepare cards you add: a check-in, a skip with its reason, a break, a new habit or a new schedule.',
      money: 'With your money I answer your totals per currency (never converted), holdings, debts, budgets, bills and spending, and I prepare forms you save yourself; I never buy, sell or move anything, and I don’t advise.',
      wealth: 'With your money I answer your totals per currency (never converted), holdings, debts, budgets, bills and spending, and I prepare forms you save yourself; I never buy, sell or move anything, and I don’t advise.',
      health: env.health ? 'With your Health (shared now) I answer meals, macros, water, sleep, steps and workouts from your own entries, and prepare log cards you add; never medical advice.' : 'Health isn’t shared with me now. Once you share it, I answer meals, water, sleep, steps and workouts from your own entries, never medical advice.',
      task: 'With your tasks I list what is open or due, add a task (with a day, a time or a repeat) and move one to tomorrow, each as a card you add; ticking one off is done in Tasks.',
      checklist: 'With your Checklist I say how today’s path stands, what is next, which orbit holds what, and I prepare a tick or a new item as a card you add.',
    };
    return {kind: 'answer', text: say(lang, `${words[area] ?? words.goal} Nothing changes before you add a card.`, `Nothing changes before you add a card.`), calls: []};
  }
  // "tomorrow call mom": the day first is still a task (Lisbon #365).
  const dayFirst = /^(today|tonight|tomorrow)\s*[,:]?\s+(?!is\b|i\b|what\b|how\b)(.{3,100}?)\s*[.!]?$/i.exec(q);
  if (dayFirst && !/\?$/.test(q)) {
    const when = dayFirst[1]!.toLowerCase() === 'tomorrow' ? 'tomorrow' : 'today', title = dayFirst[2]!.trim();
    return {kind: 'answer', text: say(lang, 'A task for your list, added only when you add it (Tasks shows and edits it).', 'Een taak voor je lijst, pas toegevoegd als je haar toevoegt.') + fence({kind: 'add-task', title: `${title[0]!.toUpperCase()}${title.slice(1)}`.slice(0, 140), due: when}), calls: []};
  }
  // A plan, a brief or an order of the evening is not a to-do (Lisbon #015, #301–309, LZ-009; Nairobi P21, N12).
  if (PLAN_ASK.test(q)) {
    const week = /\bweek(?:end)?\b/i.test(q), base = deviceAnswer(week ? 'What does my week look like?' : 'What is due today?', env);
    const facts = base && 'text' in base ? base.text.replace(/\n\n```zigoals-action[\s\S]*?```/g, '') : '';
    return {kind: 'answer', text: say(lang, `Planning it with you needs your own AI (${brainPlace(env, lang)}); without one I don’t make a plan or a task out of it. From your records:`, `Er samen een plan van maken vraagt je eigen AI (${brainPlace(env, lang)}); zonder AI maak ik er geen plan of taak van. Uit je gegevens:`) + (facts ? `\n${facts}` : say(lang, ' nothing is due.', ' er staat niets open.')), calls: base && 'calls' in base ? base.calls : []};
  }
  if (PRIORITY_ASK.test(q)) {
    const tasks = openTasks(env);
    return {kind: 'answer', text: say(lang, `A task’s priority is set on the task itself in Tasks (High, Normal, Low); ${who(env)} doesn’t change several at once. ${tasks.length ? `Your open tasks: ${tasks.slice(0, 8).map(t => `${clean(String(t.task), 50)} (${t.priority})`).join(', ')}.` : 'No open task is kept.'}`, `De prioriteit zet je op de taak zelf in Tasks (High, Normal, Low); ik verander er niet meerdere tegelijk. ${tasks.length ? `Je open taken: ${tasks.slice(0, 8).map(t => `${clean(String(t.task), 50)} (${t.priority})`).join(', ')}.` : 'Er staat geen open taak.'}`) + open('agenda'), calls: [{tool: 'tasks', args: {}, label: 'Tasks'}]};
  }
  // "tick the first one" names nothing: ask which, with the open dots (Nairobi T3, H2, NB-119).
  if (ORDINAL.test(q)) {
    const list = checklistToday(env), openNames = list?.open ?? [];
    return {kind: 'answer', text: openNames.length ? say(lang, `Which one? Name it, for example “mark ${openNames[0]} done”. Still open on your path: ${listNames(openNames, 6)}.`, `Welke? Noem hem, bijvoorbeeld “vink ${openNames[0]} af”. Nog open op je pad: ${listNames(openNames, 6)}.`) : say(lang, 'Which one? Name the habit or item, for example “mark Read done”.', 'Welke? Noem de gewoonte of stip, bijvoorbeeld “vink Lezen af”.'), calls: []};
  }
  // Another language's check-off: the card for the habit it names, with a note in that language (Lisbon #330–333).
  for (const f of FOREIGN_TICK) {
    const m = f.re.exec(q); if (!m) continue;
    const said = (m[1] ?? m[2] ?? '').trim(), card = quickCommand(`mark ${said} done`, env);
    const name = habitNamed(env, said)?.title ?? said;
    if (card && card.kind === 'answer') return {kind: 'answer', text: `${f.note.replace('{x}', name)}${card.text.slice(card.text.indexOf('\n\n'))}`, calls: []};
    return {kind: 'answer', text: f.note.replace('{x}', name).replace(/ (?:La carte|Die Karte|La tarjeta).*$/, ''), calls: []};
  }
  // "check in Drink water": the habit's own check-in, never a task called "Check in …" (Denver Z-038, BUG-058).
  const checkIn = /^(?:please\s+)?(?:check[- ]?in|checkin)\s+(?:on\s+|for\s+)?(?:my\s+|the\s+)?(.{2,60}?)(?:\s+(?:for\s+)?today)?\s*[.!]?$/i.exec(q);
  if (checkIn) {
    const habit = habitNamed(env, checkIn[1]!);
    if (habit) { const card = quickCommand(`mark ${habit.title} done`, env); if (card) return {kind: card.kind, text: card.text, calls: []};
      return {kind: 'answer', text: say(lang, `Check in ${shortName(habit.title)} for today, saved only when you add it.`, `${shortName(habit.title)} inchecken voor vandaag, pas bewaard als je het toevoegt.`) + fence({kind: 'check-in', habit: habit.title}), calls: []}; }
    if (activeHabits(env).length) return {kind: 'answer', text: say(lang, `No habit called “${checkIn[1]}”. Your habits: ${listNames(activeHabits(env).map(h => shortName(h.title)), 6)}.`, `Geen gewoonte “${checkIn[1]}”. Je gewoontes: ${listNames(activeHabits(env).map(h => shortName(h.title)), 6)}.`), calls: []};
  }
  // "mark Pick up parcel as done": a task is ticked off in Tasks (Lisbon st2-i).
  const markTask = /^(?:please\s+)?(?:mark|tick off|check off|complete|finish)\s+(.{2,80}?)\s+(?:as\s+)?(?:done|complete|completed|finished)?\s*[.!]?$/i.exec(q);
  if (markTask && !habitNamed(env, markTask[1]!)) {
    const task = oneByName(openTasks(env), t => String(t.task), markTask[1]!);
    if (task) return {kind: 'answer', text: say(lang, `“${clean(String(task.task), 60)}” is a task: tick it off in Tasks, where it has Undo. I can move a task to tomorrow or let it go from here.`, `“${clean(String(task.task), 60)}” is een taak: vink hem af in Tasks, waar hij een Undo heeft.`) + open('agenda'), calls: [{tool: 'tasks', args: {}, label: 'Tasks'}]};
  }
  // "Move Feed the dragon to yesterday": no such task, and never to a day already past (Lisbon #019).
  const moveBack = /^(?:please\s+)?(?:move|reschedule|push|shift)\s+(.{2,80}?)\s+(?:to|until)\s+(yesterday|last \w+)\s*[.!]?$/i.exec(q);
  if (moveBack) {
    const task = oneByName(openTasks(env), t => String(t.task), moveBack[1]!);
    return {kind: 'answer', text: task ? say(lang, `A task moves to today or later, never to ${moveBack[2]}. Say “move ${clean(String(task.task), 40)} to tomorrow”, or change its day in Tasks.`, `Een taak gaat naar vandaag of later, nooit naar ${moveBack[2]}.`) : say(lang, `There is no open task called “${moveBack[1]}”, and a task never moves to a day already past.`, `Er is geen open taak “${moveBack[1]}”, en een taak gaat nooit naar een dag die voorbij is.`), calls: [{tool: 'tasks', args: {}, label: 'Tasks'}]};
  }
  // "Snooze Read 10 pages to 9pm": a habit has no snooze; a reminder at that time is a card (Lisbon 375-run d).
  const snooze = /^(?:please\s+)?(?:snooze|postpone|delay|remind me (?:about|of))\s+(.{2,60}?)\s+(?:to|until|till|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[.!]?$/i.exec(q);
  if (snooze) {
    const habit = habitNamed(env, snooze[1]!); let h = Number(snooze[2]); const m = Number(snooze[3] ?? 0);
    if (snooze[4]?.toLowerCase() === 'pm' && h < 12) h += 12; if (snooze[4]?.toLowerCase() === 'am' && h === 12) h = 0;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (habit && h <= 23 && m <= 59) return {kind: 'answer', text: say(lang, `A habit has no snooze, but a reminder can bring ${shortName(habit.title)} back at ${time}: added only when you add it (Settings → Reminders lists it).`, `Een gewoonte heeft geen sluimerknop, maar een herinnering om ${time} kan ${shortName(habit.title)} terugbrengen: pas toegevoegd als je haar toevoegt.`) + fence({kind: 'create-reminder', for: 'habit', habit: habit.title, time}), calls: []};
  }
  // "Set an alarm for 7am": no alarms here (Lisbon #365).
  if (/^(?:please\s+)?(?:set|wake me|make)\b[^.?!]{0,10}\balarm\b|\bwake me (?:up )?at\b/i.test(q)) return {kind: 'answer', text: say(lang, 'ZIGoals has no alarm clock. A reminder at a time is a habit’s or a task’s: “Remind me to stretch at 7:00” makes a task card, and Settings → Reminders keeps the daily ones.', 'ZIGoals heeft geen wekker. Een herinnering op een tijd hoort bij een gewoonte of taak: Settings → Reminders.') + open('settings', 'reminders'), calls: []};
  // A task on a day that does not exist, or a reminder in the past, is said, never a card titled "On 31 February" (Lisbon #020, #021).
  const badDay = /\b(30|31)(?:st|th)?\s+(?:of\s+)?(feb(?:ruary)?)\b|\b(feb(?:ruary)?)\s+(30|31)\b|\b31(?:st)?\s+(?:of\s+)?(apr(?:il)?|june?|sep(?:t(?:ember)?)?|nov(?:ember)?)\b/i.exec(q);
  if (badDay && /\b(?:task|remind|due|on)\b/i.test(q)) return {kind: 'answer', text: say(lang, `${badDay[0]} is not a date, so no task was made. Say the day again, for example “Add a task on 28 February: …”.`, `${badDay[0]} bestaat niet, dus er is geen taak gemaakt. Noem de dag opnieuw.`), calls: []};
  const pastIn = /\bin\s+(-\s?\d+|0)\s*(minutes?|mins?|hours?|days?)\b/i.exec(q);
  if (pastIn && /\b(?:remind|task|in)\b/i.test(q)) return {kind: 'answer', text: say(lang, `“In ${pastIn[1]!.replace(/\s/g, '')} ${pastIn[2]}” is not ahead of now, so no reminder or task was made. Use a number above zero, for example “Remind me in 5 minutes to stretch”.`, `“Over ${pastIn[1]!.replace(/\s/g, '')} ${pastIn[2]}” ligt niet in de toekomst, dus er is niets gemaakt. Gebruik een getal boven nul.`), calls: []};
  // "Remind me every hour …": tasks repeat by day, week, month or year, never by the hour (Lisbon #365).
  if (/\bevery\s+(?:hour|\d+\s*(?:minutes?|mins?|hours?))\b|\bhourly\b/i.test(q) && /\b(?:remind|task|add)\b/i.test(q)) return {kind: 'answer', text: say(lang, 'Tasks repeat by the day, week, month or year, not by the hour, and ZIGoals sends no hourly reminders. A daily habit (“Create a habit called Drink water”) with a reminder in Settings → Reminders comes closest.', 'Taken herhalen per dag, week, maand of jaar, niet per uur. Een dagelijkse gewoonte met een herinnering in Settings → Reminders komt het dichtst in de buurt.'), calls: []};
  // Habit edits said plainly (Nairobi P18, P20, P27, N15, N23, NB-106): the habit's own card, never a run-log composer.
  const times = /^(?:please\s+)?(?:make|change|set|switch)\s+(?:my\s+|the\s+)?(?:habit\s+)?(.{2,50}?)\s+(?:to\s+)?(\d|one|once|two|twice|three|four|five|six|seven)\s*(?:x|times)?\s*(?:a|per|each)\s+week\b/i.exec(q);
  if (times) {
    const habit = habitNamed(env, times[1]!), count = NUMBER_WORDS[times[2]!.toLowerCase()] ?? Number(times[2]);
    if (!habit) return noHabit(env, times[1]!, lang);
    if (count >= 1 && count <= 7) return {kind: 'answer', text: say(lang, `${shortName(habit.title)} ${count} times a week, changed only when you add it (Undo puts the old schedule back).`, `${shortName(habit.title)} ${count} keer per week, pas aangepast als je het toevoegt.`) + fence({kind: 'edit-habit', habit: habit.title, schedule: {timesPerWeek: count}}), calls: []};
  }
  const skip = /^(?:please\s+)?skip\s+(?:my\s+|the\s+)?(?:habit\s+)?(.{2,50}?)(?:\s+(today|yesterday))?\s*(?:[,;:]\s*|\s+)?(?:(?:reason|because|as|since|due to)\s*:?\s*(.{2,200}))?\s*[.!]?$/i.exec(q);
  if (skip) {
    const habit = habitNamed(env, skip[1]!);
    if (!habit && !/^(?:it|this|that|today|breakfast|lunch|dinner)$|\breview\b|\breminders?\b/i.test(skip[1]!.trim())) return noHabit(env, skip[1]!, lang);
    if (habit) return {kind: 'answer', text: say(lang, `Skip ${shortName(habit.title)} ${skip[2] ?? 'today'}${skip[3] ? `, reason: ${skip[3].trim()}` : ''}. A skip keeps your streak; saved only when you add it.`, `${shortName(habit.title)} overslaan ${skip[2] === 'yesterday' ? 'gisteren' : 'vandaag'}${skip[3] ? `, reden: ${skip[3].trim()}` : ''}. Pas bewaard als je het toevoegt.`) + fence({kind: 'skip', habit: habit.title, day: skip[2]?.toLowerCase() === 'yesterday' ? 'yesterday' : 'today', ...(skip[3] ? {reason: skip[3].trim().slice(0, 500)} : {})}), calls: []};
  }
  const pause = /^(?:please\s+)?pause\s+(?:my\s+|the\s+)?(?:habit\s+)?(.{2,50}?)(?:\s+(?:for|during)\s+(?:a|one|1|two|2|three|3)\s+(week|weeks|days?))?\s*[.!]?$/i.exec(q);
  if (pause) {
    const habit = habitNamed(env, pause[1]!);
    if (!habit && !/^(?:it|this|that|music|the music|sync)$/i.test(pause[1]!.trim())) return noHabit(env, pause[1]!, lang);
    if (habit && pause[2]) { const n = /^(?:two|2)/i.test(q.split(/for|during/i).at(-1)!.trim()) ? 2 : /^(?:three|3)/i.test(q.split(/for|during/i).at(-1)!.trim()) ? 3 : 1, length = /week/i.test(pause[2]) ? 7 * n : n;
      return {kind: 'answer', text: say(lang, `A break for ${shortName(habit.title)} from today to ${addLocalDays(env.habitDay, length - 1)}: those days don’t count against it, and it carries on after. Added only when you add it.`, `Een pauze voor ${shortName(habit.title)} van vandaag tot ${addLocalDays(env.habitDay, length - 1)}: die dagen tellen niet mee. Pas toegevoegd als je het toevoegt.`) + fence({kind: 'vacation', from: env.habitDay, to: addLocalDays(env.habitDay, length - 1), habits: [habit.title]}), calls: []}; }
    if (habit) return {kind: 'answer', text: say(lang, `Pause ${shortName(habit.title)} until you resume it on Habits; changed only when you add it.`, `${shortName(habit.title)} pauzeren tot je hem op Habits hervat; pas aangepast als je het toevoegt.`) + fence({kind: 'set-habit-state', habit: habit.title, state: 'paused'}), calls: []};
  }
  // "Read 10 pages took 30 minutes", "I drank water": the habit itself, never "+30 times" or a Health glass (Lisbon #280–289, N-LA-05).
  const took = /^(?:i\s+)?(?:did\s+)?(.{2,50}?)\s+(?:took|in|for)\s+(\d{1,3})\s*(?:minutes?|mins?|min|hours?|h)\b/i.exec(q);
  if (took) {
    const habit = habitNamed(env, took[1]!), rule = habit ? latestHabitRule(habit) : null;
    if (habit && rule && rule.measurement.kind !== 'duration' && !/^(?:minutes?|mins?|hours?)$/i.test('unit' in rule.measurement ? String(rule.measurement.unit) : '')) {
      const card = quickCommand(`mark ${habit.title} done`, env);
      const note = say(lang, `${shortName(habit.title)} counts in ${'unit' in rule.measurement ? rule.measurement.unit : 'check-ins'}, not minutes, so the ${took[2]} minutes are not saved; it is checked in as done.`, `${shortName(habit.title)} telt in ${'unit' in rule.measurement ? rule.measurement.unit : 'check-ins'}, niet in minuten; hij wordt ingecheckt als gedaan.`);
      if (card && card.kind === 'answer') return {kind: 'answer', text: `${note}${card.text.slice(card.text.indexOf('\n\n'))}`, calls: []};
      return {kind: 'answer', text: note + fence({kind: 'check-in', habit: habit.title}), calls: []};
    }
  }
  const drank = /^(?:i\s+)?(?:drank|had|did|finished)\s+(?:my\s+)?(water|stretch(?:ing)?|reading|read)\s*[.!]?$/i.exec(q);
  if (drank) {
    const habit = habitNamed(env, drank[1]!.toLowerCase() === 'water' ? 'drink water' : drank[1]!);
    if (habit) { const card = quickCommand(`mark ${habit.title} done`, env); if (card) return {kind: card.kind, text: card.text, calls: []}; }
  }
  // "I walked 2 dogs": a number without a distance or steps is not a log (Lisbon #280–289a, ZIGi-F9).
  const walk = WALK_NOUN.exec(q);
  if (walk && !NOT_UNITS.test(walk[2]!) && !/^(?:times?|glass(?:es)?|lap)$/i.test(walk[2]!)) return {kind: 'answer', text: say(lang, `I didn’t log that: “${walk[0]}” has no distance, steps or time. Say it with one, for example “walked 3 km” or “walked 4000 steps”.`, `Dat heb ik niet gelogd: “${walk[0]}” heeft geen afstand, stappen of tijd.`), calls: []};
  // "3 glasses, no wait, 2": the corrected amount (Lisbon LA-018, LZ-005).
  const fix = /^(.*?)(\d+(?:[.,]\d+)?)\s*([a-z]+)\s*,?\s*(?:no wait|wait no|no,|i mean|sorry|actually|make (?:it|that))\s*,?\s*(\d+(?:[.,]\d+)?)\s*([a-z]+)?\s*[.!]?$/i.exec(q);
  if (fix) {
    const fixed = `${fix[1]}${fix[4]} ${fix[5] ?? fix[3]}`.trim(), reply = quickLogReply(fixed, quickLogContext(env), lang === 'nl' ? 'nl' : 'en');
    if (reply) return {kind: 'answer', text: say(lang, `Taken as ${fixed} (your correction). `, `Gelezen als ${fixed} (je correctie). `) + reply.text, calls: []};
  }
  // A saving amount by a date is a goal, never a log (Denver Z-004, N-005, N-066, old Z-003).
  const saveBy = SAVE_BY.exec(q);
  if (saveBy || (WANT_SAVE_AND_SPEND.test(q) && /\bspend\b/i.test(q))) {
    const raw = saveBy ? saveBy[1]!.replace(/\s/g, '') : '', european = /^\d{1,3}(?:\.\d{3})+$/.test(raw), value = raw ? Number(european ? raw.replace(/\./g, '') : raw.replace(/,(?=\d{3}\b)/g, '').replace(',', '.')) * (/^(?:k|thousand)$/i.test(saveBy?.[2] ?? '') ? 1000 : 1) : NaN;
    const by = saveBy?.[3]?.trim();
    const what = Number.isFinite(value) && value > 0 ? say(lang, `Saving ${new Intl.NumberFormat('en-GB').format(value)}${by ? ` by ${by}` : ''}`, `${new Intl.NumberFormat('nl-NL').format(value)} sparen${by ? ` voor ${by}` : ''}`) : say(lang, 'Saving', 'Sparen');
    return {kind: 'answer', text: say(lang, `${what} is a goal. Open the goal form below: give it a name, the amount${by ? ' and the date' : ''}; nothing is saved until you create it, and no money moves.${/\bspend\b/i.test(q) ? ' Spending is logged in Wealth → Spending when it happens, not ahead.' : ''}`, `${what} is een doel. Open het doelformulier hieronder: geef het een naam, het bedrag${by ? ' en de datum' : ''}; er wordt niets opgeslagen tot je het aanmaakt.`) + fence({kind: 'open-page', page: 'goals', view: 'new-goal'}), calls: []};
  }
  const want = GOAL_WANT.exec(q);
  if (want && !/\b(?:kg|kilo|pounds?|lbs?)\b/i.test(q) && want[1]!.toLowerCase() !== 'lose') {
    const name = `${want[1]![0]!.toUpperCase()}${want[1]!.slice(1).toLowerCase()} ${want[2]!.trim()}`.slice(0, 60);
    return {kind: 'answer', text: say(lang, `Let’s make it a goal: “${name}”. Open the goal form below; the name is filled in, and you add the target and, if you like, a date. Nothing is saved until you create it.`, `Laten we er een doel van maken: “${name}”. Open het doelformulier hieronder; er wordt niets opgeslagen tot je het aanmaakt.`) + fence({kind: 'open-page', page: 'goals', view: 'new-goal', name}), calls: []};
  }
  // Goals: close, finish or delete one, or all (Denver Z-010, Z-011, N-011, N-012, N-048, N-052, DVR:Z-008).
  const goalDo = /^(?:please\s+)?(close|delete|remove|archive|finish|complete|end|mark)\s+(?:my\s+|the\s+)?(.{1,80}?)\s+goal(?:\s+(?:as\s+)?(?:done|complete|completed|finished|reached))?\s*[.!]?$/i.exec(q);
  if (goalDo) {
    const verb = goalDo[1]!.toLowerCase(), goal = goalNamed(env, goalDo[2]!);
    if (/^(?:all|every)\b/i.test(goalDo[2]!) || /^all my$/i.test(goalDo[2]!)) return {kind: 'answer', text: say(lang, `I can’t delete goals from a chat, one or all. Each goal is deleted on its own page in Goals (it asks you to confirm and keeps Undo).`, 'Ik kan vanuit een chat geen doelen verwijderen. Elk doel verwijder je op zijn eigen pagina in Goals.') + open('goals'), calls: []};
    if (!goal) return {kind: 'answer', text: say(lang, `No open goal is called “${goalDo[2]}”. ${openGoals(env).length ? `Your goals: ${listNames(openGoals(env).map(g => shortName(g.name)), 6)}.` : 'You have no goals yet.'}`, `Geen open doel heet “${goalDo[2]}”.`), calls: []};
    if (/^(?:delete|remove)$/.test(verb)) return {kind: 'answer', text: say(lang, `I can’t delete ${shortName(goal.name)} from a chat: open it in Goals and choose Delete there (it asks you to confirm). Closing it instead keeps its history.`, `Ik kan ${shortName(goal.name)} niet vanuit een chat verwijderen: open het in Goals en kies daar Delete.`) + open('goals'), calls: []};
    return {kind: 'answer', text: say(lang, `Close ${shortName(goal.name)}: it leaves your active goals and keeps its history; closed only when you add it, and Reopen brings it back.`, `${shortName(goal.name)} sluiten: het verlaat je actieve doelen en houdt zijn geschiedenis; pas gesloten als je het toevoegt.`) + fence({kind: 'close-goal', goal: goal.name}), calls: []};
  }
  if (/^(?:please\s+)?(?:delete|remove|erase|clear)\s+(?:all|every)\s+(?:of\s+)?(?:my\s+)?goals?\b/i.test(q)) return {kind: 'answer', text: say(lang, 'I can’t delete goals from a chat, one or all. Each goal is deleted on its own page in Goals (it asks you to confirm).', 'Ik kan vanuit een chat geen doelen verwijderen. Elk doel verwijder je op zijn eigen pagina in Goals.') + open('goals'), calls: []};
  // "I read 3 books, add to DV Count books": the goal's contribution form, filled in (Denver Z-027).
  const toGoal = /^(?:i\s+\w+\s+)?(\d+(?:[.,]\d+)?)\s*([a-z]+)?[^.?!]{0,20}?,?\s*(?:add|log|put|count)\s+(?:it\s+|them\s+)?(?:to|towards|on)\s+(?:my\s+|the\s+)?(.{2,60}?)(?:\s+goal)?\s*[.!]?$/i.exec(q);
  if (toGoal) {
    const goal = goalNamed(env, toGoal[3]!), value = Number(toGoal[1]!.replace(',', '.'));
    if (goal && value > 0) return {kind: 'answer', text: say(lang, 'A contribution to the goal: its own form opens filled in, and nothing is saved until you save it there.', 'Een inleg voor het doel: het formulier opent ingevuld, en er wordt niets bewaard tot je het daar opslaat.') + fence({kind: 'prefill-contribution', goal: goal.name, amount: value, day: 'today'}), calls: []};
  }
  // Wealth writes (Tokyo TK #11, #17, #18, #52, #53): the form filled in, an alert card, or the line that ZIGoals never trades.
  const addCoin = /^(?:please\s+)?(?:add|record|track)\s+(\d+(?:[.,]\d+)?)\s+(btc|eth|sol|zig|usdc|atom|bitcoin|ether|ethereum|solana)\b(?:\s+to my (?:wealth|holdings|portfolio))?\s*[.!]?$/i.exec(q);
  if (addCoin) {
    const sym = ({bitcoin: 'BTC', ether: 'ETH', ethereum: 'ETH', solana: 'SOL'} as Record<string, string>)[addCoin[2]!.toLowerCase()] ?? addCoin[2]!.toUpperCase();
    return {kind: 'answer', text: say(lang, `Add ${addCoin[1]} ${sym} to Wealth: the add-asset form opens filled in; nothing is saved until you save it there, and nothing is bought.`, `${addCoin[1]} ${sym} toevoegen aan Wealth: het formulier opent ingevuld; er wordt niets bewaard tot je het daar opslaat, en niets gekocht.`) + fence({kind: 'prefill-holding', category: 'Crypto', name: sym, symbol: sym, quantity: Number(addCoin[1]!.replace(',', '.')), currency: 'USD'}), calls: []};
  }
  if (/^(?:please\s+)?(?:sell|buy|swap|trade)\s+\d/i.test(q)) return {kind: 'answer', text: say(lang, 'I can’t buy, sell or move anything, and ZIGoals never trades. If you sold some yourself, change the holding’s quantity in Wealth so its figures stay right.', 'Ik kan niets kopen, verkopen of verplaatsen, en ZIGoals handelt nooit. Verkocht je zelf iets, pas dan de hoeveelheid in Wealth aan.') + open('wealth'), calls: []};
  const alert = /\b(?:alert|notify|tell|ping|warn)\s+me\s+(?:when|if)\s+(btc|eth|sol|zig|bitcoin|ether|ethereum|solana)\s+(?:hits|reaches|goes (?:above|over|below|under)|is (?:above|over|below|under)|drops (?:below|under)|crosses)\s+(?:[$€]\s?)?(\d+(?:[.,]\d+)?)\s*(k)?\s*(usd|eur|dollars?|euros?)?/i.exec(q);
  if (alert) {
    const sym = ({bitcoin: 'BTC', ether: 'ETH', ethereum: 'ETH', solana: 'SOL'} as Record<string, string>)[alert[1]!.toLowerCase()] ?? alert[1]!.toUpperCase(), price = Number(alert[2]!.replace(',', '.')) * (alert[3] ? 1000 : 1), below = /\b(?:below|under|drops)\b/i.test(q);
    return {kind: 'answer', text: say(lang, `A price alert for ${sym} ${below ? 'below' : 'above'} ${new Intl.NumberFormat('en-GB').format(price)} ${/eur/i.test(alert[4] ?? '') ? 'EUR' : 'USD'}, kept on this device and checked when prices are read; added only when you add it. Information, never advice: nothing is bought or sold.`, `Een prijsalarm voor ${sym}, pas toegevoegd als je het toevoegt. Informatie, nooit advies.`) + fence({kind: 'create-price-alert', coin: sym, direction: below ? 'below' : 'above', price, currency: /eur/i.test(alert[4] ?? '') ? 'EUR' : 'USD'}), calls: []};
  }
  return null;
}

function noHabit(env: ToolEnv, said: string, lang: Lang): LocalReply {
  if (!env.areas.habits) { const r = runTool('list_habits', {}, env); return {kind: 'refusal', text: r.ok ? 'Habits isn’t shared here.' : r.refusal, calls: []}; }
  const names = activeHabits(env).map(h => shortName(h.title));
  return {kind: 'answer', text: say(lang, `No habit is called “${said.trim()}”. ${names.length ? `Your habits: ${listNames(names, 8)}.` : 'You have no habits yet: “Create a habit called Run” makes one.'}`, `Geen gewoonte heet “${said.trim()}”. ${names.length ? `Je gewoontes: ${listNames(names, 8)}.` : 'Je hebt nog geen gewoontes.'}`), calls: []};
}

// ---- last, before the examples list ----
type Fact = {re: RegExp; en: (env: ToolEnv | null) => string; nl: (env: ToolEnv | null) => string; page?: [string, string?]};
const FACTS: readonly Fact[] = [
  {re: /^\s*(?:hi|hello|hey|hoi|hallo|good (?:morning|afternoon|evening)|yo)(?:\s+(?:there|zigi|nova))?\s*[!.?]*\s*$/i,
    en: env => `Hi. I’m ${who(env)}: ask about today, your habits, goals or money and I answer from your records on this device. Try “What is due today?”.`, nl: env => `Hoi. Ik ben ${who(env)}: vraag naar vandaag, je gewoontes, doelen of geld en ik antwoord uit je gegevens op dit apparaat.`},
  {re: /^\s*(?:thanks?|thank you(?: so much)?|cheers|ty|thx|dank(?:je| je)?(?: wel)?|bedankt)\s*[!.]*\s*$/i,
    en: () => 'You’re welcome. Ask again any time.', nl: () => 'Graag gedaan. Vraag gerust opnieuw.'},
  {re: /\bwhat can'?t you do\b|\bwhat (?:are|is) your limit(?:s|ations)?\b|\bwhat don'?t you do\b/i,
    en: env => `Without your own AI I don’t give advice, write plans or reviews, or understand every wording; I never move money, sign anything or change a record without your tap on a card; and I don’t send your records anywhere. With your own AI (${brainPlace(env, 'en')}) I can talk things through.`, nl: env => `Zonder eigen AI geef ik geen advies en schrijf ik geen plannen; ik verplaats nooit geld en verander niets zonder jouw tik op een kaart. Met je eigen AI (${brainPlace(env, 'nl')}) kan ik meedenken.`},
  {re: /\b(?:is|are|does|do)\b[^.?!]{0,30}\b(?:my )?(?:data|records|habits|messages?|chats?|questions?|anything)\b[^.?!]{0,30}\b(?:sent|send|go(?:es)?|leave|shared|uploaded)\b[^.?!]{0,30}\b(?:anywhere|cloud|server|internet|online|outside)\b|\bdo you send\b[^.?!]{0,40}\b(?:server|cloud|anywhere)\b|\bis my data sent\b/i,
    en: env => `Not now: this answer was made on this device and nothing was sent. With your own AI connected, your question and the records of the areas you share go to that AI only when you ask (${env && novaEnvInfo(env) ? 'NOVA → Permissions' : 'Settings → ZIGi → What your AI sees'}). ZIGoals runs no server that reads your records; encrypted sync is optional.`, nl: () => 'Nu niet: dit antwoord is op dit apparaat gemaakt en er is niets verstuurd. Met je eigen AI gaan je vraag en de gedeelde gebieden alleen naar die AI als je iets vraagt.', page: ['settings', 'zigi']},
  {re: /\bwho can (?:read|see)\b[^.?!]{0,20}\b(?:this|my|the)\s+(?:chat|conversation|messages?)\b|\bis (?:this|my) chat private\b/i,
    en: env => `This chat is kept on this device only; nobody else reads it. With your own AI connected, that AI’s provider receives what you send it. ${env && novaEnvInfo(env) ? 'NOVA’s chat history' : 'ZIGi’s chat history'} can be deleted from its History.`, nl: () => 'Deze chat staat alleen op dit apparaat; niemand anders leest hem. Met je eigen AI ontvangt die aanbieder wat je stuurt.'},
  {re: /\b(?:can|do) you (?:see|read|access)\b[^.?!]{0,15}\bbank(?: account)?\b|\bbank account password\b|\bknow about my bank\b/i,
    en: () => 'No. ZIGoals never connects to your bank and never asks for a bank login or password. Accounts you enter yourself in Wealth → Accounts are figures you typed, read only on this device.', nl: () => 'Nee. ZIGoals koppelt nooit aan je bank en vraagt nooit om een bankwachtwoord. Rekeningen die je zelf invoert zijn cijfers op dit apparaat.'},
  {re: /\b(?:are you|is this) (?:a )?(?:real )?(?:person|human|robot|bot)\b|\bam i talking to a (?:person|human|bot)\b/i,
    en: env => `No, I’m ${who(env)}, software in ZIGoals: not a person. Without your own AI my answers are made on this device from your records.`, nl: env => `Nee, ik ben ${who(env)}, software in ZIGoals: geen persoon.`},
  {re: /\bdid you (?:just )?(?:mark|change|tick|add|delete|do)\b[^.?!]{0,30}\b(?:anything|something|it)\b|\bdid you change\b/i,
    en: () => 'No: I change nothing by myself. A change only happens when you tap Add on a card, and every added card is listed in Activity → Actions by ZIGi with its page.', nl: () => 'Nee: ik verander niets uit mezelf. Een wijziging gebeurt pas als je op Add tikt, en elke kaart staat in Activity → Actions by ZIGi.', page: ['activity']},
  {re: /\b(?:show|open|see)\b[^.?!]{0,10}\b(?:my )?activity(?: log)?\b|\bactivity log\b/i,
    en: () => 'Activity lists what changed, newest first: your own changes and, under Actions by ZIGi, every card you added from a chat.', nl: () => 'Activity toont wat er veranderde, nieuwste eerst, met onder Actions by ZIGi elke kaart die je uit een chat toevoegde.', page: ['activity']},
  {re: /^\s*(?:please\s+)?undo(?:\s+(?:that|it|this|my last (?:check-?in|change|card)|the last (?:one|card|check-?in)))?\s*[.!]?\s*$|\bundo my last check-?in\b/i,
    en: () => 'A card’s Undo is on the card itself for ten seconds after you add it. After that, change the record on its page: a check-in is taken back on Habits or by unticking it on the Checklist. Activity → Actions by ZIGi shows what was added.', nl: () => 'De Undo van een kaart staat tien seconden op de kaart zelf. Daarna pas je het gegeven op zijn pagina aan: een check-in neem je terug op Habits of door hem op de Checklist uit te vinken.', page: ['activity']},
  {re: /\bturn on\b[^.?!]{0,20}\bhealth\b[^.?!]{0,20}\b(?:for )?(?:yourself|you)\b|\bgive yourself\b[^.?!]{0,20}\baccess\b|\b(?:enable|grant)\b[^.?!]{0,20}\b(?:your|yourself)\b[^.?!]{0,20}\baccess\b/i,
    en: env => `I can’t change my own access: only you can. ${env && novaEnvInfo(env) ? 'NOVA → Permissions → Health' : 'Settings → ZIGi → Include Health (with Health page data on)'} turns it on.`, nl: env => `Ik kan mijn eigen toegang niet veranderen: alleen jij. ${env && novaEnvInfo(env) ? 'NOVA → Permissions → Health' : 'Settings → ZIGi → Include Health'} zet het aan.`},
  {re: /\b(?:connect|link|hook up|set up)\b[^.?!]{0,20}\b(?:to )?(?:my )?(?:local|own)\s+(?:ai|model|llm|brain)\b|\bconnect (?:to )?ollama\b/i,
    en: env => `I can’t connect by myself: you do it in ${brainPlace(env, 'en')}, which finds a model running on this computer (Ollama or LM Studio) and tests it with you.`, nl: env => `Ik kan niet zelf verbinden: dat doe je in ${brainPlace(env, 'nl')}.`},
  {re: /\b(?:can|will|would|do) you (?:change|edit|update|delete|move)\b[^.?!]{0,30}\bwithout (?:asking|me|my ok|permission)\b/i,
    en: () => 'No. Every change I propose is a card you add, edit or dismiss; nothing is changed before you add it, and an added card has Undo.', nl: () => 'Nee. Elke wijziging is een kaart die jij toevoegt, aanpast of wegklikt; er verandert niets voordat je hem toevoegt.'},
  {re: /\bcredit (?:score|rating)\b/i,
    en: () => 'ZIGoals doesn’t hold a credit score: it never reads a bank or a credit agency. Your debts as you entered them are in Wealth → Accounts, debts & net worth.', nl: () => 'ZIGoals kent geen kredietscore: het leest nooit een bank of kredietbureau.', page: ['wealth']},
  {re: /\b(?:testnet|mainnet|test net|main net|practice network|which network)\b/i,
    en: () => 'Both, each for its own part: Goals and the wallet control use the practice network (zig-test-2, no real value); Staking uses it too, or the real network (zigchain-1) after a one-time confirmation; Wealth, Earn and Staking read the real network’s public figures, read-only. Settings → Wallet & network shows it.', nl: () => 'Allebei, elk voor een deel: Goals en de wallet gebruiken het oefennetwerk (zig-test-2); Staking ook, of het echte netwerk (zigchain-1) na een bevestiging; Wealth, Earn en Staking lezen de openbare cijfers van het echte netwerk.', page: ['settings']},
  {re: /\bwhat (?:does|can) (?:the )?settings(?: page)? (?:let me )?(?:change|do|hold)\b|\b(?:where|how) (?:do|can) i (?:turn|switch|change|set)\b[^.?!]{0,20}\b(?:theme|light|dark|appearance)\b|\blight (?:mode|theme)\b/i,
    en: () => 'Settings has six groups: Data & privacy (backup, export, erase), Your app (Theme, pages & buttons, motion), Your areas (Habits, Health, market data), Account & devices (sync, wallet & network), Your assistant (ZIGi, what your AI sees) and Help & diagnostics. The theme is under Your app → Theme: Nebula, Light or Dark.', nl: () => 'Settings heeft zes groepen: Data & privacy, Your app (Theme, pagina’s & knoppen), Your areas, Account & devices, Your assistant en Help & diagnostics. Het thema staat onder Your app → Theme: Nebula, Light of Dark.', page: ['settings']},
  {re: /\b(?:tax|taxes|capital gains|fiscal|belasting)\b/i,
    en: () => 'Tax is outside what ZIGoals does: it doesn’t work out what you owe or file anything, and this is not tax advice. Wealth keeps your own figures, and Settings → Your data → Export everything gives you a copy to share with an adviser.', nl: () => 'Belasting valt buiten wat ZIGoals doet; dit is geen belastingadvies. Wealth bewaart je eigen cijfers en Export everything geeft je een kopie voor een adviseur.', page: ['settings', 'data']},
  {re: /\bexport\b[^.?!]{0,20}\b(?:my )?(?:wealth|holdings|portfolio|money|finance)\b/i,
    en: () => 'Settings → Your data → Export everything makes one ZIP of all your records, Wealth included; I can’t make a file from a chat.', nl: () => 'Settings → Your data → Export everything maakt één ZIP met al je gegevens, Wealth inbegrepen.', page: ['settings', 'data']},
  {re: /\bwhat is staking\b|\bstaking in zig\b|\bhow does staking work\b/i,
    en: () => 'Staking is locking ZIG with a validator to help run ZIGChain and earn a share of its rewards; unstaking takes a waiting period before the ZIG is free again. Whether to do it is your choice: I don’t advise on it. Earn → Start here explains it step by step, with practice first.', nl: () => 'Staken is ZIG vastzetten bij een validator om ZIGChain te helpen draaien en een deel van de beloningen te krijgen; ontstaken kent een wachttijd. Of je het doet is jouw keuze: ik adviseer niet.', page: ['earn', 'start-here']},
];
const FOCUS_GOAL = /\bwhich goal should i (?:focus on|work on|start with)\b|\bwhat goal (?:to|should i) focus\b/i;
const BIGGEST_GOAL = /\b(?:which|what) goal\b[^.?!]{0,20}\b(?:biggest|largest|highest|smallest|lowest)\b|\b(?:biggest|largest) goal\b/i;
const NEXT_CONTRIBUTION = /\b(?:when|what) is my next (?:contribution|deposit|planned contribution)\b|\bnext (?:planned )?contribution\b/i;
const GOAL_HAVE = /\bhow much (?:do i have|have i|is|is there|did i put|have i saved)\s+(?:in|on|for|towards?)\s+(?:my\s+|the\s+)?(.{2,60}?)(?:\s+goal)?\s*[?.!]*$/i;
const GOAL_DATE = /\bwhat(?:'s| is) (?:my |the )?(.{2,60}?)(?:\s+goal)?(?:'s)? (?:target date|deadline|end date|due date)\b|\bwhen (?:is|will) (?:my |the )?(.{2,60}?)(?:\s+goal)? (?:due|done|reached|finished)\b/i;
const GOAL_NEED = /\bhow much (?:do i )?(?:still )?need (?:for|to reach) (?:my |the )?(.{2,60}?)(?:\s+goal)?(?:\s+and when)?\s*[?.!]*$/i;
const GOAL_PROGRESS_LOOSE = /^(?:what(?:'s| is)\s+)?(?:my\s+|the\s+)?(.{2,60}?)(?:\s+goal)?\s+(?:progress|status)\s*[?.!]*$|^(?:how far am i on|how is)\s+(?:my\s+|the\s+)?(.{2,60}?)(?:\s+goal)?(?:\s+doing|\s+going)?\s*[?.!]*$/i;
const DID_HABIT = /^(?:did|have)\s+i\s+(?:do\s+(?:my\s+)?|done\s+(?:my\s+)?)?([a-z][a-z ]{1,40}?)(?:\s+(today|yet))?\s*\??$/i;
const DONE_FOR_TODAY = /\bam i done (?:for|with) today\b|\bwhat should i do next\b|\bwhat(?:'s| is) next\b|\bam i on track today\b|\bwhich (?:of (?:these|my) )?habits am i behind on\b|\bwhat(?:'s| is) left (?:today|for today)\b/i;
const WHICH_DONE = /^(?:and\s+)?(?:which|what)\s+(?:ones?\s+)?(?:is|are|were)\s+(?:done|finished|complete)(?:\s+today)?\s*\??$|^(?:and\s+)?(?:which|what) habits? (?:are|is|did i) (?:done|finish(?:ed)?|complete(?:d)?) today\b/i;
const CONSISTENCY = /\b(\d{1,2})[- ]weeks?\b[^.?!]{0,10}\bconsisten\w*\b|\bconsisten\w*\b[^.?!]{0,20}\b(\d{1,2})[- ]weeks?\b/i;
const WEEK_TRACK = /\bam i on track (?:this|for the) week\b|\bhow (?:am i|is my) (?:doing|going) this week\b/i;
const MISSING_MORNINGS = /\bwhy do i (?:keep )?(?:miss(?:ing)?|skip(?:ping)?)\b[^.?!]{0,30}\b(morning|evening|afternoon)s?\b/i;
const RECALL_ALL = /\bwhat do you (?:remember|know) about me\b|\bwhat did i (?:tell|ask) you to remember\b|\bwhat have i told you\b|\bmy notes for (?:zigi|nova)\b/i;
const RECALL_DIET = /\bwhat (?:diet am i on|am i allergic to)\b|\bmy (?:diet|allerg\w*)\b/i;
const NET_WORTH_BARE = /^(?:my\s+)?(?:net worth|wealth|total wealth)(?:\s+in\s+(eur|usd|euros?|dollars?))?\s*[?.!]*$/i;
const CRYPTO_SHARE = /\bhow much of my (?:wealth|money|net worth|holdings)\b[^.?!]{0,10}\b(?:is|in)\b[^.?!]{0,10}\bcrypto\b|\bcrypto (?:share|percentage|part)\b|\bshare of crypto\b/i;
const FAVOURITES = /\b(?:my )?favou?rites?\b|\bwatch ?list\b/i;
const MOVERS = /\b(?:which|what) (?:coin|asset|crypto|token)s?\b[^.?!]{0,20}\bmoved?\b|\bbiggest (?:mover|movers|gainer|loser)s?\b|\btop movers?\b/i;
const PORTFOLIO_COIN = /\bhow much\s+(btc|eth|sol|zig|bitcoin|ether|ethereum)\b[^.?!]{0,20}\b(?:in|on)\s+(?:my\s+)?portfolios?\b/i;
const PORTFOLIO_SUMMARY = /^(?:my\s+)?portfolio(?:\s+(?:summary|overview|value))?\s*[?.!]*$|^summari[sz]e my portfolio\b/i;
const REWARDS = /^\s*what are my (?:staking )?rewards\s*\??\s*$|\bmy staking rewards\b/i;
const BILLS = /\b(?:what|which) bills?\b|\bbills? (?:are )?due\b|\bmy bills\b/i;
const OPEN_TASKS = /^(?:show\s+(?:me\s+)?)?(?:my\s+)?open tasks\s*[?.!]*$|^(?:list|show) (?:me )?my tasks\s*[?.!]*$|^(?:what|which) tasks (?:are|do i have) open\b/i;
/** Keyboard runs and letters without a vowel: not words in any language the app reads. */
const NONSENSE = /\b(?:asdf|qwert|zxcv|hjkl|uiop)\w*|\b([a-z])\1{3,}\b|\b[bcdfghjklmnpqrstvwxz]{5,}\b/i;

/** The question's previous turn, for "and which is done?", "and the second one?" and "and for Read 10 pages?". */
export function fourthAnswer(question: string, env: ToolEnv | null, lang: Lang, previous: string | null = null): LocalReply | null {
  const q = norm(question);
  if (!q || q.length > 300) return null;
  const week = /\bweekly (?:health )?review\b|\bgive me (?:my |a )?(?:weekly |week )review\b|\breview of my week\b/i.test(q);
  if (week) {
    const health = /\bhealth\b/i.test(q);
    return {kind: 'answer', text: health ? say(lang, `A weekly health review written for you needs your own AI (${brainPlace(env, lang)}). Without one, “How did I sleep this week?”, “How much water this week?” and Health → Insights show the week’s own figures.`, `Een wekelijks gezondheidsoverzicht vraagt je eigen AI. Zonder AI tonen “Hoe sliep ik deze week?” en Health → Insights de cijfers van de week.`) + open('health', 'insights')
      : say(lang, 'Your week from your own records: ask “Review my week”, or open Life review → This week. A review written for you needs your own AI.', 'Je week uit je eigen gegevens: vraag “Review my week”, of open Life review → This week.') + open('review', 'week'), calls: []};
  }
  const fact = FACTS.find(f => f.re.test(q) && f.en(env));
  if (fact) return {kind: 'answer', text: (lang === 'nl' ? fact.nl(env) : fact.en(env)) + (fact.page ? open(fact.page[0], fact.page[1]) : ''), calls: []};
  if (!env) return null;
  // Follow-ups to the previous question (Lisbon LA-035, LZ-018, C-LA-04; Denver Z-022, BUG-055; Professor PR:BUG-055).
  const followed = previous ? followUp(q, previous, env, lang) : null;
  if (followed) return followed;
  if (WHICH_DONE.test(q)) return doneHabits(env, lang);
  if (OPEN_TASKS.test(q)) {
    const r = run('tasks', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const d = dataOf(r.result), rows = (d.open ?? []) as Data[];
    return {kind: 'answer', text: rows.length ? [say(lang, `${plural(rows.length, 'open task')}: ${d.counts?.today ?? 0} due today, ${d.counts?.overdue ?? 0} overdue.`, `${rows.length} open taken: ${d.counts?.today ?? 0} vandaag, ${d.counts?.overdue ?? 0} te laat.`), ...rows.slice(0, 10).map(t => `• ${clean(String(t.task), 60)}${t.due ? ` · ${t.due}${t.time ? ` ${t.time}` : ''}` : ''}${t.priority && t.priority !== 'normal' ? ` · ${t.priority}` : ''}`)].join('\n') : say(lang, 'No open task is kept.', 'Er staat geen open taak.'), calls: [r.record]};
  }
  // Did I stretch today? (Lisbon #244/245, LA-033)
  const did = DID_HABIT.exec(q);
  if (did && !env.areas.habits) return noHabit(env, did[1]!, lang);
  if (did) { const habit = habitNamed(env, did[1]!); if (habit) return habitToday(env, habit, lang); }
  // A suggestion, a routine or a habit stack is the person's own AI's to write (Nairobi H6, N16, N17, N22, NB-111, NB-121).
  if (/^(?:please\s+)?(?:suggest|recommend)\b|\bhabit stack\b|\b(?:build|make|design) (?:me )?a (?:morning|evening|night) routine\b|\bcoach me\b/i.test(q))
    return {kind: 'answer', text: say(lang, `Suggestions and routines written for you need your own AI (${brainPlace(env, lang)}). Without one: Habits → Routines strings your own habits into a routine, and a habit’s page sets “after another habit” to stack it.`, 'Suggesties en routines op maat vragen je eigen AI. Zonder AI: Habits → Routines zet je eigen gewoontes in een routine.') + open('habits', 'routines'), calls: []};
  if (DONE_FOR_TODAY.test(q)) {
    const base = deviceAnswer('What is due today?', env);
    if (base && 'text' in base) return {...base, text: `${/\bam i done\b/i.test(q) ? say(lang, 'Not everything yet. ', 'Nog niet alles. ') : ''}${base.text}`} as LocalReply;
  }
  if (WEEK_TRACK.test(q)) return consistency(env, 1, lang);
  const cons = CONSISTENCY.exec(q);
  if (cons) return consistency(env, Number(cons[1] ?? cons[2]), lang);
  const mornings = MISSING_MORNINGS.exec(q);
  if (mornings) return orbitMisses(env, mornings[1]!.toLowerCase(), lang);
  // Goals (Denver Z-006, Z-023/24, N-023, N-038, N-042, N-060, LZ-010, DVR:Z-049/051/053/054).
  if (FOCUS_GOAL.test(q)) return focusGoal(env, lang);
  // "What should I do with my Emergency fund?": no advice, the goal's own figures (Denver DVR:D-061, handed over by L7-4a).
  const doWith = /\bwhat should i do with (?:my |the )?(.{2,60}?)(?:\s+goal)?\s*\??$/i.exec(q);
  if (doWith && goalNamed(env, doWith[1]!)) { const facts = goalAsk(env, doWith[1]!, q, lang); return {kind: 'answer', text: say(lang, 'What to do with it is your choice: I don’t advise on money. The goal’s own figures: ', 'Wat je ermee doet is jouw keuze: ik geef geen geldadvies. De cijfers van het doel: ') + (facts && 'text' in facts ? facts.text : ''), calls: facts && 'calls' in facts ? facts.calls : []}; }
  if (BIGGEST_GOAL.test(q)) return biggestGoal(env, lang, /\b(?:smallest|lowest)\b/i.test(q));
  if (NEXT_CONTRIBUTION.test(q)) return nextContribution(env, lang);
  const named = GOAL_NEED.exec(q) ?? GOAL_DATE.exec(q) ?? GOAL_HAVE.exec(q) ?? GOAL_PROGRESS_LOOSE.exec(q);
  if (named) { const said = (named[1] ?? named[2] ?? '').trim(); if (said && !/^(?:it|this|that|my goals?|goals?)$/i.test(said)) return goalAsk(env, said, q, lang); }
  const bare = openGoals(env).find(g => fold(g.name) === fold(q.replace(/[?.!]+$/, '')));
  if (bare) return goalAsk(env, bare.name, q, lang);
  // Wealth (Tokyo TK #2, #5, #8, #12, #43, #47, #48, #50, P9).
  const nw = NET_WORTH_BARE.exec(q);
  if (nw) { const r = deviceAnswer('What is my net worth?', env); if (r && 'text' in r) return nw[1] ? {...r, text: `${say(lang, `I don’t convert between currencies, so there is no single figure in ${/eur/i.test(nw[1]) ? 'EUR' : 'USD'}: each total stays in its own.`, `Ik reken niet om tussen valuta, dus er is geen enkel bedrag in ${/eur/i.test(nw[1]) ? 'EUR' : 'USD'}.`)}\n${r.text}`} as LocalReply : r; }
  if (/^\s*(?:my\s+)?debts?\s*[?.!]*\s*$/i.test(q)) { const r = deviceAnswer('What do I owe?', env); if (r) return r; }
  if (CRYPTO_SHARE.test(q)) return cryptoShare(env, lang);
  const coin = PORTFOLIO_COIN.exec(q);
  if (coin) return portfolioCoin(env, coin[1]!, lang);
  if (PORTFOLIO_SUMMARY.test(q)) { const r = deviceAnswer('What is my portfolio worth?', env); if (r) return r; }
  if (FAVOURITES.test(q) && !/\bhabit\b/i.test(q)) return favourites(env, lang);
  if (MOVERS.test(q)) return movers(env, lang);
  if (/\bprice of (solana|sol)\b|\b(?:solana|sol) price\b/i.test(q)) { const r = deviceAnswer('What is the price of SOL?', env); if (r) return r; }
  if (REWARDS.test(q)) return rewards(env, lang);
  if (BILLS.test(q)) return bills(env, lang);
  if (/\bwhat(?:'s| has)? changed\b[^.?!]{0,20}\b(?:wealth|net worth|holdings|money)\b|\bhow (?:has|did) my (?:wealth|net worth) change\b/i.test(q)) { const r = deviceAnswer('Why did my net worth change this week?', env); if (r) return r; }
  if (/^\s*what changed\s*\??\s*$|\bwhat changed (?:today|lately|recently|this week)\b/i.test(q)) return changed(env, lang);
  // A screen ZIGi can't read here (Settings, a private screen): said, never the examples list (Lisbon ctx-a, ctx-c).
  if (/\bwhat(?:'s| is) on (?:this|my) (?:page|screen)\b|\bsummari[sz]e (?:this|the) (?:page|screen)\b|\bwhat am i looking at\b/i.test(q)) return {kind: 'answer', text: say(lang, 'I can’t read this screen here: Settings and private screens are never read, and elsewhere I see card titles only. Ask about a figure (“What is due today?”) and I look it up.', 'Dit scherm lees ik hier niet: Settings en privéschermen worden nooit gelezen.'), calls: []};
  // Not a question at all ("asdfghjkl qwerty zzzz"): said so, with what works (Lisbon #018, LA-020).
  if (NONSENSE.test(q) && !/\d/.test(q)) return {kind: 'answer', text: say(lang, 'I didn’t catch that. Ask about today, a habit, a goal or your money, for example “What is due today?”.', 'Dat begreep ik niet. Vraag naar vandaag, een gewoonte, een doel of je geld, bijvoorbeeld “Wat staat er vandaag open?”.'), calls: []};
  return null;
}

function followUp(q: string, previous: string, env: ToolEnv, lang: Lang): LocalReply | null {
  const prev = norm(previous);
  if (WHICH_DONE.test(q) && /\bhabits?\b|\bopen\b|\bleft\b/i.test(prev)) return doneHabits(env, lang);
  const forHabit = /^(?:and\s+|what about\s+|how about\s+)(?:for\s+|with\s+)?(?:my\s+)?(.{2,50}?)\s*\??$/i.exec(q);
  if (forHabit) {
    const habit = habitNamed(env, forHabit[1]!);
    if (habit && /\bstreak\b/i.test(prev)) return deviceAnswer(`What is my ${habit.title} streak? ${/\b(?:longest|best|record)\b/i.test(prev) ? 'longest' : ''}`.trim(), env);
    if (habit && /\bhabits?\b|\bdid i\b|\btoday\b/i.test(prev)) return habitToday(env, habit, lang);
    const goal = goalNamed(env, forHabit[1]!);
    if (goal && /\bgoals?\b/i.test(prev)) return goalAsk(env, goal.name, prev, lang);
  }
  const nth = /^(?:and\s+|what about\s+|how about\s+)?(?:the\s+)?(first|second|third|fourth|fifth|last)(?:\s+one)?\s*\??$/i.exec(q);
  if (nth && /\bgoals?\b/i.test(prev)) {
    const goals = openGoals(env), at = ({first: 0, second: 1, third: 2, fourth: 3, fifth: 4} as Record<string, number>)[nth[1]!.toLowerCase()] ?? goals.length - 1, goal = goals[at];
    if (goal) return goalAsk(env, goal.name, 'how far am i', lang);
    return {kind: 'answer', text: say(lang, `You have ${plural(goals.length, 'goal')}, so there is no ${nth[1]} one.`, `Je hebt ${goals.length} doelen, dus er is geen ${nth[1]}.`), calls: []};
  }
  return null;
}
function doneHabits(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('list_habits', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const rows = ((dataOf(r.result).habits ?? []) as Data[]).filter(h => h.state === 'active'), done = rows.filter(h => h.today === 'complete'), part = rows.filter(h => h.today === 'partial');
  return {kind: 'answer', text: done.length || part.length ? say(lang, `Done today: ${done.map(h => clean(String(h.title), 50)).join(', ') || 'none yet'}${part.length ? `; partly: ${part.map(h => clean(String(h.title), 50)).join(', ')}` : ''} (${done.length} of ${rows.length}).`, `Gedaan vandaag: ${done.map(h => clean(String(h.title), 50)).join(', ') || 'nog geen'} (${done.length} van ${rows.length}).`) : say(lang, `None of your ${plural(rows.length, 'habit')} is done yet today.`, `Nog geen van je ${rows.length} gewoontes is vandaag gedaan.`), calls: [r.record]};
}
function habitToday(env: ToolEnv, habit: Habit, lang: Lang): LocalReply {
  const r = run('list_habits', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const row = ((dataOf(r.result).habits ?? []) as Data[]).find(h => h.title === clean(habit.title, 100) || String(h.title).startsWith(habit.title.slice(0, 40)));
  const state = String(row?.today ?? 'unknown'), name = shortName(habit.title);
  const text = state === 'complete' ? say(lang, `Yes: ${name} is done today.`, `Ja: ${name} is vandaag gedaan.`) : state === 'partial' ? say(lang, `Partly: ${name} has a check-in today, short of its target.`, `Deels: ${name} heeft vandaag een check-in, onder het doel.`)
    : state === 'not scheduled' || state === 'not due' ? say(lang, `${name} isn’t planned today.`, `${name} staat vandaag niet gepland.`) : state === 'skipped' ? say(lang, `${name} is skipped today.`, `${name} is vandaag overgeslagen.`) : say(lang, `Not yet: ${name} has no check-in today. Say “mark ${name} done” for the card.`, `Nog niet: ${name} heeft vandaag geen check-in.`);
  return {kind: 'answer', text, calls: [r.record]};
}
function consistency(env: ToolEnv, weeks: number, lang: Lang): LocalReply {
  const span = Math.max(1, Math.min(52, weeks || 12)), from = addLocalDays(env.habitDay, -(span * 7 - 1)), habits = activeHabits(env).slice(0, 12), calls: {tool: string; args: Record<string, unknown>; label: string}[] = [];
  if (!env.areas.habits) { const r = run('list_habits', {}, env); return {kind: 'refusal', text: r.result.ok ? 'Habits isn’t shared here.' : r.result.refusal, calls: [r.record]}; }
  if (!habits.length) return {kind: 'answer', text: say(lang, 'No habit is kept yet, so there is no consistency to show.', 'Er is nog geen gewoonte.'), calls: []};
  const rows = habits.map(h => { const s = run('habit_stats', {habit: clean(h.title, 60), range: `${from}..${env.habitDay}`, metric: 'rate'}, env); calls.push(s.record); const d = s.result.ok ? dataOf(s.result) : null; return d ? `• ${shortName(h.title)}: ${d.days?.complete ?? 0} of ${d.days?.scheduled ?? 0} planned days (${d.completionRate ?? 0}%)` : null; }).filter(Boolean);
  return {kind: 'answer', text: [say(lang, `${span === 1 ? 'The last 7 days' : `The last ${span} weeks`} (${from} to ${env.habitDay}), from your Habits journal:`, `${span === 1 ? 'De laatste 7 dagen' : `De laatste ${span} weken`}, uit je Habits-dagboek:`), ...rows].join('\n'), calls};
}
function orbitMisses(env: ToolEnv, orbit: string, lang: Lang): LocalReply {
  const list = checklistToday(env), inOrbit = (list?.dots ?? []).filter(d => d.orbit.toLowerCase().startsWith(orbit)).map(d => d.name);
  const names = inOrbit.length ? inOrbit : activeHabits(env).filter(h => (h as Habit & {timeOfDay?: string}).timeOfDay === orbit).map(h => shortName(h.title));
  const lines = names.slice(0, 6).map(n => { const habit = habitNamed(env, n); if (!habit) return null; const s = runTool('habit_stats', {habit: clean(habit.title, 60), range: 'the last 30 days'}, env); const d = s.ok ? (s as ToolOk).data as Data : null; return d ? `• ${n}: ${d.days?.complete ?? 0} of ${d.days?.scheduled ?? 0} planned days in the last 30` : null; }).filter(Boolean);
  return {kind: 'answer', text: [say(lang, `Why is a question your own AI can talk through with you (${brainPlace(env, lang)}). What the records show for your ${orbit}s:`, `Waarom is een vraag voor je eigen AI. Wat je gegevens tonen voor je ${orbit}:`), ...(lines.length ? lines : [say(lang, `• Nothing is planned in the ${orbit} on your path.`, '• Er staat niets gepland.')])].join('\n'), calls: []};
}
function recall(env: ToolEnv, lang: Lang, diet: boolean): LocalReply {
  const notes = env.notes ?? [], pick = diet ? notes.filter(n => n.category === 'diet' || /\b(?:allerg\w*|vegan|vegetarian|gluten|lactose|diet)\b/i.test(n.text)) : notes;
  if (!notes.length) return {kind: 'answer', text: say(lang, `I keep no notes about you${env.notes === null ? ' that I may read here (“Use my notes” in What ZIGi knows about me)' : ''}. Say “Remember that …” and I make a note card you can add.`, `Ik bewaar geen notities over je. Zeg “Onthoud dat …” en ik maak een notitiekaart.`), calls: []};
  if (!pick.length) return {kind: 'answer', text: say(lang, `None of your notes says anything about ${diet ? 'a diet or an allergy' : 'that'}. Your notes are in What ZIGi knows about me.`, 'Geen van je notities gaat daarover.'), calls: []};
  return {kind: 'answer', text: [say(lang, `From what you asked me to remember (${plural(pick.length, 'note')}):`, `Uit wat je me vroeg te onthouden (${pick.length}):`), ...pick.slice(0, 10).map(n => `• ${clean(n.text, 200)} (${n.category})`)].join('\n'), calls: []};
}
function goalAsk(env: ToolEnv, said: string, q: string, lang: Lang): LocalReply | null {
  const goal = goalNamed(env, said);
  if (!goal) {
    if (!env.areas.goals) return null;
    const all = openGoals(env);
    return {kind: 'answer', text: say(lang, `No goal is called “${said}”. ${all.length ? `Your goals: ${listNames(all.map(g => shortName(g.name)), 6)}.` : 'You have no goals yet; Goals → Create a goal starts one.'}`, `Geen doel heet “${said}”. ${all.length ? `Je doelen: ${listNames(all.map(g => shortName(g.name)), 6)}.` : 'Je hebt nog geen doelen.'}`), calls: []};
  }
  const r = run('goal_progress', {goal: clean(goal.name, 120)}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const d = dataOf(r.result), date = d.targetDate && d.targetDate !== 'none' ? d.targetDate : null, projected = typeof d.plan === 'object' && d.plan.projectedCompletion && d.plan.projectedCompletion !== 'unknown' ? d.plan.projectedCompletion : null;
  const head = say(lang, `${clean(goal.name, 60)}: ${money(d.now)} of ${money(d.target)} (${d.progress}); ${money(d.remaining)} to go.`, `${clean(goal.name, 60)}: ${money(d.now)} van ${money(d.target)} (${d.progress}); nog ${money(d.remaining)}.`);
  const when = date ? say(lang, ` Target date: ${date}.`, ` Streefdatum: ${date}.`) : say(lang, ' No target date is set.', ' Er is geen streefdatum.');
  const proj = projected ? say(lang, ` At its plan it is reached around ${projected}.`, ` Volgens het plan rond ${projected}.`) : /\bwhen\b/i.test(q) ? say(lang, ' With no plan, there is no projected date (unknown).', ' Zonder plan is er geen verwachte datum.') : '';
  return {kind: 'answer', text: head + when + proj, calls: [r.record]};
}
function focusGoal(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('list_goals', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const goals = ((dataOf(r.result).goals ?? []) as Data[]).filter(g => g.status === 'active');
  if (!goals.length) return {kind: 'answer', text: say(lang, 'You have no active goals yet.', 'Je hebt nog geen actieve doelen.'), calls: [r.record]};
  const dated = goals.filter(g => g.targetDate && g.targetDate !== 'none').sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate)))[0];
  const offPlan = goals.filter(g => /behind|off track|late/i.test(String(g.funding ?? '')));
  return {kind: 'answer', text: [say(lang, `Which goal comes first is your choice; I don’t rank them for you. What the records show (${plural(goals.length, 'active goal')}):`, `Welk doel eerst gaat is jouw keuze. Wat je gegevens tonen:`),
    dated ? say(lang, `• Nearest target date: ${clean(String(dated.name), 60)}, ${dated.targetDate}`, `• Dichtstbijzijnde streefdatum: ${clean(String(dated.name), 60)}, ${dated.targetDate}`) : say(lang, '• No goal has a target date', '• Geen doel heeft een streefdatum'),
    offPlan.length ? say(lang, `• Not keeping up with its plan: ${offPlan.map(g => clean(String(g.name), 40)).join(', ')}`, `• Loopt niet gelijk met het plan: ${offPlan.map(g => clean(String(g.name), 40)).join(', ')}`) : say(lang, '• None is marked as not keeping up with its plan', '• Geen enkel doel loopt achter op het plan')].join('\n'), calls: [r.record]};
}
function biggestGoal(env: ToolEnv, lang: Lang, smallest: boolean): LocalReply {
  const r = run('list_goals', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const goals = ((dataOf(r.result).goals ?? []) as Data[]).filter(g => g.status !== 'closed'), by = new Map<string, Data>();
  for (const g of goals) { const m = /^(\d+(?:\.\d+)?) (\S+)$/.exec(String(g.target ?? '')); if (!m) continue; const best = by.get(m[2]!); const v = Number(m[1]); if (!best || (smallest ? v < Number(String(best.target).split(' ')[0]) : v > Number(String(best.target).split(' ')[0]))) by.set(m[2]!, g); }
  if (!by.size) return {kind: 'answer', text: say(lang, 'None of your goals has a target to compare.', 'Geen van je doelen heeft een doelbedrag.'), calls: [r.record]};
  return {kind: 'answer', text: [say(lang, `Your ${smallest ? 'smallest' : 'biggest'} target, per currency or unit (never converted):`, `Je ${smallest ? 'kleinste' : 'grootste'} doel, per valuta of eenheid (nooit omgerekend):`), ...[...by.values()].map(g => `• ${clean(String(g.name), 60)}: ${money(g.target)}`)].join('\n'), calls: [r.record]};
}
function nextContribution(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('list_goals', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const goals = ((dataOf(r.result).goals ?? []) as Data[]).filter(g => g.status === 'active' && g.nextPlannedDate && g.nextPlannedDate !== 'none').sort((a, b) => String(a.nextPlannedDate).localeCompare(String(b.nextPlannedDate)));
  if (!goals.length) return {kind: 'answer', text: say(lang, 'No contribution is planned: none of your goals has a contribution plan. A goal’s page sets one (Plan → how much and how often).', 'Er is geen inleg gepland: geen van je doelen heeft een inlegplan.') + open('goals'), calls: [r.record]};
  return {kind: 'answer', text: [say(lang, `Next planned contribution: ${goals[0]!.nextPlannedDate} for ${clean(String(goals[0]!.name), 60)}.`, `Volgende geplande inleg: ${goals[0]!.nextPlannedDate} voor ${clean(String(goals[0]!.name), 60)}.`), ...goals.slice(1, 4).map(g => `• ${clean(String(g.name), 60)}: ${g.nextPlannedDate}`)].join('\n'), calls: [r.record]};
}
function cryptoShare(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('holdings', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const rows = (dataOf(r.result).holdings ?? []) as Data[], per = new Map<string, {all: number; crypto: number; unpriced: number}>();
  let unpriced = 0;
  for (const h of rows) { const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(String(h.value ?? '')); if (!m) { if (/crypto|stable/i.test(String(h.class))) unpriced++; continue; } const t = per.get(m[2]!) ?? {all: 0, crypto: 0, unpriced: 0}; t.all += Number(m[1]); if (/^crypto/i.test(String(h.class))) t.crypto += Number(m[1]); per.set(m[2]!, t); }
  if (!per.size) return {kind: 'answer', text: say(lang, 'No holding has a known value, so the crypto share is unknown (not zero).', 'Geen positie heeft een bekende waarde, dus het crypto-aandeel is onbekend.'), calls: [r.record]};
  const lines = [...per].map(([c, t]) => `• ${c}: ${amount(t.crypto.toFixed(2), c)} of ${amount(t.all.toFixed(2), c)} (${t.all ? (t.crypto / t.all * 100).toFixed(1) : '0'}%)`);
  return {kind: 'answer', text: [say(lang, 'Crypto in your tracked wealth, per currency (never converted; stablecoins counted apart):', 'Crypto in je bijgehouden vermogen, per valuta (nooit omgerekend):'), ...lines, ...(unpriced ? [say(lang, `${plural(unpriced, 'crypto holding')} without a price ${unpriced === 1 ? 'is' : 'are'} not counted, so the share is at least this.`, `${unpriced} crypto-posities zonder prijs tellen niet mee.`)] : []), say(lang, 'Information, not advice.', 'Informatie, geen advies.')].join('\n'), calls: [r.record]};
}
function portfolioCoin(env: ToolEnv, said: string, lang: Lang): LocalReply {
  const sym = ({bitcoin: 'BTC', ether: 'ETH', ethereum: 'ETH'} as Record<string, string>)[said.toLowerCase()] ?? said.toUpperCase();
  const r = run('portfolios', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const rows = ((dataOf(r.result).portfolios ?? []) as Data[]).flatMap(p => ((p.coins ?? []) as Data[]).filter(c => String(c.coin).toUpperCase() === sym).map(c => `• ${clean(String(p.portfolio), 50)} (${p.kind}): ${c.quantity} ${sym}${c.value && c.value !== 'unknown' ? `, ${money(c.value)}` : ', no price'}`));
  return {kind: 'answer', text: rows.length ? [say(lang, `${sym} in your portfolios (Portfolio is separate from Wealth):`, `${sym} in je portfolio’s (los van Wealth):`), ...rows].join('\n') : say(lang, `No portfolio holds ${sym}. Wealth keeps its own holdings: ask “How much ${sym} do I have?”.`, `Geen portfolio bevat ${sym}.`), calls: [r.record]};
}
function favourites(env: ToolEnv, lang: Lang): LocalReply {
  const list = env.areas.wealth ? (env.platform.watchlist ?? []) as Data[] : null;
  if (!list) return {kind: 'refusal', text: say(lang, 'Wealth isn’t shared here, so your favourites are not read.', 'Wealth wordt hier niet gedeeld.'), calls: []};
  const names = list.map(w => String(w.symbol ?? w.name ?? w.id ?? '')).filter(Boolean);
  return {kind: 'answer', text: names.length ? say(lang, `Your favourites on Markets: ${listNames(names.map(n => clean(n, 20)), 12)}.`, `Je favorieten op Markets: ${listNames(names.map(n => clean(n, 20)), 12)}.`) : say(lang, 'No favourites yet: the star on a coin in Markets adds one.', 'Nog geen favorieten: de ster bij een munt op Markets voegt er een toe.'), calls: []};
}
function movers(env: ToolEnv, lang: Lang): LocalReply {
  const quotes = (env.areas.wealth ? env.quotes : []) as unknown as Data[], moved = quotes.map(x => ({sym: String(x.symbol ?? x.asset ?? x.id ?? ''), pct: Number(x.change24h ?? x.changePercent24h ?? x.change ?? NaN)})).filter(x => x.sym && Number.isFinite(x.pct));
  if (!moved.length) return {kind: 'answer', text: say(lang, 'No day’s change is read on this device right now, so which coin moved most is unknown here. Markets shows the day’s change once it has read prices.', 'Er is nu geen dagverandering gelezen op dit apparaat. Markets toont die zodra prijzen gelezen zijn.') + open('markets'), calls: []};
  const top = moved.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3);
  return {kind: 'answer', text: say(lang, `Moved most in the last 24 hours, as last read: ${top.map(t => `${t.sym} ${t.pct > 0 ? '+' : ''}${t.pct.toFixed(1)}%`).join(', ')}. Information, not advice.`, `Grootste beweging in 24 uur: ${top.map(t => `${t.sym} ${t.pct > 0 ? '+' : ''}${t.pct.toFixed(1)}%`).join(', ')}.`), calls: []};
}
function rewards(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('staking_watch', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const rows = (dataOf(r.result).staking ?? []) as Data[];
  return {kind: 'answer', text: rows.length ? say(lang, `ZIGoals doesn’t read staking rewards earned from the network in a chat. Wealth keeps ${rows.map(s => `${Number(s.quantity).toLocaleString('en-GB')} ${s.asset}`).join(', ')} marked as held for staking rewards (your own entry). Staking shows the network’s figures once a wallet is connected there.`, `ZIGoals leest verdiende stakingbeloningen niet in een chat. Wealth bewaart ${rows.map(s => `${s.quantity} ${s.asset}`).join(', ')} als aangehouden voor stakingbeloningen.`) + open('staking')
    : say(lang, 'No staking is tracked on this device, so there are no rewards to show (none tracked, not zero). Staking shows a wallet’s rewards once you connect it there.', 'Er wordt geen staking bijgehouden, dus geen beloningen te tonen.') + open('staking'), calls: [r.record]};
}
function bills(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('bills', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const d = dataOf(r.result), due = (d.due ?? []) as Data[];
  if (!d.bills) return {kind: 'answer', text: say(lang, 'No bill reminder is kept. Wealth → Bills adds one (a reminder only; nothing is paid).', 'Er is geen rekeningherinnering. Wealth → Bills voegt er een toe.') + open('wealth'), calls: [r.record]};
  return {kind: 'answer', text: [say(lang, `${plural(Number(d.bills), 'bill reminder')}; next due:`, `${d.bills} rekeningherinneringen; eerstvolgend:`), ...due.slice(0, 6).map(b => `• ${clean(String(b.bill), 50)}: ${b.due}, ${money(b.amount)} (${b.every})`), say(lang, 'Reminders only; nothing is paid. Per currency, never converted.', 'Alleen herinneringen; er wordt niets betaald.')].join('\n'), calls: [r.record]};
}
function changed(env: ToolEnv, lang: Lang): LocalReply {
  const r = run('recent_activity', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
  const events = ((dataOf(r.result).events ?? []) as Data[]).slice(0, 6);
  return {kind: 'answer', text: events.length ? [say(lang, 'Most recent changes, from Activity:', 'Recentste wijzigingen, uit Activity:'), ...events.map(e => `• ${e.at} · ${clean(String(e.title), 50)}${e.detail ? ` · ${clean(String(e.detail), 60)}` : ''}`)].join('\n') + open('activity') : say(lang, 'Nothing has changed yet in Activity.', 'Er is nog niets veranderd in Activity.'), calls: [r.record]};
}

/**
 * /remember in ZIGi's panel and in NOVA's chat (Moscow N-MO-04, NP-30): the person's words as a "Remember this?" card with a
 * category read from them ("I am vegetarian and allergic to peanuts" is diet, never "Other"); NOVA no longer sends the
 * person to ZIGi's panel for it. Nothing is kept until the card is added.
 */
export function rememberCardText(rest: string, who: 'ZIGi' | 'NOVA' = 'ZIGi'): string {
  const words = rest.trim();
  if (!words) return `Type what ${who} should remember after /remember, for example: /remember I train before work.`;
  const parsed = actionSchema.safeParse({kind: 'remember', text: words, category: memoryCategory(words)});
  if (!parsed.success) return 'That is too long to keep as one note: 500 characters at most.';
  // Backticks are escaped inside the block (JSON's `), so the words can never close it early.
  const json = JSON.stringify(parsed.data).replace(/`/g, '\\u0060');
  return `Here is your note as a card: nothing is kept until you add it.\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
}
