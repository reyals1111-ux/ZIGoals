import {describe, expect, it} from 'vitest';
import {decimalsOf, easeOut, formatLike, parseFigure, shouldTick, tickValue} from './ticker';

describe('the number ticker', () => {
  it('ticks only in Full motion and only a known, finite figure (unknown is not zero)', () => {
    expect(shouldTick('full', 42)).toBe(true);
    expect(shouldTick('calm', 42)).toBe(false);
    expect(shouldTick('off', 42)).toBe(false);
    for (const v of [null, undefined, Number.NaN, Infinity, '42']) expect(shouldTick('full', v)).toBe(false);
    expect(shouldTick('full', 0)).toBe(false);
  });
  it('lands exactly on the value, never passes it, and starts from the start', () => {
    expect(tickValue(0, 100, 0)).toBe(0);
    expect(tickValue(0, 100, 900)).toBe(100);
    expect(tickValue(0, 100, 5000)).toBe(100);
    for (let t = 0; t <= 900; t += 37) { const v = tickValue(0, 12.5, t, 900, 1); expect(v).toBeLessThanOrEqual(12.5); expect(v).toBeGreaterThanOrEqual(0); }
    for (let t = 0; t <= 900; t += 37) expect(tickValue(10, -5, t)).toBeGreaterThanOrEqual(-5);
    expect(tickValue(0, 7, 10, 0)).toBe(7);
    expect(easeOut(-1)).toBe(0); expect(easeOut(2)).toBe(1); expect(easeOut(.5)).toBeGreaterThan(.5);
    expect(decimalsOf(12.5)).toBe(1); expect(decimalsOf(1200)).toBe(0); expect(decimalsOf(Number.NaN)).toBe(0);
  });
  it('reads the app\'s formatted figures and writes every frame in the same style, ending on the exact text', () => {
    for (const text of ['$501,800.00', '−€1.250,50', '12 kg', '100%', '1 234 567', '€0.99', 'ZIG 300,000', '7', '3.5 h']) {
      const t = parseFigure(text);
      expect(t, text).not.toBeNull();
      expect(formatLike(t!, t!.value), text).toBe(text);
    }
    const money = parseFigure('$501,800.00')!;
    expect(money).toMatchObject({prefix: '$', suffix: '', value: 501800, decimals: 2, group: ',', decimal: '.'});
    expect(formatLike(money, 1234.5)).toBe('$1,234.50');
    expect(formatLike(money, 0)).toBe('$0.00');
    const euro = parseFigure('−€1.250,50')!;
    expect(euro.value).toBe(1250.5);
    expect(formatLike(euro, 12)).toBe('−€12,00');
  });
  it('leaves text without one clear figure alone', () => {
    for (const text of ['Unknown', '—', '', '1–2 hours', '3 of 5', '1,234.567,8', 'x'.repeat(80) + '1']) expect(parseFigure(text), text).toBeNull();
  });
});
