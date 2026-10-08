import {expect, test} from 'vitest';
import {applyDayCue, dayCue} from './day-cue';
import {parseReply} from './parse';

const TODAY = '2026-10-05'; // a Monday
test('the day a message names for a log, in three languages; none, two, or a day to come give nothing', () => {
  expect(dayCue('Log a glass of water for yesterday', TODAY)).toBe('yesterday');
  expect(dayCue('Noteer twee glazen water voor gisteren', TODAY)).toBe('yesterday');
  expect(dayCue("Hier j'ai bu trois verres d'eau", TODAY)).toBe('yesterday');
  expect(dayCue('Zet hier twee glazen water', TODAY)).toBeNull(); // Dutch "hier" is "here"
  expect(dayCue('I walked 6000 steps the day before yesterday', TODAY)).toBe('2026-10-03');
  expect(dayCue('Eergisteren 7000 stappen', TODAY)).toBe('2026-10-03');
  expect(dayCue('Avant-hier, 9000 pas', TODAY)).toBe('2026-10-03');
  expect(dayCue('On Wednesday I had 10,200 steps', TODAY)).toBe('2026-09-30');
  expect(dayCue('Tick off my walk for last Monday', TODAY)).toBe('2026-09-28');
  expect(dayCue('Vendredi dernier, 20 minutes de méditation', TODAY)).toBe('2026-10-02');
  expect(dayCue('Log a glass of water', TODAY)).toBeNull();
  expect(dayCue('Yesterday and on Friday I walked', TODAY)).toBeNull();
  expect(dayCue('Remind me tomorrow at 9', TODAY)).toBeNull();
  expect(dayCue('Log water for yesterday', 'not-a-day')).toBeNull();
});
test('a log card that said today, or named no day, takes the message\'s day; other kinds and explicit days stay; no cue leaves the reply untouched', () => {
  const reply = 'Done.\n```zigoals-action\n{"kind":"log-water","glasses":2,"day":"today"}\n```\n```zigoals-action\n{"kind":"log-steps","steps":7000}\n```\n```zigoals-action\n{"kind":"create-reminder","for":"water","time":"10:00"}\n```\n```zigoals-action\n{"kind":"log-weight","value":78.4,"unit":"kg","day":"2026-10-01"}\n```';
  const out = parseReply(applyDayCue(reply, 'Eergisteren twee glazen water en 7000 stappen', TODAY)).proposals as Record<string, unknown>[];
  expect(out.map(p => [p.kind, p.day])).toEqual([['log-water', '2026-10-03'], ['log-steps', '2026-10-03'], ['create-reminder', undefined], ['log-weight', '2026-10-01']]);
  expect(applyDayCue(reply, 'Two glasses of water and 7000 steps', TODAY)).toBe(reply);
  const arr = '```zigoals-action\n[{"kind":"log-water","glasses":3,"day":"today"},{"kind":"check-in","habit":"h1"}]\n```';
  expect(parseReply(applyDayCue(arr, "Hier j'ai bu trois verres d'eau et coché h1", TODAY)).proposals.map(p => (p as {day?: string}).day)).toEqual(['yesterday', 'yesterday']);
});
