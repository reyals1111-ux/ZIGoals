import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PAGE_PATH_COLOUR, PATH_COLOURS, PATH_COLOUR_IDS, PATH_NEON_STOPS, isPathColour, pathColour} from './colours';
import {litSegments, milestoneState, nextStep, normalisePath, pathProblems, pathProgress, pathSegments, pathSteps, sectionProgress, snakeOffset, orbitOffset, stepAriaLabel, stepIntent, withStepState, zigiAnchor, type PathModel, type PathStep} from './model';

const step = (id: string, state: PathStep['state'] = 'undone', extra: Partial<PathStep> = {}): PathStep => ({id, label: id, colour: 'cyan', state, ...extra});
const at = <T,>(list: readonly T[], i: number): T => { const v = list[i]; if (v === undefined) throw new Error(`no item ${i}`); return v; };
const model = (extra: Partial<PathModel> = {}): PathModel => ({
  id: 'today',
  sections: [
    {id: 'morning', label: 'Morning orbit', colour: 'cyan', steps: [step('walk', 'done'), step('water', 'undone', {value: {current: 500, unit: 'ml', suggested: 250, min: 50, max: 3000, step: 50}}), step('read', 'done')]},
    {id: 'evening', label: 'Evening orbit', colour: 'purple', steps: [step('sleep', 'running'), step('goal', 'undone', {href: '/app/goals/1', counted: false})]},
  ],
  milestones: [{id: 'half', at: 'half', label: 'Half way'}, {id: 'end', at: 'end', label: 'All dots lit'}],
  ...extra,
});

