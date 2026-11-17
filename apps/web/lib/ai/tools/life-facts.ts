import * as z from 'zod';
import {answerQuery, queryLabel, recordsOf, showOf} from '../local-answers/exact';
import {isPeriodToken} from '../local-answers/exact/period';
import {fold, sameWord} from '../local-answers/exact/text';
import {ASKS, DOMAINS, SHAPES, type Query, type QuerySubject} from '../local-answers/exact/types';
import type {ToolEnv} from './env';
import {ok, provenance, refuse, text} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AS (ADR-042, approval item 4; TIER 3 (AI tools)): `life_facts` — the exact layer's computed facts as one lookup.
 * The device's own answer to "which days did I skip meditation this month" is this lookup's result said in words; a
 * connected model that asks the same gets the same facts as data (counts, ISO dates, rows), so its words cannot disagree
 * with the device or the widget. Read only. Every part of life reads under its own switch, checked inside the lookup
 * (lib/ai/local-answers/exact/index.ts `closed`): a closed area or a closed Health gate is a refusal, never a figure. The
 * journal's words never leave: with journal sharing off a model gets only that the journal is private.
 */
const args = z.object({
  about: z.enum(DOMAINS), ask: z.enum(ASKS), shape: z.enum(SHAPES).optional(), period: z.string().max(24).optional(), versus: z.string().max(24).optional(),
  weekday: z.number().int().min(0).max(6).optional(), name: z.string().max(120).optional(), language: z.enum(['en', 'nl']).optional(),
  /** The widgets of the device's own answer (lib/ai/local-answers/exact/index.ts `showOf`); a model does not set it. */
  show: z.array(z.string().max(200)).max(3).optional(),
});
export type LifeFactsArgs = z.infer<typeof args>;
const names = (value: string) => fold(value).split(' ').filter(w => w.length >= 3);
/** The record a name stands for, in the part of life asked about (a habit, a goal, a budget's category, a bill). */
function subjectOf(a: LifeFactsArgs, env: ToolEnv): QuerySubject | null {
  if (!a.name) return null;
  const records = recordsOf(env), words = names(a.name), fits = (title: string) => { const parts = names(title); return parts.length > 0 && parts.every(p => words.some(w => w === p || sameWord(w, p))); };
  if (a.about === 'habits') { const h = records.habits.find(x => !x.archived && fits(x.title)); return h ? {kind: 'habit', id: h.id, name: h.title} : null; }
  if (a.about === 'goals') { const g = records.goals.find(x => fits(x.name)); return g ? {kind: 'goal', id: g.id, name: g.name} : null; }
  if (a.about === 'spending' || a.about === 'budgets') { const c = records.categories.find(fits); return c ? {kind: 'category', id: c, name: c} : null; }
  if (a.about === 'bills') { const b = records.bills.find(x => fits(x.title)); return b ? {kind: 'bill', id: b.id, name: b.title} : null; }
  return null;
}
export function lifeFactsQuery(a: LifeFactsArgs, env: ToolEnv): Query {
  const shape = a.shape ?? (a.ask === 'status' ? 'overview' : a.ask === 'total' || a.ask === 'average' ? 'amount' : 'list');
  return {domain: a.about, ask: a.ask, shape, lang: a.language ?? 'en', period: isPeriodToken(a.period) ? a.period : null, versus: isPeriodToken(a.versus) ? a.versus : null, weekday: a.weekday ?? null, subject: subjectOf(a, env), read: fold(`${a.about} ${a.ask} ${a.name ?? ''}`)};
}
export const lifeFactsTool: ToolDefinition<LifeFactsArgs> = {
  name: 'life_facts', title: 'Life facts', area: 'today', surface: 'facts',
  description: 'Exact facts from the person’s own records: what was done, missed, skipped, not done, late or open; on which days; totals, averages, best and lowest day, streaks, one period beside another. "missed" is a due day not done; "skipped" is never counted as missed; today is still open. Use the figures as they are; never state one you did not look up.',
  parameters: {type: 'object', properties: {
    about: {type: 'string', enum: DOMAINS, description: 'The part of life.'},
    ask: {type: 'string', enum: ASKS, description: 'What is asked about it.'},
    shape: {type: 'string', enum: SHAPES, description: 'The shape of the answer: a count, a list, the dates, an amount, yes or no, or an overview.'},
    period: {type: 'string', description: 'today, yesterday, this-week, last-week, this-month, last-month, this-year, last-year, last-N-days (N a number), since:YYYY-MM-DD, on:YYYY-MM-DD or month:YYYY-MM; add @0 to @6 for one weekday (0 = Sunday). Left out: the answer’s own default.'},
    versus: {type: 'string', description: 'For ask "compare": the period to compare with (same forms). Left out: the period just before.'},
    weekday: {type: 'integer', description: '0 (Sunday) to 6: only that weekday across the period.'},
    name: {type: 'string', description: 'One record by its name: a habit, a goal, a spending category or a bill.'},
    language: {type: 'string', enum: ['en', 'nl'], description: 'The language of the sentence in the result.'},
  }, required: ['about', 'ask']},
  args,
  label: (a, env) => { try { return queryLabel(lifeFactsQuery(a, env), env.habitDay); } catch { return 'Life facts'; } },
  run(a, env, label) {
    if (a.period !== undefined && !isPeriodToken(a.period)) return refuse('life_facts', label, 'range', `"${text(a.period, 24)}" is not a period this lookup reads. Use today, yesterday, this-week, last-week, this-month, last-month, this-year, last-year, last-N-days, since:YYYY-MM-DD, on:YYYY-MM-DD or month:YYYY-MM.`);
    if (a.name && !subjectOf(a, env) && (a.about === 'habits' || a.about === 'goals' || a.about === 'bills')) return refuse('life_facts', label, 'not-found', `No ${a.about === 'habits' ? 'habit' : a.about === 'goals' ? 'goal' : 'bill'} is called "${text(a.name, 60)}" in the person’s records.`);
    // The journal's words stay on the device; a model learns its days only when the person turned journal sharing on.
    if (a.about === 'journal' && env.purpose === 'provider' && !env.journal?.shareWithAi) return ok('life_facts', label, provenance(env, 'Journal', null, null, null), {private: true, note: 'The journal is private: nothing of it is shared. The person can allow sharing on the Journal page.'});
    const q = lifeFactsQuery(a, env), exact = answerQuery(q, env);
    if (!exact) return refuse('life_facts', label, 'arguments', 'That combination is not one this lookup answers. Ask another way, or use the lookup of that part of life.');
    if (exact.kind === 'refusal') return refuse('life_facts', label, exact.facts.closed === 'health' ? 'gate' : 'area', exact.text);
    return ok('life_facts', label, provenance(env, `${a.about === 'nova' || a.about === 'life' ? 'own' : a.about} records`, q.subject?.name ? text(q.subject.name, 60) : null, null, null), {answer: exact.text, ...exact.facts, ...(exact.widgets.length ? {show: showOf(exact.widgets)} : {}), rule: 'the person’s own records as they stand; a day with nothing recorded is unknown, never zero'});
  },
};
export const LIFE_FACTS_TOOLS = [lifeFactsTool] as const;
