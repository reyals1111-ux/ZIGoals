import {owedAfterPayments} from '../../accounts/net-worth';
import {localDate} from '../../local-date';
import {isDebtKind, type Account} from '../../accounts/schema';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, list, MIXED, moneyIn, say, type Asked} from './av-words';
import type {LocalReply} from './engine';
import {periodIn, periodSpan, resolvePeriod, type Period} from './exact/period';
import {fold} from './exact/text';

/**
 * Session AW (fr-money, FR-AW-4; persona Tom): "How much have I paid off this week?" was answered with his spending
 * ("€127.44 spent this week… most on Groceries"), which is not debt paid off. Here "paid off / paid down / afgelost /
 * afbetaald" in a period is read from the payments recorded on the debts (Wealth → What you owe → Record a payment, kept in
 * `zigoals:accounts:v1` `payments`), per debt and in each debt's own currency, never converted; with none it says none,
 * and never falls back to spending. Read only while Wealth is shared; no money advice.
 * What it leaves to the answers that had it (lib/ai/local-answers/av2-money.ts): "how much debt did I pay down this year" and
 * "how much have I paid down" (the balances' change over the year), "which debts have I paid off" and the debt-free date.
 * Wired in lib/ai/local-answers/engine.ts before round 7's money answers; aw-fr-money.test.ts proves it claims none of the
 * corpus's other questions. Null when it is not one of these.
 */
export function awFrMoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    return paidInPeriod(a) ?? owedNl(a);
  } catch { return null; }
}

const PAID = /\b(?:paid|payed|pay) (?:off|down)\b|\b(?:afgelost|afbetaald)\b/;
const HOW_MUCH = /\bhow much\b|\bhoeveel\b|\bwhat (?:did|have) i\b|\bwat heb ik\b/;
// A date the plan works out, a remainder, a projection, which debts: other questions with other answers.
const OTHER = /\bdebt ?free\b|\bschuldenvrij\b|\bwhen\b|\bwanneer\b|\bwhich\b|\bwelke?\b|\bwill\b|\bwould\b|\bzal\b|\bzou\b|\bplan\b|\bextra\b|\bleft\b|\bremaining\b|\bstill\b|\bnog\b|\bto pay off\b|\bte (?:betalen|lossen)\b|\b20\d\d\b/;
// The balances' change over a year is av2-money.ts's answer ("paid down this year", "hoeveel heb ik afbetaald").
const PAID_DOWN = /\bpaid? down\b|\bpay down\b|\bhoeveel\b.*\b(?:afgelost|afbetaald)\b/;
const LONG = (token: string) => /^(?:this|last)-year$/.test(token) || Number(/^last-(\d+)-days$/.exec(token)?.[1] ?? 0) >= 365;
const CALLS = [{tool: 'accounts', args: {payments: true}, label: 'What you owe · payments recorded'}];
const PLACE = 'Wealth → What you owe';

type Paid = {account: Account; cents: bigint; payments: number; first: string};
const cents = (value: string, decimals: number): bigint => decimals === 2 ? BigInt(value) : decimals < 2 ? BigInt(value) * 10n ** BigInt(2 - decimals) : BigInt(value) / 10n ** BigInt(decimals - 2);

/** The payments recorded on each debt between two days (all of them without a period), the debts named in the question only when it names one. */
export function debtPaymentsIn(accounts: readonly Account[], from: string | null, to: string, question = ''): Paid[] {
  const debts = accounts.filter(x => isDebtKind(x.kind)), named = debts.filter(x => { const n = fold(x.name).replace(/\bshowcase data\b.*$/, '').trim(); return n.length >= 3 && ` ${question} `.includes(` ${n} `); });
  return (named.length ? named : debts).flatMap(account => {
    const paid = account.payments.filter(p => (from === null || p.date >= from) && p.date <= to);
    if (!paid.length) return [];
    return [{account, cents: paid.reduce((sum, p) => sum + cents(p.value, p.decimals), 0n), payments: paid.length, first: paid.map(p => p.date).sort()[0]!}];
  });
}

