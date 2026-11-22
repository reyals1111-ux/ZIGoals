import type {MoneyEntry} from '../../money-log/schema';
import {fromCents} from '../../money-log/engine';
import type {MoneyMore} from '../../money-more/schema';
import {leftThisMonth} from '../../budgets/left-this-month';
import {cashForecast, forecastDays, monthLows, plannedContributions, type ForecastLength, type KnownForecast} from '../../cash-forecast/model';
import {plannedForForecast, plannedStates} from '../../cash-forecast/planned';
import {formatCurrencyAmount, formatPercent} from '../../visual-format';
import type {WealthSheet} from '../../wealth-sheet/schema';
import {cardStates} from '../../wealth-sheet/cards';
import {NEED_WANT_WORDS, needWantMonth, shareOfIncome} from '../../money-insights/needs-wants';
import {monthWaterfall} from '../../money-insights/month-compare';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, monthIn, say, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2, round 3 (money; PocketGuard, Quicken Simplifi): the on-device answers to round 3's money features,
 * in English and Dutch, each read from the feature's own pure function (the figures its page shows) and only while
 * Wealth is shared. Spending figures come from Wealth → Spending's own `totals` / `byCategory` (through each feature's
 * function), so NOVA, ZIGi and the pages say the same amounts. A Dutch answer writes money the Dutch way ("€ 12,50") and
 * its days and months as Dutch words. The lead wires `av2R3MoneyAnswer` into lib/ai/local-answers/engine.ts before
 * `av2MoneyR2Answer`; lib/ai/local-answers/av2-r3-money.test.ts proves it claims none of the earlier money questions.
 * Null when the question is not one of these; every pattern reads the whole question, so nothing else is claimed.
 */
