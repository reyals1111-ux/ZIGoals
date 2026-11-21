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

/**
 * Session AV (1c, q1 #2, fresh-agent review): "uur" is a length unless it follows "om", sits next to a day or is past 12;
 * "van de maand", "voor N min" and "het weekend" leave nothing behind; the common Dutch day parts, "half 10", "kwart
 * over 3", short weekdays, the Belgian "18u30" and "om de week" are read.
 */
const pick = (o: object, ...keys: string[]) => Object.fromEntries(keys.map(k => [k, (o as Record<string, unknown>)[k]]));
describe('Session AV (1c): Dutch lengths, leftovers and common phrases', () => {
  it.each([
    ['Rapport schrijven 2 uur', 'Rapport schrijven', 120],
    ['Rapport schrijven voor 2 uur', 'Rapport schrijven', 120],
    ['Lezen 1 uur 30', 'Lezen', 90],
    ['Les 1,5 uur', 'Les', 90],
    ['Een half uur lezen', 'lezen', 30],
    ['Ruimen een kwartier', 'Ruimen', 15],
    ['Sporten anderhalf uur', 'Sporten', 90],
    ['Read for 1.5 hours', 'Read', 90],
  ])('a length: %s', (line, title, minutes) => {
    const out = p(line);
    expect([out.title, out.minutes, out.time]).toEqual([title, minutes, undefined]);
  });
  it('"uur" stays a clock after "om", next to a day and past 12', () => {
    expect(pick(p('Was ophangen vandaag om 9 uur'), 'time', 'minutes')).toEqual({time: '09:00', minutes: undefined});
    expect(pick(p('Feest morgen 9 uur'), 'title', 'due', 'time', 'minutes')).toEqual({title: 'Feest', due: '2026-11-24', time: '09:00', minutes: undefined});
    expect(pick(p('Meeting 20 uur'), 'title', 'time', 'minutes')).toEqual({title: 'Meeting', time: '20:00', minutes: undefined});
    expect(pick(p('Om 1 uur lunch'), 'title', 'time', 'minutes')).toEqual({title: 'lunch', time: '13:00', minutes: undefined});
  });
  it('no leftovers: "van de maand", "voor N minuten", "in het weekend"', () => {
    expect(p('Huur elke 1e van de maand')).toMatchObject({title: 'Huur', recur: {every: 'month', monthDay: 1}});
    expect(p('Elke tweede dinsdag van de maand')).toMatchObject({title: '', recur: {every: 'month', nth: {n: 2, weekday: 2}}});
    expect(p('Huur elke maand op de 1e van de maand')).toMatchObject({title: 'Huur', recur: {every: 'month', monthDay: 1}});
    expect(p('Bellen morgen 9:00 voor 15 minuten')).toMatchObject({title: 'Bellen', due: '2026-11-24', time: '09:00', minutes: 15});
    expect(p('Klussen in het weekend')).toMatchObject({title: 'Klussen', due: '2026-11-28'});
  });
  it.each([
    ['Bel om half 10', 'Bel', '2026-11-23', '09:30'],
    ['Koffie kwart over 3', 'Koffie', '2026-11-23', '15:15'],
    ['Koffie kwart voor 3', 'Koffie', '2026-11-23', '14:45'],
    ['Sporten vanmiddag', 'Sporten', '2026-11-23', '14:00'],
    ['Yoga vanochtend', 'Yoga', '2026-11-23', '09:00'],
    ['Bellen morgenochtend', 'Bellen', '2026-11-24', '09:00'],
    ["Lezen 's avonds", 'Lezen', '2026-11-23', '20:00'],
    ['Afspraak op do', 'Afspraak', '2026-11-26', undefined],
    ['Vergadering vr 10:00', 'Vergadering', '2026-11-27', '10:00'],
    ['Bellen 18u30', 'Bellen', '2026-11-23', '18:30'],
    ['Bellen 9u', 'Bellen', '2026-11-23', '09:00'],
  ])('common Dutch: %s', (line, title, due, time) => {
    expect(pick(p(line), 'title', 'due', 'time')).toEqual({title, due, time});
  });
  it('repeats: elke ochtend, elke ma en do, om de week; "do" and "zo" as words stay text', () => {
    expect(p('Wandelen elke ochtend')).toMatchObject({title: 'Wandelen', time: '09:00', recur: {every: 'day', interval: 1}});
    expect(p('Sport elke ma en do').recur).toEqual({every: 'week', interval: 1, weekdays: [1, 4]});
    expect(p('Afval om de week').recur).toEqual({every: 'week', interval: 2});
    expect(pick(p('Zo snel mogelijk'), 'title', 'due')).toEqual({title: 'Zo snel mogelijk', due: undefined});
    expect(pick(p('Ik do mijn best'), 'title', 'due')).toEqual({title: 'Ik do mijn best', due: undefined});
  });
});
