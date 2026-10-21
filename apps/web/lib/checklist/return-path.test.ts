import {beforeEach, describe, expect, test} from 'vitest';
import {notePath, pathBefore, resetTrail} from './return-path';

describe('the Checklist returns to where the person was (L3b)', () => {
  beforeEach(() => resetTrail());
  test('opened directly: nothing before it', () => {
    notePath('/app/checklist');
    expect(pathBefore('/app/checklist')).toBeNull();
  });
  test('opened from a page in the app: that page', () => {
    for (const p of ['/app', '/app/habits', '/app/checklist']) notePath(p);
    expect(pathBefore('/app/checklist')).toBe('/app/habits');
  });
  test('a repeated route is noted once; the latest visit counts', () => {
    for (const p of ['/app', '/app/checklist', '/app/checklist', '/app/health', '/app/checklist']) notePath(p);
    expect(pathBefore('/app/checklist')).toBe('/app/health');
  });
});
