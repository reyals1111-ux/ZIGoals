import {cardNumberIn, safetyFirst} from '../../ai/safety-guard';
import {looksSecret} from '../../secret-guard/guard';
import type {HudPreset} from '../layout';
import {WIDGET_RANGES, type MakeRequest, type WidgetRange} from '../stage/record';
import {widgetSpec} from '../widgets/catalog';

/**
 * Session AM (ADR-038 D4, D6, A4): the summon step — which widgets a request makes. Deterministic and on the device: the
 * person's words (English or Dutch, typed or spoken) are matched against phrasing families, one per widget of the closed
 * catalogue (lib/nova/widgets/catalog.ts); the lookups an answer used (the on-device answer's, or the person's model's)
 * are mapped the same way. The result is only *which* widget and its small parameters (a range, a goal's id): the figures
 * come from the person's records inside the widget itself, so nothing here reads, sends or invents a value.
 *
 * Safety first (the one rule every device path keeps): a message the safety guard answers makes no widget and is never a
 * command. Stage commands ("clear the stage", "pin the weather", "sluit alles") are recognised here too; the page applies
 * them, with Undo.
 */
export type SummonLang = 'en' | 'nl';
export type StageCommand = {kind: 'clear'} | {kind: 'close' | 'pin' | 'unpin' | 'hide'; id: string} | {kind: 'arrangement'; preset: HudPreset};
export type SummonContext = {goals?: readonly {id: string; name: string}[]; available?: (id: string) => boolean;
  /** Whether a widget's switch is open right now (security review AM-S1: a model never pins a widget whose switch is off). */
  gateOpen?: (id: string) => boolean};
export type SummonPlan = {
  lang: SummonLang;
  widgets: MakeRequest[];
  command: StageCommand | null;
  /** The words are a plain "show me …" (or name something only NOVA's stage answers): NOVA answers on the stage itself. */
  direct: boolean;
};
export const MAX_SUMMON = 3;
const NONE = (lang: SummonLang): SummonPlan => ({lang, widgets: [], command: null, direct: false});

/** What the engine refuses or answers with the guard before anything else: the summon step never acts on it and never keeps it. */
export const unsafeWords = (text: string): boolean => !!safetyFirst(text) || looksSecret(text) || cardNumberIn(text);
/** Lowercase, accents folded, punctuation to spaces: what the families match against. */
export const normal = (text: string): string => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, '').replace(/[^a-z0-9%]+/g, ' ').trim();
const NL_WORDS = /\b(ik|mijn|mij|hoe|wat|wanneer|welke|vandaag|deze|laat|toon|zien|het|een|niet|geen|heb|ben|gaat|staat|doelen|gewoontes?|gewicht|slaap|geld|weer|sluit|alles|maak|leeg|vast|verberg|afgelopen|maand|jaar|hoeveel|waar|uitgaven|rekening(?:en)?|taken|dagboek|notities)\b/g;
/** Dutch when the words are mostly Dutch function words; English otherwise (the app's own language). */
export function summonLanguage(text: string): SummonLang {
  const n = normal(text), hits = n.match(NL_WORDS)?.length ?? 0;
  return hits >= 2 || (hits === 1 && n.split(' ').length <= 3 && !/\b(the|my|show|what|how|is|me)\b/.test(n)) ? 'nl' : 'en';
}

