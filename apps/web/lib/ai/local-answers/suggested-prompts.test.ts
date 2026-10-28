import {describe, expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withHandHealth, withPortfolios} from '../tools/fixtures';
import {goldenSources} from '../evals/run';
import {emptyHabitData} from '../../habits';
import {emptyPlatform} from '../../positions';
import {localAnswer} from './engine';
import {examplesFor} from './examples';

/**
 * Session AI (DE7, G2; Grok's L-004, L-051, B-002, N-066, BUG-054): a suggested prompt ZIGi shows must work when tapped.
 * Without an AI, ZIGi offers examples made from the person's records (`examplesFor`); each must be answered on this
 * device (an answer or a choice between two records), never the canned list again or nothing. Checked for the Showcase,
 * an empty start, and the Showcase with Health not shared.
 */
const showcase = goldenSources(withPortfolios(withHandHealth(showcaseSources())));
const empty = {...showcaseSources(), habits: emptyHabitData(), platform: emptyPlatform(), accounts: null, portfolio: null};
const cases = [['the Showcase', toolEnv(showcase, gatesFor(true, 'today'), 'local')], ['the Showcase, Health not shared', toolEnv(showcase, gatesFor(false, 'today'), 'local')], ['an empty start', toolEnv(empty, gatesFor(true, 'today'), 'local')]] as const;
describe('every example ZIGi offers without an AI is answered on the device', () => {
  for (const [name, env] of cases) test(name, () => {
    const examples = examplesFor(env, 12);
    expect(examples.length).toBeGreaterThanOrEqual(3);
    const unanswered = examples.filter(q => !['answer', 'choices'].includes(localAnswer(q, env).kind));
    expect(unanswered).toEqual([]);
  });
});
