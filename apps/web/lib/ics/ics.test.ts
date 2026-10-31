import {describe, expect, it} from 'vitest';
import {MAX_ICS_EVENTS, buildIcs, escapeText, foldLine, icsUid, stableHash, unfold} from './ics';

const STAMP = new Date('2026-11-04T09:30:15.123Z');
const bytes = (s: string) => new TextEncoder().encode(s).length;

describe('an iCalendar file made on the device (RFC 5545; Session AK, F5d)', () => {
  it('escapes TEXT: backslash, semicolon, comma and line breaks; drops other control characters', () => {
    expect(escapeText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d'); // security review F10 (R1-F2): the semicolon is escaped too
    expect(escapeText('one\r\ntwo\nthree\rfour')).toBe('one\\ntwo\\nthree\\nfour');
    expect(escapeText('tab\there\u0000\u0007\u007f')).toBe('tabhere');
  });
  it('an injected line break can never start a property or a component', () => {
    const evil = 'Rent\r\nBEGIN:VEVENT\r\nUID:evil\r\nSUMMARY:pwned\r\nEND:VEVENT';
    const ics = buildIcs([{id: 'bill:1:2026-11-05', date: '2026-11-05', summary: evil, description: 'x\nATTACH:http://evil.example/'}], {stamp: STAMP});
    const lines = unfold(ics);
    expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines.filter(l => l.startsWith('UID:'))).toEqual([`UID:${icsUid('bill:1:2026-11-05')}`]);
    expect(lines.some(l => l.startsWith('ATTACH'))).toBe(false);
    expect(lines.find(l => l.startsWith('SUMMARY:'))).toBe('SUMMARY:Rent\\nBEGIN:VEVENT\\nUID:evil\\nSUMMARY:pwned\\nEND:VEVENT');
    // Every physical line is a property, a component line or a fold continuation.
    for (const line of ics.split('\r\n').filter(Boolean)) expect(line).toMatch(/^( |[A-Z-]+[;:])/);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
  it('folds at 75 octets with CRLF and a space, never inside a UTF-8 character', () => {
    expect(foldLine('SUMMARY:short')).toBe('SUMMARY:short');
    const long = `SUMMARY:${'é🌙x'.repeat(60)}`, folded = foldLine(long);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(bytes(p)).toBeLessThanOrEqual(75);
    for (const p of parts.slice(1)) expect(p.startsWith(' ')).toBe(true);
    expect(parts.map((p, i) => i ? p.slice(1) : p).join('')).toBe(long);
    expect(folded).not.toContain('�');
  });
  it('writes a whole calendar: all-day and floating timed events, a UID and DTSTAMP each, transparent', () => {
    const ics = buildIcs([
      {id: 'habit:a:2026-11-04', date: '2026-11-04', time: '08:00', minutes: 20, summary: 'Fictional stretch'},
      {id: 'bill:b:2026-12-31', date: '2026-12-31', summary: 'Fictional rent', description: 'Monthly bill due'},
    ], {stamp: STAMP, name: 'ZIGoals agenda (Example)'});
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.split('\r\n').every(l => !l.includes('\n'))).toBe(true);
    const lines = unfold(ics);
    expect(lines.slice(0, 6)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ZIGoals//Agenda export//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:ZIGoals agenda (Example)']);
    expect(lines.at(-1)).toBe('END:VCALENDAR');
    expect(lines).toContain('DTSTART:20261104T080000');
    expect(lines).toContain('DURATION:PT20M');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261231');
    expect(lines).toContain('DTEND;VALUE=DATE:20270101');
    expect(lines.filter(l => l === 'DTSTAMP:20261104T093015Z')).toHaveLength(2);
    expect(lines.filter(l => l === 'TRANSP:TRANSPARENT')).toHaveLength(2);
    expect(lines).toContain('DESCRIPTION:Monthly bill due');
    expect(lines.filter(l => l.startsWith('DESCRIPTION'))).toHaveLength(1);
  });
  it('UIDs are stable, opaque and unique; duplicates and invalid events are left out; at most 2,000 events', () => {
    expect(icsUid('habit:x:2026-11-04')).toBe(icsUid('habit:x:2026-11-04'));
    expect(icsUid('habit:x:2026-11-04')).not.toBe(icsUid('habit:x:2026-11-05'));
    expect(icsUid('habit:x:2026-11-04')).not.toContain('habit');
    expect(stableHash('')).toMatch(/^[0-9a-f]{16}$/);
    const ics = buildIcs([{id: 'a', date: '2026-11-04', summary: 'A'}, {id: 'a', date: '2026-11-04', summary: 'A again'}, {id: 'b', date: 'not a day', summary: 'B'}, {id: 'c', date: '2026-11-04', summary: '   '}], {stamp: STAMP});
    expect(unfold(ics).filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1);
    const many = Array.from({length: MAX_ICS_EVENTS + 5}, (_, i) => ({id: `e${i}`, date: '2026-11-04', summary: `E${i}`}));
    expect(unfold(buildIcs(many, {stamp: STAMP})).filter(l => l === 'BEGIN:VEVENT')).toHaveLength(MAX_ICS_EVENTS);
    expect(() => buildIcs([], {stamp: new Date('x')})).toThrow();
  });
  it('long titles are clipped; an empty calendar is still a calendar', () => {
    const lines = unfold(buildIcs([{id: 'x', date: '2026-11-04', summary: 'y'.repeat(500)}], {stamp: STAMP}));
    expect(lines.find(l => l.startsWith('SUMMARY:'))).toBe(`SUMMARY:${'y'.repeat(200)}`);
    expect(unfold(buildIcs([], {stamp: STAMP})).filter(l => l.includes('VCALENDAR'))).toEqual(['BEGIN:VCALENDAR', 'END:VCALENDAR']);
  });
});
