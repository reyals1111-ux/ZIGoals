import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, habitInputSchema} from '../habits';
import {emptyGoalExtras, goalExtrasSchema, setGoalTemplate} from '../goal-extras/store';
import {TEXT_LIMITS} from '../limits/text';
import {wizardIdeaOf} from '../goals/wizard-ideas';
import {GOAL_LIBRARY, templateById} from './goal-library';
import {HABIT_GROUP_LABEL, habitTemplateInputOf} from './habits';
import {ALL_HABIT_TEMPLATES} from './library';
import {CATALOGUE_AREAS, TEMPLATE_CATALOGUE, catalogueAreaOfGoal, catalogueAreasFor, searchCatalogue} from './library';
import {LIBRARY_GOALS} from './library-goals';
import {LIBRARY_HABITS} from './library-habits';
import {templateHabitInput} from './template-habits';

// Backlog #15 (AL-COMPETITOR-GAP-118): the curated template library, 150+ goal and habit templates grouped by area.
const AT = '2026-11-13T09:00:00.000Z';
/** A goal's name: lib/positions.ts privateGoalSchema `name` (trim, 1–100); a step: the creator's short-step rule (DV-182). */
const GOAL_NAME_MAX = 100, STEP_MAX = 36;
/** No promises about health or money, no medical advice, no hype. */
const BANNED = [/\bguarantee[sd]?\b/i, /\bcure[sd]?\b/i, /\brich(es)?\b/i, /\blose \d+ ?kg in\b/i, /\bdetox\b/i, /\bmiracle\b/i, /\brisk[- ]free\b/i, /\bpassive income\b/i, /\bfat[- ]?burn/i, /\bburn fat\b/i, /\bdouble your\b/i, /\bweight loss\b/i, /\bquick fix\b/i, /\bclinically\b/i, /\bdiagnos/i, /\bprescri/i, /\bheal(s|ing)?\b/i, /\bproven\b/i, /\b100 ?% ?(sure|safe)\b/i, /\bin (a|one) (week|month)\b.*\b(kg|lbs?|pounds)\b/i];
const textOf = (e: (typeof TEMPLATE_CATALOGUE)[number]) => e.kind === 'goal'
  ? [e.goal.title, e.goal.summary, ...(e.goal.milestones ?? []), ...(e.goal.keywords ?? []), ...(e.goal.habits ?? []).flatMap(h => [h.title, h.why]), e.goal.average?.unit ?? '', e.goal.count?.unit ?? ''].join(' | ')
  : [e.habit.title, e.habit.note, e.habit.category].join(' | ');

