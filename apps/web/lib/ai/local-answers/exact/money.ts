import {byCategory, cents, fromCents} from '../../../money-log/engine';
import type {MoneyEntry} from '../../../money-log/schema';
import {billsCard} from '../../../nova/cards/bills';
import {budgetsCard} from '../../../nova/cards/budgets';
import {formatCurrencyAmount, formatPercent} from '../../../visual-format';
import type {ToolEnv} from '../../tools/env';
import {text as clean} from '../../tools/format';
import {runTool} from '../../tools/registry';
import {dayWords, periodSpan, periodWords, previousPeriod, resolvePeriod, type Period} from './period';
import {dayList} from './series';
import {listWords, t} from './text';
import {periodFor} from './track';
import type {Exact, ExactWidget, Query} from './types';

/**
 * Session AS (ADR-042, Part 1): money, exactly, from the money log, the budgets, the bills and Wealth's own totals. Every
 * amount stays in its own currency (never converted, never added across); the leading currency is said, the others are
 * named beside it. Nothing here moves money: a move is only ever a pre-filled card the person signs.
 */
const SOURCE = ['Your money log', 'Je geldlog'] as const;
const money = (amountCents: number, currency: string) => formatCurrencyAmount(fromCents(amountCents), currency);
const plain = (name: string) => clean(name.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?.*$/i, '').replace(/^Example · /, '').trim() || name.trim(), 80);
type Kind = 'expense' | 'income';
/** The entries of one kind inside a period, in the currency that carries most of them. */
function ledger(entries: readonly MoneyEntry[], kind: Kind, p: Period, category?: string | null) {
  const inRange = entries.filter(e => e.kind === kind && e.date >= p.from && e.date <= p.to && (p.weekday === null || p.days.includes(e.date)) && (!category || e.category.toLowerCase() === category.toLowerCase()));
  const per = new Map<string, number>();
  for (const e of inRange) per.set(e.currency, (per.get(e.currency) ?? 0) + cents(e.amount));
  const ranked = [...per.entries()].sort((a, b) => b[1] - a[1]), currency = ranked[0]?.[0] ?? null, own = inRange.filter(e => e.currency === currency);
  return {own, currency, total: ranked[0]?.[1] ?? 0, others: ranked.slice(1).map(([c, v]) => ({currency: c, cents: v, text: money(v, c)}))};
}
export function spendingAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, log = env.moneyLog, income = q.domain === 'income', kind: Kind = income ? 'income' : 'expense';
  const out = (text: string, facts: Record<string, unknown>, widgets: ExactWidget[], p?: Period): Exact => ({kind: 'answer', text, facts: {about: q.domain, ask: q.ask, ...(p ? {period: {token: p.token, from: p.from, to: p.to}} : {}), ...facts}, widgets, query: q, source: SOURCE[lang === 'nl' ? 1 : 0]});
  if (!log) return null;
  const all = log.entries.filter(e => e.kind === kind);
  if (!all.length) return out(income ? t(lang, 'No income logged yet.', 'Nog geen inkomsten gelogd.') : t(lang, 'No spending logged yet.', 'Nog geen uitgaven gelogd.'), {entries: 0}, [{id: income ? 'cash-flow' : 'spending'}]);
  const p = periodFor({...q, shape: 'amount'}, today, 'this-month'), category = q.subject?.kind === 'category' ? q.subject.name : null;
  const now = ledger(log.entries, kind, p, category), span = periodSpan(p, lang, today), day = (d: string) => dayWords(d, today), cur = now.currency;
  const what = category ? `${plain(category)}: ` : '', verb = income ? t(lang, 'came in', 'binnengekomen') : t(lang, 'spent', 'uitgegeven');
  const others = now.others.length ? t(lang, ` Also ${listWords(now.others.map(o => o.text), 'en')} in other currencies.`, ` Ook ${listWords(now.others.map(o => o.text), 'nl')} in andere valuta.`) : '';
  const widgets: ExactWidget[] = income ? [{id: 'cash-river', period: p.token, fallback: 'cash-flow'}] : q.ask === 'best' || q.shape === 'list' ? [{id: 'spending-ranks', period: p.token, fallback: 'spending'}, {id: 'spending-radar', period: p.token, fallback: 'spending'}] : q.shape === 'dates' || q.ask === 'not-done' ? [{id: 'spending-days', period: p.token, fallback: 'spending'}] : [{id: 'spending'}, {id: 'spending-radar', period: p.token, fallback: 'spending-pace'}];
  if (!cur) return out(income ? t(lang, `${what}No income logged ${span}.`, `${what}Geen inkomsten gelogd ${span}.`) : t(lang, `${what}Nothing logged as spent ${span}.`, `${what}Niets als uitgegeven gelogd ${span}.`), {total: 0, entries: 0}, widgets, p);
  const cats = byCategory(now.own, p.from, p.to, kind).filter(c => c.currency === cur).sort((a, b) => b.total - a.total), base = {currency: cur, totalCents: now.total, entries: now.own.length, categories: cats.map(c => ({category: c.category, cents: c.total}))};
  if (q.ask === 'compare' || q.ask === 'trend') {
    const other = q.versus ? resolvePeriod(q.versus, today) : previousPeriod(p, today);
    if (!other) return null;
    const before = ledger(log.entries.filter(e => e.currency === cur), kind, other, category), diff = now.total - before.total;
    const wb = q.versus ? periodWords(other, lang, today) : `${t(lang, 'the period before', 'de periode ervoor')} (${day(other.from)}${other.from === other.to ? '' : ` ${t(lang, 'to', 't/m')} ${day(other.to)}`})`;
    return out(`${what}${money(now.total, cur)} ${verb} ${periodWords(p, lang, today)}; ${money(before.total, cur)} ${wb}${diff === 0 ? t(lang, ', the same', ', gelijk') : t(lang, `, ${money(Math.abs(diff), cur)} ${diff > 0 ? 'more' : 'less'}`, `, ${money(Math.abs(diff), cur)} ${diff > 0 ? 'meer' : 'minder'}`)}.${others}`,
      {...base, compare: {now: {from: p.from, to: p.to, cents: now.total}, before: {from: other.from, to: other.to, cents: before.total}}}, [{id: 'compare-periods', ref: q.domain, period: p.token, fallback: income ? 'cash-flow' : 'spending-pace'}], p);
  }
  // The largest single entry ("my biggest expense").
  if ((q.ask === 'best' || q.ask === 'worst') && /\b(?:expense|purchase|payment|entry|uitgave|aankoop|betaling)\b/.test(q.read)) {
    const hit = now.own.reduce((a, e) => (q.ask === 'best' ? cents(e.amount) > cents(a.amount) : cents(e.amount) < cents(a.amount)) ? e : a);
    return out(t(lang, `Your ${q.ask === 'best' ? 'largest' : 'smallest'} ${income ? 'income entry' : 'expense'} ${span}: ${money(cents(hit.amount), cur)} on ${day(hit.date)} (${plain(hit.note?.trim() || hit.category)}).`, `Je ${q.ask === 'best' ? 'grootste' : 'kleinste'} ${income ? 'inkomst' : 'uitgave'} ${span}: ${money(cents(hit.amount), cur)} op ${day(hit.date)} (${plain(hit.note?.trim() || hit.category)}).`), {...base, entry: {day: hit.date, cents: cents(hit.amount), category: hit.category}}, widgets, p);
  }
  // Where the money went: the categories by size.
  if (!category && (q.ask === 'best' || q.ask === 'worst' || q.shape === 'list' || /\b(?:category|categories|categorie|categorieen|on what|waaraan|where did|waar ging|most on)\b/.test(q.read))) {
    const ranked = q.ask === 'worst' ? [...cats].reverse() : cats, top = ranked.slice(0, 4).map(c => `${plain(c.category)} ${money(c.total, cur)} (${formatPercent(c.total / now.total * 100)})`);
    return out(t(lang, `${money(now.total, cur)} ${verb} ${span}; ${q.ask === 'worst' ? 'least' : 'most'} on ${listWords(top, 'en')}.${others}`, `${money(now.total, cur)} ${verb} ${span}; het ${q.ask === 'worst' ? 'minst' : 'meest'} aan ${listWords(top, 'nl')}.${others}`), base, widgets, p);
  }
  // Days without an entry, or with one.
  if (q.ask === 'not-done' || q.ask === 'missed' || q.shape === 'dates') {
    const dates = [...new Set(now.own.map(e => e.date))].sort(), free = p.days.filter(d => !dates.includes(d) && d !== today), none = q.ask === 'not-done' || q.ask === 'missed';
    return out(none ? t(lang, `${what}No ${income ? 'income' : 'spending'} logged on ${free.length} ${free.length === 1 ? 'day' : 'days'} ${span}${free.length ? `: ${dayList(free, day, 'en')}` : ''}.`, `${what}Geen ${income ? 'inkomsten' : 'uitgaven'} gelogd op ${free.length} ${free.length === 1 ? 'dag' : 'dagen'} ${span}${free.length ? `: ${dayList(free, day, 'nl')}` : ''}.`)
      : t(lang, `${what}${money(now.total, cur)} ${verb} on ${dates.length} ${dates.length === 1 ? 'day' : 'days'} ${span}: ${dayList(dates, day, 'en')}.`, `${what}${money(now.total, cur)} ${verb} op ${dates.length} ${dates.length === 1 ? 'dag' : 'dagen'} ${span}: ${dayList(dates, day, 'nl')}.`), {...base, days: none ? free : dates}, [{id: 'spending-days', period: p.token, fallback: 'spending'}], p);
  }
  if (q.ask === 'average') {
    const per = Math.round(now.total / Math.max(1, p.days.length));
    return out(t(lang, `${what}${money(per, cur)} a day on average ${span} (${money(now.total, cur)} over ${p.days.length} days).${others}`, `${what}Gemiddeld ${money(per, cur)} per dag ${span} (${money(now.total, cur)} over ${p.days.length} dagen).${others}`), {...base, averageCents: per}, widgets, p);
  }
  const top = !category && cats[0] ? t(lang, `; most on ${plain(cats[0].category)} (${formatPercent(cats[0].total / now.total * 100)})`, `; het meest aan ${plain(cats[0].category)} (${formatPercent(cats[0].total / now.total * 100)})`) : '';
  return out(`${what}${money(now.total, cur)} ${verb} ${span}${income ? '' : top}, ${t(lang, `in ${now.own.length} ${now.own.length === 1 ? 'entry' : 'entries'}`, `in ${now.own.length} ${now.own.length === 1 ? 'boeking' : 'boekingen'}`)}.${others}`, base, widgets, p);
}

