import * as z from 'zod';
import {addLocalDays} from '../../local-date';
import {ENERGY_WORDS} from '../../energy/schema';
import {patternLine, patterns} from '../../journal/reflect';
import type {ToolEnv} from './env';
import {ok, provenance, refuse} from './format';
import type {ToolDefinition} from './types';

/**
 * Session AI (feature 6, the daily energy): the journal and the energy for ZIGi. The journal is private by default: with
 * journal sharing off (the person's own switch on the Journal page) only how many entries there are leaves this tool, for
 * any purpose — no words, no patterns. The energy follows the Health gate (the environment holds none when it is closed).
 */
export const journalTool: ToolDefinition<{days?: number}> = {
  name: 'journal', title: 'Journal', area: 'today',
  description: 'The person\'s own journal entries of the last days (default 7, at most 30), with ZIGi\'s follow-up question and their answer, and the patterns of their recent entries — only when they turned journal sharing on; otherwise only that the journal is private.',
  parameters: {type: 'object', properties: {days: {type: 'integer', description: 'How many days back, 1 to 30.'}}},
  args: z.object({days: z.number().int().min(1).max(30).optional()}),
  label: args => `Journal · last ${args.days ?? 7} days`,
  run(args, env: ToolEnv, label) {
    const journal = env.journal;
    if (!journal) return ok('journal', label, provenance(env, 'Journal', null, null, null), {entries: [], note: 'No journal on this device yet.'});
    if (!journal.shareWithAi) return ok('journal', label, provenance(env, 'Journal', null, null, null), {private: true, entriesOnThisDevice: journal.entries.length, note: 'The journal is private: its words stay on this device. The person can allow sharing on the Journal page.'});
    const from = addLocalDays(env.habitDay, -((args.days ?? 7) - 1));
    const entries = journal.entries.filter(e => e.date >= from).slice(-20).map(e => ({date: e.date, text: e.text.slice(0, 600), ...(e.followUp ? {zigiAsked: e.followUp.question, ...(e.followUp.answer ? {answer: e.followUp.answer.slice(0, 300)} : {})} : {})}));
    return ok('journal', label, provenance(env, 'Journal', null, null, null), {entries, patterns: patterns(journal, env.energy ?? null).slice(0, 4).map(p => patternLine(p, 'en'))});
  },
};
export const energyTool: ToolDefinition<{days?: number}> = {
  name: 'energy', title: 'Energy', area: 'health',
  description: 'The person\'s daily energy ratings (1 drained to 5 full of energy) for the last days (default 14), with the average and the days rated.',
  parameters: {type: 'object', properties: {days: {type: 'integer', description: 'How many days back, 1 to 60.'}}},
  args: z.object({days: z.number().int().min(1).max(60).optional()}),
  label: args => `Energy · last ${args.days ?? 14} days`,
  run(args, env: ToolEnv, label) {
    if (!env.energy) return env.health ? ok('energy', label, provenance(env, 'Energy', null, null, null), {days: [], note: 'No energy rated yet.'}) : refuse('energy', label, 'gate', 'Health is not shared with ZIGi, so the daily energy is not read.');
    const n = args.days ?? 14, days = Array.from({length: n}, (_, i) => addLocalDays(env.habitDay, i - n + 1)).flatMap(d => env.energy!.days[d] ? [{date: d, energy: env.energy!.days[d]!.energy, word: ENERGY_WORDS.en[env.energy!.days[d]!.energy - 1]}] : []);
    const avg = days.length ? Math.round(10 * days.reduce((a, d) => a + d.energy, 0) / days.length) / 10 : null;
    return ok('energy', label, provenance(env, 'Energy', null, null, null), {days, rated: days.length, of: n, average: avg, scale: '1 drained · 5 full of energy'});
  },
};
export const JOURNAL_TOOLS = [journalTool, energyTool] as const;
