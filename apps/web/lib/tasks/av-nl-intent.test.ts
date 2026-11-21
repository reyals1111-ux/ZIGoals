import {describe, expect, it} from 'vitest';
import {taskIntent} from './intent';

/**
 * Session AV (1c, q1 #2, fresh-agent review; Todoist NL): Dutch to-do lines are tasks in Quick add and for NOVA/ZIGi, with
 * the to-do words cut from the title; "plan mijn dag" asks for a plan, never a task of that name. Monday 23 Nov 2026.
 */
const TODAY = '2026-11-23';
describe('Session AV (1c): Dutch to-do prefixes and verbs', () => {
  it.each([
    ['taak: boodschappen doen', 'boodschappen doen', undefined, undefined],
    ['todo boodschappen doen', 'boodschappen doen', undefined, undefined],
    ['niet vergeten: oma bellen', 'oma bellen', undefined, undefined],
    ['vergeet niet de huur te betalen', 'de huur te betalen', undefined, undefined],
    ['Koop melk vandaag', 'Koop melk', TODAY, undefined],
    ['Bel mama', 'Bel mama', undefined, undefined],
    ['herinner me om de planten water te geven om 20:00', 'de planten water te geven', TODAY, '20:00'],
    ['herinner me eraan om de bank te bellen morgen', 'de bank te bellen', '2026-11-24', undefined],
    ['voeg een taak toe: bel de bank morgen om 9 uur', 'bel de bank', '2026-11-24', '09:00'],
    ['nieuwe taak paspoort verlengen', 'paspoort verlengen', undefined, undefined],
    ['Betaal de rekening vrijdag', 'Betaal de rekening', '2026-11-27', undefined],
  ])('%s', (line, title, due, time) => {
    const got = taskIntent(line, TODAY);
    expect(got?.confidence).toBe('sure');
    expect({title: got?.parsed.title, due: got?.parsed.due, time: got?.parsed.time}).toEqual({title, due, time});
  });
  it('logs and questions stay out; "plan my day" / "plan mijn dag" is not a task', () => {
    for (const line of ['2 glazen water gedronken', 'ontbijt: yoghurt', 'Haal ik mijn spaardoel?', 'plan mijn dag', 'Plan my day', 'plan de week', 'help me plan my day']) expect(taskIntent(line, TODAY), line).toBeNull();
    // "plan" with a real thing to plan stays a to-do.
    expect(taskIntent('plan the trip budget', TODAY)?.parsed.title).toBe('plan the trip budget');
  });
});