export function budgetsAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, record = env.nova?.budgets, log = env.moneyLog;
  if (!record || !log) return null;
  const card = budgetsCard(record, log.entries, today);
  const out = (text: string, facts: Record<string, unknown>): Exact => ({kind: 'answer', text, facts: {about: 'budgets', ask: q.ask, month: card.month, ...facts}, widgets: [{id: 'budget-gauges', fallback: 'budgets'}], query: q, source: t(lang, 'Your budgets and money log', 'Je budgetten en geldlog')});
  if (card.state === 'empty') return out(t(lang, 'You have no budgets yet.', 'Je hebt nog geen budgetten.'), {budgets: 0});
  const rows = card.lines.map(l => ({category: plain(l.category), over: l.over, spent: l.spent, available: l.available, words: l.words, share: l.share})), over = rows.filter(r => r.over), facts = {count: card.count, within: card.within, over: over.map(r => r.category), lines: rows};
  const nlWords = (r: typeof rows[number]) => r.over ? `over het budget (${r.spent} van ${r.available})` : `${r.spent} van ${r.available}`;
  const one = q.subject?.kind === 'category' ? rows.find(r => r.category.toLowerCase() === plain(q.subject!.name).toLowerCase()) : null;
  if (one) return out(t(lang, `${one.category}: ${one.spent} of ${one.available} this month, ${one.words}.`, `${one.category}: ${nlWords(one)} deze maand.`), {...facts, budget: one});
  if (q.ask === 'late' || q.ask === 'missed' || q.ask === 'worst' || /\b(?:over|exceeded|blown|overschreden)\b/.test(q.read)) return out(over.length
    ? t(lang, `${over.length} of ${card.count} budgets ${over.length === 1 ? 'is' : 'are'} over this month: ${listWords(over.map(r => `${r.category} (${r.spent} of ${r.available})`), 'en')}.`, `${over.length} van je ${card.count} budgetten ${over.length === 1 ? 'is' : 'zijn'} deze maand overschreden: ${listWords(over.map(r => `${r.category} (${r.spent} van ${r.available})`), 'nl')}.`)
    : t(lang, `No budget is over this month: all ${card.count} are within plan.`, `Geen budget is deze maand overschreden: alle ${card.count} zitten binnen plan.`), facts);
  const list = rows.slice(0, 6).map(r => lang === 'nl' ? `${r.category} ${nlWords(r)}` : `${r.category} ${r.spent} of ${r.available}${r.over ? ' (over)' : ''}`);
  return out(t(lang, `${card.within} of ${card.count} budgets within plan this month: ${listWords(list, 'en')}.`, `${card.within} van ${card.count} budgetten binnen plan deze maand: ${listWords(list, 'nl')}.`), facts);
}