type Family = {id: string; en: RegExp; nl: RegExp; /** Only NOVA's stage answers this (no on-device lookup exists for it). */ stageOnly?: true};
/** One family per widget, most specific first. Each pattern runs on `normal(text)`. */
export const FAMILIES: readonly Family[] = [
  {id: 'weight', en: /\b(weight|weigh|weighed|kilos?|kg|pounds|lbs|bmi|scale)\b/, nl: /\b(gewicht|weeg|woog|gewogen|kilos?|kg|weegschaal)\b/},
  {id: 'sleep', en: /\b(sleep|slept|sleeping|bedtime|nights? rest)\b/, nl: /\b(slaap|geslapen|slapen|nachtrust|bedtijd)\b/},
  {id: 'water', en: /\b(water|hydration|hydrated|drank|glasses)\b/, nl: /\b(water|gedronken|drinken|glazen)\b/},
  {id: 'steps', en: /\b(steps|step count|walked|walking)\b/, nl: /\b(stappen|gewandeld|gelopen|wandelen)\b/},
  {id: 'workouts', en: /\b(workouts?|exercised?|exercises|training|trained|gym|runs?|running|ran)\b/, nl: /\b(workouts?|training|getraind|sporten|gesport|sportschool|hardlopen|hardgelopen)\b/},
  {id: 'health-hud', en: /\b(calories|kcal|protein|carbs|macros|nutrition|ate|eaten|eat|food|meals?|health)\b/, nl: /\b(calorieen|kcal|eiwit|eiwitten|koolhydraten|voeding|gegeten|eten|maaltijd(?:en)?|gezondheid)\b/},
  {id: 'habits-hud', en: /\b(streaks?|consistency|consistent)\b/, nl: /\b(reeks(?:en)?|streaks?|consistentie|volgehouden)\b/},
  {id: 'habit-week', en: /\b(habits?|routines?)\b/, nl: /\b(gewoontes?|gewoonten|routines?)\b/},
  {id: 'budgets', en: /\b(budgets?)\b/, nl: /\b(budget(?:ten)?|budgets)\b/},
  {id: 'spending', en: /\b(spend|spent|spending|expenses?)\b/, nl: /\b(uitgaven|uitgegeven|uitgeven|kosten)\b/},
  {id: 'bills', en: /\b(bills?|subscriptions?|rent|invoices?)\b/, nl: /\b(rekening(?:en)?|abonnement(?:en)?|huur|facturen|factuur)\b/},
  {id: 'money', en: /\b(contributions?|contribute|set aside|saving for)\b/, nl: /\b(bijdragen?|inleg|opzij ?gezet|sparen voor)\b/},
  {id: 'net-worth', en: /\b(net worth|worth|tracked wealth|assets|how much (?:money )?do i have|how rich)\b/, nl: /\b(vermogen|waard|bezit(?:tingen)?|hoeveel (?:geld )?heb ik)\b/},
  {id: 'markets', en: /\b(markets?|prices?|crypto|bitcoin|coins?|stocks?)\b/, nl: /\b(markt(?:en)?|koers(?:en)?|crypto|bitcoin|aandelen)\b/},
  {id: 'wealth-hud', en: /\b(wealth|money|finances?|financial|portfolio|savings)\b/, nl: /\b(geld|financien|financieel|portefeuille|spaargeld)\b/},
  {id: 'goals-hud', en: /\b(goals)\b/, nl: /\b(doelen)\b/},
  {id: 'goal-pace', en: /\b(goal|on track|pace|when will i reach|ahead of plan|behind plan)\b/, nl: /\b(doel|op schema|tempo|wanneer haal ik|voor op schema|achter op schema)\b/},
  {id: 'agenda-clock', en: /\b(agenda|calendar|schedule|appointments?|meetings?|events?)\b/, nl: /\b(agenda|kalender|afspraken?|planning|vergadering(?:en)?)\b/},
  {id: 'tasks', en: /\b(tasks?|to ?dos?|todo list)\b/, nl: /\b(taken|taak|te doen|takenlijst)\b/},
  {id: 'orbit', en: /\b(checklist|orbit)\b/, nl: /\b(checklist|baan)\b/},
  {id: 'focus', en: /\b(focus|pomodoro|concentrate|deep work)\b/, nl: /\b(focus|pomodoro|concentreren|concentratie)\b/},
  {id: 'journal', en: /\b(journal|journaling|diary)\b/, nl: /\b(dagboek|journal)\b/},
  {id: 'notes', en: /\b(notes?)\b/, nl: /\b(notities?|aantekeningen?)\b/},
  {id: 'briefs', en: /\b(briefs?|briefing|recap)\b/, nl: /\b(briefing|samenvatting|terugblik)\b/},
  {id: 'next', en: /\b(whats next|what is next|next up|up next|what should i do|what now)\b/, nl: /\b(wat nu|wat staat er|wat moet ik|volgende|straks)\b/},
  {id: 'sun', en: /\b(sunrise|sunset|daylight|golden hour|sun (?:rise|set|up|down))\b/, nl: /\b(zonsopgang|zonsopkomst|zonsondergang|daglicht|zon (?:op|onder))\b/, stageOnly: true},
  {id: 'weather', en: /\b(weather|rain|raining|rainy|umbrella|temperature|forecast|sunny|snow|snowing|windy|degrees|cold outside|warm outside|hot outside|jacket|coat)\b/, nl: /\b(weer|weerbericht|regen|regent|regenen|paraplu|temperatuur|zonnig|sneeuw|sneeuwt|graden|koud buiten|warm buiten|jas)\b/, stageOnly: true},
  {id: 'time', en: /\b(time left|what time|the time|clock|year progress|how much of the (?:day|week|year)|days left)\b/, nl: /\b(hoe laat|de tijd|klok|tijd over|hoeveel van (?:de dag|de week|het jaar)|dagen over)\b/, stageOnly: true},
  {id: 'nova-sees', en: /\b(what can you see|what do you see|what do you know|permissions?|what can you read|privacy)\b/, nl: /\b(wat kun je zien|wat zie je|wat weet je|toestemming(?:en)?|wat mag je|privacy)\b/, stageOnly: true},
  {id: 'nova-brain', en: /\b(which model|what model|which brain|your brain|are you (?:online|connected)|which ai)\b/, nl: /\b(welk model|welk brein|je brein|ben je (?:online|verbonden)|welke ai)\b/, stageOnly: true},
  {id: 'requests', en: /\b(what did i ask|my requests|request history|asked (?:you )?(?:before|earlier|lately))\b/, nl: /\b(wat heb ik gevraagd|mijn vragen|eerder gevraagd|geschiedenis)\b/, stageOnly: true},
  {id: 'now-playing', en: /\b(music|now playing|playing|sounds?)\b/, nl: /\b(muziek|speelt|geluiden?)\b/},
  {id: 'glance', en: /\b(my day|today|day at a glance|how is my day|hows my day)\b/, nl: /\b(mijn dag|vandaag|hoe gaat mijn dag)\b/},
];
const RANGE: Readonly<Record<SummonLang, readonly [WidgetRange, RegExp][]>> = {
  en: [['week', /\b(week|7 days|seven days)\b/], ['quarter', /\b(quarter|3 months|three months|90 days)\b/], ['year', /\b(year|12 months|twelve months)\b/], ['month', /\b(month|30 days|thirty days|4 weeks)\b/]],
  nl: [['week', /\b(week|7 dagen|zeven dagen)\b/], ['quarter', /\b(kwartaal|3 maanden|drie maanden|90 dagen)\b/], ['year', /\b(jaar|12 maanden|twaalf maanden)\b/], ['month', /\b(maand|30 dagen|dertig dagen|4 weken)\b/]],
};
export function rangeIn(text: string, lang: SummonLang = summonLanguage(text)): WidgetRange | undefined {
  const n = normal(text);
  for (const [range, re] of RANGE[lang]) if (re.test(n)) return range;
  // A person mixing languages ("my weight deze maand") still gets the range.
  for (const [range, re] of RANGE[lang === 'en' ? 'nl' : 'en']) if (re.test(n)) return range;
  return undefined;
}
const SHOW: Readonly<Record<SummonLang, RegExp>> = {
  en: /^(?:please )?(?:nova )?(?:show|open|display|put up|pull up|bring up|bring back|give me|let me see|add|make|project)\b/,
  nl: /^(?:nova )?(?:toon|laat|open|geef|zet|maak|projecteer|haal)\b/,
};
const CLEAR: Readonly<Record<SummonLang, RegExp>> = {
  en: /^(?:please )?(?:clear|clean|empty|reset|wipe)(?: up| off)? (?:the |my )?(?:stage|screen|dashboard|widgets|everything|all)\b|^(?:close|hide|remove|dismiss) (?:all|everything)\b/,
  nl: /^(?:maak|veeg|wis) (?:het |mijn )?(?:podium|scherm|dashboard|alles) (?:leeg|schoon)\b|^(?:sluit|verberg|verwijder) alles\b|^alles (?:sluiten|weg|dicht)\b|^(?:wis|leeg) (?:het |mijn )?(?:podium|scherm)\b/,
};
const VERB: Readonly<Record<SummonLang, readonly [Exclude<StageCommand['kind'], 'clear' | 'arrangement'>, RegExp][]>> = {
  en: [['unpin', /^(?:please )?unpin\b/], ['pin', /^(?:please )?(?:pin|keep)\b/], ['hide', /^(?:please )?(?:hide|minimi[sz]e|dock)\b/], ['close', /^(?:please )?(?:close|remove|dismiss)\b/]],
  nl: [['unpin', /^(?:maak|zet) .* los\b|^losmaken\b/], ['pin', /^(?:pin|zet .* vast|vastzetten|bewaar)\b/], ['hide', /^(?:verberg|minimaliseer)\b/], ['close', /^(?:sluit|verwijder)\b/]],
};
const ARRANGEMENT: readonly [HudPreset, RegExp][] = [
  ['health', /\b(health|gezondheid)s? (?:arrangement|preset|view|opstelling|weergave)\b/], ['wealth', /\b(wealth|money|geld|vermogen)s? (?:arrangement|preset|view|opstelling|weergave)\b/],
  ['minimal', /\b(minimal|minimale?) (?:arrangement|preset|view|opstelling|weergave)\b/],
  ['command', /\b(command|full|everything|commando|volledige?|alles) (?:arrangement|preset|view|dashboard|opstelling|weergave|center|centre)\b|^(?:show|open|toon|laat) (?:me )?(?:everything|the (?:full |whole )?dashboard|my dashboard|alles|het hele dashboard)\b/],
];

