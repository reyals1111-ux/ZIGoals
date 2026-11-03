import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReportDocument} from '../../components/report/report-document';
import {buildReport, REPORT_SECTIONS} from './build';
import {createEmptyHealth, type HealthData} from '../health';

const TODAY = '2026-10-31';
describe('the report page (Session AK lane S, item 14)', () => {
  test('escapes what the person wrote, names its source and leaves empty sections honest', () => {
    const moods = {version: 1, days: {[TODAY]: {mood: 3, at: `${TODAY}T20:00:00.000Z`, note: '<script>alert(1)</script> & "quotes"'}}};
    const weights = [{id: 'w1', date: '2026-10-20', grams: 72000, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z`}, {id: 'w2', date: TODAY, grams: 71500, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z`}];
    const health = {...createEmptyHealth(), schemaVersion: 4, moods, weights} as unknown as HealthData;
    const report = buildReport({health, habits: null, energy: {days: {[TODAY]: {energy: 4}}}, from: '2026-10-02', to: TODAY, today: TODAY, sections: [...REPORT_SECTIONS]});
    const html = renderToStaticMarkup(createElement(ReportDocument, {report, weightUnit: 'kg', showcase: false}));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;');
    expect(html).toContain('From the person&rsquo;s own log'.replace('&rsquo;', '’'));
    expect(html).toContain('Oct 2, 2026 – Oct 31, 2026');
    expect(html).toContain('Change over the dates: -0.5 kg');
    expect(html).toContain('Nothing logged in these dates.');
    expect(html).toContain('<svg');
    expect(html).not.toContain('Showcase: fictional');
  });
});
