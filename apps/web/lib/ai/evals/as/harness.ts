import {emptyAccounts} from '../../../accounts/schema';
import {AVERAGE_GOALS_KEY, averageGoalsSchema} from '../../../average-goals/store';
import {emptyBills} from '../../../bills/schema';
import {emptyHabitData} from '../../../habits';
import {createEmptyHealth} from '../../../health';
import {emptyJournal} from '../../../journal/schema';
import {emptyMoneyLog} from '../../../money-log/schema';
import {emptyNotes} from '../../../notes/schema';
import {novaLocalEnv} from '../../../nova/local-env';
import {emptyPlatform} from '../../../positions';
import {buildShowcase} from '../../../showcase-data';
import {GAME_KEY} from '../../../aa-device-keys';
import {EARN_ACADEMY} from '../../../earn/records';
import {gameSchema} from '../../../game/schema';
import {coinKey} from '../../../portfolio/schema';
import {SHOWCASE_PRICES, showcasePortfolios} from '../../../portfolio/showcase';
import type {PriceOf} from '../../tools/env';
import {DEFAULT_NOVA_SCOPES} from '../../context-pack/nova';
import {localAnswer, type LocalReply} from '../../local-answers/engine';
import {noModelReply} from '../../local-answers/no-model';
import {readAkToolSources} from '../../tools/ak-sources';
import type {ToolEnv, ToolSources} from '../../tools/env';
import {toolEnv} from '../../tools/env';
import {gatesFor, showcaseSources} from '../../tools/fixtures';
import {readNovaToolSources} from '../../tools/nova-sources';
import {runTool} from '../../tools/registry';

/**
 * Session AS (ADR-042 Part 1): the corpus's two worlds and how a question is asked in them.
 * - The Showcase on a fixed day, 17 November 2026 (a Tuesday), for a person in UTC at 19:00: fictional, deterministic
 *   records (lib/showcase-data.ts), so every expected fact below is a literal.
 * - A fresh profile: nothing recorded yet, every switch open: the empty-state answers.
 * A question is asked the way NOVA asks it with no model connected: the device's own answer (`localAnswer`), then the
 * no-model reply. The facts are read back from the reply's own `life_facts` lookup, run again, so the corpus checks what a
 * connected model would receive as the tool result, not only the sentence.
 */
export const DAY = '2026-11-17';
const NOW = new Date(`${DAY}T19:00:00Z`);
const RECORDS = buildShowcase(DAY, 'UTC').records, get = {getItem: (k: string) => RECORDS[k] ?? null};
// The average goals are goals too (the app's context passes them, components/ai/use-ai-context.ts; list_goals lists them):
// the corpus's world holds them as the app does, so its goals answers count what the Goals page and the widgets count
// (ADR-042 D20: without them the corpus said 5 active goals where the app says 7).
const AVERAGES = averageGoalsSchema.parse(JSON.parse(RECORDS[AVERAGE_GOALS_KEY]!)).goals;
// Session AT (L7 NB:N11, TK:1): the game layer's record and the Showcase's portfolio, as the app's context passes them
// (components/ai/use-ai-context.ts: the switch with the Academy's lessons; Portfolio with its fixture prices, labelled).
const GAME_ON = gameSchema.parse(JSON.parse(RECORDS[GAME_KEY]!)), ACADEMY = RECORDS[EARN_ACADEMY.key] ? EARN_ACADEMY.schema.parse(JSON.parse(RECORDS[EARN_ACADEMY.key]!)) : null;
const PORTFOLIO = showcasePortfolios(DAY), SHOWCASE_PRICE: PriceOf = (coin, currency) => { const price = currency === 'USD' ? SHOWCASE_PRICES[coin] : undefined; return price && PORTFOLIO.portfolios.some(p => p.coins.some(c => coinKey(c.ref) === coin)) ? {price, source: 'Showcase example price', observedAt: null} : undefined; };
export const showcaseAll = (): ToolSources => ({...showcaseSources(DAY), now: NOW, ak: readAkToolSources(get), nova: readNovaToolSources(get, {notes: true}), averageGoals: AVERAGES, game: {enabled: GAME_ON.enabled, earnAcademy: ACADEMY}, portfolio: {data: PORTFOLIO, priceOf: SHOWCASE_PRICE}});
export const freshAll = (): ToolSources => ({...showcaseSources(DAY), now: NOW, habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), accounts: emptyAccounts(), moneyLog: emptyMoneyLog(), journal: emptyJournal(), fasting: null, weekly: null, energy: null, chess: null, ak: {bills: emptyBills()}, nova: {tasks: {version: 1, tasks: []}, focus: {version: 1, sessions: []}, budgets: {version: 1, budgets: []}, notes: emptyNotes()}, game: {enabled: false, earnAcademy: null}, portfolio: {data: {version: 1, portfolios: []}, priceOf: () => undefined}, showcase: false} as ToolSources);
const SCOPES = {...DEFAULT_NOVA_SCOPES, health: true, journal: true, notes: true};
/** NOVA's own environment with every permission on (the corpus is about the answers; the switches have their own tests). */
export const novaEnv = (sources: ToolSources, scopes = SCOPES, health = true): ToolEnv => novaLocalEnv({sources, gates: gatesFor(health, 'today'), scopes, chainChosen: true})!;
/**
 * Session AV lane 2 (review b1 #6, deliberate): ZIGi's environment carries no notes record, as in the app — the app's
 * context reads the notes only on NOVA's surface, with its Notes scope (components/ai/use-ai-context.ts: `nova` is
 * `readNovaToolSources(storage)` without `{notes: true}`). The corpus had given ZIGi the notes too, so its notes answers
 * passed here and failed in the app.
 */
