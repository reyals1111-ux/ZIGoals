import {describe, expect, it} from 'vitest';
import {showcaseSources} from '../../ai/tools/fixtures';
import {readAkToolSources} from '../../ai/tools/ak-sources';
import {readNovaToolSources} from '../../ai/tools/nova-sources';
import type {ToolSources} from '../../ai/tools/env';
import {buildShowcase} from '../../showcase-data';
import {lineData, stageLine} from './lines';
import {lineDays, nlLogDay, nlMonth, nlShortDate, nlWeekDay} from './nl-dates';

/**
 * Session AV lane 2 (loose ends): NOVA's Dutch widget captions write their days the Dutch way ("di 1 dec", "13 okt",
 * "november 2026"), as NOVA's Dutch answers do; the English captions are unchanged. The Showcase on 11 November 2026.
 */
const DAY = '2026-11-11', NOW = new Date(`${DAY}T14:05:00Z`);
const RECORDS = buildShowcase(DAY, 'UTC').records, get = {getItem: (k: string) => RECORDS[k] ?? null};
const sources = (): ToolSources => ({...showcaseSources(DAY), now: NOW, ak: readAkToolSources(get), nova: readNovaToolSources(get)});
const DATA = lineData(sources(), () => true)!;
const line = (id: string, lang: 'en' | 'nl', params?: Parameters<typeof stageLine>[1]) => stageLine(id, params, DATA, lang, NOW);
const ENGLISH_DAY = /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

describe('the Dutch writers of a caption’s days', () => {
  it('write a day, a date, a logged day and a month the Dutch way, with the year only in another year', () => {
    expect(nlWeekDay('2026-12-01', DAY)).toBe('di 1 dec');
    expect(nlWeekDay('2027-01-05', DAY)).toBe('di 5 jan 2027');
    expect(nlWeekDay('2026-11-11', null)).toBe('wo 11 nov 2026');
    expect(nlShortDate('2026-10-13', DAY)).toBe('13 okt');
    expect(nlShortDate('2025-03-02', DAY)).toBe('2 mrt 2025');
    expect(nlShortDate('2027-04-10', null)).toBe('10 apr 2027');
    expect(nlShortDate('2026-11-09T10:00:00.000Z', DAY)).toBe('9 nov');
    expect([nlLogDay(DAY, DAY), nlLogDay('2026-11-10', DAY), nlLogDay('2026-11-02', DAY)]).toEqual(['vandaag', 'gisteren', '2 nov']);
    expect([nlMonth('2026-07'), nlMonth('2028-04'), nlMonth('2026-11')]).toEqual(['juli 2026', 'april 2028', 'november 2026']);
    expect(lineDays('nl')('2026-10-20', DAY)).toBe('di 20 okt');
    expect(lineDays('en')('2026-10-20', DAY)).toBe('Tue, Oct 20');
  });
});

describe('NOVA’s Dutch widget captions write Dutch days; the English ones are as they were', () => {
  it('bills, weight, net worth, the time and the tasks calendar', () => {
    expect(line('bills', 'en')).toBe('Next bill: Rent, €950.00, due in 20 days (Tue, Dec 1); 3 more after it.');
    expect(line('bills', 'nl')).toBe('Volgende rekening: Rent, €950.00, over 20 dagen (di 1 dec); daarna nog 3.');
    expect(line('bill-dial', 'nl')).toBe('Rent: €950.00, over 20 dagen (di 1 dec).');
    expect(line('weight', 'en')).toMatch(/since Oct 13\.$/);
    expect(line('weight', 'nl')).toMatch(/lager dan op 13 okt\.$/);
    expect(line('time', 'nl')).toMatch(/^Het is .+, wo 11 nov 2026; nog /);
    expect(line('time', 'en')).toMatch(/, Wed, Nov 11, 2026; /);
    expect(line('tasks-calendar', 'nl')).toMatch(/^Taken in november 2026: /);
    expect(line('tasks-calendar', 'en')).toMatch(/^Tasks in Nov 2026: /);
    expect(line('goal-dates', 'nl')).toBe('De eerstvolgende streefdatum is 10 apr 2027: Japan adventure, over 150 dagen.');
  });
  it('a period said in a caption writes its days the Dutch way', () => {
    const since = {period: 'since:2026-10-20'};
    expect(line('spending-ranks', 'nl', since)).toMatch(/ uitgegeven sinds di 20 okt; /);
    expect(line('spending-ranks', 'en', since)).toMatch(/ spent since Tue, Oct 20; /);
    expect(line('water-days', 'nl', since)).toMatch(/ dagen sinds di 20 okt, /);
  });
  it('no Dutch caption the summon lines write themselves names an English day', () => {
    for (const id of ['money', 'bills', 'weight', 'net-worth', 'time', 'bill-timeline', 'bill-dial', 'bill-calendar', 'goal-dates', 'spending-heat', 'net-worth-river', 'tasks-calendar', 'fasting-windows', 'body-scan']) {
      const text = line(id, 'nl');
      if (text) expect(text, id).not.toMatch(ENGLISH_DAY);
    }
  });
});