describe('palette', () => {
  test('seven colours, each a pillar or brand token with its Nebula value as the fallback', () => {
    expect(PATH_COLOUR_IDS).toEqual(['teal', 'blue', 'magenta', 'purple', 'gold', 'pink', 'cyan']);
    for (const id of PATH_COLOUR_IDS) {
      const {token, hex} = PATH_COLOURS[id];
      expect(token).toMatch(/^var\(--[a-z-]+, #[0-9a-f]{6}\)$/);
      expect(token.endsWith(`${hex})`)).toBe(true);
    }
    expect(new Set(PATH_COLOUR_IDS.map(id => PATH_COLOURS[id].hex)).size).toBe(7);
  });
  test('the tokens hold the same values the app defines (visual-v21.css), so a dot keeps its page colour', () => {
    const css = readFileSync(fileURLToPath(new URL('../../app/visual-v21.css', import.meta.url)), 'utf8');
    for (const id of PATH_COLOUR_IDS) {
      const [, name, hex] = /^var\((--[a-z-]+), (#[0-9a-f]{6})\)$/.exec(PATH_COLOURS[id].token) ?? [];
      expect(css, `${name} ${hex}`).toMatch(new RegExp(`${name}: ${hex};`));
    }
    expect(PAGE_PATH_COLOUR).toMatchObject({habits: 'cyan', goals: 'purple', health: 'pink', water: 'blue', wealth: 'gold'});
  });
  test('an unknown stored colour falls back instead of throwing', () => {
    expect(isPathColour('gold')).toBe(true);
    expect(isPathColour('chartreuse')).toBe(false);
    expect(pathColour('chartreuse')).toBe('cyan');
    expect(pathColour(undefined, 'pink')).toBe('pink');
    expect(pathColour('teal', 'pink')).toBe('teal');
  });
  test('the neon line is the footer banner main line', () => {
    expect(PATH_NEON_STOPS.map(s => s.hex)).toEqual(['#9273ff', '#23eaff', '#ff74be', '#f06dff']);
    const footer = readFileSync(fileURLToPath(new URL('../../components/footer/footer-path.tsx', import.meta.url)), 'utf8');
    expect(footer).toContain('<stop offset="0" stopColor="#9273ff"/><stop offset=".45" stopColor="#23eaff"/><stop offset=".8" stopColor="#ff74be"/><stop offset="1" stopColor="#f06dff"/>');
  });
});

describe('progress and the next step', () => {
  test('path order is sections then steps', () => {
    expect(pathSteps(model()).map(s => s.id)).toEqual(['walk', 'water', 'read', 'sleep', 'goal']);
  });
  test('a step left out of the count is not in the total; a running step is not done', () => {
    expect(pathProgress(model())).toEqual({done: 2, total: 4, fraction: 0.5});
    expect(sectionProgress(at(model().sections, 1))).toEqual({done: 0, total: 1, fraction: 0});
    expect(pathProgress({sections: []})).toEqual({done: 0, total: 0, fraction: 0});
  });
  test('locked steps count toward the total (they are part of the way) but are never next', () => {
    const m: PathModel = {id: 'start', sections: [{id: 's', label: 'Start here', colour: 'gold', steps: [step('a', 'done'), step('b', 'locked', {lockedReason: 'Finish a first'}), step('c', 'undone')]}], milestones: []};
    expect(pathProgress(m)).toEqual({done: 1, total: 3, fraction: 1 / 3});
    expect(nextStep(m)?.id).toBe('c');
  });
  test('next is the first waiting step in path order, any order of ticking allowed', () => {
    expect(nextStep(model())?.id).toBe('water');
    expect(nextStep(withStepState(model(), 'water', 'done'))?.id).toBe('sleep');
    const all = ['water', 'sleep'].reduce((m, id) => withStepState(m, id, 'done'), model());
    expect(nextStep(all)).toBeNull(); // the uncounted "Open goal" dot is never next
  });
  test('intent: locked → none, value → stepper, href → open, else tick, unless the caller says otherwise', () => {
    expect(stepIntent(step('x', 'locked', {href: '/a'}))).toBeNull();
    expect(stepIntent(at(at(model().sections, 0).steps, 1))).toBe('value');
    expect(stepIntent(step('x', 'undone', {href: '/a'}))).toBe('open');
    expect(stepIntent(step('x'))).toBe('tick');
    expect(stepIntent(step('x', 'undone', {href: '/a', intent: 'tick'}))).toBe('tick');
  });
});

describe('lines', () => {
  test('a segment is lit when both its dots are done; orbits are bridged', () => {
    expect(litSegments(at(model().sections, 0))).toEqual([false, false]);
    const m = withStepState(model(), 'water', 'done');
    expect(litSegments(at(m.sections, 0))).toEqual([true, true]);
    const segs = pathSegments(m);
    expect(segs.map(s => [s.id, s.bridge, s.lit])).toEqual([['walk->water', false, true], ['water->read', false, true], ['read->sleep', true, false], ['sleep->goal', false, false]]);
    expect(segs.find(s => s.bridge)?.sectionId).toBe('morning');
  });
  test('empty sections are skipped by the bridges and a locked end marks the line', () => {
    const m: PathModel = {id: 'x', milestones: [], sections: [{id: 'a', label: 'A', colour: 'cyan', steps: [step('1', 'done')]}, {id: 'b', label: 'B', colour: 'cyan', steps: []}, {id: 'c', label: 'C', colour: 'cyan', steps: [step('2', 'locked')]}]};
    expect(pathSegments(m)).toEqual([{id: '1->2', from: '1', to: '2', sectionId: 'a', bridge: true, lit: false, locked: true}]);
  });
});

describe('milestones', () => {
  test('half way sits after the half-way count and is reached by count in any order', () => {
    const [half, end] = milestoneState(model());
    expect(half).toMatchObject({id: 'half', afterStepId: 'water', reached: true}); // 2 of 4 done (walk, read)
    expect(end).toMatchObject({id: 'end', afterStepId: 'goal', reached: false});
    const one = withStepState(withStepState(model(), 'walk', 'undone'), 'read', 'undone');
    expect(milestoneState(one)[0]?.reached).toBe(false);
  });
  test('end is reached when every counted step is done; an empty path reaches nothing', () => {
    const all = ['water', 'sleep'].reduce((m, id) => withStepState(m, id, 'done'), model());
    expect(milestoneState(all).every(m => m.reached)).toBe(true);
    expect(milestoneState({sections: [], milestones: [{id: 'e', at: 'end', label: 'End'}, {id: 'h', at: 'half', label: 'Half'}]})).toEqual([
      {id: 'e', at: 'end', label: 'End', afterStepId: null, reached: false}, {id: 'h', at: 'half', label: 'Half', afterStepId: null, reached: false}]);
  });
  test('after a step: reached when that step and every counted step before it are done (the Earn path chapters)', () => {
    const m = model({milestones: [{id: 'c1', at: {afterStep: 'read'}, label: 'Chapter 1', reward: {badge: 'first'}}, {id: 'gone', at: {afterStep: 'nope'}, label: 'Lost'}]});
    expect(milestoneState(m)[0]).toMatchObject({afterStepId: 'read', reached: false});
    expect(milestoneState(withStepState(m, 'water', 'done'))[0]).toMatchObject({afterStepId: 'read', reached: true, reward: {badge: 'first'}});
    expect(milestoneState(m)[1]).toMatchObject({afterStepId: null, reached: false});
    expect(pathProblems(m)).toEqual(['milestone gone names an unknown step nope']);
  });
});

describe('ZIGi, layout and words', () => {
  test('ZIGi stands by the next step with a mood from the progress', () => {
    expect(zigiAnchor(model())).toEqual({stepId: 'water', sectionId: 'morning', mood: 'half'});
    expect(zigiAnchor({sections: []})).toEqual({stepId: null, sectionId: null, mood: 'empty'});
    const none = ['walk', 'read'].reduce((m, id) => withStepState(m, id, 'undone'), model());
    expect(zigiAnchor(none).mood).toBe('start');
    const all = ['water', 'sleep'].reduce((m, id) => withStepState(m, id, 'done'), model());
    expect(zigiAnchor(all)).toEqual({stepId: null, sectionId: null, mood: 'done'});
  });
  test('the snake is a gentle wave', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(snakeOffset)).toEqual([0, 0.71, 1, 0.71, 0, -0.71, -1, -0.71, 0]);
  });
  test('the Checklist\'s orbit path swings half a step per planet, a whole S every eight', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => orbitOffset(i))).toEqual([0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5]);
  });
  test('each dot says its state in words', () => {
    expect(stepAriaLabel(step('Morning walk', 'done'))).toBe('Morning walk: done');
    expect(stepAriaLabel(step('Water', 'undone', {note: '500 ml'}))).toBe('Water: 500 ml: not done yet');
    expect(stepAriaLabel(step('Stake', 'locked', {lockedReason: 'Practice first'}))).toBe('Stake: locked (Practice first)');
    expect(stepAriaLabel(step('Run', 'undone', {counted: false, note: 'Not today'}))).toBe('Run: Not today: not counted today');
  });
  test('normalise: unknown colours fall back, duplicates keep the first, partial is clamped; the input is not changed', () => {
    const raw = {id: 'x', milestones: [], sections: [{id: 's', label: 'S', colour: 'nope', steps: [step('a', 'undone', {colour: 'nope' as never, partial: 4}), step('a', 'done'), step('b', 'weird' as never)]}]} as unknown as PathModel;
    const n = normalisePath(raw);
    expect(at(n.sections, 0).colour).toBe('cyan');
    expect(at(n.sections, 0).steps.map(s => [s.id, s.state, s.colour, s.partial])).toEqual([['a', 'undone', 'cyan', 0.99], ['b', 'undone', 'cyan', undefined]]);
    expect(at(raw.sections, 0).steps).toHaveLength(3);
    expect(pathProblems(raw)).toEqual(['duplicate step a']);
  });
});
