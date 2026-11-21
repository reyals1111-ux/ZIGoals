import {describe, expect, it} from 'vitest';
import {parseTaskLine} from './parse';

/**
 * Session AV (owner follow-up 1, F-NL-TASKS; Todoist's quick add, the rehearsal's Sanne): the task line reads Dutch days,
 * times, repeats and priorities with the same rules as English. Monday 23 November 2026.
 */
const TODAY = '2026-11-23';
const p = (line: string) => parseTaskLine(line, TODAY);

describe('Session AV (F-NL-TASKS): Dutch in the task line', () => {
  it.each([
    ['Bel de tandarts morgen 18:00', 'Bel de tandarts', '2026-11-24', '18:00'],
    ['Boodschappen overmorgen', 'Boodschappen', '2026-11-25', undefined],
    ['Was ophangen vandaag om 9 uur', 'Was ophangen', '2026-11-23', '09:00'],
    ['Huur betalen volgende vrijdag', 'Huur betalen', '2026-11-27', undefined],
    ['Rapport af over 2 weken', 'Rapport af', '2026-12-07', undefined],
    ['Oma bellen op 5 december', 'Oma bellen', '2026-12-05', undefined],
    ['Sporten vanavond', 'Sporten', '2026-11-23', '20:00'],
    ['Factuur sturen om 3 uur', 'Factuur sturen', '2026-11-23', '15:00'],
    ['Belasting eind van de maand', 'Belasting', '2026-11-30', undefined],
  ])('%s', (line, title, due, time) => {
    const out = p(line);
    expect(out.title).toBe(title);
    expect(out.due).toBe(due);
    expect(out.time).toBe(time);
  });
  it('repeats: elke maandag, elke! 3 dagen, elke maand op de 1e, werkdagen, tot and keer', () => {
    expect(p('Planten water geven elke maandag').recur).toEqual({every: 'week', interval: 1, weekdays: [1]});
    expect(p('Vitamines elke! 3 dagen').recur).toEqual({every: 'day', interval: 3, afterDone: true});
    expect(p('Huur elke maand op de 1e').recur).toMatchObject({every: 'month', monthDay: 1});
    expect(p('Stand-up elke werkdag').recur).toEqual({every: 'week', interval: 1, weekdays: [1, 2, 3, 4, 5]});
    expect(p('Hardlopen elke dinsdag en donderdag tot 1 dec').recur).toEqual({every: 'week', interval: 1, weekdays: [2, 4], until: '2026-12-01'});
    expect(p('Fysio elke week 10 keer').recur).toMatchObject({every: 'week', left: 10});
    expect(p('Afval wekelijks').recur).toEqual({every: 'week', interval: 1});
    expect(p('Tandarts elke 2 weken').recur).toEqual({every: 'week', interval: 2});
  });
  it('priorities, projects and labels as in English; the title keeps the Dutch words', () => {
    const out = p('Kado voor mama kopen morgen p1 #Thuis @winkel');
    expect(out).toMatchObject({title: 'Kado voor mama kopen', due: '2026-11-24', level: 1, project: 'Thuis', labels: ['winkel']});
  });
  it('ordinary Dutch words stay text: "over" without a number, "de", "een", "en" in a title', () => {
    expect(p('Praten over het werk').title).toBe('Praten over het werk');
    expect(p('Praten over het werk').due).toBeUndefined();
    expect(p('Brood en melk halen').title).toBe('Brood en melk halen');
    expect(p('Koop een cadeau').title).toBe('Koop een cadeau');
  });
  it('English still reads as before', () => {
    expect(p('call mum tomorrow 6pm')).toMatchObject({title: 'call mum', due: '2026-11-24', time: '18:00'});
    expect(p('Pay rent every month on the 1st p1 #Home').recur).toMatchObject({every: 'month', monthDay: 1});
  });
});
