import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import {Path} from '../../components/path/path';
import type {PathModel} from './model';

/**
 * The renderer's first paint for the shapes the Earn lane's Start-here path and Academy use (a locked step, a step that
 * opens a page, a chapter chest after a step) and the Checklist's (a value step, a step left out of the count). The
 * browser specs (tests/path-engine.spec.ts) cover measuring, the line, motion and the keyboard on the real page.
 */
const START: PathModel = {
  id: 'start-here',
  sections: [
    {id: 'wallet', label: 'Your wallet', colour: 'gold', steps: [
      {id: 'get-wallet', label: 'Get a wallet', colour: 'gold', state: 'done', note: 'Detected'},
      {id: 'practice', label: 'Practice first', colour: 'gold', state: 'undone', href: '/app/staking'},
      {id: 'real', label: 'Your first real stake', colour: 'gold', state: 'locked', lockedReason: 'Practice first'},
    ]},
    {id: 'more', label: 'Explore', colour: 'teal', steps: [
      {id: 'water', label: 'Water', colour: 'blue', state: 'undone', value: {current: 500, unit: 'ml', suggested: 250, min: 50, max: 3000, step: 50}},
      {id: 'goal', label: 'Open goal', colour: 'purple', state: 'undone', href: '/app/goals/1', counted: false},
    ]},
  ],
  milestones: [{id: 'chapter-1', at: {afterStep: 'real'}, label: 'Chapter one', reward: {badge: 'Starter', xp: 15}}],
};
const render = (model: PathModel) => new JSDOM(renderToStaticMarkup(createElement(Path, {model, ariaLabel: 'Start here'}))).window.document;

describe('the path renderer, first paint', () => {
  test('a locked step is not a control: an image with its reason, and a lock', () => {
    const doc = render(START), locked = doc.querySelector('[data-step="real"]');
    expect(locked?.tagName).toBe('SPAN');
    expect(locked?.getAttribute('role')).toBe('img');
    expect(locked?.getAttribute('aria-label')).toBe('Your first real stake: locked (Practice first)');
    expect(locked?.getAttribute('data-state')).toBe('locked');
    expect(doc.querySelector('[data-step="real"]')?.closest('.path-step')?.textContent).toContain('Practice first');
  });
  test('a step with a page is a link; a value step is a button that says whether its stepper is open; done is pressed', () => {
    const doc = render(START);
    const practice = doc.querySelector('[data-step="practice"]');
    expect(practice?.tagName).toBe('A');
    expect(practice?.getAttribute('href')).toBe('/app/staking');
    const water = doc.querySelector('[data-step="water"]');
    expect(water?.tagName).toBe('BUTTON');
    expect(water?.getAttribute('aria-expanded')).toBe('false');
    expect(water?.getAttribute('aria-pressed')).toBe('false');
    expect(doc.querySelector('[data-step="get-wallet"]')?.getAttribute('aria-pressed')).toBe('true');
  });
  test('the chapter chest sits right after its step; banners count only counted steps; ZIGi stands by the next step', () => {
    const doc = render(START);
    const items = [...doc.querySelectorAll('.path-steps > li')].map(li => li.querySelector('[data-step]')?.getAttribute('data-step') ?? li.getAttribute('data-milestone'));
    expect(items).toEqual(['get-wallet', 'practice', 'real', 'chapter-1', 'water', 'goal']);
    expect([...doc.querySelectorAll('.path-banner-count')].map(b => b.textContent)).toEqual(['1 of 3', '0 of 1']);
    expect(doc.querySelector('[data-milestone="chapter-1"]')?.textContent).toContain('(not reached yet)');
    expect(doc.querySelector('[data-next]')?.querySelector('[data-step]')?.getAttribute('data-step')).toBe('practice');
    expect(doc.querySelector('[data-next] .path-zigi')).not.toBeNull();
    expect(doc.querySelectorAll('.path-zigi')).toHaveLength(1);
  });
  test('every dot gives the line its centre and its colour as a token; headings name the orbits', () => {
    const doc = render(START);
    const points = [...doc.querySelectorAll('[data-path-point]')].map(d => d.getAttribute('data-path-point'));
    expect(points).toEqual(['get-wallet', 'practice', 'real', 'water', 'goal']);
    expect(doc.querySelector('[data-step="water"]')?.getAttribute('style')).toContain('--dot:var(--brand-blue, #459dff)');
    expect([...doc.querySelectorAll('.path-section h2')].map(h => h.textContent)).toEqual(['Your wallet', 'Explore']);
    expect(doc.querySelector('.path-stage')?.getAttribute('role')).toBe('group');
    expect(doc.querySelector('.path-stage')?.getAttribute('aria-label')).toBe('Start here');
  });
  test('the reward line shows only once the chest is reached', () => {
    const reached: PathModel = {...START, sections: START.sections.map(s => ({...s, steps: s.steps.map(x => ({...x, state: 'done' as const}))}))};
    const chest = render(reached).querySelector('[data-milestone="chapter-1"]');
    expect(chest?.getAttribute('data-reached')).toBe('true');
    expect(chest?.textContent).toContain('Badge: Starter · +15 XP');
    expect(render(START).querySelector('[data-milestone="chapter-1"]')?.textContent).not.toContain('Badge');
  });
});
