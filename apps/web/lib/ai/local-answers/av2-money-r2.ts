import type {MoneyEntry} from '../../money-log/schema';
import {mineParts} from '../../money-log/counted';
import {monthOf} from '../../money-log/engine';
import type {MoneyMore} from '../../money-more/schema';
import {PAID_WITH_WORDS, byPaidWith, bySub, savedLabel} from '../../money-more/quick';
import {monthView} from '../../budgets/engine';
import {daysLeftInMonth, perDay} from '../../budgets/per-day';
import {ownBudgetRows, payeeBudgets} from '../../money-more/own-budgets';
import {billsToRecord, limitStates, unusualEntries} from '../../money-more/alerts';
import type {WealthSheet} from '../../wealth-sheet/schema';
import {besideWorth, loanRows, owedTotals} from '../../money-more/people';
import type {StoreCards} from '../../store-cards/schema';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, list, MIXED, money, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2, round 2 (money; Wallet by BudgetBakers, Spendee, Emma): the on-device answers to round 2's money
 * features, in English and Dutch, each read from the feature's own pure function (the figures its page shows) and only
 * while Wealth is shared. The lead wires `av2MoneyR2Answer` into lib/ai/local-answers/engine.ts beside `av2MoneyAnswer`
 * (asked before the exact layer). The new record `zigoals:money-more:v1` is read from `env.moneyMore` (the lead adds it to
 * the tool sources beside `moneyLog`); without it, those answers say where the figures live. Null when the question is
 * not one of these; every pattern reads the whole question, so nothing else is claimed.
 */
export function av2MoneyR2Answer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !(isQuestion(a) || /^(?:who|wie|aan wie)\b/.test(a.f))) return null;
    for (const one of ANSWERS) { const r = one(a); if (r) return r; }
    return null;
  } catch { return null; }
}
type Answer = (a: Asked) => LocalReply | null;
const ANSWERS: Answer[] = [];
export const addR2Answers = (...more: Answer[]) => { ANSWERS.push(...more); };
export const entriesOf = (env: ToolEnv): readonly MoneyEntry[] => env.moneyLog?.entries ?? [];
/** The money extras record, when the lead has added it to the tool sources (`moneyMore`, beside `moneyLog`). */
export const moreOf = (env: ToolEnv): MoneyMore | null => (env as ToolEnv & {moneyMore?: MoneyMore | null}).moneyMore ?? ((env.ak as {moneyMore?: MoneyMore | null} | null | undefined)?.moneyMore ?? null);
export const SPENDING = {en: 'Wealth → Spending', nl: 'Vermogen → Uitgaven'} as const;
export const BUDGETS_PLACE = {en: 'Wealth → Budgets', nl: 'Vermogen → Budgetten'} as const;
const thisMonth = (a: Asked) => monthOf(a.today);
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];

