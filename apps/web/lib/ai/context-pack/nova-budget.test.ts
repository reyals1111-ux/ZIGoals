import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {CONTEXT_BUDGET, PAGE_AREAS} from '../settings';
import {estimateTokens} from '../context/budget';
import {buildSystemPrompt} from '../context/specialists';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {readAkToolSources} from '../tools/ak-sources';
import {readNovaToolSources} from '../tools/nova-sources';
import {buildNovaPack, NOVA_PACK_TOKENS, type NovaScopes} from './nova';
import {buildNovaSystemPrompt} from './nova-prompt';

/**
 * Owner follow-up 2 (N4): NOVA's fixed prompt (its system prompt and its context pack, every scope granted, the Showcase
 * loaded) keeps within ZIGi's 9,000-token page line of the 10,000 default, with and without the tools note, so at least
 * 1,000 tokens stay free for the conversation. Measured (estimate, four characters a token) on 2026-11-01: ZIGi's Today
 * 7,948 (system alone, unchanged); NOVA's system 8,222 without tools and 8,397 with them; the full Showcase pack 536 (cap
 * 600, all 20 parts of the day attached, with lanes T's and B's Showcase tasks and notes) → NOVA 8,760 / 8,935; the
 * system with tools plus the cap is 8,997. Today's prompt is untouched: NOVA reads ZIGi's parts.
 */
const DAY = '2026-10-31';
const ALL: NovaScopes = {today: true, goals: true, habits: true, health: true, wealth: true, notes: true, journal: true, earn: true};
function pack() {
  const {records} = buildShowcase(DAY, 'UTC'), get = {getItem: (k: string) => records[k] ?? null};
  const sources = {...showcaseSources(DAY), ak: readAkToolSources(get), nova: readNovaToolSources(get, {notes: true})};
  return buildNovaPack({sources, gates: gatesFor(true, 'today'), scopes: ALL, chainChosen: true, privacy: {mode: 'relaxed', redactForSend: t => t}});
}
const nova = (tools: boolean, text: string | null) => buildNovaSystemPrompt({pack: text, customInstructions: '', providerName: 'OpenAI', today: DAY, timeZone: 'Europe/Amsterdam', tools});

test('NOVA\'s system prompt and its full Showcase pack stay within 9,000 of the default 10,000, with or without tools', () => {
  expect(CONTEXT_BUDGET.default).toBe(10_000);
  const p = pack();
  expect(p.estimatedTokens).toBeLessThanOrEqual(NOVA_PACK_TOKENS);
  expect(p.overBudget).toEqual([]); // the budget holds with every part of the day attached
  for (const tools of [false, true]) expect(estimateTokens(nova(tools, p.text)), `tools ${tools}`).toBeLessThanOrEqual(CONTEXT_BUDGET.default - 1000);
  // Any person's records: the pack's cap plus the system prompt with the tools note still fits (the pack names what it leaves out).
  expect(estimateTokens(nova(true, null)) + NOVA_PACK_TOKENS).toBeLessThanOrEqual(CONTEXT_BUDGET.default - 1000);
});
test('NOVA is not a page area, and ZIGi\'s Today prompt is still its own (no NOVA line in it)', () => {
  expect(PAGE_AREAS as readonly string[]).not.toContain('nova');
  const today = buildSystemPrompt({area: 'today', context: null, customInstructions: '', providerName: 'OpenAI', today: DAY, timeZone: 'Europe/Amsterdam'});
  expect(today.startsWith('You are ZIGi, the assistant inside ZIGoals')).toBe(true);
  for (const word of ['NOVA', '"kind":"add-task"', '"kind":"capture-note"', '"kind":"log-workout"', '"kind":"start-focus"']) expect(today, word).not.toContain(word);
  expect(estimateTokens(today)).toBe(7948);
});
