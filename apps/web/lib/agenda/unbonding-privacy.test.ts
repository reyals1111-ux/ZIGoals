import {expect, test} from 'vitest';
import {unbondingEvents} from '../zigchain-eco/staking-clarity';
import {agendaExtras} from '../../components/agenda/agenda-extras';
import {buildIcs} from '../ics/ics';
import type {Position} from '../positions';

// Security review F10 (R1-F1, R2-F3): an unbonding date reaches the agenda and its calendar file with no amount and no
// validator name, straight from Wealth's real records (not hand-made titles).
test('unbonding dates carry no figure and no validator into the agenda or the .ics file', () => {
  const now = Date.parse('2026-11-01T10:00:00Z');
  const position = {id: 'p1', sourceType: 'NATIVE_UNBONDING', asset: 'ZIG', quantity: '12345678000', decimals: 6, network: 'zigchain-1', account: 'zig1fictional', exitDate: '2026-11-15T09:00:00Z', validator: {name: 'Big Validator', operator: 'zigvaloper1fictional'}} as unknown as Position;
  expect(unbondingEvents([position], {now}).length).toBe(1);
  const platform = {positions: [position]} as unknown as Parameters<typeof agendaExtras>[0]['platform'];
  const {unbonding} = agendaExtras({platform, showcase: false, day: '2026-11-01'});
  expect(unbonding).toEqual([expect.objectContaining({date: '2026-11-15', title: 'Unstaked ZIG becomes usable'})]);
  const ics = buildIcs(unbonding.map(u => ({id: u.id, date: u.date, summary: u.title})), {stamp: new Date(now)});
  expect(ics).not.toMatch(/Big Validator|12[,.]?345/);
  expect(ics.split('\r\n').find(l => l.startsWith('SUMMARY:'))).toBe('SUMMARY:Unstaked ZIG becomes usable');
});
