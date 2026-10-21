import {describe, expect, it} from 'vitest';
import {continueSentence} from '../../components/earn/words';
import {filterValidators} from '../../components/earn/validators-section';
import {checklistPath, deriveDots, summarise} from '../checklist/derive';
import {addCustom} from '../checklist/store';
import {emptyChecklist} from '../checklist/schema';
import {emptyHabitData} from '../habits';
import {nextStep, normalisePath} from '../path/model';
import {academyModel} from './academy';
import {NOBLE_USDC, PROVIDER_CLAIMS, VALDORA_VAULT_PAGE} from './options';
import {START_STEPS, startHereModel, type StartStepState} from './start-here';
import type {Validator} from './client';

/**
 * Critique round 2 (lane L5c): the words and orders that are pure functions — a dated fact continued inside a sentence
 * keeps a name's capital ("but Circle stopped…"), the Academy's end chest is named the way Start here's is, the validator
 * list opens by name (every other order kept), and the Today Checklist card's "Next" is the path's own next step even when
 * the dots' stored order differs from the path's orbits.
 */
describe('continueSentence', () => {
  it('keeps a name or a word with more than one capital, lowers an ordinary first word', () => {
    expect(continueSentence(NOBLE_USDC.text)).toMatch(/^Circle stopped new minting/);
    expect(continueSentence(PROVIDER_CLAIMS.valdoraRedemption.text)).toMatch(/^unstaking follows ZIGChain’s/);
    expect(continueSentence(VALDORA_VAULT_PAGE.curated)).toMatch(/^curated by ZIG Markets/);
    expect(continueSentence('ZIGChain takes fees in ZIG.')).toBe('ZIGChain takes fees in ZIG.');
    expect(continueSentence('USDC on Noble is paused.')).toBe('USDC on Noble is paused.');
    expect(continueSentence('Valdora’s FAQ says so.')).toBe('Valdora’s FAQ says so.');
    expect(continueSentence('The vault pays later.')).toBe('the vault pays later.');
    expect(continueSentence('')).toBe('');
  });
});

describe('the Academy’s end chest', () => {
  it('is named like Start here’s: "Academy, complete" beside "Start here, complete"', () => {
    const academyEnd = academyModel({version: 1}).milestones.find(m => m.at === 'end')!;
    const startEnd = startHereModel(START_STEPS.map(id => ({id, done: false, why: ''}) as unknown as StartStepState)).milestones.find(m => m.at === 'end')!;
    expect(startEnd.label).toBe('Start here, complete');
    expect(academyEnd.label).toBe('Academy, complete');
    expect(academyEnd.label).not.toMatch(/Earn Academy/);
  });
});

describe('the validator list’s order', () => {
  const v = (moniker: string, share: number, rate: number, signed: number): Validator => ({operator: `zigvaloper1${moniker.toLowerCase().padEnd(38, 'q').replace(/[^02-9ac-hj-np-z]/g, 'q').slice(0, 38)}`, moniker, status: 'bonded', jailed: false, tombstoned: false, votingPowerShare: share, commission: {rate, maxRate: .2, maxChangeRate: .01}, uptime: {signedShare: signed, missed: 0, window: 10000}, selfBond: null} as unknown as Validator);
  const list = [v('Zeta', .4, .05, .99), v('alpha', .1, .1, .98), v('Mu', .3, .07, 1)];
  it('opens by name (A to Z, case-insensitive), and keeps the voting power, commission and uptime orders', () => {
    const base = {active: true, hideJailed: true, maxCommission: null};
    expect(filterValidators(list, {...base, sort: 'name'}).map(x => x.moniker)).toEqual(['alpha', 'Mu', 'Zeta']);
    expect(filterValidators(list, {...base, sort: 'power'}).map(x => x.moniker)).toEqual(['Zeta', 'Mu', 'alpha']);
    expect(filterValidators(list, {...base, sort: 'commission'}).map(x => x.moniker)).toEqual(['Zeta', 'Mu', 'alpha']);
    expect(filterValidators(list, {...base, sort: 'uptime'}).map(x => x.moniker)).toEqual(['Mu', 'Zeta', 'alpha']);
  });
});

describe('the Today Checklist card’s "Next"', () => {
  it('is the path’s own next step (ZIGi’s), not the first waiting dot in stored order', () => {
    let r = emptyChecklist();
    r = addCustom(r, {label: 'Fictional evening sketch', colour: 'gold', section: 'evening'}, {id: 'ck_fixture-a', at: new Date('2026-10-01T08:00:00Z')});
    r = addCustom(r, {label: 'Fictional morning note', colour: 'cyan', section: 'morning'}, {id: 'ck_fixture-b', at: new Date('2026-10-01T09:00:00Z')});
    const today = {date: '2026-10-19', ticks: [], custom: [], nudged: []};
    const dots = deriveDots(r, today as never, '2026-10-19', {habits: emptyHabitData(), habitsDay: '2026-10-19', health: {} as never, healthDay: '2026-10-19', sleep: null as never, meditation: null as never, meditationRun: null as never, fasting: null as never, platform: null as never, zone: 'UTC', now: new Date('2026-10-19T09:00:00Z')});
    // The stored order puts the evening item first; the path's orbits put the morning one first.
    expect(summarise(dots, today as never).next?.label).toBe('Fictional evening sketch');
    expect(nextStep(normalisePath(checklistPath(r, dots, [])))?.label).toBe('Fictional morning note');
  });
});