describe('the template library', () => {
  it('holds 150 or more entries across goals and habits, every area used, ids and titles unique', () => {
    expect(TEMPLATE_CATALOGUE.length).toBeGreaterThanOrEqual(150);
    expect(TEMPLATE_CATALOGUE.length).toBe(GOAL_LIBRARY.length + ALL_HABIT_TEMPLATES.length);
    expect(new Set(TEMPLATE_CATALOGUE.map(e => e.id)).size).toBe(TEMPLATE_CATALOGUE.length);
    expect(new Set(TEMPLATE_CATALOGUE.map(e => e.title.trim().toLowerCase())).size).toBe(TEMPLATE_CATALOGUE.length);
    expect(new Set(GOAL_LIBRARY.map(t => t.id)).size).toBe(GOAL_LIBRARY.length);
    expect(new Set(ALL_HABIT_TEMPLATES.map(t => t.id)).size).toBe(ALL_HABIT_TEMPLATES.length);
    for (const area of CATALOGUE_AREAS) expect(TEMPLATE_CATALOGUE.filter(e => e.area === area.id).length, area.id).toBeGreaterThanOrEqual(5);
    // every added entry is in the library once, and the library stays grouped by area
    for (const t of LIBRARY_GOALS) expect(GOAL_LIBRARY.filter(x => x.id === t.id), t.id).toHaveLength(1);
    for (const t of LIBRARY_HABITS) expect(ALL_HABIT_TEMPLATES.filter(x => x.id === t.id), t.id).toHaveLength(1);
    const order = TEMPLATE_CATALOGUE.map(e => CATALOGUE_AREAS.findIndex(a => a.id === e.area));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('every goal is valid in the goal library’s shape: id, name and step lengths, what its kind needs, a wizard idea or its own form', () => {
    let extras = emptyGoalExtras();
    for (const t of GOAL_LIBRARY) {
      expect(t.id, t.id).toMatch(/^[a-z0-9-]{1,60}$/);
      extras = setGoalTemplate(extras, `private:${GOAL_LIBRARY.indexOf(t) + 1}`, t.id, AT);
      expect(t.title.trim().length, t.id).toBeGreaterThan(0);
      expect(t.title.length, t.id).toBeLessThanOrEqual(GOAL_NAME_MAX);
      for (const m of t.milestones ?? []) { expect(m.length, `${t.id}: ${m}`).toBeLessThanOrEqual(STEP_MAX); expect(m.trim().length).toBeGreaterThan(0); }
      if (t.kind === 'project') expect(t.milestones?.length, t.id).toBeGreaterThanOrEqual(2);
      if (t.kind === 'count') expect(t.count && Number.isInteger(t.count.target) && t.count.target > 0 && t.count.unit.length <= 30, t.id).toBe(true);
      if (t.kind === 'average') expect(t.average && t.average.target > 0, t.id).toBe(true);
      const idea = wizardIdeaOf(t, {id: t.id, category: 'Custom'});
      if (t.kind === 'average' || t.kind === 'health-weight') expect(idea, t.id).toBeNull();
      else expect(idea, t.id).toMatchObject({name: t.title, type: t.kind === 'value' ? 'VALUE' : t.kind === 'count' ? 'QUANTITY' : 'PROJECT'});
      expect(templateById(t.id)).toBe(t);
    }
    expect(goalExtrasSchema.safeParse(extras).success).toBe(true);
  });

  it('every habit is valid Habits input; a goal’s suggested habits are made by Habits’ own createHabit', () => {
    for (const t of ALL_HABIT_TEMPLATES) {
      expect(habitInputSchema.safeParse(habitTemplateInputOf(t)).success, t.id).toBe(true);
      expect(t.title.length, t.id).toBeLessThanOrEqual(TEXT_LIMITS.habitTitle);
      expect(HABIT_GROUP_LABEL[t.group], t.id).toBeTruthy();
    }
    let data = emptyHabitData(), n = 0;
    for (const t of LIBRARY_GOALS) for (const h of t.habits ?? []) {
      expect(h.title.length, h.title).toBeLessThanOrEqual(TEXT_LIMITS.habitTitle);
      data = createHabit(data, templateHabitInput(h, t.area), new Date(AT), `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`);
    }
    expect(data.habits).toHaveLength(n);
  });

  it('plain, honest words: no health or money promises, no medical advice, no sums in money templates', () => {
    for (const e of TEMPLATE_CATALOGUE) for (const word of BANNED) expect(textOf(e), e.id).not.toMatch(word);
    for (const e of TEMPLATE_CATALOGUE.filter(x => x.area === 'money')) expect(textOf(e), e.id).not.toMatch(/[$€£]|\b(usd|eur|gbp)\b|\d+\s?%|\d[\d,.]*\s?(k|thousand|million)\b/i);
    for (const t of LIBRARY_HABITS.filter(x => x.group === 'money')) { expect(t.measurement?.kind, t.id).toBe('boolean'); expect(`${t.title} ${t.note}`, t.id).not.toMatch(/\d/); }
    // the check itself catches the promises it is for
    for (const promise of ['Lose 10 kg in a month', 'Get rich', 'Guaranteed results', 'A juice detox', 'Cure your back pain']) expect(BANNED.some(w => w.test(promise)), promise).toBe(true);
  });

  it('search: every word, any case or accent, within a kind and an area; areas offered per kind', () => {
    expect(searchCatalogue('CHESS', {kind: 'goal'}).map(e => e.id)).toEqual(expect.arrayContaining(['goal:chess-rating', 'goal:chess-tournament']));
    expect(searchCatalogue('', {kind: 'goal', area: 'chess'}).every(e => e.kind === 'goal' && e.area === 'chess')).toBe(true);
    expect(searchCatalogue('sketch', {kind: 'habit'}).map(e => e.id)).toEqual(['habit:sketch']);
    expect(searchCatalogue('creativity', {kind: 'habit'}).length).toBe(LIBRARY_HABITS.filter(t => t.group === 'creativity').length);
    expect(searchCatalogue('café')).toEqual(searchCatalogue('cafe'));
    expect(searchCatalogue('nothing matches this at all')).toEqual([]);
    expect(catalogueAreasFor('habit').map(a => a.id)).not.toContain('fun');
    expect(catalogueAreasFor('goal').map(a => a.id)).toEqual(CATALOGUE_AREAS.map(a => a.id));
    expect(catalogueAreaOfGoal(templateById('sleep-7h')!)).toBe('sleep');
    expect(catalogueAreaOfGoal(templateById('emergency-fund')!)).toBe('money');
  });
});
