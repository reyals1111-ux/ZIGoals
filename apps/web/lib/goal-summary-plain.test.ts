import {expect, test} from 'vitest';
import {fundingFact, goalEyebrow} from './goal-summary';
import {pickerCategories} from '../components/platform/asset-picker';

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, FR-1): a newcomer saving for a holiday never meets "Value Goal ·
 * Private allocation", "Funding Wealth · NO PLAN" or a Crypto tab; once the chain is chosen, every word is as it was.
 */
test('the goal page\'s eyebrow in plain words until the chain is chosen', () => {
  const s = (source: string) => ({type: 'Value Goal', source});
  expect(goalEyebrow({type: 'VALUE'}, s('Private allocation'), false)).toBe('Savings goal · Your own plan');
  expect(goalEyebrow({type: 'VALUE'}, s('Future contributions'), false)).toBe('Savings goal · Saving plan');
  expect(goalEyebrow({type: 'VALUE'}, s('Existing wealth'), false)).toBe('Savings goal · Money you have');
  expect(goalEyebrow({type: 'QUANTITY'}, {type: 'Quantity Goal', source: 'Private allocation'}, false)).toBe('Count goal · Your own plan');
  expect(goalEyebrow({type: 'PROJECT'}, {type: 'Project Goal', source: 'Project'}, false)).toBe('Project');
  for (const t of ['VALUE', 'QUANTITY', 'PROJECT'] as const) expect(goalEyebrow({type: t}, s('Private allocation'), false)).not.toMatch(/allocation|Value Goal/i);
  // Session AL fifth pass (DV-018, DV-120): with the chain chosen the kind keeps the card's one name; its source words stay.
  expect(goalEyebrow({type: 'VALUE'}, s('Private allocation'), true)).toBe('Savings goal · Private allocation');
  expect(goalEyebrow({type: 'PROJECT'}, {type: 'Project Goal', source: 'Project'}, true)).toBe('Project');
});
test('the funding fact: "No saving plan yet" until the chain is chosen; "Funding Wealth" after', () => {
  const f = (fundingHealth: string) => ({requiresReview: false, status: 'active' as const, fundingHealth});
  expect(fundingFact(f('NO PLAN'), false)).toEqual({label: 'Saving plan', value: 'No saving plan yet'});
  expect(fundingFact(f('ON TRACK'), false)).toEqual({label: 'Saving plan', value: 'On track'});
  expect(fundingFact(f('NO PLAN'), true)).toEqual({label: 'Funding Wealth', value: 'NO PLAN'});
  expect(fundingFact({requiresReview: true, status: 'active', fundingHealth: 'NO PLAN'}, false).value).toBe('Needs review');
});
test('the asset picker leaves out Crypto and Stablecoins for a person who chose neither, money first', () => {
  expect(pickerCategories(false)).toEqual(['Existing assets', 'Cash', 'Property', 'Stocks', 'ETFs', 'Precious metals', 'Custom']);
  expect(pickerCategories(true)).toEqual(['Existing assets', 'Crypto', 'Stablecoins', 'Stocks', 'ETFs', 'Precious metals', 'Cash', 'Property', 'Custom']);
});
