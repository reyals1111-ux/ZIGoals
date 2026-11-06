import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {EvidenceChart} from '../components/platform/evidence-chart';

/** Session AL Part 14, lane P14-D: earlier-scope rows of L1 and L10a (R30, P-DVR-18). */
const web = join(__dirname, '..');
const read = (file: string) => readFileSync(join(web, file), 'utf8');

describe('R30: readable text in the Wealth styles and the shell', () => {
  const FILES = ['components/wealth/money-tools/money-tools.css', 'components/wealth/allocation/allocation.css', 'components/platform/wealth-product.css', 'components/shell/shell-ab.css'];
  it.each(FILES)('%s sets no font size under 12 px', file => {
    const small = [...read(file).matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1])).filter(n => n < 12);
    expect(small).toEqual([]);
  });
  it('the money charts and the purpose flow draw their labels at 14 px even without the chart look', () => {
    expect(read('components/wealth/money-tools/money-tools.css')).toMatch(/\.money-chart text\{[^}]*font-size:14px/);
    expect(read('components/wealth/allocation/allocation.css')).toMatch(/\n\.purpose-value\{[^}]*font-size:14px/);
    // Theme parity: the fallback colour is a theme token, the same rule in Nebula, Light and Dark.
    expect(read('components/wealth/allocation/allocation.css')).toMatch(/\n\.purpose-value\{fill:var\(--text-secondary/);
  });
});

const day = (d: number) => `2026-09-${String(d).padStart(2, '0')}T12:00:00Z`;
const chart = (extra: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(EvidenceChart, {series: [{label: 'Counted wealth', color: '#38d9f5', points: [{at: day(1), value: '1000'}, {at: day(2), value: '2000'}]}], decimals: 2, currency: 'USD', label: 'Goal history', ...extra}));

describe('P-DVR-18 (B-115, G-017, N-080): the evidence chart can reach a Goal target', () => {
  it('without a ceiling the scale fits the observed range, as before', () => {
    const html = chart();
    expect(html).toContain('Scale maximum: 21 USD');
    expect(html).toContain('Scale minimum: 9 USD');
    expect(html).not.toContain('evidence-ceiling');
  });
  it('a ceiling above the data lifts the top of the scale to it and draws it as a named dashed line', () => {
    const html = chart({ceiling: '5000', ceilingLabel: 'Target'});
    expect(html).toContain('Scale maximum: 50 USD · dashed line: Target 50 USD');
    expect(html).toContain('class="evidence-ceiling"');
    expect(html).toContain('<title>Target: 50 USD</title>');
    expect(html).toContain('reaches Target');
  });
  it('a ceiling inside the padded range changes nothing; an unreadable one is ignored', () => {
    expect(chart({ceiling: '1500'})).toContain('Scale maximum: 21 USD');
    expect(chart({ceiling: '1500'})).not.toContain('reaches');
    // Inside the range and named: the line is still drawn where the target is.
    expect(chart({ceiling: '1500', ceilingLabel: 'Target'})).toContain('<title>Target: 15 USD</title>');
    expect(chart({ceiling: 'soon'})).toContain('Scale maximum: 21 USD');
  });
});

describe('TK-019 (P-TK-10): the brokerage template file speaks the importer’s words', () => {
  it('writes Name, Symbol, Quantity, Kind of asset, Value, Currency, Notes, and a brokerage’s own header still maps every field', async () => {
    const {CSV_TEMPLATES, templateCsv, templateMapping} = await import('./csv/templates/presets');
    const t = CSV_TEMPLATES.find(x => x.id === 'brokerage')!;
    expect(templateCsv(t).split('\r\n')[0]).toBe('"Name","Symbol","Quantity","Kind of asset","Value","Currency","Notes"');
    expect(Object.keys(templateMapping(['Description', 'Symbol', 'Quantity', 'Asset class', 'Market Value', 'Currency', 'Account'], t)).sort()).toEqual(['asset', 'class', 'currency', 'name', 'notes', 'quantity', 'value']);
  });
});

describe('DV-147 (P-DV-28): the asset page offers a Goal only when the holding fits it', () => {
  it('USD cash is never offered to a count Goal; a money Goal on its network takes it', async () => {
    const {canAllocate} = await import('./wealth-goal-fit');
    const cash = {network: 'manual', archivedAt: undefined, sourceType: 'MANUAL', asset: 'USD', denom: 'usd'} as never;
    expect(canAllocate({status: 'active', type: 'QUANTITY', network: 'manual', asset: 'PAGES', denom: 'pages'} as never, cash)).toBe(false);
    expect(canAllocate({status: 'active', type: 'VALUE', network: 'manual', asset: 'USD'} as never, cash)).toBe(true);
    expect(canAllocate({status: 'closed', type: 'VALUE', network: 'manual', asset: 'USD'} as never, cash)).toBe(false);
  });
});

describe('MO-119 (P-MO-84): Markets says what its price lookups send', () => {
  it('the method note names what is sent and what never is', () => {
    expect(read('components/platform/markets-view.tsx')).toContain('this page sends only which markets it shows and their currency to the ZIGoals server, which asks CoinGecko; never your amounts or records.');
  });
});
