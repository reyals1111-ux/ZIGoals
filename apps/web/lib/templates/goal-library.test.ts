import {describe, expect, it} from 'vitest';
import {GOAL_LIBRARY, LIBRARY_AREAS, searchTemplates, templateById} from './goal-library';
import {BUILT_IN_AREAS} from '../goal-extras/store';

describe('G6 template library (Session AA-Cloud Part 2)', () => {
  it('holds 40 or more templates, at least five in every life area, each id unique', () => {
    expect(GOAL_LIBRARY.length).toBeGreaterThanOrEqual(40);
    expect(new Set(GOAL_LIBRARY.map(t => t.id)).size).toBe(GOAL_LIBRARY.length);
    for (const area of BUILT_IN_AREAS) expect(GOAL_LIBRARY.filter(t => t.area === area.id).length).toBeGreaterThanOrEqual(5);
    expect([...LIBRARY_AREAS].sort()).toEqual(BUILT_IN_AREAS.map(a => a.id).sort());
  });
  it('a money template never suggests a sum, a rate or a currency amount', () => {
    for (const t of GOAL_LIBRARY.filter(x => x.area === 'wealth')) {
      const words = [t.title, t.summary, ...(t.milestones ?? [])].join(' ');
      expect(words).not.toMatch(/[$€£]|\b(usd|eur)\b|\d+\s?%|\d[\d,.]*\s?(k|thousand|million)\b/i);
    }
  });
  it('each kind carries what it needs: averages a target, projects milestones', () => {
    for (const t of GOAL_LIBRARY) {
      if (t.kind === 'average') expect(t.average && t.average.target > 0).toBe(true);
      if (t.kind === 'project') expect(t.milestones?.length).toBeGreaterThanOrEqual(2);
    }
    expect(templateById('run-10k')?.title).toBe('Run a 10K');
  });
  it('search matches every word across title, summary, keywords and milestones, accents ignored, within an area', () => {
    expect(searchTemplates('10k').map(t => t.id)).toEqual(['run-10k']);
    expect(searchTemplates('sleep').map(t => t.id)).toContain('sleep-7h');
    expect(searchTemplates('emergency fund').map(t => t.id)).toEqual(['emergency-fund']);
    expect(searchTemplates('dutch').map(t => t.id)).toEqual(['language']);
    expect(searchTemplates('', 'fun').every(t => t.area === 'fun')).toBe(true);
    expect(searchTemplates('nothing-matches-this')).toEqual([]);
  });
});
