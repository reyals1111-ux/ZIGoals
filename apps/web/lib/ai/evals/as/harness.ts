import {emptyAccounts} from '../../../accounts/schema';
import {emptyBills} from '../../../bills/schema';
import {emptyHabitData} from '../../../habits';
import {createEmptyHealth} from '../../../health';
import {emptyJournal} from '../../../journal/schema';
import {emptyMoneyLog} from '../../../money-log/schema';
import {emptyNotes} from '../../../notes/schema';
import {novaLocalEnv} from '../../../nova/local-env';
import {emptyPlatform} from '../../../positions';
import {buildShowcase} from '../../../showcase-data';
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
export const showcaseAll = (): ToolSources => ({...showcaseSources(DAY), now: NOW, ak: readAkToolSources(get), nova: readNovaToolSources(get, {notes: true})});
export const freshAll = (): ToolSources => ({...showcaseSources(DAY), now: NOW, habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), accounts: emptyAccounts(), moneyLog: emptyMoneyLog(), journal: emptyJournal(), fasting: null, weekly: null, energy: null, chess: null, portfolio: null, ak: {bills: emptyBills()}, nova: {tasks: {version: 1, tasks: []}, focus: {version: 1, sessions: []}, budgets: {version: 1, budgets: []}, notes: emptyNotes()}, showcase: false} as ToolSources);
const SCOPES = {...DEFAULT_NOVA_SCOPES, health: true, journal: true, notes: true};
/** NOVA's own environment with every permission on (the corpus is about the answers; the switches have their own tests). */
export const novaEnv = (sources: ToolSources, scopes = SCOPES, health = true): ToolEnv => novaLocalEnv({sources, gates: gatesFor(health, 'today'), scopes, chainChosen: true})!;
export const zigiEnv = (sources: ToolSources, health = true): ToolEnv => toolEnv(sources, gatesFor(health, 'today'), 'local');
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
export type Pillar = 'habits' | 'health' | 'goals' | 'wealth' | 'tasks' | 'notes' | 'journal' | 'agenda' | 'checklist' | 'focus' | 'nova';
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
