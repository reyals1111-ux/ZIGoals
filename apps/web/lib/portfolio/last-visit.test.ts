import {expect, test} from 'vitest';
import {VISIT_GAP_MS, readVisits, sinceChange, visitStep} from './last-visit';

// Session AH (WE22): "since your last visit", device-only; fictional figures.
test('the first visit only remembers; a later visit compares with the last one and remembers it as the previous', () => {
  const first = visitStep(undefined, {at: 0, value: '100', currency: 'EUR'});
  expect(first.compare).toBeUndefined();
  const later = visitStep(first.next, {at: VISIT_GAP_MS, value: '110', currency: 'EUR'});
  expect(later.compare).toEqual({at: 0, value: '100', currency: 'EUR'});
  expect(sinceChange(later.compare!, '110')).toEqual({value: '10', pct: '10'});
  // A reload a minute later keeps comparing with the same earlier visit, and stores nothing new.
  const reload = visitStep(later.next, {at: VISIT_GAP_MS + 60_000, value: '111', currency: 'EUR'});
  expect(reload).toEqual({compare: {at: 0, value: '100', currency: 'EUR'}});
});

test('another currency is never compared; a damaged note reads as no note', () => {
  expect(visitStep({at: 0, value: '100', currency: 'USD'}, {at: VISIT_GAP_MS, value: '90', currency: 'EUR'}).compare).toBeUndefined();
  expect(readVisits('{"p":{"at":"x"}}')).toEqual({});
  expect(readVisits('not json')).toEqual({});
  expect(sinceChange({at: 0, value: '0', currency: 'EUR'}, '5')).toEqual({value: '5', pct: undefined});
});
