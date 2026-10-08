import {expect, test} from 'vitest';
import {AUTO_ACCEPT_CAP, AUTO_ACCEPT_GROUPS, AUTO_ACCEPT_HEALTH, AUTO_ACCEPT_KINDS, AUTO_ACCEPT_LABELS, AUTO_ACCEPT_NEVER, autoAcceptVerdict, noteAutoAccept, setAutoAcceptCap, setAutoAcceptKind} from './auto-accept';
import {ACTION_KINDS, PREFILL_KINDS, WRITING_KINDS} from './schema';
import {aiOptionsSchema, type AiOptions} from '../store/records';

// Session X-Local Part 5b, owner addition 5: auto-accept is opt-in per kind, never for weight, fasting or money, Health
// kinds only while the gate is open at that moment, capped per day; the record stays a loose field older builds ignore.
const DAY = '2026-10-08', off: AiOptions = {version: 1};
const on = (...kinds: string[]): AiOptions => ({version: 1, autoAccept: {kinds: Object.fromEntries(kinds.map(k => [k, true]))}});
test('the never list is exactly weight, fasting and the two money pre-fills; every other writing kind is eligible', () => {
  expect([...AUTO_ACCEPT_NEVER].sort()).toEqual(['log-weight', 'prefill-holding', 'start-fast', 'stop-fast', 'update-account-balance']);
  for (const kind of PREFILL_KINDS) expect(AUTO_ACCEPT_NEVER).toContain(kind);
  expect([...AUTO_ACCEPT_KINDS].sort()).toEqual(WRITING_KINDS.filter(k => !(AUTO_ACCEPT_NEVER as readonly string[]).includes(k)).sort());
  for (const kind of AUTO_ACCEPT_NEVER) expect(autoAcceptVerdict(on(kind), kind, DAY, true)).toEqual({ok: false, reason: 'never'});
  // Every kind has a label and a place in the settings groups (the never ones are labelled but never offered).
  for (const kind of ACTION_KINDS) expect(AUTO_ACCEPT_LABELS[kind].length).toBeGreaterThan(3);
  expect(AUTO_ACCEPT_GROUPS.flatMap(g => g.kinds).sort()).toEqual([...AUTO_ACCEPT_KINDS].sort());
  expect(AUTO_ACCEPT_GROUPS.find(g => g.health)!.kinds).toEqual(AUTO_ACCEPT_HEALTH);
});
test('off by default; on only for the kinds switched on; the switch for a never kind is ignored', () => {
  for (const kind of AUTO_ACCEPT_KINDS) expect(autoAcceptVerdict(off, kind, DAY, true)).toEqual({ok: false, reason: 'off'});
  const water = setAutoAcceptKind(off, 'log-water', true);
  expect(autoAcceptVerdict(water, 'log-water', DAY, true)).toEqual({ok: true});
  expect(autoAcceptVerdict(water, 'check-in', DAY, true)).toEqual({ok: false, reason: 'off'});
  expect(setAutoAcceptKind(off, 'log-weight', true)).toEqual(off);
  expect(setAutoAcceptKind(water, 'log-water', false).autoAccept?.kinds).toEqual({});
  expect(aiOptionsSchema.parse(water)).toEqual(water);
});
test('Health kinds are eligible only while the Health gate is open at that moment, whatever the switch says', () => {
  for (const kind of AUTO_ACCEPT_HEALTH) {
    expect(autoAcceptVerdict(on(kind), kind, DAY, false), kind).toEqual({ok: false, reason: 'health-gate-closed'});
    expect(autoAcceptVerdict(on(kind), kind, DAY, true), kind).toEqual({ok: true});
  }
  for (const kind of AUTO_ACCEPT_KINDS.filter(k => !(AUTO_ACCEPT_HEALTH as readonly string[]).includes(k))) expect(autoAcceptVerdict(on(kind), kind, DAY, false), kind).toEqual({ok: true});
});
test('the daily cap: default 20, counted per day with the cards of one reply, old days pruned, bounds kept', () => {
  let o = on('log-water');
  expect(autoAcceptVerdict(o, 'log-water', DAY, true, 19)).toEqual({ok: true});
  expect(autoAcceptVerdict(o, 'log-water', DAY, true, 20)).toEqual({ok: false, reason: 'cap'});
  for (let i = 0; i < 20; i++) o = noteAutoAccept(o, DAY);
  expect(o.autoAccept?.days).toEqual({[DAY]: 20});
  expect(autoAcceptVerdict(o, 'log-water', DAY, true)).toEqual({ok: false, reason: 'cap'});
  expect(autoAcceptVerdict(o, 'log-water', '2026-10-09', true)).toEqual({ok: true});
  o = setAutoAcceptCap(o, 25); expect(autoAcceptVerdict(o, 'log-water', DAY, true)).toEqual({ok: true});
  expect(setAutoAcceptCap(o, 0).autoAccept?.dailyCap).toBe(25); expect(setAutoAcceptCap(o, AUTO_ACCEPT_CAP.max + 1).autoAccept?.dailyCap).toBe(25); expect(setAutoAcceptCap(o, 2.5).autoAccept?.dailyCap).toBe(25);
  const old = noteAutoAccept({...o, autoAccept: {...o.autoAccept, days: {'2026-08-01': 3, [DAY]: 20}}}, '2026-10-09');
  expect(old.autoAccept?.days).toEqual({[DAY]: 20, '2026-10-09': 1});
  expect(aiOptionsSchema.parse(old)).toEqual(old);
});