const distinct = (words: string) => normal(words).split(' ').filter(w => w.length >= 4 && !/^(goal|doel|fund|plan|save|saving|sparen|voor|with|from|this|that)$/.test(w));
/** The goal a question names (a distinctive word of its name, 4 letters or more), or null. */
export function goalNamed(text: string, goals: SummonContext['goals']): {id: string; name: string} | null {
  if (!goals?.length) return null;
  const n = ` ${normal(text)} `;
  let best: {id: string; name: string} | null = null, score = 0;
  for (const g of goals) {
    const words = distinct(g.name), hit = words.filter(w => n.includes(` ${w} `)).length;
    if (hit > score || (hit === score && hit > 0 && best && g.name.length < best.name.length)) { best = {id: g.id, name: g.name}; score = hit; }
  }
  return score > 0 ? best : null;
}

/**
 * What a request makes. Up to `MAX_SUMMON` widgets, in the families' order; a named goal makes that goal's widget; a range
 * in the words goes to every made widget that takes one. A stage command is returned instead of widgets.
 */
export function summonFor(question: string, ctx: SummonContext = {}): SummonPlan {
  const lang = summonLanguage(question), n = normal(question);
  // Safety first, exactly as the engine does before anything is answered, kept or sent: a message the guard answers, one
  // that holds a secret (a key, a password, recovery words) or a card number makes no widget and is no command.
  if (!n || n.length > 600 || unsafeWords(question)) return NONE(lang);
  const can = (id: string) => !!widgetSpec(id) && (ctx.available?.(id) ?? true);
  const both = (re: Readonly<Record<SummonLang, RegExp>>) => re[lang].test(n) || re[lang === 'en' ? 'nl' : 'en'].test(n);
  if (both(CLEAR)) return {lang, widgets: [], command: {kind: 'clear'}, direct: true};
  for (const [preset, re] of ARRANGEMENT) if (re.test(n)) return {lang, widgets: [], command: {kind: 'arrangement', preset}, direct: true};
  const matched: string[] = [];
  for (const f of FAMILIES) if ((f.en.test(n) || f.nl.test(n)) && can(f.id) && !matched.includes(f.id)) matched.push(f.id);
  const goal = goalNamed(question, ctx.goals), range = rangeIn(question, lang);
  // A named goal: that goal's widget leads, and the generic goal widgets step back for it.
  let ids = goal && can('goal-focus') ? ['goal-focus', ...matched.filter(id => id !== 'goal-pace' && id !== 'goals-hud')] : matched;
  // "habits" with "streak": the streaks' widget is enough; "money" with a more specific money word: that one is enough.
  if (ids.includes('habits-hud') && ids.includes('habit-week') && !/\b(week)\b/.test(n)) ids = ids.filter(id => id !== 'habit-week');
  if (ids.some(id => ['spending', 'budgets', 'bills', 'net-worth', 'money', 'markets'].includes(id))) ids = ids.filter(id => id !== 'wealth-hud');
  if (ids.includes('goals-hud')) ids = ids.filter(id => id !== 'goal-pace');
  if (ids.some(id => id !== 'glance') && ids.includes('glance')) ids = ids.filter(id => id !== 'glance');
  if (ids.some(id => id !== 'health-hud' && widgetSpec(id)?.pillar === 'health') && /\bhealth|gezondheid\b/.test(n) === false) ids = ids.filter(id => id !== 'health-hud' || /\b(calories|kcal|protein|macros|nutrition|ate|eaten|food|meals?|calorieen|eiwit|voeding|gegeten|maaltijd)/.test(n));
  for (const [kind, re] of VERB[lang].concat(VERB[lang === 'en' ? 'nl' : 'en'])) if (re.test(n) && ids[0]) return {lang, widgets: [], command: {kind, id: ids[0]}, direct: true};
  const widgets = ids.slice(0, MAX_SUMMON).map(id => {
    const spec = widgetSpec(id)!, params = {...(range && spec.params?.includes('range') ? {range} : {}), ...(id === 'goal-focus' && goal ? {ref: goal.id} : {})};
    return {id, ...(Object.keys(params).length ? {params} : {})};
  });
  const stageOnly = widgets.length > 0 && widgets.every(w => FAMILIES.find(f => f.id === w.id)?.stageOnly);
  return {lang, widgets, command: null, direct: widgets.length > 0 && (both(SHOW) || stageOnly)};
}