export function billsAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, today = env.habitDay, record = env.ak?.bills;
  if (!record) return null;
  const card = billsCard(record, today), nl = lang === 'nl';
  const due = (days: number) => nl ? (days === 0 ? 'vandaag' : days === 1 ? 'morgen' : days > 1 ? `over ${days} dagen` : `${-days} ${days === -1 ? 'dag' : 'dagen'} te laat`) : (days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 1 ? `in ${days} days` : `overdue by ${-days} ${days === -1 ? 'day' : 'days'}`);
  const line = (l: typeof card.lines[number]) => `${plain(l.title)} ${l.amount}, ${due(l.days)} (${l.date})`;
  const out = (text: string, facts: Record<string, unknown>, widgets: ExactWidget[] = [{id: 'bill-timeline', fallback: 'bills'}]): Exact => ({kind: 'answer', text, facts: {about: 'bills', ask: q.ask, ...facts}, widgets, query: q, source: t(lang, 'Your bill reminders', 'Je rekeningen')});
  if (card.state === 'empty') return out(t(lang, 'No bill reminders yet.', 'Nog geen rekeningen als herinnering.'), {bills: 0});
  const rows = card.lines.map(l => ({bill: plain(l.title), amount: l.amount, due: l.due, days: l.days, overdue: l.overdue})), facts = {count: rows.length, bills: rows};
  const one = q.subject?.kind === 'bill' ? card.lines.find(l => l.id === q.subject!.id) : null;
  if (one) return out(t(lang, `${line(one)}.`, `${line(one)}.`), {...facts, bill: plain(one.title)});
  if (q.ask === 'late' || q.ask === 'missed' || q.ask === 'not-done') {
    const late = card.lines.filter(l => l.overdue);
    return out(late.length ? t(lang, `${late.length} ${late.length === 1 ? 'bill is' : 'bills are'} overdue: ${listWords(late.map(line), 'en')}.`, `${late.length} ${late.length === 1 ? 'rekening is' : 'rekeningen zijn'} te laat: ${listWords(late.map(line), 'nl')}.`) : t(lang, `No bill is overdue. Next: ${line(card.next!)}.`, `Geen rekening is te laat. De volgende: ${line(card.next!)}.`), {...facts, overdue: late.map(l => plain(l.title))});
  }
  if (q.ask === 'next' || (q.shape !== 'list' && q.shape !== 'count' && q.ask !== 'total' && !q.period)) return out(t(lang, `Next bill: ${line(card.next!)}${card.lines.length > 1 ? `; ${card.lines.length - 1} more after it` : ''}.`, `Volgende rekening: ${line(card.next!)}${card.lines.length > 1 ? `; daarna nog ${card.lines.length - 1}` : ''}.`), {...facts, next: plain(card.next!.title)});
  if (q.ask === 'total' || q.shape === 'amount') return out(t(lang, `Your bills come to about ${listWords(card.typical.map(x => x.text), 'en')} in a typical month (an estimate); ${listWords(card.month.map(m => `${m.text} in ${m.count} ${m.count === 1 ? 'bill' : 'bills'}`), 'en')} fall due in the next 30 days.`, `Je rekeningen komen op ongeveer ${listWords(card.typical.map(x => x.text), 'nl')} in een gewone maand (een schatting); ${listWords(card.month.map(m => `${m.text} in ${m.count} ${m.count === 1 ? 'rekening' : 'rekeningen'}`), 'nl')} in de komende 30 dagen.`), {...facts, typical: card.typical, next30: card.month});
  // Which bills are due: within the week when the words say so, else the next 30 days.
  const horizon = /\b(?:week)\b/.test(q.read) || q.period === 'this-week' ? 7 : 30, soon = card.lines.filter(l => l.days <= horizon);
  return out(soon.length ? t(lang, `${soon.length} ${soon.length === 1 ? 'bill falls' : 'bills fall'} due in the next ${horizon} days: ${listWords(soon.slice(0, 6).map(line), 'en')}.`, `${soon.length} ${soon.length === 1 ? 'rekening vervalt' : 'rekeningen vervallen'} in de komende ${horizon} dagen: ${listWords(soon.slice(0, 6).map(line), 'nl')}.`) : t(lang, `No bill falls due in the next ${horizon} days. Next: ${line(card.next!)}.`, `Geen rekening vervalt in de komende ${horizon} dagen. De volgende: ${line(card.next!)}.`), {...facts, dueSoon: soon.map(l => plain(l.title)), horizon});
}