function paidInPeriod(a: Asked): LocalReply | null {
  if (!PAID.test(a.f) || !HOW_MUCH.test(a.f) || OTHER.test(a.f)) return null;
  const found = periodIn(a.f, a.today), token = found.token;
  if (token && (found.versus || found.weekday !== null)) return null;
  const period: Period | null = token ? resolvePeriod(token, a.today) : null;
  if (token && !period) return null;
  // No period, or a year: "how much have I paid down" and "hoeveel heb ik afbetaald" stay av2-money.ts's (the balances' change).
  if ((!token || LONG(token)) && PAID_DOWN.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const lang = a.lang, accounts = a.env.accounts?.items ?? [], span = period ? periodSpan(period, lang, a.today) : null;
  if (!accounts.some(x => isDebtKind(x.kind))) return answer(say(lang,
    `No debt is kept in ${PLACE}, so no payment is recorded on one. Spending is not counted as paying off a debt.`,
    `Er staat geen schuld in ${PLACE}, dus er is geen aflossing vastgelegd. Uitgaven tellen niet als aflossing.`), CALLS);
  const rows = debtPaymentsIn(accounts, period?.from ?? null, period?.to ?? a.today, a.f);
  if (!rows.length) return answer(say(lang,
    `No debt payment is recorded ${span ?? 'yet'}. A payment counts here once you record it with Record a payment on the debt in ${PLACE}; spending is not counted as paying off.`,
    `Er is ${span ?? 'nog'} geen aflossing vastgelegd. Een betaling telt hier zodra je hem vastlegt met Record a payment bij de schuld in ${PLACE}; uitgaven tellen niet als aflossing.`), CALLS);
  const n = rows.reduce((sum, r) => sum + r.payments, 0), first = rows.map(r => r.first).sort()[0]!;
  const parts = (l: 'en' | 'nl') => rows.map((r, i) => `${moneyIn(l, Number(r.cents), r.account.currency)} ${i === 0 ? (l === 'nl' ? 'afgelost op' : 'paid on') : (l === 'nl' ? 'op' : 'on')} ${r.account.name}`);
  const totals = [...rows.reduce((m, r) => m.set(r.account.currency, (m.get(r.account.currency) ?? 0n) + r.cents), new Map<string, bigint>())].sort(([x], [y]) => x.localeCompare(y));
  const inAll = rows.length > 1 ? say(lang, ` In all: ${list(totals.map(([c, v]) => moneyIn('en', Number(v), c)), 'en')}${totals.length > 1 ? ', one total per currency, never converted' : ''}.`, ` Samen: ${list(totals.map(([c, v]) => moneyIn('nl', Number(v), c)), 'nl')}${totals.length > 1 ? ', één totaal per valuta, nooit omgerekend' : ''}.`) : '';
  return answer(say(lang,
    `${list(parts('en'), 'en')} ${span ?? 'in all'}, in ${count(n, 'en', ['payment', 'payments'], ['', ''])} recorded in ${PLACE}${span ? '' : ` (the first on ${dayIn('en', first, a.today)})`}.${inAll}`,
    `${list(parts('nl'), 'nl')} ${span ?? 'in totaal'}, in ${count(n, 'nl', ['', ''], ['betaling', 'betalingen'])} vastgelegd in ${PLACE}${span ? '' : ` (de eerste op ${dayIn('nl', first, a.today)})`}.${inAll}`), CALLS);
}

// ── What is owed, in Dutch (FR-AW-3) ─────────────────────────────────────────────────────────────────────────────
// "Hoeveel schuld heb ik", "hoeveel moet ik nog aflossen": the English question is engine.ts's accountsAnswer (the accounts
// tool), the Dutch one had no answer at all. Both read the figure Wealth's row shows: the latest balance less the payments
// recorded since it (lib/accounts/net-worth.ts owedAfterPayments, the one function). One total per currency, never converted.
const OWE_NL = /\b(?:hoeveel|wat)\b.*\b(?:schuld|schulden|schuldig|nog (?:af te lossen|aflossen|af te betalen|afbetalen))\b|\b(?:hoeveel|wat)\b.*\b(?:creditcard|lening|hypotheek)\b.*\bopen\b|\b(?:hoeveel|wat)\b.*\bopen\b.*\b(?:creditcard|lening|hypotheek)\b/;
function owedNl(a: Asked): LocalReply | null {
  if (a.lang !== 'nl' || !OWE_NL.test(a.f) || PAID.test(a.f) || /\b(?:schuldenvrij|wanneer|welke?|plan|extra|20\d\d|vorige|dit jaar|deze (?:week|maand))\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = [{tool: 'accounts', args: {}, label: 'Accounts and debts'}];
  const debts = (a.env.accounts?.items ?? []).filter(x => isDebtKind(x.kind) && !x.archivedAt);
  if (!debts.length) return answer(`Er staat geen schuld in ${PLACE} op dit apparaat.`, calls);
  const day = localDate(a.env.now), rows = debts.map(account => ({account, owed: owedAfterPayments(account, day)})); // Review fix: Wealth's row's day
  const known = rows.filter(r => r.owed), unknown = rows.length - known.length;
  if (!known.length) return answer(`Geen van je schulden heeft al een saldo; voeg het toe in ${PLACE}.`, calls);
  const minor = (m: {value: bigint; decimals: number}) => m.decimals === 2 ? m.value : m.decimals < 2 ? m.value * 10n ** BigInt(2 - m.decimals) : m.value / 10n ** BigInt(m.decimals - 2);
  const totals = [...known.reduce((m, r) => m.set(r.account.currency, (m.get(r.account.currency) ?? 0n) + minor(r.owed!)), new Map<string, bigint>())].sort(([x], [y]) => x.localeCompare(y));
  const line = (r: (typeof known)[number]) => { const o = r.owed!, at = r.account.snapshots.find(s => s.date === o.date)!; return `- ${r.account.name}: ${moneyIn('nl', Number(minor(o)), r.account.currency)}${o.payments ? `, na ${count(o.payments, 'nl', ['', ''], ['betaling', 'betalingen'])} sinds je saldo van ${moneyIn('nl', Number(minor({value: BigInt(at.value), decimals: at.decimals})), r.account.currency)} op ${dayIn('nl', o.date, a.today)}` : ` op ${dayIn('nl', o.date, a.today)}`}`; };
  return answer([`Je hebt ${list(totals.map(([c, v]) => moneyIn('nl', Number(v), c)), 'nl')} schuld, over ${count(known.length, 'nl', ['', ''], ['schuld', 'schulden'])}, zoals ingevoerd op dit apparaat:`, ...known.map(line),
    ...(unknown ? [`${count(unknown, 'nl', ['', ''], ['schuld', 'schulden'])} zonder saldo ${unknown === 1 ? 'telt' : 'tellen'} niet mee`] : []), ...(totals.length > 1 ? ['Eén totaal per valuta, nooit omgerekend'] : [])].join('\n'), calls);
}
