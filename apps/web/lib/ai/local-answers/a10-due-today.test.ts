import {expect, test} from 'vitest';
import {NOVA_SCOPES, type NovaScopes} from '../context-pack/nova';
import {novaLocalEnv} from '../../nova/local-env';
import {gatesFor, showcaseSources, withG1, withHandHealth, withPortfolios} from '../tools/fixtures';
import {localAnswer} from './engine';

/**
 * Release review A10 (A10-5): "What is due today?" on Monday 09:30 listed the Showcase's overdue garden-bed task twice,
 * once "Still open from earlier" and once in "Also planned today" (the agenda carries an overdue task into today). Each
 * task is said once, in its own group; the agenda's other plans stay.
 */
const DAY = '2026-11-09';
const ALL = Object.fromEntries(NOVA_SCOPES.map(s => [s, true])) as NovaScopes;
const sources = () => ({...withG1(withPortfolios(withHandHealth(showcaseSources(DAY)))), now: new Date(`${DAY}T09:30:00Z`)});
const answer = () => { const r = localAnswer('What is due today?', novaLocalEnv({sources: sources(), gates: gatesFor(true), scopes: ALL, chainChosen: true})!); return 'text' in r ? r.text : ''; };

test('A10-5: the overdue garden-bed task is said once, under "Still open from earlier"', () => {
  const text = answer();
  expect(text.match(/Sketch the garden bed/g)).toHaveLength(1);
  const earlier = text.split('\n').find(l => l.startsWith('• Still open from earlier:'));
  expect(earlier).toContain('Example · Sketch the garden bed (since Sun, Nov 8)');
  const also = text.split('\n').find(l => l.startsWith('• Also planned today:')) ?? '';
  expect(also).not.toContain('Sketch the garden bed');
  // Every task named in the answer appears exactly once.
  const named = text.split('\n').filter(l => /^• (Tasks due today|Still open from earlier):/.test(l)).flatMap(l => l.replace(/^• [^:]+: /, '').split(/, (?=Example · )/)).map(n => n.replace(/ \(.*$/, '').replace(/ at .*$/, ''));
  for (const n of named) expect(text.split(n).length - 1, n).toBe(1);
});