/** Wealth's own totals (lib/ai/tools/wealth.ts, life-w.ts): net worth per currency, never converted. */
export function netWorthAnswer(q: Query, env: ToolEnv): Exact | null {
  const lang = q.lang, r = runTool('net_worth', {}, env), totalsR = runTool('totals_per_currency', {}, env);
  if (!r.ok && !totalsR.ok) return null;
  const amount = (text: string) => { const i = text.lastIndexOf(' '); return i > 0 ? formatCurrencyAmount(text.slice(0, i), text.slice(i + 1)) : text; };
  const per = r.ok ? (r.data.perCurrency as {currency: string; netWorth: string; assets: string; debts: string; holdingsWithAValue: string; accounts: number}[] | undefined) ?? [] : [];
  const out = (text: string, facts: Record<string, unknown>): Exact => ({kind: 'answer', text, facts: {about: 'networth', ask: q.ask, ...facts}, widgets: [{id: 'net-worth-river', fallback: 'net-worth-history'}, {id: 'net-worth'}], query: q, source: t(lang, 'Wealth on this device', 'Wealth op dit apparaat')});
  if (!per.length) {
    const tot = totalsR.ok ? (totalsR.data.totals as {currency: string; total: string}[] | undefined) ?? [] : [];
    if (!tot.length) return out(t(lang, 'Nothing is tracked on Wealth yet.', 'Er wordt nog niets gevolgd bij Wealth.'), {tracked: 0});
    return out(t(lang, `Tracked wealth: ${listWords(tot.map(x => amount(`${x.total} ${x.currency}`)), 'en')}. No accounts or debts are kept, so this is your holdings alone.`, `Gevolgd vermogen: ${listWords(tot.map(x => amount(`${x.total} ${x.currency}`)), 'nl')}. Er zijn geen rekeningen of schulden vastgelegd, dus dit zijn alleen je bezittingen.`), {totals: tot});
  }
  const sorted = [...per].sort((a, b) => Number(b.netWorth.split(' ')[0]) - Number(a.netWorth.split(' ')[0])), lead = sorted[0]!, unknown = r.ok && typeof r.data.holdingsWithoutAValue === 'number' ? r.data.holdingsWithoutAValue : 0;
  const rest = sorted.slice(1).map(x => amount(x.netWorth)), debts = Number(lead.debts.split(' ')[0]) > 0 ? t(lang, `, after ${amount(lead.debts)} of debts`, `, na ${amount(lead.debts)} aan schulden`) : '';
  return out(t(lang, `Net worth: ${amount(lead.netWorth)}${debts}${rest.length ? `; and ${listWords(rest, 'en')}, each currency on its own` : ''}.${unknown ? ` ${unknown} ${unknown === 1 ? 'holding has' : 'holdings have'} no known value and ${unknown === 1 ? 'is' : 'are'} not in it.` : ''}`, `Nettovermogen: ${amount(lead.netWorth)}${debts}${rest.length ? `; en ${listWords(rest, 'nl')}, elke valuta apart` : ''}.${unknown ? ` ${unknown} ${unknown === 1 ? 'bezitting heeft' : 'bezittingen hebben'} geen bekende waarde en ${unknown === 1 ? 'zit' : 'zitten'} er niet in.` : ''}`), {perCurrency: per, withoutValue: unknown});
}