/** The lookups an answer ran → the widgets that show the same records (the tool's name, then small arguments). */
const TOOL_WIDGET: Readonly<Record<string, string>> = {
  weight: 'weight', body_measurements: 'weight', water: 'water', steps: 'steps', sleep_nights: 'sleep', sleep_summary: 'sleep', workouts: 'workouts',
  nutrient_totals: 'health-hud', diary_entries: 'health-hud', meal_plan: 'health-hud',
  habit_stats: 'habits-hud', habit_checkins: 'habits-hud', list_habits: 'habit-week', habits_due: 'habit-week',
  list_goals: 'goals-hud', goal_progress: 'goal-focus', goal_what_if: 'goal-focus', goal_contributions: 'goal-focus', milestones: 'goals-hud',
  net_worth: 'net-worth', net_worth_change: 'net-worth', holdings: 'wealth-hud', totals_per_currency: 'wealth-hud', accounts: 'wealth-hud', portfolios: 'wealth-hud', purpose_allocation: 'wealth-hud',
  spending: 'spending', budgets: 'budgets', bills: 'bills', cash_forecast: 'bills',
  tasks: 'tasks', agenda: 'agenda-clock', calendar_events: 'agenda-clock', checklist_today: 'orbit', focus_sessions: 'focus',
  search_notes: 'notes', journal: 'journal', today_summary: 'glance', weather: 'weather',
};
const argRange = (args: Record<string, unknown> | null | undefined): WidgetRange | undefined => {
  if (!args) return undefined;
  for (const key of ['range', 'period', 'window', 'span']) { const v = args[key]; if (typeof v === 'string') { const hit = WIDGET_RANGES.find(r => v.toLowerCase().includes(r)); if (hit) return hit; } }
  const days = typeof args.days === 'number' ? args.days : typeof args.lastDays === 'number' ? args.lastDays : null;
  return days === null ? undefined : days <= 10 ? 'week' : days <= 45 ? 'month' : days <= 120 ? 'quarter' : 'year';
};
const argRef = (args: Record<string, unknown> | null | undefined): string | undefined => {
  if (!args) return undefined;
  for (const key of ['goalId', 'goal_id', 'id', 'goal']) { const v = args[key]; if (typeof v === 'string' && v && v.length <= 80) return v; }
  return undefined;
};
/**
 * A4: the model's explicit `stage_widget` calls → what the stage does. "show" becomes a widget to make (with its range);
 * pin, hide and close become stage commands. Arguments are checked against the closed catalogue again here: a call that
 * names anything else is dropped. At most `MAX_SUMMON` shows and ONE command per reply (security review AM-S7: each
 * command has its own Undo, and one toast holds one Undo), and never a pin for a widget whose switch is off (AM-S1).
 */
