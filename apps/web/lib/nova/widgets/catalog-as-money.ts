import type {WidgetSpec} from './catalog';

/**
 * Session AS (ADR-042 Part 2): the answer widgets of Wealth and Goals: rivers, radars, gauges, orbits, timelines. Same
 * rules as catalog-as.ts. A money kind reads under Wealth's switch and a goal kind under Goals' (savings jars are goals:
 * they read the goals, not the money log). Every amount stays in its own currency; nothing here moves money, and a
 * forecast is only ever shown as an estimate.
 */
const wealth = {pillar: 'wealth', gate: 'wealth', open: 'Open Wealth', size: 'M', made: true} as const;
const goals = {pillar: 'goals', gate: 'goals', href: '/app/goals', open: 'Open Goals', size: 'M', made: true} as const;
export const AS_MONEY: readonly WidgetSpec[] = [
  {id: 'spending-ranks', title: 'Where it went', about: 'What you logged as spent in a period, ranked by category, each with its share of the total.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'income-ranks', title: 'Income sources', about: 'The income you logged in a period, ranked by category, each with its share of the total.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'debt-ranks', title: 'Debt balances', about: 'The accounts you keep as debts, ranked by the balance you entered, in their own currency.', href: '/app/wealth#accounts-title', params: ['period'], ...wealth},
  {id: 'spending-radar', title: 'Spending radar', about: 'Your categories as spokes: this period lit, the period before dim beside it.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'spending-days', title: 'Spending days', about: 'A period as a calendar, with the days on which you logged spending lit.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'bill-calendar', title: 'Bill calendar', about: 'The next 31 days as a grid, with the days a bill falls due lit.', href: '/app/wealth?view=bills', params: ['period'], ...wealth},
  {id: 'spending-heat', title: 'Spending heat', about: 'The last 13 weeks, a cell a day, brighter the more you logged as spent that day.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'cash-river', title: 'Cash river', about: 'Income and spending over time as two bands on one line, with the gap between them in words.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'net-worth-river', title: 'Net worth river', about: 'The net worth Wealth recorded, day by day, as one band, with the change over the period. Recorded days only.', href: '/app/wealth#wealth-history', params: ['period'], ...wealth},
  {id: 'budget-gauges', title: 'Budget gauges', about: 'Each budget this month as an arc: what is spent of what is available, and over said in words.', href: '/app/wealth?view=budgets', params: ['period'], ...wealth},
  {id: 'savings-rate', title: 'Savings rate', about: 'The income you logged in a period less what you logged as spent, as a share of that income. A figure, not advice.', href: '/app/wealth#spending', params: ['period'], ...wealth},
  {id: 'goal-gauge', title: 'Goal gauge', about: 'One goal on an arc: the percent reached, what is saved of its target and whether its plan keeps pace.', params: ['ref', 'period'], ...goals},
  {id: 'goal-orbits', title: 'Goal orbits', about: 'Each active goal as a planet on its own ring; its place on the ring is its progress.', params: ['period'], ...goals},
  {id: 'bill-timeline', title: 'Bills ahead', about: 'Your next bills on a line that starts at today, each with its amount and the days to it.', href: '/app/wealth?view=bills', params: ['period'], ...wealth},
  {id: 'goal-dates', title: 'Target dates', about: 'Your active goals’ target dates on a line that starts at today, soonest first.', params: ['period'], ...goals},
  {id: 'savings-jars', title: 'Savings jars', about: 'Each savings goal as a jar, filled to its progress.', params: ['period'], ...goals},
  {id: 'bill-dial', title: 'Next bill', about: 'Your next bill as a countdown dial, with its name, its amount and its date.', href: '/app/wealth?view=bills', params: ['period'], ...wealth},
  {id: 'spending-compare', title: 'Spend compared', about: 'What you spent or what came in, beside the same stretch of the period before, with the difference in words.', href: '/app/wealth#spending', params: ['ref', 'period'], ...wealth},
];
