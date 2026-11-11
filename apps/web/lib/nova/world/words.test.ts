import {describe, expect, test} from 'vitest';
import forecast from './fixtures/forecast-brussels.json';
import symbols from './fixtures/symbol-codes.json';
import {MET_CREDIT, parseForecast} from './met';
import {UMBRELLA_HOURS, clockTime, degrees, umbrella, weatherSentence} from './words';

// Session AM (ADR-038 D12–D15): the weather in words. Built from the real reading of the fixture and from small ones.
const ZONE = 'Europe/Brussels';
const reading = parseForecast(forecast, {lat: 50.85, lon: 4.35}, new Date('2026-11-11T04:35:00Z'), ZONE);
const at = (t: number, symbol: string, time = '2026-11-11T13:00:00.000Z') => ({now: {at: time, t, symbol}});
const hourly = (precips: Array<number | undefined>, symbol = 'rain') => {
  const steps = precips.map((precip, i) => ({at: new Date(Date.parse('2026-11-11T13:00:00Z') + i * 3_600_000).toISOString(), t: 9, symbol, ...(precip === undefined ? {} : {precip})}));
  return {now: steps[0]!, hours: steps.slice(1)};
};

describe('one sentence about now', () => {
  test('the place, the temperature, the sky, then the source and the reading\'s time', () => {
    expect(weatherSentence(reading, {name: 'Brussels'}, 'en', 'celsius', ZONE)).toBe('In Brussels it is 7° and cloudy. Data from MET Norway, 05:00.');
    expect(weatherSentence(reading, {name: 'Brussel'}, 'nl', 'celsius', ZONE)).toBe('In Brussel is het 7° en bewolkt. Gegevens van MET Norway, 05:00.');
    expect(weatherSentence(at(12.4, 'lightrain'), {name: 'Brussels'}, 'en', 'celsius', ZONE)).toBe('In Brussels it is 12° with light rain. Data from MET Norway, 14:00.');
    expect(weatherSentence(at(12.4, 'lightrain'), {name: 'Brussel'}, 'nl', 'celsius', ZONE)).toBe('In Brussel is het 12° met lichte regen. Gegevens van MET Norway, 14:00.');
    expect(weatherSentence(at(21, 'clearsky_day'), {name: 'Home'}, 'en', 'celsius', ZONE)).toBe('In Home it is 21° and clear. Data from MET Norway, 14:00.');
    expect(weatherSentence(at(3, 'fog'), {name: 'Ghent'}, 'en', 'celsius', ZONE)).toBe('In Ghent it is 3° and foggy. Data from MET Norway, 14:00.');
    expect(weatherSentence(at(3, 'fog'), {name: 'Gent'}, 'nl', 'celsius', ZONE)).toBe('In Gent is het 3° en mistig. Gegevens van MET Norway, 14:00.');
    expect(weatherSentence(at(-2.6, 'heavysnowshowersandthunder_night'), {name: 'Oslo'}, 'en', 'celsius', ZONE)).toBe('In Oslo it is -3° with heavy snow showers and thunder. Data from MET Norway, 14:00.');
    expect(weatherSentence(at(18, 'partlycloudy_night'), {name: 'Lisbon'}, 'nl', 'celsius', ZONE)).toBe('In Lisbon is het 18° en half bewolkt. Gegevens van MET Norway, 14:00.');
  });
  test('the time is the device\'s clock; the defaults are English and Celsius', () => {
    expect(weatherSentence(at(25, 'fair_day'), {name: 'New York'}, 'en', 'celsius', 'America/New_York')).toBe('In New York it is 25° and fair. Data from MET Norway, 08:00.');
    expect(weatherSentence(at(25, 'fair_day'), {name: 'New York'})).toMatch(/^In New York it is 25° and fair\. Data from MET Norway, \d{2}:\d{2}\.$/);
    expect(clockTime('2026-11-11T13:05:00.000Z', 'UTC')).toBe('13:05'); expect(clockTime('2026-07-11T22:30:00.000Z', ZONE)).toBe('00:30');
    expect(clockTime('2026-11-11T13:05:00.000Z', 'Nowhere/Nothing')).toBe('13:05'); expect(clockTime('never')).toBe('');
  });
  test('a symbol that is missing or unknown claims nothing about the sky', () => {
    expect(weatherSentence(at(12, ''), {name: 'Brussels'}, 'en', 'celsius', ZONE)).toBe('In Brussels it is 12°. Data from MET Norway, 14:00.');
    expect(weatherSentence(at(12, 'hail'), {name: 'Brussel'}, 'nl', 'celsius', ZONE)).toBe('In Brussel is het 12°. Gegevens van MET Norway, 14:00.');
  });
  test('every symbol of the service\'s list makes a whole sentence that names the source, in both languages', () => {
    for (const code of symbols.codes) {
      expect(weatherSentence(at(9, code), {name: 'Brussels'}, 'en', 'celsius', ZONE), code).toMatch(/^In Brussels it is 9° (and|with) [a-z ]+\. Data from MET Norway, 14:00\.$/);
      expect(weatherSentence(at(9, code), {name: 'Brussel'}, 'nl', 'celsius', ZONE), code).toMatch(/^In Brussel is het 9° (en|met) [a-z ]+\. Gegevens van MET Norway, 14:00\.$/);
    }
    expect(weatherSentence(reading, {name: 'Brussels'}, 'en', 'celsius', ZONE)).toContain(MET_CREDIT);
  });
  test('whole degrees, and never "-0"', () => {
    expect([12.4, 12.5, -2.6, -0.4, 0, 0.4, 37].map(t => degrees(t))).toEqual(['12°', '13°', '-3°', '0°', '0°', '0°', '37°']);
  });
});

