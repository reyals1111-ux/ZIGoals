import {expect, test} from 'vitest';
import {emptyHabitExtras, habitExtrasSchema} from '../habits-extras/schema';
import {habitIntention, habitWhy, intentionLine, setHabitIntention} from './intentions';

test('AL-COMPETITOR-GAP-100: a habit keeps its own why; editing when and where never clears it; Clear does', () => {
  let r = setHabitIntention(emptyHabitExtras(), 'h1', {why: '  So I have\nenergy  for the kids '});
  expect(habitWhy(r, 'h1')).toBe('So I have energy for the kids');
  expect(intentionLine('Walk', habitIntention(r, 'h1'))).toBeNull();
  r = setHabitIntention(r, 'h1', {when: 'after lunch', where: 'around the block'});
  expect(habitIntention(r, 'h1')).toEqual({when: 'after lunch', where: 'around the block', why: 'So I have energy for the kids'});
  r = setHabitIntention(r, 'h1', {when: 'after lunch', where: '', why: ''});
  expect(habitIntention(r, 'h1')).toEqual({when: 'after lunch'});
  r = setHabitIntention(r, 'h1', {why: 'x'.repeat(200)});
  expect(habitWhy(r, 'h1')).toHaveLength(160);
  r = setHabitIntention(r, 'h1', null);
  expect(habitIntention(r, 'h1')).toBeNull();
  // Additive in the loose record: an older record reads, and a why with a control character is refused.
  expect(habitExtrasSchema.safeParse({version: 1, intentions: {h1: {when: 'x'}}}).success).toBe(true);
  expect(habitExtrasSchema.safeParse({version: 1, intentions: {h1: {why: 'a\u0007b'}}}).success).toBe(false);
});