export const MAX_MODEL_COMMANDS = 1;
export function stageCalls(calls: readonly {tool: string; args?: Record<string, unknown> | null}[], ctx: SummonContext = {}): {show: MakeRequest[]; commands: Exclude<StageCommand, {kind: 'clear'} | {kind: 'arrangement'}>[]} {
  const show: MakeRequest[] = [], commands: Exclude<StageCommand, {kind: 'clear'} | {kind: 'arrangement'}>[] = [];
  for (const call of calls) {
    if (call.tool !== 'stage_widget') continue;
    const id = typeof call.args?.widget === 'string' ? call.args.widget : '', action = call.args?.action, spec = widgetSpec(id);
    if (!spec || !(ctx.available?.(id) ?? true)) continue;
    if (action === 'show') {
      const range = spec.params?.includes('range') ? WIDGET_RANGES.find(r => r === call.args?.range) : undefined;
      if (show.length < MAX_SUMMON && !show.some(w => w.id === id)) show.push({id, ...(range ? {params: {range}} : {})});
    } else if ((action === 'pin' || action === 'hide' || action === 'close') && commands.length < MAX_MODEL_COMMANDS && !(action === 'pin' && ctx.gateOpen && !ctx.gateOpen(id))) commands.push({kind: action, id});
  }
  return {show, commands};
}
export function summonForTools(calls: readonly {tool: string; args?: Record<string, unknown> | null}[], ctx: SummonContext = {}): MakeRequest[] {
  const out: MakeRequest[] = [];
  for (const call of calls) {
    let id = TOOL_WIDGET[call.tool];
    if (!id || !widgetSpec(id) || !(ctx.available?.(id) ?? true)) continue;
    const spec = widgetSpec(id)!, range = spec.params?.includes('range') ? argRange(call.args) : undefined;
    // A goal lookup names its goal by a handle or an id; only an id this device knows becomes the widget's goal.
    const ref = id === 'goal-focus' ? ctx.goals?.find(g => g.id === argRef(call.args))?.id : undefined;
    if (id === 'goal-focus' && !ref && (ctx.available?.('goal-pace') ?? true)) id = 'goal-pace';
    if (out.some(w => w.id === id)) continue;
    const params = {...(range ? {range} : {}), ...(ref ? {ref} : {})};
    out.push({id, ...(Object.keys(params).length ? {params} : {})});
    if (out.length >= MAX_SUMMON) break;
  }
  return out;
}
/**
 * The request's own widgets first, then what the answer's lookups add, each kind once, `MAX_SUMMON` at most. The goal
 * widgets (one goal, the goals' pace, the Goals HUD) say the same thing three ways, so one request makes one of them: the
 * first asked for (design review AM-D22: "Am I on track for Japan?" on an empty profile made Goal pace and the Goals HUD).
 */
