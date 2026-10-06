import {describe, expect, it} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {habitDataSchema, type HabitData} from '../../habits';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {fastingSchema, FASTING_KEY} from '../../fasting/schema';
import {emptyReminders} from '../../reminders/schema';
import {emptyWeeklyReview, weeklyReviewSchema} from '../../weekly-review/schema';
import type {Handle} from '../context/types';
import {REPLY_CORPUS} from '../fixtures/reply-corpus';
import {hasOpenFence, NOT_AN_ENTRY, parseReply} from './parse';
import {planAction, type Env, type Stores} from './plan';
import {WRITING_KINDS} from './schema';

/**
 * ADR-012 follow-up, part D: the MOCK reply corpus against the parser and the planner. Whatever a model sends, the
 * chat never crashes, nothing is written without a card, malformed blocks become one calm note, and the text shown
 * never carries a raw block. The planner runs over every surviving proposal with the Showcase records and either
 * plans a card or refuses in plain words; it never throws and never writes.
 */
const {records} = buildShowcase('2026-09-20');
const stores: Stores = {
  habits: habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData,
  health: healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform,
  fasting: fastingSchema.parse(JSON.parse(records[FASTING_KEY]!)),
  // Session V Part 7: the three device records a proposal may also write.
  reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: records['zigoals:weekly-review:v1'] ? weeklyReviewSchema.parse(JSON.parse(records['zigoals:weekly-review:v1'])) : emptyWeeklyReview(), memory: {version: 1},
};
const handles: Handle[] = [
  ...stores.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title})),
  ...stores.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name})),
  ...stores.health.foods.map((f, i) => ({handle: `f${i + 1}`, kind: 'food' as const, id: f.id, label: f.name})),
  ...stores.health.recipes.map((r, i) => ({handle: `r${i + 1}`, kind: 'recipe' as const, id: r.id, label: r.name})),
];
let counter = 0;
const env: Env = {stores, handles, now: new Date('2026-09-20T19:00:00Z'), habitDay: '2026-09-20', healthDay: '2026-09-20', timeZone: 'UTC', newHealthId: () => `health_ai-${String(++counter).padStart(8, '0')}`, newHabitId: () => `92000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`};
const snapshot = JSON.stringify(stores);

describe('the reply corpus (MOCK, hand-written)', () => {
  it('has at least forty entries across every provider style', () => {
    expect(REPLY_CORPUS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(REPLY_CORPUS.map(e => e.style))).toEqual(new Set(['openai', 'anthropic', 'gemini', 'xai', 'openrouter', 'ollama', 'lmstudio']));
    expect(new Set(REPLY_CORPUS.map(e => e.id)).size).toBe(REPLY_CORPUS.length);
  });
  for (const entry of REPLY_CORPUS) {
    it(`${entry.id}: ${entry.note}`, () => {
      const parsed = parseReply(entry.reply);
      expect(parsed.proposals.length, 'cards').toBe(entry.expect.proposals);
      if (entry.expect.rejected !== undefined) expect(parsed.rejected.length, 'not-an-entry notes').toBe(entry.expect.rejected);
      if (entry.expect.kinds) expect(parsed.proposals.map(p => p.kind)).toEqual(entry.expect.kinds);
      for (const word of entry.expect.textIncludes ?? []) expect(parsed.text).toContain(word);
      for (const word of entry.expect.textExcludes ?? []) expect(parsed.text).not.toContain(word);
      // A closed or stripped reply never shows a raw proposal block; every surviving proposal is a whitelisted kind.
      expect(parsed.text).not.toMatch(/```\s*zigoals/i);
      for (const proposal of parsed.proposals) expect([...WRITING_KINDS, 'prefill-holding']).toContain(proposal.kind);
      // Every rejected block has a plain-words reason and a bounded raw excerpt.
      for (const r of parsed.rejected) { expect(r.reason.length).toBeGreaterThan(8); expect(r.raw.length).toBeLessThanOrEqual(200); }
      // The planner never throws and never writes: it plans a card or refuses calmly.
      for (const proposal of parsed.proposals) {
        const result = planAction(proposal, env);
        if (result.ok) expect(result.plan.card.title.length).toBeGreaterThan(0); else expect(result.message.length).toBeGreaterThan(8);
      }
      expect(JSON.stringify(stores)).toBe(snapshot);
    });
  }
  it('a cut stream is not parsed while open, and once finished it becomes one note with the calm wording', () => {
    const cut = REPLY_CORPUS.find(e => e.id === 'cut-stream')!;
    expect(hasOpenFence(cut.reply)).toBe(true);
    const parsed = parseReply(cut.reply);
    expect(parsed.rejected[0]!.reason).toContain('cut off');
    expect(NOT_AN_ENTRY).toMatch(/couldn.t turn that into an entry/i);
  });
  it('an instruction echoed from the person\'s own records can at most become an ordinary card, never a new kind', () => {
    const echoed = REPLY_CORPUS.filter(e => e.id.startsWith('echoed-'));
    expect(echoed.length).toBeGreaterThanOrEqual(3);
    for (const entry of echoed) for (const p of parseReply(entry.reply).proposals) expect([...WRITING_KINDS, 'prefill-holding']).toContain(p.kind);
    expect(parseReply(REPLY_CORPUS.find(e => e.id === 'echoed-instruction-habit')!.reply).proposals.map(p => p.kind)).toEqual(['check-in']);
  });
});
