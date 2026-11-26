import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {AW_PROGRAMMES_JOURNEY_FIELDS, AW_PROGRAMMES_NEW_KEYS, AW_PROGRAMMES_RECORD_KEY} from './aw-programmes-keys';
import {AJ_PERSONAL_KEYS} from './aj-device-keys';
import {EVERYTHING_KEYS} from './export/everything';
import {GUIDED_JOURNEYS_KEY, MAX_DONE, MAX_STEPS_DONE, guidedJourneySchema, guidedJourneysSchema} from './guided/schema';
import {GUIDED_PROGRAMS} from './guided/programs';

/** The Guided journeys schema exactly as builds #37–#59 shipped it (Session AJ), to prove they still read this build's record. */
const olderSlug = z.string().regex(/^[a-z0-9-]{1,60}$/);
const olderSchema = z.looseObject({version: z.literal(1), journeys: z.array(z.looseObject({programId: olderSlug, startedOn: z.iso.date(), done: z.array(olderSlug).max(50), endedOn: z.iso.date().optional()})).max(20)});

describe('Session AW (programmes): stored data', () => {
  it('the literals equal the owners’ constants; the record is the registered Guided journeys key; no new key', () => {
    expect(AW_PROGRAMMES_RECORD_KEY).toBe(GUIDED_JOURNEYS_KEY);
    expect(AJ_PERSONAL_KEYS).toContain(AW_PROGRAMMES_RECORD_KEY);
    expect(EVERYTHING_KEYS).toContain(AW_PROGRAMMES_RECORD_KEY);
    expect(AW_PROGRAMMES_NEW_KEYS).toEqual([]);
    const shape = Object.keys(guidedJourneySchema.shape);
    for (const field of AW_PROGRAMMES_JOURNEY_FIELDS) expect(shape).toContain(field);
    expect(guidedJourneySchema.shape.stepsDone.safeParse(undefined).success).toBe(true);
    expect(guidedJourneySchema.shape.showcase.safeParse(undefined).success).toBe(true);
  });
  it('an older build (#37–#59) reads a record with programme progress, and its own write keeps the new fields', () => {
    const record = {version: 1 as const, journeys: [
      {programId: 'run-5k', startedOn: '2026-11-10', done: ['w1-r1', 'w1-r2', 'w1-r3'], stepsDone: ['w2-r1/warm-up'], showcase: true as const},
      {programId: 'sleep-reset', startedOn: '2026-11-12', done: ['log'], stepsDone: ['wake/light']},
    ]};
    expect(guidedJourneysSchema.parse(record)).toEqual(record);
    const old = olderSchema.parse(JSON.parse(JSON.stringify(record)));
    expect(old).toEqual(record);
    // An older build's tick spreads the journey (lib/guided/engine.ts `markDone`): the new fields stay.
    const written = {...old, journeys: old.journeys.map(j => j.programId === 'sleep-reset' ? {...j, done: [...j.done, 'wake']} : j)};
    expect(guidedJourneysSchema.parse(written).journeys[1]).toMatchObject({stepsDone: ['wake/light'], done: ['log', 'wake']});
  });
  it('no programme has more days than an older build’s 50 done ids', () => {
    for (const p of GUIDED_PROGRAMS) expect(p.steps.length, p.id).toBeLessThanOrEqual(MAX_DONE);
  });
  // Session AW (programmes, deliberate): review b1 m6 made `stepsDone` tolerant (.catch): a malformed or overlong list is
  // left out, never the whole journey or record. Equally strict: exactly the list is dropped, everything else kept as read.
  it('leaves out a malformed or overlong step list, keeping the journey; refuses a showcase flag that is not true', () => {
    const j = {programId: 'run-5k', startedOn: '2026-11-10', done: ['w1-r1']};
    for (const bad of [['no slash'], Array.from({length: MAX_STEPS_DONE + 1}, (_, i) => `d${i}/s`), 'w1-r2/warm-up']) {
      const r = guidedJourneySchema.safeParse({...j, stepsDone: bad});
      expect(r.success).toBe(true);
      expect(r.data).toEqual(j);
      expect(r.data!.stepsDone).toBeUndefined();
    }
    expect(guidedJourneySchema.parse({...j, stepsDone: ['w1-r2/warm-up']})).toEqual({...j, stepsDone: ['w1-r2/warm-up']});
    expect(guidedJourneySchema.safeParse({programId: 'run-5k', startedOn: '2026-11-10', done: [], showcase: false}).success).toBe(false);
  });
});