export function av2R3MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Answer = (a: Asked) => LocalReply | null;
const ANSWERS: Answer[] = [];
const add = (...more: Answer[]) => { ANSWERS.push(...more); };
/** Money in the answer's language: "€12.50" in English (the display locale), "€ 12,50" in Dutch. */
export const moneyIn = (lang: Lang, cents: number | bigint, currency: string) => formatCurrencyAmount(fromCents(Number(cents)), currency, lang === 'nl' ? 'nl-NL' : undefined);
/** A rounded figure ("about €1,235" / "ongeveer € 1.235"). */
const aboutIn = (lang: Lang, cents: bigint, currency: string) => moneyIn(lang, Math.round(Number(cents) / 100) * 100, currency).replace(/[.,]00(?=\D*$)/, '');
const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
const moreOf = (env: ToolEnv): MoneyMore | null => (env as ToolEnv & {moneyMore?: MoneyMore | null}).moneyMore ?? ((env.ak as {moneyMore?: MoneyMore | null} | null | undefined)?.moneyMore ?? null);
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];
export const PLACES = {
  budgets: {en: 'Wealth → Budgets', nl: 'Vermogen → Budgetten'},
  spending: {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'},
  forecast: {en: 'Wealth → Spending → Money tools → the cash forecast', nl: 'Vermogen → Uitgaven → Money tools → de kasprognose'},
} as const;
const contributionsOf = (a: Asked) => a.env.areas.goals ? plannedContributions(a.env.platform.goals) : [];

// ── Left this month, planned one-off costs, the forecast up to 12 months (#291, #292, #294) ────────────────────────────
/** "How much is left this month", "hoeveel heb ik deze maand over". */
function leftMonth(a: Asked): LocalReply | null {
  const en = /\b(?:left|leftover|remaining)\b.*\b(?:this|the) month\b|\bthis month\b.*\b(?:left|leftover)\b|\bleftover\b|\bin my pocket\b/.test(a.f) && /\b(?:how much|what s|whats|what is|show|tell)\b/.test(a.f);
  const nl = /\b(?:deze|de) maand\b.*\bover\b|\bover\b.*\bdeze maand\b|\bblijft er\b.*\bover\b/.test(a.f) && /\b(?:hoeveel|wat|toon)\b/.test(a.f);
  if (!(en || nl) || /\b(?:budgets?|budgetten?|per dag|a day|per day|each day|steps?|stappen|calories|water|habits?|gewoontes?|tasks?|taken|days? left|dagen)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const entries = entriesOf(a.env), calls = call('money_log', {left: 'this-month'}, 'Budgets · left this month');
  const rows = leftThisMonth({entries, budgets: a.env.nova?.budgets ?? null, bills: a.env.ak?.bills ?? null, contributions: contributionsOf(a), planned: plannedForForecast(moreOf(a.env), entries, a.today), today: a.today});
  if (!rows.length) return answer(say(a.lang, `Nothing to work out for this month yet. Log your income and spending in ${PLACES.spending.en}; ${PLACES.budgets.en} → Left this month then says what is left after your budgets, bills, Goal plans and planned costs.`,
    `Er is deze maand nog niets uit te rekenen. Log je inkomsten en uitgaven in ${PLACES.spending.nl}; ${PLACES.budgets.nl} → Left this month zegt dan wat er over is na je budgetten, rekeningen, doelplannen en geplande kosten.`), calls);
  const line = (lang: Lang) => rows.map(r => {
    const m = (c: number) => moneyIn(lang, c, r.currency), parts = [
      say(lang, `${m(r.spent)} spent`, `${m(r.spent)} uitgegeven`),
      ...(r.budgets.cents ? [say(lang, `${m(r.budgets.cents)} still in your budgets`, `${m(r.budgets.cents)} nog in je budgetten`)] : []),
      ...(r.bills.cents ? [say(lang, `${m(r.bills.cents)} in bills still due`, `${m(r.bills.cents)} aan rekeningen die nog komen`)] : []),
      ...(r.goals.cents ? [say(lang, `${m(r.goals.cents)} in Goal plans`, `${m(r.goals.cents)} aan doelplannen`)] : []),
      ...(r.planned.cents ? [say(lang, `${m(r.planned.cents)} in planned costs`, `${m(r.planned.cents)} aan geplande kosten`)] : []),
    ], figure = r.left < 0 ? say(lang, `${m(-r.left)} more than came in`, `${m(-r.left)} meer dan er binnenkwam`) : m(r.left);
    return say(lang, `Left this month in ${r.currency}: ${figure} — ${m(r.income)} income logged, less ${list(parts, 'en')}.`, `Deze maand over in ${r.currency}: ${figure} — ${m(r.income)} inkomen gelogd, min ${list(parts, 'nl')}.`);
  }).join(' ');
  return answer(`${line(a.lang)} ${say(a.lang, 'From your own records; a figure, not advice.', 'Uit je eigen gegevens; een bedrag, geen advies.')}`, calls);
}
/** "Which planned costs do I have", "welke geplande kosten heb ik". */
function plannedCosts(a: Asked): LocalReply | null {
  const en = /\bplanned (?:one ?off )?(?:costs?|spending|expenses?)\b|\bone ?off (?:costs?|expenses?)\b/.test(a.f);
  const nl = /\bgeplande (?:eenmalige )?(?:kosten|uitgaven)\b|\beenmalige (?:kosten|uitgaven)\b/.test(a.f);
  if (!(en || nl) || /\b(?:payments?|betalingen|bills?|rekeningen)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const states = plannedStates(moreOf(a.env)?.planned, entriesOf(a.env), a.today), open = states.filter(s => s.state === 'open'), calls = call('money_more', {planned: true}, 'Money · planned costs');
  if (!states.length) return answer(say(a.lang, `You have no planned one-off costs. Add one (a name, an amount and a day) under ${PLACES.budgets.en} → Left this month → Planned one-off costs, or in the cash forecast; it counts until your money log shows it or you clear it.`,
    `Je hebt geen geplande eenmalige kosten. Voeg er een toe (een naam, een bedrag en een dag) onder ${PLACES.budgets.nl} → Left this month → Planned one-off costs, of in de kasprognose; hij telt mee tot je geldlog hem toont of je hem wist.`), calls);
  const item = (lang: Lang, s: typeof states[number]) => `${s.cost.name} ${moneyIn(lang, Math.round(Number(s.cost.amount) * 100), s.cost.currency)} ${say(lang, 'on', 'op')} ${dayIn(lang, s.cost.date, a.today)}${s.overdue ? say(lang, ' (its day has passed)', ' (de dag is voorbij)') : ''}`;
  const seen = states.length - open.length, tail = (lang: Lang) => seen ? say(lang, ` ${seen} already seen in your money log, so no longer counted.`, ` ${seen} al gezien in je geldlog, dus telt niet meer mee.`) : '';
  if (!open.length) return answer(say(a.lang, `None still to come.${tail('en')}`, `Geen meer te gaan.${tail('nl')}`), calls);
  return answer(say(a.lang, `Still to come: ${list(open.map(s => item('en', s)), 'en')}. Each counts in your forecast and in Left this month.${tail('en')}`,
    `Nog te gaan: ${list(open.map(s => item('nl', s)), 'nl')}. Elk telt mee in je prognose en in Left this month.${tail('nl')}`), calls);
}
/** "What's my lowest cash in the next 6 months", "wat is mijn laagste saldo de komende 12 maanden". */
function forecastLows(a: Asked): LocalReply | null {
  const months = /\b(?:6|six|zes)\s+(?:months?|maanden)\b|\bhalf (?:a )?year\b|\bhalfjaar\b/.test(a.f) ? '6m' : /\b(?:12|twelve|twaalf)\s+(?:months?|maanden)\b|\b(?:a|next|this|one) year\b|\bkomend jaar\b|\bvolgend jaar\b|\been jaar\b/.test(a.f) ? '12m' : null;
  const en = /\b(?:lowest|how low|projected|forecast|expected)\b/.test(a.f) && /\b(?:cash|balance|money|savings?)\b/.test(a.f);
  const nl = /\b(?:laagste|hoe laag|prognose|verwacht)\b/.test(a.f) && /\b(?:saldo|geld|kas|rekening)\b/.test(a.f);
  if (!months || !(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const length: ForecastLength = months, calls = call('cash_forecast', {length}, `Cash forecast · next ${length === '6m' ? '6' : '12'} months`);
  const rows = a.env.accounts && a.env.ak?.bills ? cashForecast({accounts: a.env.accounts, bills: a.env.ak.bills, entries: entriesOf(a.env), ...(a.env.nova?.budgets ? {budgets: a.env.nova.budgets} : {}), contributions: contributionsOf(a), planned: plannedForForecast(moreOf(a.env), entriesOf(a.env), a.today), today: a.today, days: forecastDays(length, a.today)}).rows.filter((r): r is KnownForecast => r.known) : [];
  if (!rows.length) return answer(say(a.lang, `The forecast needs a cash or savings account with its balance (What you have → Accounts). Then ${PLACES.forecast.en} runs 60 days, 6 or 12 months ahead.`,
    `De prognose heeft een betaal- of spaarrekening met saldo nodig (What you have → Accounts). Dan rekent ${PLACES.forecast.nl} 60 dagen, 6 of 12 maanden vooruit.`), calls);
  const n = length === '6m' ? 6 : 12;
  const text = rows.map(r => {
    const lows = monthLows(r), worst = lows.reduce((m, x) => x.cents < m.cents ? x : m, lows[0]!);
    const each = (lang: Lang) => lows.map(x => `${monthIn(lang, x.month)} ${aboutIn(lang, x.cents, r.currency)}`);
    return say(a.lang, `${r.currency}, the next ${n} months: lowest about ${aboutIn('en', worst.cents, r.currency)} around ${dayIn('en', worst.date, a.today)}. Each month's lowest: ${list(each('en'), 'en')}.`,
      `${r.currency}, de komende ${n} maanden: het laagst ongeveer ${aboutIn('nl', worst.cents, r.currency)} rond ${dayIn('nl', worst.date, a.today)}. Het laagste punt per maand: ${list(each('nl'), 'nl')}.`);
  }).join(' ');
  return answer(`${text} ${say(a.lang, 'An estimate from your own records, not a promise.', 'Een schatting uit je eigen gegevens, geen belofte.')}`, calls);
}
add(leftMonth, plannedCosts, forecastLows);

// ── A credit card's limit, share used, statement and due days (#293) ───────────────────────────────────────────────
const sheetOf = (env: ToolEnv): WealthSheet | null => (env as ToolEnv & {wealthSheet?: WealthSheet | null}).wealthSheet ?? ((env.ak as {wealthSheet?: WealthSheet | null} | null | undefined)?.wealthSheet ?? null);
const pctIn = (lang: Lang, share: number) => lang === 'nl' ? `${Math.round(share * 100)}%` : formatPercent(share * 100);
/** "How much of my credit card limit have I used", "hoeveel van mijn creditcardlimiet heb ik gebruikt". */
function cardUse(a: Asked): LocalReply | null {
  const en = /\bcredit ?cards?\b/.test(a.f) && /\b(?:limits?|used|use|utili[sz]ation|available|due|statement)\b/.test(a.f);
  const nl = /creditcardlimiet/.test(a.f) || (/\bcreditcards?\b/.test(a.f) && /\b(?:limiet|gebruikt|beschikbaar|betalen|betaald|afschrift|vervalt)\b/.test(a.f));
  if (!(en || nl) || /\b(?:paid with|betaald met|spent with|uitgegeven met|by payment|per betaalwijze)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const cards = cardStates(a.env.accounts, sheetOf(a.env), a.today), calls = call('accounts', {kind: 'credit-card'}, 'Accounts · credit cards');
  if (!cards.length) return answer(say(a.lang, 'You have no credit card in What you owe. Add one as a credit card account, then its Sheet keeps its limit, statement day and due day.',
    'Je hebt geen creditcard bij What you owe. Voeg er een toe als creditcardrekening; het Sheet ervan bewaart de limiet, de afschriftdag en de betaaldag.'), calls);
  const one = (lang: Lang, c: typeof cards[number]) => {
    const m = (x: number) => moneyIn(lang, x, c.currency), bits: string[] = [];
    if (c.limit !== null && c.owed !== null) bits.push(say(lang, `${m(c.owed)} of ${m(c.limit)} used (${pctIn(lang, c.share ?? 0)}), ${c.available! >= 0 ? `${m(c.available!)} available` : `${m(-c.available!)} over the limit`}`, `${m(c.owed)} van ${m(c.limit)} gebruikt (${pctIn(lang, c.share ?? 0)}), ${c.available! >= 0 ? `${m(c.available!)} beschikbaar` : `${m(-c.available!)} boven de limiet`}`));
    else bits.push(say(lang, c.limit === null ? 'no limit kept yet (its Sheet keeps one)' : 'no balance yet, so the share used is not known', c.limit === null ? 'nog geen limiet bewaard (het Sheet bewaart er een)' : 'nog geen saldo, dus het gebruikte deel is niet bekend'));
    if (c.nextStatement) bits.push(say(lang, `statement ${dayIn('en', c.nextStatement, a.today)}`, `afschrift ${dayIn('nl', c.nextStatement, a.today)}`));
    if (c.nextDue) bits.push(say(lang, `due ${dayIn('en', c.nextDue, a.today)}`, `te betalen ${dayIn('nl', c.nextDue, a.today)}`));
    return `${c.name}: ${bits.join('; ')}`;
  };
  return answer(say(a.lang, `${cards.map(c => one('en', c)).join('. ')}. From the numbers you typed.`, `${cards.map(c => one('nl', c)).join('. ')}. Uit de getallen die je invulde.`), calls);
}
add(cardUse);

// ── Needs, wants and saving as the person's own shares of income (#295) ───────────────────────────────────────────
/** "How much went to needs and wants this month", "hoeveel ging er deze maand naar nodig en wensen". Never a target. */
function needsWants(a: Asked): LocalReply | null {
  const en = /\bneeds?\b.*\bwants?\b|\bwants?\b.*\bneeds?\b|\b50 ?30 ?20\b/.test(a.f);
  const nl = /\bnodig\b.*\bwensen\b|\bwensen\b.*\bnodig\b|\bbehoeften\b.*\bwensen\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const marks = a.env.moneyLog?.needWant, rows = needWantMonth(entriesOf(a.env), marks, a.today.slice(0, 7)), calls = call('money_log', {by: 'need-want', month: a.today.slice(0, 7)}, 'Money log · needs, wants and saving');
  const rule = /\b50 ?30 ?20\b/.test(a.f) ? say(a.lang, ' ZIGoals shows your own shares, never a split to aim for.', ' ZIGoals toont je eigen verdeling, nooit een verdeling om na te streven.') : '';
  if (!marks || !Object.keys(marks).length) return answer(say(a.lang, `No category is marked as a need, a want or saving yet. In ${PLACES.spending.en} → Your money over time → Needs, wants and saving, mark your categories; the month then shows what went to each, as a share of your income.${rule}`,
    `Nog geen categorie is gemarkeerd als nodig, wens of sparen. In ${PLACES.spending.nl} → Your money over time → Needs, wants and saving markeer je je categorieën; de maand toont dan wat er naar elk ging, als deel van je inkomen.${rule}`), calls);
  if (!rows.length) return answer(say(a.lang, `Nothing logged this month yet.${rule}`, `Deze maand is nog niets gelogd.${rule}`), calls);
  const text = rows.map(r => {
    const part = (lang: Lang, k: 'need' | 'want' | 'saving' | 'unmarked') => { const sh = shareOfIncome(r.parts[k].cents, r), label = k === 'unmarked' ? say(lang, 'not marked', 'niet gemarkeerd') : NEED_WANT_WORDS[k][lang].toLowerCase(); return `${label} ${moneyIn(lang, r.parts[k].cents, r.currency)}${sh === null ? '' : ` (${lang === 'nl' ? `${Math.round(sh * 100)}%` : formatPercent(sh * 100)})`}`; };
    const keys = (['need', 'want', 'saving', 'unmarked'] as const).filter(k => k !== 'unmarked' || r.parts.unmarked.cents > 0);
    return say(a.lang, `This month in ${r.currency}${r.income ? `, of ${moneyIn('en', r.income, r.currency)} income logged` : ' (no income logged, so no shares)'}: ${list(keys.map(k => part('en', k)), 'en')}.`,
      `Deze maand in ${r.currency}${r.income ? `, van ${moneyIn('nl', r.income, r.currency)} gelogd inkomen` : ' (geen inkomen gelogd, dus geen aandelen)'}: ${list(keys.map(k => part('nl', k)), 'nl')}.`);
  }).join(' ');
  return answer(`${text} ${say(a.lang, 'Your own marks and figures, not a target.', 'Je eigen markeringen en bedragen, geen doel.')}${rule}`, calls);
}
add(needsWants);

// ── A month waterfall: what moved this month's spending from last month's (#297) ───────────────────────────────────
const signedIn = (lang: Lang, cents: number, currency: string) => `${cents < 0 ? '−' : '+'}${moneyIn(lang, Math.abs(cents), currency)}`;
/** "What changed in my spending since last month", "wat is er veranderd in mijn uitgaven sinds vorige maand". */
function spendingWaterfall(a: Asked): LocalReply | null {
  const en = /\bwhat (?:changed|moved)\b.*\bspending\b|\bspending\b.*\bwaterfall\b|\bwaterfall\b|\bwhy (?:did|has|is) my spending (?:go |gone )?(?:up|down)\b/.test(a.f);
  const nl = /\bwat (?:is er )?veranderd\b.*\buitgaven\b|\bwaardoor\b.*\buitgaven\b.*\b(?:hoger|lager|gestegen|gedaald)\b|\bwaterval\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const rows = monthWaterfall(entriesOf(a.env), a.today, 'so-far').filter(w => w.recorded), calls = call('money_log', {waterfall: 'so-far'}, 'Spending · what changed');
  if (!rows.length) return answer(say(a.lang, `There is nothing to compare yet: last month has no spending in your money log. Once it has, ${PLACES.spending.en} → Your money over time → What changed shows how the total moved, category by category.`,
    `Er is nog niets te vergelijken: vorige maand staat er geen uitgave in je geldlog. Daarna toont ${PLACES.spending.nl} → Your money over time → What changed hoe het totaal bewoog, per categorie.`), calls);
  const text = rows.map(w => {
    const top = (lang: Lang) => w.steps.slice(0, 5).map(st => `${st.category} ${signedIn(lang, st.change, w.currency)}`), more = w.steps.length - 5;
    return say(a.lang, `In ${w.currency}: ${moneyIn('en', w.before, w.currency)} last month to ${dayIn('en', w.from.end, a.today)}, ${moneyIn('en', w.after, w.currency)} this month so far (${signedIn('en', w.after - w.before, w.currency)})${w.steps.length ? `; most moved by ${list(top('en'), 'en')}${more > 0 ? ` and ${more} more` : ''}` : '; no category moved'}.`,
      `In ${w.currency}: ${moneyIn('nl', w.before, w.currency)} vorige maand t/m ${dayIn('nl', w.from.end, a.today)}, ${moneyIn('nl', w.after, w.currency)} deze maand tot nu toe (${signedIn('nl', w.after - w.before, w.currency)})${w.steps.length ? `; het meest door ${list(top('nl'), 'nl')}${more > 0 ? ` en nog ${more}` : ''}` : '; geen categorie veranderde'}.`);
  }).join(' ');
  return answer(`${text} ${say(a.lang, 'From your own entries; a comparison, not a forecast.', 'Uit je eigen invoer; een vergelijking, geen voorspelling.')}`, calls);
}
add(spendingWaterfall);