const withoutNotes = (sources: ToolSources): ToolSources => { if (!sources.nova || !('notes' in sources.nova)) return sources; const {notes: _notes, ...nova} = sources.nova; void _notes; return {...sources, nova}; };
export const zigiEnv = (sources: ToolSources, health = true): ToolEnv => toolEnv(withoutNotes(sources), gatesFor(health, 'today'), 'local');
export type Asked = {reply: LocalReply; text: string; kind: LocalReply['kind']; tools: string[]; facts: Record<string, unknown> | null; widgets: string[]};
/** The device's reply with no model, the facts of its lookup (run again) and the widgets that answer asks for (their first-choice kinds). */
export function ask(question: string, env: ToolEnv): Asked {
  let reply: LocalReply = {kind: 'none'};
  try { reply = localAnswer(question, env); } catch { reply = {kind: 'none'}; }
  if (reply.kind === 'none') reply = noModelReply(question, env);
  const calls = 'calls' in reply ? reply.calls : [], lookup = calls.find(c => c.tool === 'life_facts');
  const result = lookup ? runTool('life_facts', lookup.args, env) : null, show = Array.isArray(lookup?.args.show) ? lookup.args.show as string[] : [];
  return {reply, text: 'text' in reply ? reply.text : '', kind: reply.kind, tools: calls.map(c => c.tool), facts: result?.ok ? result.data : null, widgets: show.map(s => s.split('|')[0]!)};
}
// Session AT (L7 NB:N11): 'journey', the level and XP Journey counts.
export type Pillar = 'habits' | 'health' | 'goals' | 'wealth' | 'tasks' | 'notes' | 'journal' | 'agenda' | 'checklist' | 'focus' | 'nova' | 'journey';
/**
 * One thing a person asks, in the ways people ask it. Every phrasing must give the same facts.
 * - `en`, `nl`: the phrasings (casual forms and typos among them).
 * - `says`: what the sentence must contain, in either language (names, figures and dates are written the same in both).
 * - `never`: what it must not contain (the wrong answer the question used to get).
 * - `facts`: what the lookup's data must hold (a deep partial match): counts and ISO dates, the same a model receives.
 * - `widgets`: the kinds of widget this answer asks NOVA's stage for, in order.
 * - `fresh`: what the same question says on a fresh profile (contained in the English reply; `freshNl` in the Dutch one).
 */
export type Case = {id: string; pillar: Pillar; en: readonly string[]; nl: readonly string[]; says: readonly string[]; never?: readonly string[]; facts?: Record<string, unknown>; widgets?: readonly string[]; fresh: string; freshNl?: string};
