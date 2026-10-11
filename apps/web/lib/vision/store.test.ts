import {describe, expect, it} from 'vitest';
import {COMPRESSION_STEPS, VISION, fitSize, newImageId} from './store';

describe('vision photos (Session AA-Cloud Part 2)', () => {
  it('fits the longest side, keeps the aspect, never enlarges', () => {
    expect(fitSize(4032, 3024)).toEqual({width: 1600, height: 1200});
    expect(fitSize(3024, 4032)).toEqual({width: 1200, height: 1600});
    expect(fitSize(800, 600)).toEqual({width: 800, height: 600});
    expect(fitSize(10000, 10, 1600)).toEqual({width: 1600, height: 2});
    expect(() => fitSize(0, 10)).toThrow('no size');
  });
  it('limits: 300 kB a photo, 30 MB in all, steps that only get smaller', () => {
    expect(VISION.maxBytes).toBe(300_000);
    expect(VISION.totalBytes).toBe(30_000_000);
    for (let i = 1; i < COMPRESSION_STEPS.length; i++) {
      expect(COMPRESSION_STEPS[i]!.quality).toBeLessThanOrEqual(COMPRESSION_STEPS[i - 1]!.quality);
      expect(COMPRESSION_STEPS[i]!.maxSide).toBeLessThanOrEqual(COMPRESSION_STEPS[i - 1]!.maxSide);
    }
  });
  it('image ids match the goal-extras schema', () => {
    expect(newImageId()).toMatch(/^img-[0-9a-f-]{36}$/);
    expect(newImageId().length).toBeLessThanOrEqual(64);
  });
});
