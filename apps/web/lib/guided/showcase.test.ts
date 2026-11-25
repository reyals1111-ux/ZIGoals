import {expect, it} from 'vitest';
import {showcaseGuidedJourneys} from './showcase';
import {GUIDED_JOURNEYS_KEY, guidedJourneysSchema} from './schema';
import {programById} from './programs';
import {dayProgress, journeyState, programmeToday, progressLine} from './engine';
import {buildShowcase} from '../showcase-data';

it('the Showcase has one labelled programme in progress: today is run 4, its warm-up ticked', () => {
  const r = showcaseGuidedJourneys('2026-11-17'), j = r.journeys[0]!, run = programById('run-5k')!;
  expect(guidedJourneysSchema.parse(r)).toEqual(r);
  expect(j).toMatchObject({programId: 'run-5k', startedOn: '2026-11-10', showcase: true});
  for (const id of j.done) expect(run.days!.some(d => d.id === id), id).toBe(true);
  expect(programmeToday(j, run, '2026-11-17')).toMatchObject({kind: 'day', number: 4, day: {id: 'w2-r1'}});
  expect(dayProgress(j, run.days![3]!)).toEqual({done: 1, total: 4});
  expect(journeyState(j, run, '2026-11-17').doneCount).toBe(3);
  expect(progressLine(j, run, '2026-11-17')).toBe('Week 2 of 8 · 3 of 24 runs done');
  expect(JSON.parse(buildShowcase('2026-11-17', 'UTC').records[GUIDED_JOURNEYS_KEY]!)).toEqual(r);
});
