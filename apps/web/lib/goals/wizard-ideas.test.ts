import {describe, expect, it} from 'vitest';
import {WIZARD_IDEAS} from './wizard-ideas';
import {GOAL_LIBRARY, templateById, templateNumberIssue, withTemplateNumber} from '../templates/goal-library';

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

// Session AO (DV-053c): the chess idea asks for the rating in its own field; the number fills the last step's title.
describe('a template number (chess rating)', () => {
  const t = templateById('chess-rating')!, spec = t.number!, steps = t.milestones!.join('\n');
  it('the chess template and its wizard idea carry a whole-number field from 400 to 3000', () => {
    expect(spec).toMatchObject({label: 'Target rating', min: 400, max: 3000});
    expect(WIZARD_IDEAS.find(i => i.id === 'chess-rating')).toMatchObject({number: spec, templateLast: 'Reach my target rating'});
    expect(templateNumberIssue(spec, '1500')).toBeNull();
    expect(templateNumberIssue(spec, ' 400 ')).toBeNull();
    expect(templateNumberIssue(spec, '3000')).toBeNull();
    for (const typed of ['', '399', '3001', '1500.5', '1,500', '-1500', 'abc']) expect(templateNumberIssue(spec, typed), typed).toBe('Enter a whole number from 400 to 3000.');
  });
  it('fills the last step, replaces an earlier number, and keeps a last step the person rewrote', () => {
    const once = withTemplateNumber(steps, spec, 1500, 'Reach my target rating');
    expect(once).toBe('Play 20 rated games\nReview 10 of my games\nReach a rating of 1500');
    expect(withTemplateNumber(once, spec, 1800, 'Reach my target rating')).toBe('Play 20 rated games\nReview 10 of my games\nReach a rating of 1800');
    expect(withTemplateNumber(`${steps}\n\n`, spec, 1200, 'Reach my target rating').split('\n').filter(Boolean).at(-1)).toBe('Reach a rating of 1200');
    expect(withTemplateNumber('Play 20 rated games\nWin a club game', spec, 1500, 'Reach my target rating')).toBe('Play 20 rated games\nWin a club game\nReach a rating of 1500');
    expect(withTemplateNumber('', spec, 1500)).toBe('Reach a rating of 1500');
  });
});
