import {describe, expect, it} from 'vitest';
import {defaultGoalArt, goalArt} from './goal-art';

// Session AL (DV-022a, D-208, BUG-019, L-066; P-DV-63/P-DVR-28): one fitting artwork per goal, the person's choice first.
describe('goal art', () => {
  it('a default that fits the goal, never the same banner for all', () => {
    expect(defaultGoalArt({name: 'Run a 10K', scene: 'mountains'})).toBe('track');
    expect(defaultGoalArt({name: 'Read 12 books', scene: 'horizon'})).toBe('library');
    expect(defaultGoalArt({name: 'Holiday fund', scene: 'mountains'})).toBe('sailboat');
    expect(defaultGoalArt({name: 'Emergency fund', scene: 'garden'})).toBe('treasure');
    expect(defaultGoalArt({name: 'Something else', scene: 'aurora'})).toBe('aurora');
  });
  it('the person\'s choice wins in every view; an unknown stored value falls back', () => {
    expect(goalArt({name: 'Run a 10K', scene: 'mountains'}, 'kitchen')).toBe('kitchen');
    expect(goalArt({name: 'Run a 10K', scene: 'mountains'}, 'not-an-art')).toBe('track');
    expect(goalArt({name: 'Run a 10K', scene: 'mountains'}, null)).toBe('track');
  });
});
