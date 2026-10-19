import {describe, expect, it} from 'vitest';
import fixture from '../fixtures/live-2026-10-19.json';
import {aprAtCommission} from '../apr';
import {aprAgreement, issuanceParts, issuanceRate, measuredRate} from './measured.mjs';

/**
 * Session AF chunk 2 (ADR-028 H97): the measured native staking figure and the issuance figure, on the recorded answers of
 * lib/earn/fixtures/live-2026-10-19.json (one real read). The script (scripts/earn/live-check.mjs) and the app compute both
 * with this one module, and the issuance arithmetic here equals lib/earn/apr.ts's to the last digit.
 */
type Chain = {mint: {annualProvisions: string; blocksPerYear: string}; staking: {bondedTokens: string}; distribution: {communityTax: string}; blocks: {latest: {height: string; time: string}; earlier: {height: string; time: string}}; apr: {beforeCommission: string}};
type Measured = {validator: {commission: string}; latest: {height: string; time: string; pendingRewards: string; selfBond: string}; earlier: {height: string; time: string; pendingRewards: string; selfBond: string}; measured: {status: string; rate?: string; accrued?: string}};
const chain = fixture.answers.chainMainnet.data as unknown as Chain;
const measured = (fixture.answers as unknown as {measured: {data: Measured}}).measured.data;

describe('the two native staking figures', () => {
  it('measured: the self-bond’s accrual over the window, annualised over the real seconds between the two blocks', () => {
    const r = measuredRate({latest: measured.latest, earlier: measured.earlier});
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.windowBlocks).toBe('10000');
    expect(r).toEqual({status: 'ok', ...{accrued: measured.measured.accrued, rate: measured.measured.rate}, windowBlocks: '10000', windowSeconds: r.windowSeconds});
    // By hand: accrued ÷ bond × year ÷ seconds.
    const byHand = Number(r.accrued) / Number(measured.latest.selfBond) * 31_557_600 / Number(r.windowSeconds);
    expect(Math.abs(Number(r.rate) - byHand)).toBeLessThan(1e-12);
    expect(Number(r.rate)).toBeGreaterThan(0.04);
    expect(Number(r.rate)).toBeLessThan(0.07);
  });
  it('rewards that fell (a claim) or a self-bond that changed in the window cannot be measured', () => {
    expect(measuredRate({latest: {...measured.latest, pendingRewards: '1'}, earlier: measured.earlier})).toEqual({status: 'unavailable', reason: 'REWARDS_CLAIMED'});
    expect(measuredRate({latest: measured.latest, earlier: {...measured.earlier, selfBond: '1'}})).toEqual({status: 'unavailable', reason: 'REWARDS_CLAIMED'});
    expect(() => measuredRate({latest: measured.earlier, earlier: measured.latest})).toThrow();
    expect(() => measuredRate({latest: {...measured.latest, selfBond: '0'}, earlier: {...measured.earlier, selfBond: '0'}})).toThrow();
    expect(() => measuredRate({latest: {...measured.latest, time: 'yesterday'}, earlier: measured.earlier})).toThrow();
  });
  it('issuance: the same arithmetic as lib/earn/apr.ts, at the measured validator’s commission', () => {
    const issuance = issuanceRate({annualProvisions: chain.mint.annualProvisions, bondedTokens: chain.staking.bondedTokens, communityTax: chain.distribution.communityTax, mintBlocksPerYear: chain.mint.blocksPerYear, latest: chain.blocks.latest, earlier: chain.blocks.earlier, commission: measured.validator.commission});
    expect(issuance).toBe(aprAtCommission(chain.apr, measured.validator.commission));
  });
  it('issuance parts: gross, after tax, block seconds, factor and the rate before commission equal lib/earn/apr.ts’s', () => {
    const parts = issuanceParts({annualProvisions: chain.mint.annualProvisions, bondedTokens: chain.staking.bondedTokens, communityTax: chain.distribution.communityTax, mintBlocksPerYear: chain.mint.blocksPerYear, latest: chain.blocks.latest, earlier: chain.blocks.earlier});
    const apr = chain.apr as unknown as Record<string, string>;
    expect(parts).toEqual({gross: apr.gross, afterTax: apr.afterTax, blockSeconds: apr.blockSeconds, factor: apr.factor, beforeCommission: apr.beforeCommission});
  });
  it('the two figures agree within 10 % on the recorded read; past 10 % they disagree', () => {
    const issuance = aprAtCommission(chain.apr, measured.validator.commission);
    const agreement = aprAgreement(issuance, measured.measured.rate!);
    expect(agreement.disagree).toBe(false);
    expect(Number(agreement.apart)).toBeLessThan(0.1);
    expect(aprAgreement('0.05', '0.0551').disagree).toBe(true);
    expect(aprAgreement('0.05', '0.0549').disagree).toBe(false);
    expect(aprAgreement('0.05', '0.0449').disagree).toBe(true);
    expect(aprAgreement('0', '0.05')).toEqual({apart: null, disagree: true});
  });
});
