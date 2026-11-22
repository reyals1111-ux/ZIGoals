import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DrinkDayEnergy, facts} from '../components/health/r3/water-more';
import {MoreGoalHead} from '../components/health-goals/more-goals';
import {addMoreGoal, emptyMoreGoals} from './health-goals/more';

/**
 * Session AV lane 2 (health r3; review B3B-4): "Hide calories and weight" (components/hide-figures.css hides every
 * `[data-body-figure]`) covers the water card's drink kcal line, each own drink's kcal and a calorie or body goal's target,
 * as it covers Health's other calorie and weight figures.
 */
const hidden = (html: string, figure: string) => new RegExp(`data-body-figure=""[^>]*>[^<]*(?:<[^>]+>[^<]*)*${figure}`).test(html);
describe('hide calories and weight', () => {
  test('the water card’s line of today’s drink energy', () => {
    const html = renderToStaticMarkup(createElement(DrinkDayEnergy, {energy: {kcal: 250, sugarG: 21.5, withKcal: 2, withSugar: 1, drinks: 2, lines: []}}));
    expect(html).toMatch(/^<p class="fine" data-body-figure="">From today’s drinks/);
    expect(renderToStaticMarkup(createElement(DrinkDayEnergy, {energy: {kcal: null, sugarG: null, withKcal: 0, withSugar: 0, drinks: 1, lines: []}}))).toBe('');
  });
  test('an own drink’s kcal sits in its own hidden span; the size and caffeine stay', () => {
    const html = renderToStaticMarkup(facts({id: 'oat-latte', name: 'Oat latte', type: 'coffee', sizeMl: 300, caffeineMg: 80, kcal: 130, sugarG: 7.5}));
    expect(html).toBe('300 mL · 80 mg caffeine · <span data-body-figure="">130 kcal</span> · 7.5 g sugar');
  });
  test('a calorie goal’s name and target, and a body goal’s target, are hidden; a protein goal’s are not', () => {
    const head = (source: 'nutrient' | 'body', key: string, target: string) => { const r = addMoreGoal(emptyMoreGoals(), {name: '', source, key, target, direction: 'at-most', windowDays: 7}, 'g', '2026-11-23T08:00:00.000Z'); if (!r.ok) throw new Error(r.issue.message); return renderToStaticMarkup(createElement(MoreGoalHead, {g: r.goal})); };
    const kcal = head('nutrient', 'kcal', '2000');
    expect(kcal).toContain('<strong data-body-figure="">Calories eaten at most 2000 kcal</strong>');
    expect(hidden(kcal, 'at most 2000 kcal')).toBe(true);
    expect(hidden(head('body', 'waist', '85'), 'at most 85 cm')).toBe(true);
    expect(head('nutrient', 'proteinMg', '100')).not.toContain('data-body-figure');
  });
});
