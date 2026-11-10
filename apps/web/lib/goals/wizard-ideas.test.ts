import {describe, expect, it} from 'vitest';
import {WIZARD_IDEAS} from './wizard-ideas';
import {GOAL_LIBRARY, templateById} from '../templates/goal-library';

// Session AL (DV-083a, DV-176, DV-179, DV-183, DV-039b; P-DV-38/P-DV-40): one source for an idea, its name and steps.
describe('wizard ideas', () => {
  it('each idea is a library template: the button title is the goal name, steps and kind are the library\'s', () => {
    for (const idea of WIZARD_IDEAS) {
      expect(idea.label, idea.id).toBe(idea.name);
      const t = GOAL_LIBRARY.find(x => x.title === idea.name);
      expect(t, idea.id).toBeDefined();
      if (t!.kind === 'project') expect(idea.milestones).toEqual(t!.milestones);
    }
    expect(WIZARD_IDEAS.map(i => i.name)).toEqual(['Emergency fund', 'Holiday fund', 'House deposit', 'Run a 10K', 'Read 12 books', 'Reach a chess rating', 'Learn a language']);
  });
  it('"Read 12 books" is a count goal in books (not ticked milestones), in the wizard and the gallery', () => {
    const read = WIZARD_IDEAS.find(i => i.name === 'Read 12 books')!;
    expect(read).toMatchObject({type: 'QUANTITY', count: {unit: 'books', target: 12}});
    expect(read.milestones).toBeUndefined();
    expect(templateById('read-12')).toMatchObject({kind: 'count', count: {unit: 'books', target: 12}});
  });
  it('template steps read alike and stay short (DV-182, DV-185); the chess template says the rating is written by you (DV-178)', () => {
    for (const t of GOAL_LIBRARY) for (const m of t.milestones ?? []) expect(m.length, `${t.id}: ${m}`).toBeLessThanOrEqual(36);
    expect(templateById('date-nights')?.milestones).toEqual(['3 date nights', '6 date nights', '9 date nights', '12 date nights']);
    expect(templateById('chess-rating')?.summary).toMatch(/rating you choose/);
  });
});
