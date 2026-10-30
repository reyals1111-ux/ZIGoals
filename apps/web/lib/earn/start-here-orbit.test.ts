import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import StartHerePath from '../../components/earn/start-here-path';
import {Path} from '../../components/path/path';
import {startHereModel, startStates, type StartFacts} from './start-here';

/**
 * Session AJ (owner decision D3): Earn's Start-here path wears the Checklist's orbit look. Its first paint: the same six
 * steps as buttons with the same names and states, the three orbits under their own names, only the path's end on the
 * path, and the open guide under its node. The browser specs (tests/earn-path.spec.ts) cover the page itself.
 */
const FACTS: StartFacts = {linked: 0, connected: 0, journal: [], reads: []};
const LIVE = {chain: {phase: 'loading'}, oroswap: {phase: 'loading'}} as const;
const STEPS = ['Get a wallet', 'Practice first', 'Add money', 'Get ZIG', 'Your first real stake', 'Explore more'];
const render = (open: string | null, marked: string[] = []) => {
  const states = startStates(FACTS, {version: 1, steps: Object.fromEntries(marked.map(id => [id, {done: true, at: '2026-10-30T09:00:00.000Z'}]))});
  return new JSDOM(renderToStaticMarkup(createElement(StartHerePath, {states, open, onOpen: () => undefined, onMark: () => undefined, live: LIVE}))).window.document;
};

describe('Start here in the orbit look', () => {
  test('the orbit look, with the same six steps, their names, states and order', () => {
    const doc = render(null, ['add-money']), stage = doc.querySelector('.path-stage.earn-start-path');
    expect(stage?.getAttribute('data-variant')).toBe('orbit');
    expect(stage?.getAttribute('role')).toBe('group');
    expect(stage?.getAttribute('aria-label')).toBe('Start here: how staking works, step by step');
    const dots = [...doc.querySelectorAll('button.path-dot')];
    expect(dots.map(d => d.getAttribute('aria-label')!.split(':')[0])).toEqual(STEPS);
    expect(dots.map(d => d.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false', 'false']);
    expect(dots.every(d => d.classList.contains('orbit-node'))).toBe(true);
    // The next step wears its NEXT tag (a step is done, so not START); every node has its name tab.
    expect(doc.querySelector('[data-next] .path-next-tag')?.textContent).toBe('Next');
    expect(doc.querySelector('[data-next] [data-step]')?.getAttribute('data-step')).toBe('get-wallet');
    expect([...doc.querySelectorAll('.path-label.orbit-tab .path-label-text')].map(t => t.textContent)).toEqual(STEPS);
  });
  test('the orbits keep their own names; only the path’s end stands on it', () => {
    const doc = render(null);
    expect([...doc.querySelectorAll('.orbit-banner h2')].map(h => h.textContent)).toEqual(['Get ready', 'Bring money in', 'Start earning']);
    expect([...doc.querySelectorAll('.path-chest')].map(c => c.getAttribute('data-milestone'))).toEqual(['start-complete']);
    expect(doc.querySelector('.path-chest.path-finale')?.textContent).toContain('Start here, complete');
  });
  test('a step’s guide opens under its node, and its node says so', () => {
    const doc = render('practice');
    expect(doc.querySelector('[data-step="practice"]')?.getAttribute('aria-expanded')).toBe('true');
    const guide = doc.querySelector('[data-start-panel="practice"]');
    expect(guide?.closest('.path-step')?.querySelector('[data-step]')?.getAttribute('data-step')).toBe('practice');
    expect(guide?.getAttribute('role')).toBe('region');
    expect(guide?.getAttribute('aria-label')).toBe('Practice first: how');
    expect(guide?.textContent).toContain('Mark as done');
    expect(doc.querySelectorAll('.earn-start-panel')).toHaveLength(1);
  });
  test('the orbit look without a title of its own keeps the Checklist’s "<name> Orbit"', () => {
    const doc = new JSDOM(renderToStaticMarkup(createElement(Path, {model: startHereModel(startStates(FACTS, {version: 1})), ariaLabel: 'Path', variant: 'orbit'}))).window.document;
    expect([...doc.querySelectorAll('.orbit-banner h2')].map(h => h.textContent)).toEqual(['Get ready Orbit', 'Bring money in Orbit', 'Start earning Orbit']);
  });
});
