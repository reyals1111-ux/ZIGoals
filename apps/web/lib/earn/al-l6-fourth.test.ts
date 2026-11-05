import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import StartHerePath from '../../components/earn/start-here-path';
import {REAL_ZIG_STEPS, START_STEPS, startHereModel, startProgress, startStates, type StartFacts} from './start-here';
import {milestoneState, nextStep} from '../path/model';

/** Session AL (lane L6, fourth pass): the Earn guide is a practice guide with optional real-ZIG steps, not a funnel. */
const FACTS: StartFacts = {linked: 0, connected: 0, journal: [], reads: []};
const LIVE = {chain: {phase: 'loading'}, oroswap: {phase: 'loading'}} as const;
const marked = (ids: string[]) => ({version: 1 as const, steps: Object.fromEntries(ids.map(id => [id, {done: true, at: '2026-11-04T09:00:00.000Z'}]))});

describe('BN-030 / D-060 / D-099: the real-ZIG steps are optional', () => {
  test('after practice, nothing points on to Add money: no NEXT, the end is reached, the line says optional', () => {
    const states = startStates(FACTS, marked(['get-wallet', 'practice'])), model = startHereModel(states);
    expect(nextStep(model)).toBeNull();
    expect(milestoneState(model).find(m => m.id === 'start-complete')?.reached).toBe(true);
    expect(startProgress(states)).toEqual({count: '2 of 6 steps done', next: 'practice done: that is enough to know staking; the real-ZIG steps are optional, only if you choose'});
    const doc = new JSDOM(renderToStaticMarkup(createElement(StartHerePath, {states, open: null, onOpen: () => undefined, onMark: () => undefined, live: LIVE}))).window.document;
    expect(doc.querySelector('[data-next]')).toBeNull();
    expect(doc.body.textContent).not.toContain('Next: Add money');
  });
  test('the four real-ZIG steps are drawn but not counted; the two practice steps are', () => {
    const steps = startHereModel(startStates(FACTS, {version: 1})).sections.flatMap(s => s.steps);
    expect(steps.filter(s => s.counted === false).map(s => s.id)).toEqual([...REAL_ZIG_STEPS]);
    expect(steps.map(s => s.id)).toEqual([...START_STEPS]);
  });
  test('the Add money and first-stake guides say Optional first and offer no primary button', () => {
    for (const open of ['add-money', 'first-stake', 'get-zig']) {
      const doc = new JSDOM(renderToStaticMarkup(createElement(StartHerePath, {states: startStates(FACTS, {version: 1}), open, onOpen: () => undefined, onMark: () => undefined, live: LIVE}))).window.document;
      const panel = doc.querySelector(`[data-start-panel="${open}"]`)!;
      expect(panel.querySelector('p')?.textContent).toMatch(/^Optional\./);
      expect(panel.querySelectorAll('a.primary')).toHaveLength(0);
    }
  });
  test('a person with nothing done is pointed at the first practice step; all six done says so', () => {
    expect(startProgress(startStates(FACTS, {version: 1}))).toEqual({count: 'Six steps · none done yet', next: 'next: Get a wallet'});
    expect(startProgress(startStates(FACTS, marked([...START_STEPS]))).next).toBe('all done');
    expect(startProgress(startStates(FACTS, marked(['add-money']))).next).toBe('next: Get a wallet');
  });
});

describe('D-149 / N-BN-06: the end of the path at 0 of 6', () => {
  test('reads "End of the guide", never "complete", until reached', () => {
    const end = milestoneState(startHereModel(startStates(FACTS, {version: 1}))).find(m => m.at === 'end')!;
    expect(end.reached).toBe(false);
    expect(end.label).toBe('End of the guide');
  });
});
