import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {busiestDays, calendarCurrencies, calendarMonths, monthCalendar} from './month-days';
import {totals} from '../money-log/engine';
import MonthCalendarView from '../../components/wealth/spending/insights/month-calendar';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's calendar, LEDGER #338): the month's days, per currency, by Wealth →
 * Spending's rule — income through `totals`, spending through the shared rule's `budgetDayParts` (left out, transfers and
 * refunds not counted, a shared cost by the person's share, a spread cost by its share on its day each month).
 */
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `c${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-03', createdAt: '2026-11-03T10:00:00.000Z', ...over});
const TODAY = '2026-11-14';
const text = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&rsquo;/g, '’').replace(/\s+/g, ' ');
const probe = [
  e({amount: '10.00'}), e({amount: '50.00', excluded: true}), e({amount: '30.00', share: '10.00', date: '2026-11-05'}),
  e({amount: '200.00', date: '2026-11-07', transfer: 'x1'}), e({kind: 'income', amount: '200.00', date: '2026-11-07', category: 'Other income', transfer: 'x2'}),
  e({kind: 'income', amount: '25.00', category: 'Refund', excluded: true, date: '2026-11-09'}), e({kind: 'income', amount: '1000.00', category: 'Salary', date: '2026-11-01'}),
  e({amount: '120.00', category: 'Bills', date: '2026-09-12', spread: 12}), e({amount: '4.00', currency: 'USD', date: '2026-11-04'}),
];

describe('a calendar of the month', () => {
  const cal = monthCalendar(probe, '2026-11', 'EUR', TODAY);
  const day = (d: string) => cal.weeks.flat().find(x => x.date === d)!;
  test('each day by Wealth → Spending’s rule; the spread cost’s share on its day', () => {
    expect(day('2026-11-03')).toMatchObject({spent: 1000, count: 2});
    expect(day('2026-11-05').spent).toBe(1000);
    expect(day('2026-11-07')).toMatchObject({spent: 0, received: 0, count: 2});
    expect(day('2026-11-09')).toMatchObject({received: 0, count: 1});
    expect(day('2026-11-01').received).toBe(100_000);
    expect(day('2026-11-12').spent).toBe(1000); // a twelfth of the September yearly bill
    expect(cal.spent).toBe(3000);
    expect(cal.received).toBe(totals(probe, '2026-11-01', '2026-11-30').find(t => t.currency === 'EUR')!.income);
  });
  test('weeks from Monday (or Sunday), whole weeks, today and the future marked, a shade for the larger days', () => {
    expect(cal.weeks[0]![0]!.date).toBe('2026-10-26');
    expect(cal.weeks.every(w => w.length === 7)).toBe(true);
    expect(monthCalendar(probe, '2026-11', 'EUR', TODAY, 'sunday').weeks[0]![0]!.date).toBe('2026-11-01');
    expect(day('2026-11-14').today).toBe(true); expect(day('2026-11-20').future).toBe(true);
    expect(day('2026-11-03').level).toBe(3); expect(day('2026-11-02').level).toBe(0);
    expect(busiestDays(cal).map(d => d.date)).toEqual(['2026-11-03', '2026-11-05', '2026-11-12']);
  });
  test('currencies apart, never converted; months to page from the first one', () => {
    expect(calendarCurrencies(probe, '2026-11')).toEqual(['EUR', 'USD']);
    expect(calendarCurrencies(probe, '2026-12')).toEqual(['EUR']); // only the spread bill reaches December
    expect(monthCalendar(probe, '2026-11', 'USD', TODAY).spent).toBe(400);
    expect(calendarMonths(probe, TODAY)).toEqual(['2026-09', '2026-10', '2026-11']);
  });
  test('the view: amounts blurred by Hide amounts, a day opens search, an empty log teaches', () => {
    const html = renderToStaticMarkup(createElement(MonthCalendarView, {entries: probe, today: TODAY, openDay: () => {}}));
    expect(text(html)).toContain('Nov 2026 in EUR: spent €30.00 , received €1,000.00');
    expect(html).toContain('data-private-amount');
    expect(html).toContain('aria-label="Tue, Nov 3, 2026: spent €10.00 (2 entries). Open these entries in search"');
    expect(text(html)).toContain('a cost spread over months counts its share on its day each month');
    expect(html).toContain('aria-label="Currency"');
    expect(text(renderToStaticMarkup(createElement(MonthCalendarView, {entries: [], today: TODAY})))).toContain('Nothing logged yet.');
  });
});

describe('review b4f #11: a day holding only a spread share is text, not a button, on a phone too', () => {
  test('the list under the grid has a button only for a day with entries', () => {
    const html = renderToStaticMarkup(createElement(MonthCalendarView, {entries: probe, today: TODAY, openDay: () => {}}));
    const list = html.slice(html.indexOf('class="money-cal-list"'));
    expect(list).toContain('<span>Thu, Nov 12, 2026: spent €10.00</span>');
    expect(list).not.toMatch(/<button[^>]*><span>Thu, Nov 12, 2026<\/span>/);
    expect(list).toMatch(/<button[^>]*><span>Tue, Nov 3, 2026<\/span>/);
  });
});
