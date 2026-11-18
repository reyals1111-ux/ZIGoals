import {expect, test} from 'vitest';
import {billsSchema, emptyBills} from '../../../bills/schema';
import {buildShowcase} from '../../../showcase-data';
import {billDial, billGrid, billTimeline} from './money-bills';

/** Session AS (ADR-042 Part 2, Wealth): the bill answer widgets read the bills' own due dates (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', bills = billsSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:bills:v1']!));

test('the next 31 days as a grid: three due days lit, the total in its own currency, the Showcase label stripped', () => {
  const grid = billGrid(bills, DAY);
  expect(grid).toMatchObject({state: 'live', from: DAY, to: '2026-12-17', span: 'Nov 17 – Dec 17', dueDays: 3, totals: [{currency: 'EUR', text: '€1,079.99', count: 3}], overdue: []});
  expect(grid.weekdays).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']); expect(grid.weeks).toHaveLength(5);
  expect(grid.due.map(d => [d.title, d.amount, d.dateWords, d.when])).toEqual([['Rent', '€950.00', 'Tue, Dec 1', 'in 14 days'], ['Energy', '€120.00', 'Tue, Dec 8', 'in 21 days'], ['Music', '€9.99', 'Mon, Dec 14', 'in 27 days']]);
  const cells = grid.weeks.flat(), of = (date: string) => cells.find(c => c.date === date)!;
  expect(cells.filter(c => c.bills.length).map(c => c.date)).toEqual(['2026-12-01', '2026-12-08', '2026-12-14']);
  expect(of('2026-11-16')).toMatchObject({inRange: false, today: false}); expect(of(DAY)).toMatchObject({inRange: true, today: true}); expect(of('2026-12-18').inRange).toBe(false);
  expect(of('2026-12-01').words).toBe('Tue, Dec 1: Rent €950.00'); expect(of('2026-11-20').words).toBe('Fri, Nov 20: no bill due');
  expect(grid.next).toMatchObject({title: 'Rent', amount: '€950.00', date: 'Tue, Dec 1', days: 14});
});
test('the next bills on a time axis from today, and the next one as a countdown', () => {
  const line = billTimeline(bills, DAY);
  expect(line).toMatchObject({state: 'live', count: 4, more: 0, spanDays: 45, overdue: 0, endWords: 'Fri, Jan 1, 2027'});
  expect(line.marks.map(m => [m.n, m.title, m.amount, m.when])).toEqual([[1, 'Rent', '€950.00', 'in 14 days'], [2, 'Energy', '€120.00', 'in 21 days'], [3, 'Music', '€9.99', 'in 27 days'], [4, 'Home insurance', '€180.00', 'in 45 days']]);
  expect(line.marks[0]!.at).toBeCloseTo(14 / 45); expect(line.marks.at(-1)!.at).toBe(1);
  expect(billTimeline(bills, DAY, 2)).toMatchObject({more: 2, spanDays: 21});
  expect(billDial(bills, DAY)).toMatchObject({state: 'live', after: 3, next: {title: 'Rent', amount: '€950.00', date: 'Tue, Dec 1', days: 14, when: 'in 14 days', overdue: false}});
  // A bill due today stands at today's edge of the axis, in words "today".
  const now = billTimeline({...bills, bills: [...bills.bills, {...bills.bills[0]!, id: 'now', title: 'Phone · SHOWCASE DATA', amount: '15.00', nextDue: DAY}]}, DAY);
  expect(now.marks[0]).toMatchObject({title: 'Phone', amount: '€15.00', when: 'today', days: 0, at: 0, overdue: false}); expect(now.count).toBe(5);
});
test('no bills kept: empty, with no figure', () => {
  expect(billGrid(emptyBills(), DAY)).toMatchObject({state: 'empty', due: [], dueDays: 0, totals: [], next: null});
  expect(billTimeline(emptyBills(), DAY)).toMatchObject({state: 'empty', marks: [], next: null});
  expect(billDial(emptyBills(), DAY)).toEqual({state: 'empty', next: null, after: 0});
});