const GOAL_KIND: ReadonlySet<string> = new Set(['goal-focus', 'goal-pace', 'goals-hud']);
export function mergeSummons(first: readonly MakeRequest[], more: readonly MakeRequest[]): MakeRequest[] {
  const out: MakeRequest[] = [];
  const again = (id: string) => GOAL_KIND.has(id) && out.some(x => GOAL_KIND.has(x.id));
  for (const w of [...first, ...more]) { if (out.length >= MAX_SUMMON) break; if (!out.some(x => x.id === w.id) && !again(w.id)) out.push(w); }
  return out;
}

/**
 * Session AM (lead's rule, after the browser specs): the engine comes first. What the on-device engine would say to these
 * words, as far as the stage needs to know it (lib/nova/summon/engine-look.ts reads it from the engine itself):
 * - `fallback`: nothing of its own (its general "that isn't something I can answer…" list);
 * - `records`: an answer read from the person's records, with the lookups it ran;
 * - `other`: anything else it says itself — a card to confirm, a navigation ("Opening Goals."), a refusal, a note that
 *   this needs the person's own AI, a permissions answer, a question back;
 * - `model`: no answer on the device, and a model is connected: the model answers.
 */
export type EngineLookKind = 'fallback' | 'records' | 'other' | 'model';
/**
 * Whether the stage answers the words by itself, before the engine. Only a stage command, or a widget request the
 * on-device engine has no answer of its own for (then the widget's line is the answer, design review AM-D3). With a model
 * connected nothing changes: a plain "show me …" (or a stage-only family) is the stage's, every other question the model's.
 * Whatever the engine answers itself stays the engine's reply, word for word. `oneTap`: the words are one of the stage's
 * own one-tap requests, tapped (lib/nova/summon/words.ts ONE_TAP).
 */
