import {expect, it} from 'vitest';
import {PROGRAMME_TITLES, programmeHref, type ProgrammeId} from './programme-titles';
import {GUIDED_PROGRAMS, programById} from './programs';

it('the literal titles equal the programmes’ own, one for each written programme', () => {
  expect(Object.keys(PROGRAMME_TITLES).sort()).toEqual(GUIDED_PROGRAMS.filter(p => p.days).map(p => p.id).sort());
  for (const [id, title] of Object.entries(PROGRAMME_TITLES)) expect(programById(id)?.title, id).toBe(title);
  expect(programmeHref('run-5k' as ProgrammeId)).toBe('/app/guided?programme=run-5k');
});