// ── Quick logging: saved entries, paid with, subcategories (#242, #244, #251) ────────────────────────────────────────
/** "What are my saved entries", "welke opgeslagen posten heb ik". */
function savedEntries(a: Asked): LocalReply | null {
  if (!/\bsaved (?:entries|entry|records?|transactions?)\b|\b(?:entry|record) templates?\b|\bopgeslagen (?:posten|boekingen|uitgaven)\b|\bsjablonen\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const saved = moreOf(a.env)?.saved ?? [], calls = call('money_more', {saved: true}, 'Money · saved entries');
  if (!saved.length) return answer(say(a.lang, `You have no saved entries yet. In ${SPENDING.en} → Log spending, fill in one you log often and choose “Keep as a saved entry”; it is then one tap beside Log spending.`,
    `Je hebt nog geen opgeslagen posten. In ${SPENDING.nl} → Log spending vul je er een in die je vaak logt en kies je “Keep as a saved entry”; dan is hij één tik naast Log spending.`), calls);
  const names = saved.map(s => savedLabel(s, money));
  return answer(say(a.lang, `${count(saved.length, 'en', ['saved entry', 'saved entries'], ['', ''])}: ${list(names, 'en')}. One tap beside Log spending logs it today, with Undo.`,
    `${count(saved.length, 'nl', ['', ''], ['opgeslagen post', 'opgeslagen posten'])}: ${list(names, 'nl')}. Eén tik naast Log spending logt hem vandaag, met Ongedaan maken.`), calls);
}
/** "How did I pay this month", "hoeveel heb ik deze maand contant betaald". */
function paidWith(a: Asked): LocalReply | null {
  const en = /\bhow did i pay\b|\bpaid (?:with|by) (?:cash|card|credit card|debit card)\b|\bin cash\b|\bpayment (?:methods?|types?)\b|\bby (?:payment )?method\b/.test(a.f) && !/\bsplit\b/.test(a.f);
  const nl = /\bhoe heb ik betaald\b|\bcontant\b|\bmet de (?:pinpas|creditcard)\b|\bbetaalmethodes?\b|\bper betaalwijze\b|\bbetaalwijzen?\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const {start, end} = thisMonth(a), rows = byPaidWith(entriesOf(a.env), start, end), marked = rows.filter(r => r.method !== 'unmarked'), calls = call('money_log', {by: 'paid-with', from: start, to: end}, 'Money log · paid with');
  if (!marked.length) return answer(say(a.lang, `No entry this month says how it was paid. When you log or edit one in ${SPENDING.en}, choose “Paid with” (cash, debit card, credit card, transfer); This month then shows the totals by method.`,
    `Geen post deze maand zegt hoe hij betaald is. Kies bij loggen of bewerken in ${SPENDING.nl} “Paid with” (contant, pinpas, creditcard, overboeking); Deze maand toont dan de totalen per betaalwijze.`), calls);
  const words = (lang: 'en' | 'nl') => rows.map(r => `${r.method === 'unmarked' ? say(lang, 'not said', 'niet gezegd') : PAID_WITH_WORDS[r.method][lang]} ${money(r.cents, r.currency)}`);
  return answer(say(a.lang, `Spent this month by how you paid: ${list(words('en'), 'en')}. Each currency on its own; only what counts in your spending.`,
    `Deze maand uitgegeven per betaalwijze: ${list(words('nl'), 'nl')}. Elke valuta apart; alleen wat in je uitgaven meetelt.`), calls);
}
/** "What did I spend per subcategory this month", "wat gaf ik uit per subcategorie". */
function subcategories(a: Asked): LocalReply | null {
  if (!/\bsub ?categor(?:y|ies)\b|\bsubcategorie(?:en|n)?\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const {start, end} = thisMonth(a), entries = entriesOf(a.env), cats = [...new Set(entries.filter(e => e.sub && e.kind === 'expense' && e.date >= start && e.date <= end).map(e => e.category))];
  const calls = call('money_log', {by: 'subcategory', from: start, to: end}, 'Money log · subcategories');
  if (!cats.length) return answer(say(a.lang, `No spending this month carries a subcategory. In ${SPENDING.en} → Log spending, open “Add a subcategory” under a category (Food & drink › Coffee); totals and budgets keep counting it in the main category.`,
    `Geen uitgave deze maand heeft een subcategorie. In ${SPENDING.nl} → Log spending open je “Add a subcategory” onder een categorie (Food & drink › Coffee); totalen en budgetten tellen hem gewoon in de hoofdcategorie.`), calls);
  const parts = (lang: 'en' | 'nl') => cats.map(c => `${c}: ${list(bySub(entries, c, start, end, mineParts).map(r => `${r.sub ?? say(lang, 'other', 'overig')} ${money(r.cents, r.currency)}`), lang)}`);
  return answer(say(a.lang, `This month by subcategory — ${parts('en').join('; ')}.`, `Deze maand per subcategorie — ${parts('nl').join('; ')}.`), calls);
}
addR2Answers(savedEntries, paidWith, subcategories);

// ── Budgets: a day's amount left, your own budgets, payee budgets (#243, #246, #247, #250) ───────────────────────────
/** The tags record, when the lead has added it to the tool sources (`moneyTags`); without it a tag budget counts nothing here. */
const taggedOf = (env: ToolEnv) => { const tags = (env as ToolEnv & {moneyTags?: {tags: Record<string, readonly string[]>} | null}).moneyTags?.tags ?? {}; return (tag: string) => new Set(Object.entries(tags).filter(([, list]) => list.includes(tag)).map(([id]) => id)); };
/** "How much can I spend per day", "hoeveel heb ik per dag over". */
function dayLeft(a: Asked): LocalReply | null {
  const en = /\b(?:per|a|each) day\b/.test(a.f) && /\b(?:left|spend|budgets?)\b/.test(a.f) && !/\b(?:steps?|water|calories|sleep|hours?)\b/.test(a.f);
  const nl = /\bper dag\b/.test(a.f) && /\b(?:over|uitgeven|budgetten?|besteden)\b/.test(a.f) && !/\b(?:stappen|water|slaap|uur)\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, month = a.today.slice(0, 7), calls = call('budgets', {month, perDay: true}, 'Budgets · a day left');
  const rows = record?.budgets.length ? monthView(entriesOf(a.env), record, month, a.today).rows : [], days = daysLeftInMonth(a.today);
  const lines = rows.map(r => ({r, d: perDay(r.left, days)})).filter(x => x.d !== null);
  if (!rows.length) return answer(say(a.lang, `You have no budgets yet. Set one in ${BUDGETS_PLACE.en}; each row then says about how much a day is left.`, `Je hebt nog geen budgetten. Stel er een in bij ${BUDGETS_PLACE.nl}; elke rij zegt dan ongeveer hoeveel er per dag over is.`), calls);
  if (!lines.length) return answer(say(a.lang, `No budget has money left this month, so there is nothing left a day. ${count(days, 'en', ['day', 'days'], ['', ''])} to go.`, `Geen budget heeft deze maand nog geld over, dus er is niets per dag over. Nog ${count(days, 'nl', ['', ''], ['dag', 'dagen'])}.`), calls);
  const words = lines.map(x => `${x.r.category} ${money(x.d!, x.r.currency)}`);
  return answer(say(a.lang, `About this much a day is left for the ${days} days to go: ${list(words, 'en')}. What is left divided by the days; a fact, not advice.`,
    `Ongeveer zoveel per dag is er over voor de ${days} dagen die nog komen: ${list(words, 'nl')}. Wat over is gedeeld door de dagen; een feit, geen advies.`), calls);
}
/** "How are my own budgets", "hoe staat mijn vakantiebudget". */
function ownBudgets(a: Asked): LocalReply | null {
  const en = /\b(?:my own|custom|one[ -]time|trip|holiday|tag) budgets?\b|\bbudgets? (?:on|for|by) (?:a |my )?(?:tags?|labels?)\b/.test(a.f);
  const nl = /\beigen budgetten?\b|\beenmalige? budgetten?\b|\b(?:vakantie|reis|label|tag)budgetten?\b|\b(?:vakantie|reis|label|tag)budget\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const rows = ownBudgetRows(moreOf(a.env), entriesOf(a.env), taggedOf(a.env), a.today), calls = call('money_more', {budgets: true}, 'Budgets · your own');
  if (!rows.length) return answer(say(a.lang, `You have none of your own budgets yet. In ${BUDGETS_PLACE.en} → Your own budgets, add one on a tag (a trip) or on chosen categories, each month or once between two days.`,
    `Je hebt nog geen eigen budgetten. In ${BUDGETS_PLACE.nl} → Your own budgets voeg je er een toe op een tag (een reis) of op gekozen categorieën, elke maand of eenmalig tussen twee dagen.`), calls);
  const line = (lang: 'en' | 'nl', r: (typeof rows)[number]) => `${r.budget.name}: ${money(r.spent, r.budget.currency)} ${say(lang, 'of', 'van')} ${money(r.amount, r.budget.currency)}, ${r.over ? `${money(-r.left, r.budget.currency)} ${say(lang, 'over', 'te veel')}` : `${money(r.left, r.budget.currency)} ${say(lang, 'left', 'over')}`}${r.state === 'running' ? `, ${count(r.daysLeft!, lang, ['day', 'days'], ['dag', 'dagen'])} ${say(lang, 'to go', 'te gaan')}${r.perDay !== null ? ` (${say(lang, 'about', 'ongeveer')} ${money(r.perDay, r.budget.currency)} ${say(lang, 'a day', 'per dag')})` : ''}` : r.state === 'ended' ? ` (${say(lang, 'ended', 'afgelopen')})` : ` (${say(lang, 'starts in', 'begint over')} ${count(r.daysToStart!, lang, ['day', 'days'], ['dag', 'dagen'])})`}`;
  return answer(say(a.lang, `${rows.map(r => line('en', r)).join('; ')}.`, `${rows.map(r => line('nl', r)).join('; ')}.`), calls);
}
/** "How are my payee budgets", "hoe staan mijn winkelbudgetten". */
function payeeBudgetsAnswer(a: Asked): LocalReply | null {
  if (!/\b(?:payee|merchant|shop|store) budgets?\b|\bbudgets? (?:per|for each) (?:payee|shop|store|merchant)\b|\bwinkelbudgetten?\b|\bbudgetten? per winkel\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = a.env.nova?.budgets, rows = record ? payeeBudgets(record, entriesOf(a.env), a.today) : [], calls = call('budgets', {payees: true, amounts: true}, 'Budgets · payee budgets');
  if (!rows.length) return answer(say(a.lang, `No payee has a budget yet. In ${BUDGETS_PLACE.en} → Watching payees, watch a shop and choose “Set an amount a month”.`, `Nog geen winkel heeft een budget. In ${BUDGETS_PLACE.nl} → Watching payees volg je een winkel en kies je “Set an amount a month”.`), calls);
  const line = (lang: 'en' | 'nl', r: (typeof rows)[number]) => `${r.payee}: ${money(r.thisMonth, r.currency)} ${say(lang, 'of', 'van')} ${money(r.amount, r.currency)}, ${r.over ? `${money(-r.left, r.currency)} ${say(lang, 'over', 'te veel')}` : `${money(r.left, r.currency)} ${say(lang, 'left', 'over')}`}${r.near ? say(lang, ', near the limit', ', bijna op') : ''}`;
  return answer(say(a.lang, `This month — ${rows.map(r => line('en', r)).join('; ')}.`, `Deze maand — ${rows.map(r => line('nl', r)).join('; ')}.`), calls);
}
addR2Answers(dayLeft, ownBudgets, payeeBudgetsAnswer);

// ── Alerts: unusual entries, balance lines per account, bills due now to record (#248, #249, #245) ────────────────────
/** "Is there any unusual spending", "zijn er ongewone uitgaven". */
function unusual(a: Asked): LocalReply | null {
  if (!/\b(?:unusual|odd|strange|out of the ordinary|above (?:the |its )?usual)\b.*\b(?:spending|entr(?:y|ies)|transactions?|payments?|purchases?)\b|\b(?:spending|entr(?:y|ies)|transactions?|payments?)\b.*\b(?:unusual|out of the ordinary|above (?:the |its |their )?usual)\b|\b(?:ongewone|ongebruikelijke|vreemde|afwijkende) (?:uitgaven|posten|betalingen|aankopen|transacties)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const found = unusualEntries(entriesOf(a.env), a.today), calls = call('money_log', {unusual: true, days: 14}, 'Money log · above the usual');
  if (!found.length) return answer(say(a.lang, 'Nothing in the last two weeks is well above its usual (more than twice the middle of its last ten, at the same payee or in the same category).',
    'Niets in de afgelopen twee weken ligt ver boven het gewone (meer dan twee keer het midden van de laatste tien, bij dezelfde winkel of in dezelfde categorie).'), calls);
  const line = (lang: 'en' | 'nl', u: (typeof found)[number]) => `${u.name} ${money(u.cents, u.entry.currency)} (${dayIn(lang, u.entry.date, a.today)}; ${say(lang, 'usually', 'meestal')} ${money(u.usual, u.entry.currency)})`;
  return answer(say(a.lang, `Above its usual in the last two weeks: ${list(found.slice(0, 4).map(u => line('en', u)), 'en')}. “That's fine” in ${SPENDING.en} stops one being named again.`,
    `Boven het gewone in de afgelopen twee weken: ${list(found.slice(0, 4).map(u => line('nl', u)), 'nl')}. “That's fine” in ${SPENDING.nl} zorgt dat er een niet opnieuw genoemd wordt.`), calls);
}
const sheetOf = (env: ToolEnv): WealthSheet | null => (env as ToolEnv & {wealthSheet?: WealthSheet | null}).wealthSheet ?? ((env.ak as {wealthSheet?: WealthSheet | null} | null | undefined)?.wealthSheet ?? null);
/** "Which accounts are past their balance limit", "welke rekeningen staan voorbij hun saldogrens". */
function balanceLines(a: Asked): LocalReply | null {
  if (!/\b(?:balance|account) (?:limits?|lines?|alerts?)\b|\baccounts? (?:below|above|past|over|under) (?:my |their |its )?(?:limits?|lines?)\b|\bsaldo ?(?:grenzen|grens|limieten?|alarmen?)\b|\brekeningen? (?:staan |zijn |komen )?(?:onder|boven|voorbij) (?:hun |mijn )?(?:grens|limiet)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const sheet = sheetOf(a.env), states = limitStates(a.env.accounts, sheet), calls = call('accounts', {limits: true}, 'Accounts · your balance lines');
  const set = Object.keys(sheet?.limits ?? {}).length;
  if (!states.length) return answer(say(a.lang, set ? `Every account with a line of yours is within it (${count(set, 'en', ['account', 'accounts'], ['', ''])} with a line).` : 'No account has a balance line yet. On Wealth, open an account’s Sheet and fill in “Tell me when it is below” (or above).',
    set ? `Elke rekening met een eigen grens zit erbinnen (${count(set, 'nl', ['', ''], ['rekening', 'rekeningen'])} met een grens).` : 'Nog geen rekening heeft een saldogrens. Open op Vermogen de Sheet van een rekening en vul “Tell me when it is below” (of above) in.'), calls);
  const line = (lang: 'en' | 'nl', s: (typeof states)[number]) => `${s.name} ${money(Math.round(Number(s.balance) * 100), s.currency)} (${dayIn(lang, s.date, a.today)}), ${s.side === 'below' ? say(lang, 'below', 'onder') : say(lang, 'above', 'boven')} ${money(Math.round(Number(s.line) * 100), s.currency)}`;
  return answer(say(a.lang, `${list(states.map(s => line('en', s)), 'en')}. From the latest balance you entered.`, `${list(states.map(s => line('nl', s)), 'nl')}. Uit het laatste saldo dat je invoerde.`), calls);
}
/** "Which bills do I still need to record", "welke vaste lasten moet ik nog vastleggen". */
function toRecord(a: Asked): LocalReply | null {
  if (!/\bbills?\b.*\b(?:to record|not (?:yet )?recorded|not in my (?:money )?log|still to (?:record|log|mark))\b|\b(?:record|log) (?:my )?(?:due )?bills?\b|\bplanned payments?\b|\bvaste lasten\b.*\b(?:vastleggen|boeken|noteren|loggen)\b|\bgeplande betalingen\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const due = billsToRecord(a.env.ak?.bills, entriesOf(a.env), a.today), calls = call('bills', {toRecord: true}, 'Bills · due now, not in your log');
  if (!due.length) return answer(say(a.lang, 'No bill due in the last three days is missing from your money log. When one is, Upcoming bills offers “Record it”: one tap, never by itself.',
    'Geen rekening van de afgelopen drie dagen ontbreekt in je geldlog. Als er een is, biedt Upcoming bills “Record it” aan: één tik, nooit vanzelf.'), calls);
  const line = (lang: 'en' | 'nl', l: (typeof due)[number]) => `${l.title} ${money(l.cents, l.currency)} (${dayIn(lang, l.due, a.today)})`;
  return answer(say(a.lang, `Due and not in your money log yet: ${list(due.map(l => line('en', l)), 'en')}. Wealth → Upcoming bills → Record it puts one in, with Undo.`,
    `Verlopen en nog niet in je geldlog: ${list(due.map(l => line('nl', l)), 'nl')}. Vermogen → Upcoming bills → Record it zet er een in, met Ongedaan maken.`), calls);
}
addR2Answers(unusual, balanceLines, toRecord);

// ── Between you and others: shared costs, lent and borrowed (#252, #253) ─────────────────────────────────────────────
/** "Who owes me money", "wie is mij nog geld schuldig". */
function whoOwes(a: Asked): LocalReply | null {
  if (!/\bwho owes me\b|\bowed to me\b|\bowes? me (?:money|anything)\b|\bshared costs?\b|\bsettle up\b|\bwie (?:is )?mij (?:nog )?(?:geld )?schuldig\b|\bwie moet mij (?:nog )?(?:geld )?(?:terug)?betalen\b|\bgedeelde kosten\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const more = moreOf(a.env), owed = owedTotals(more), lent = loanRows(more, a.today).filter(r => r.loan.kind === 'lent' && !r.loan.closed), calls = call('money_more', {owed: true}, 'Money · owed to you');
  if (!owed.length && !lent.length) return answer(say(a.lang, `Nobody owes you anything here. Share a cost by editing it in ${SPENDING.en} → Shared with others, or add money lent under Between you and others.`,
    `Niemand is je hier iets schuldig. Deel een uitgave door hem te bewerken in ${SPENDING.nl} → Shared with others, of voeg uitgeleend geld toe onder Between you and others.`), calls);
  const parts = (lang: 'en' | 'nl') => [...owed.map(o => `${o.name} ${money(o.cents, o.currency)} ${say(lang, 'for shared costs', 'voor gedeelde kosten')}`), ...lent.map(r => `${r.loan.name} ${money(r.left, r.loan.currency)} ${say(lang, 'lent', 'uitgeleend')}${r.loan.due ? ` (${say(lang, 'due', 'terug op')} ${dayIn(lang, r.loan.due, a.today)})` : ''}`)];
  return answer(say(a.lang, `Owed to you: ${list(parts('en'), 'en')}. Kept on this device only.`, `Je tegoed: ${list(parts('nl'), 'nl')}. Alleen op dit apparaat.`), calls);
}
/** "What have I lent and borrowed", "wat heb ik uitgeleend en geleend". */
function lentBorrowed(a: Asked): LocalReply | null {
  if (!/\b(?:lent|borrowed|lend|borrow|loans? (?:to|from) (?:friends|family|people))\b|\bwho do i owe\b|\b(?:uitgeleend|geleend|uitlenen|lenen)\b|\baan wie ben ik (?:nog )?(?:geld )?schuldig\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const rows = loanRows(moreOf(a.env), a.today).filter(r => !r.loan.closed), calls = call('money_more', {loans: true}, 'Money · lent and borrowed');
  if (!rows.length) return answer(say(a.lang, `Nothing lent or borrowed is open. Add one under ${SPENDING.en} → Between you and others: a name, an amount, and a due day with a reminder if you want one.`,
    `Er staat niets uitgeleend of geleend open. Voeg het toe onder ${SPENDING.nl} → Between you and others: een naam, een bedrag, en een terugbetaaldag met herinnering als je wilt.`), calls);
  const line = (lang: 'en' | 'nl', r: (typeof rows)[number]) => `${r.loan.kind === 'lent' ? say(lang, `lent to ${r.loan.name}`, `uitgeleend aan ${r.loan.name}`) : say(lang, `borrowed from ${r.loan.name}`, `geleend van ${r.loan.name}`)} ${money(r.left, r.loan.currency)} ${say(lang, 'left', 'over')}${r.loan.due ? ` (${r.state === 'overdue' ? say(lang, 'past due since', 'over tijd sinds') : say(lang, 'due', 'terug op')} ${dayIn(lang, r.loan.due, a.today)})` : ''}`;
  const totals = besideWorth(moreOf(a.env)).map(b => `${b.net < 0 ? '−' : '+'}${money(Math.abs(b.net), b.currency)}`);
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return answer(say(a.lang, `${cap(list(rows.map(r => line('en', r)), 'en'))}. Beside your net worth: ${list(totals, 'en')}.`, `${cap(list(rows.map(r => line('nl', r)), 'nl'))}. Naast je vermogen: ${list(totals, 'nl')}.`), calls);
}
addR2Answers(whoOwes, lentBorrowed);

// ── Store and club cards (#254) ─────────────────────────────────────────────────────────────────────────────────────
/** The store cards record, when the lead has added it to the tool sources (`storeCards`); the numbers are never said. */
const cardsOf = (env: ToolEnv): StoreCards | null => (env as ToolEnv & {storeCards?: StoreCards | null}).storeCards ?? ((env.ak as {storeCards?: StoreCards | null} | null | undefined)?.storeCards ?? null);
/** "Which store cards do I have", "welke klantenkaarten heb ik". */
function storeCards(a: Asked): LocalReply | null {
  if (!/\b(?:store|loyalty|club|membership|reward|bonus) cards?\b|\bklantenkaart(?:en)?\b|\bspaarkaart(?:en)?\b|\bpasjes? van (?:winkels|de winkel)\b|\bbonuskaart\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const cards = cardsOf(a.env)?.cards ?? [], calls = call('store_cards', {}, 'Store and club cards');
  if (!cards.length) return answer(say(a.lang, `You have no store cards here yet. In ${SPENDING.en} → Store and club cards, add one: type its number or read it from a photo; “Show” puts the barcode on the whole screen for the till.`,
    `Je hebt hier nog geen klantenkaarten. In ${SPENDING.nl} → Store and club cards voeg je er een toe: typ het nummer of lees het van een foto; “Show” zet de streepjescode schermvullend klaar voor de kassa.`), calls);
  return answer(say(a.lang, `${count(cards.length, 'en', ['store card', 'store cards'], ['', ''])}: ${list(cards.map(c => c.name), 'en')}. Open ${SPENDING.en} → Store and club cards → Show for the barcode.`,
    `${count(cards.length, 'nl', ['', ''], ['klantenkaart', 'klantenkaarten'])}: ${list(cards.map(c => c.name), 'nl')}. Open ${SPENDING.nl} → Store and club cards → Show voor de streepjescode.`), calls);
}
addR2Answers(storeCards);
