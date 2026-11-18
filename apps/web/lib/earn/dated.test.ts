import {expect, test} from 'vitest';
import {dayHasPassed, newestDay, nobleUsdcLine, zignalyPhase, zignalyStatusLine} from './dated';

// Session AL (PR-036, PR-038, BN-027, BN-161): dated notices worded by today's date (Professor and Berlin read on 4 Nov).
const at = (iso: string) => Date.parse(iso);
test('PR-036/BN-161: on 4 Nov the 1 Nov Private Credit deadline reads as passed, not as a step to take', () => {
  expect(zignalyPhase(at('2026-10-31T12:00:00Z'))).toBe('credit-open');
  expect(zignalyPhase(at('2026-11-01T23:59:00Z'))).toBe('credit-open');
  expect(zignalyPhase(at('2026-11-04T02:30:00Z'))).toBe('credit-passed');
  expect(zignalyStatusLine(at('2026-11-04T02:30:00Z'))).toMatch(/was 1 November 2026 \(passed\)/);
  expect(zignalyStatusLine(at('2026-11-04T02:30:00Z'))).not.toMatch(/is 1 November/);
  expect(zignalyPhase(at('2026-12-02T00:00:01Z'))).toBe('closed');
});
test('BN-027/BN-161: Circle\'s 31 October date reads as past from 31 October on', () => {
  expect(nobleUsdcLine(at('2026-10-20T00:00:00Z'))).toContain('fall to zero from 31 October 2026');
  expect(nobleUsdcLine(at('2026-11-04T00:00:00Z'))).toContain('fell to zero on 31 October 2026');
  expect(nobleUsdcLine(at('2026-11-04T00:00:00Z'))).toContain('are fully paused');
});
test('helpers: whole UTC days; the newest read day', () => {
  expect(dayHasPassed('2026-11-01', at('2026-11-01T23:59:59Z'))).toBe(false);
  expect(dayHasPassed('2026-11-01', at('2026-11-02T00:00:00Z'))).toBe(true);
  expect(newestDay(['2026-09-23', '2026-10-31', '2026-10-18'])).toBe('2026-10-31');
});

// Session AT (ADR-043 D1): the closure's words switch by the UTC day, from the notice's own dates, with no deploy.
test('D1: "is closing" until 30 Nov, the notice\'s last day on 1 Dec, "has closed" from 2 Dec', async () => {
  const {zignalyClosure, zignalyWords} = await import('./dated');
  expect(zignalyClosure(at('2026-11-30T23:59:59Z'))).toBe('closing');
  expect(zignalyWords(at('2026-11-30T23:59:59Z')).heading).toBe('Zignaly is closing: how to withdraw');
  expect(zignalyClosure(at('2026-12-01T00:00:00Z'))).toBe('last-day');
  expect(zignalyClosure(at('2026-12-01T23:59:59Z'))).toBe('last-day');
  expect(zignalyWords(at('2026-12-01T12:00:00Z')).heading).toBe('Zignaly: today is the last day to withdraw');
  expect(zignalyStatusLine(at('2026-12-01T12:00:00Z'))).toMatch(/^Today, 1 December 2026, is the last day to withdraw, until 23:59 UTC; the app closes after that\./);
  expect(zignalyClosure(at('2026-12-02T00:00:00Z'))).toBe('closed');
  expect(zignalyWords(at('2026-12-02T00:00:00Z')).heading).toBe('Zignaly has closed: what its notice said');
  expect(zignalyStatusLine(at('2026-12-02T00:00:00Z'))).toBe('Zignaly has closed: its notice made 1 December 2026 (until 23:59 UTC) the last day to withdraw.');
  for (const iso of ['2026-11-18T09:00:00Z', '2026-12-01T12:00:00Z', '2027-02-01T00:00:00Z']) {
    const w = zignalyWords(at(iso));
    // Never "is closing" once the day has come; never "has closed" before it.
    if (iso >= '2026-12-01') expect(Object.values(w).join(' ')).not.toMatch(/is closing/);
    if (iso < '2026-12-02') expect(Object.values(w).join(' ')).not.toMatch(/has closed/);
  }
});