export function stageOwns(plan: Pick<SummonPlan, 'command' | 'widgets' | 'direct'>, look: EngineLookKind, oneTap = false): boolean {
  if (plan.command) return true;
  if (!plan.widgets.length) return false;
  // A one-tap request above the command bar is a request to the stage itself ("Agenda" makes the agenda's widget; the
  // same words typed are the engine's, which opens the Agenda page).
  return oneTap || look === 'fallback' || (look === 'model' && plan.direct);
}
/**
 * The widgets made beside an on-device reply: only those that belong to it. A reply that read records makes the widgets
 * of its lookups, and those of the question's own families that read under the same switch as a lookup (the weight
 * question's "Weight · the last 30 days" beside the `weight` lookup). A card to confirm (a write, an add, a log), a
 * navigation, a refusal, a note or a question back makes nothing. The general fallback is the stage's own answer: the
 * question's widgets are made and their lines are said.
 */
export function replyWidgets(plan: Pick<SummonPlan, 'widgets'>, reply: {kind: 'answer' | 'choices' | 'refusal' | 'examples' | 'none' | undefined; calls: readonly {tool: string; args?: Record<string, unknown> | null}[]; card: boolean}, ctx: SummonContext = {}): MakeRequest[] {
  if (reply.kind === 'examples') return [...plan.widgets];
  if (reply.kind !== 'answer' || reply.card || !reply.calls.length) return [];
  const gates = new Set(reply.calls.map(c => widgetSpec(TOOL_WIDGET[c.tool] ?? '')?.gate).filter(Boolean));
  const own = plan.widgets.filter(w => gates.has(widgetSpec(w.id)?.gate)), all = mergeSummons(own, summonForTools(reply.calls, ctx));
  // One request, one widget of a kind: the question's own widget is enough beside the general HUD a second lookup maps to
  // ("Show my net worth" reads two wealth lookups; it makes the wealth widget asked for, not the Wealth HUD too).
  const general = (id: string) => (id === 'wealth-hud' || id === 'health-hud' || id === 'habits-hud' || id === 'goals-hud' || id === 'glance') && !own.some(w => w.id === id);
  return own.length ? all.filter(w => !(general(w.id) && own.some(o => widgetSpec(o.id)?.gate === widgetSpec(w.id)?.gate))) : all;
}