describe('will it rain?', () => {
  test('the real reading: the amounts of the next six hours added up, said as what the forecast shows', () => {
    expect(umbrella(reading)).toEqual({expected: true, mm: 0.6, hours: 6, words: 'The forecast shows rain in the next 6 hours, about 0.6 mm. An umbrella may be useful.'});
    expect(umbrella(reading, 'nl')).toEqual({expected: true, mm: 0.6, hours: 6, words: 'De verwachting toont regen in de komende 6 uur, ongeveer 0,6 mm. Een paraplu kan van pas komen.'});
    expect(UMBRELLA_HOURS).toBe(6);
  });
  test('only the six hours from the reading\'s time count', () => {
    expect(umbrella(hourly([0, 0, 0, 0, 0, 0, 5, 5]))).toEqual({expected: false, mm: 0, hours: 6, words: 'The forecast shows no rain or snow in the next 6 hours.'});
    expect(umbrella(hourly([0, 0, 0, 0, 0, 0, 5, 5]), 'nl').words).toBe('De verwachting toont geen regen of sneeuw in de komende 6 uur.');
    expect(umbrella(hourly([0, 0, 0, 0, 0, 1.25, 5]))).toMatchObject({expected: true, mm: 1.3});
    // A trace is not rain.
    expect(umbrella(hourly([0.01, 0.02, 0, 0, 0, 0]))).toMatchObject({expected: false, mm: 0});
    expect(umbrella(hourly([0.1, 0, 0, 0, 0, 0]))).toMatchObject({expected: true, mm: 0.1});
  });
  test('snow and sleet are named; an umbrella is only suggested for what it helps against', () => {
    expect(umbrella(hourly([0.5, 0.5, 0, 0, 0, 0], 'heavysnow')).words).toBe('The forecast shows snow in the next 6 hours, about 1 mm.');
    expect(umbrella(hourly([0.5, 0.5, 0, 0, 0, 0], 'heavysnow'), 'nl').words).toBe('De verwachting toont sneeuw in de komende 6 uur, ongeveer 1 mm.');
    expect(umbrella(hourly([0.5, 0, 0, 0, 0, 0], 'sleetshowers_day')).words).toBe('The forecast shows sleet in the next 6 hours, about 0.5 mm. An umbrella may be useful.');
    expect(umbrella(hourly([0.5, 0, 0, 0, 0, 0], 'sleetshowers_day'), 'nl').words).toBe('De verwachting toont natte sneeuw in de komende 6 uur, ongeveer 0,5 mm. Een paraplu kan van pas komen.');
    expect(umbrella(hourly([2, 0, 0, 0, 0, 0], 'rainshowersandthunder_day')).words).toBe('The forecast shows rain in the next 6 hours, about 2 mm. An umbrella may be useful.');
  });
  test('a reading without amounts does not say; it is never read as dry', () => {
    expect(umbrella(hourly([undefined, undefined, undefined]))).toEqual({expected: null, mm: null, hours: 0, words: 'The forecast does not say if rain is expected in the next 6 hours.'});
    expect(umbrella(hourly([undefined]), 'nl').words).toBe('De verwachting zegt niet of er regen komt in de komende 6 uur.');
    expect(umbrella({now: {at: '2026-11-11T13:00:00.000Z', t: 9, symbol: ''}, hours: []}).expected).toBeNull();
    // Amounts for some of the hours only: the sentence names the hours it knows.
    expect(umbrella(hourly([0, undefined, 0]))).toEqual({expected: false, mm: 0, hours: 2, words: 'The forecast shows no rain or snow in the next 2 hours.'});
    expect(umbrella(hourly([0.4]))).toEqual({expected: true, mm: 0.4, hours: 1, words: 'The forecast shows rain in the next hour, about 0.4 mm. An umbrella may be useful.'});
    expect(umbrella(hourly([0.4]), 'nl').words).toBe('De verwachting toont regen in het komende uur, ongeveer 0,4 mm. Een paraplu kan van pas komen.');
  });
  test('a forecast, never a promise', () => {
    for (const lang of ['en', 'nl'] as const) for (const r of [reading, hourly([0, 0, 0, 0, 0, 0]), hourly([undefined]), hourly([3, 3, 3], 'heavysnow')]) {
      const words = umbrella(r, lang).words;
      expect(words, words).toMatch(lang === 'en' ? /^The forecast (shows|does not say)/ : /^De verwachting (toont|zegt niet)/);
      expect(words, words).not.toMatch(/\b(will|zal|gaat|blijft|certain|zeker|guarantee|garant)/i);
    }
  });
});
