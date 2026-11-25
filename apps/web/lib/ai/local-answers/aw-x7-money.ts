import Decimal from 'decimal.js';
import type {Accounts} from '../../accounts/schema';
import {cardStatement, onlyCreditCard} from '../../accounts/card-statement';
import {paymentsLeft} from '../../bills/ends';
import type {BillsRecord} from '../../bills/schema';
import {moneyRemovedSchema, recentlyRemoved, KEEP_DAYS} from '../../money-log/removed';
import type {MoneyLog} from '../../money-log/schema';
import type {WealthSheet} from '../../wealth-sheet/schema';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, dayIn, isQuestion, list, MIXED, moneyIn, say, titleWords, type Asked, type Lang} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AW, round 7 X7 (money; Cashew, Money Manager): the on-device answers to this group's money features, in English
 * and Dutch, each read from the feature's own pure function (the figures its page shows) and only while Wealth is shared:
 * - "what did I remove recently" — Removed recently (#461, lib/money-log/removed.ts);
 * - "when does my phone contract bill end" — a bill that ends (#462, lib/bills/ends.ts);
 * - "how much is my next credit card payment" — a card's next payment (#464, lib/accounts/card-statement.ts).
 * A Dutch answer writes money ("€ 12,50") and dates the Dutch way. Facts from the person's own records; no money advice;
 * unknown is said in words, never as 0. Wired in lib/ai/local-answers/engine.ts before round 6's money answers;
 * lib/ai/local-answers/aw-x7-money.test.ts proves it claims none of the corpus questions. Null when it is not one of these.
 */
export function awX7MoneyAnswer(question: string, env: ToolEnv): LocalReply | null {
  try {
    const a = asked(question, env);
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
    return removed(a) ?? billEnds(a) ?? cardPayment(a);
  } catch { return null; }
}
const call = (tool: string, args: Record<string, unknown>, label: string) => [{tool, args, label}];
const cents = (amount: string) => new Decimal(amount).times(100).round().toNumber();
const PLACES = {
  removed: {en: 'Wealth → Spending → Removed recently', nl: 'Vermogen → Uitgaven → Removed recently'},
  bills: {en: 'Wealth → Upcoming bills → Bill tracker → Edit', nl: 'Vermogen → Komende rekeningen → Bill tracker → Edit'},
  accounts: {en: 'Wealth → Accounts → the card’s Sheet', nl: 'Vermogen → Rekeningen → Sheet van de kaart'},
} as const;
const plain = (title: string) => title.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?.*$/i, '').trim() || title;
const ak = (env: ToolEnv) => (env.ak ?? {}) as {bills?: BillsRecord | null; wealthSheet?: WealthSheet | null; moneyRemoved?: unknown; moneyLogBusiness?: MoneyLog | null};

// ── Removed recently (#461) ───────────────────────────────────────────────────────────────────────────────────────
/** "What did I remove recently", "which money entries did I delete lately", "wat heb ik onlangs verwijderd". */
function removed(a: Asked): LocalReply | null {
  const notMoney = /\b(?:notes?|notitie\w*|tasks?|taken|taak|habits?|gewoonte\w*|journal|dagboek|photos?|foto\w*|goals?|doelen|workouts?|chats?)\b/.test(a.f);
  const en = /\b(?:what|which)\b.*\b(?:did i|have i)\s+(?:remove|delete)d?\b.*\b(?:recently|lately|this month|in the last (?:30|thirty) days)\b|\b(?:recently|lately) (?:removed|deleted) (?:money |spending )?(?:entries|entry|expenses?|transactions?)\b|\bremoved recently\b/.test(a.f);
  const nl = /\b(?:onlangs|recent|laatst|kortgeleden)\b.*\bverwijderd\b|\bverwijderd\b.*\b(?:onlangs|recent|laatst|kortgeleden)\b|\bremoved recently\b/.test(a.f);
  if (!(en || nl) || notMoney) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = call('money_log', {removed: true}, 'Spending · removed recently');
  const parsed = moneyRemovedSchema.safeParse(ak(a.env).moneyRemoved ?? {version: 1, items: []});
  const log = a.env.moneyLog ?? {version: 1, entries: [], weekStartsOn: 'monday'} as MoneyLog;
  const now = a.env.now ?? new Date();
  const items = parsed.success ? recentlyRemoved(parsed.data, 'personal', log, now) : [];
  const business = parsed.success ? recentlyRemoved(parsed.data, 'business', ak(a.env).moneyLogBusiness ?? {version: 1, entries: [], weekStartsOn: 'monday'} as MoneyLog, now).length : 0;
  const more = business ? say(a.lang, ` Your business space has ${business} more there.`, ` Je zakelijke ruimte heeft er nog ${business}.`) : '';
  if (!items.length) return answer(say(a.lang, `Nothing removed in the last ${KEEP_DAYS} days.${more} An entry you remove in ${PLACES.removed.en.replace(' → Removed recently', '')} stays in ${PLACES.removed.en} for ${KEEP_DAYS} days, so you can put it back.`,
    `Niets verwijderd in de laatste ${KEEP_DAYS} dagen.${more} Een boeking die je verwijdert in ${PLACES.removed.nl.replace(' → Removed recently', '')} blijft ${KEEP_DAYS} dagen in ${PLACES.removed.nl}, zodat je hem kunt terugzetten.`), calls);
  const shown = items.slice(0, 5), row = (lang: Lang) => shown.map(i => `${plain(i.entry.note?.split(' · ')[0] || i.entry.category)} ${moneyIn(lang, cents(i.entry.amount), i.entry.currency)} (${dayIn(lang, i.entry.date, a.today)})`);
  const rest = items.length > shown.length ? say(a.lang, ` and ${items.length - shown.length} more`, ` en nog ${items.length - shown.length}`) : '';
  return answer(say(a.lang, `${items.length} ${items.length === 1 ? 'entry' : 'entries'} removed in the last ${KEEP_DAYS} days: ${list(row('en'), 'en')}${rest}.${more} Put any of them back in ${PLACES.removed.en}; each is kept ${KEEP_DAYS} days and counts in no figure meanwhile.`,
    `${items.length} ${items.length === 1 ? 'boeking' : 'boekingen'} verwijderd in de laatste ${KEEP_DAYS} dagen: ${list(row('nl'), 'nl')}${rest}.${more} Zet ze terug via ${PLACES.removed.nl}; elke boeking blijft ${KEEP_DAYS} dagen en telt intussen nergens mee.`), calls);
}

// ── A bill that ends (#462) ───────────────────────────────────────────────────────────────────────────────────────
/** "When does my phone contract bill end", "how many payments are left on my bills", "wanneer stopt mijn telefoonabonnement". */
function billEnds(a: Asked): LocalReply | null {
  const en = /\bwhen (?:does|will|do) (?:my |the )?.{2,60}? (?:end|stop|finish|run out)\b|\bhow many (?:payments|instalments|installments) (?:are |do i have )?(?:left|to go)\b|\b(?:last|final) payment of (?:my |the )\b|\bwhich bills? (?:end|stop)\b/.test(a.f);
  const nl = /\bwanneer (?:stopt|eindigt|loopt)\b|\bhoeveel (?:betalingen|termijnen) (?:heb ik |zijn er )?nog\b|\blaatste (?:betaling|termijn) van\b|\bwelke rekeningen (?:stoppen|eindigen)\b/.test(a.f);
  if (!(en || nl) || /\b(?:streak|reeks|fast\w*|vast\w*|challenge|uitdaging|journey|programme|program|focus|timer|period|cyclus|budget\w*|goal|doel\w*|trial)\b/.test(a.f)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const record = ak(a.env).bills, calls = call('bills', {ends: true}, 'Bills · when they end');
  const words = new Set(a.f.split(' ').map(w => w.replace(/(?<=\w{2})s$/, '')));
  const bills = record?.bills ?? [], named = bills.filter(b => { const t = titleWords(b.title).filter(w => !['bill', 'contract', 'subscription'].includes(w)); return t.length > 0 && t.every(w => words.has(w)); });
  const ending = bills.flatMap(b => { const left = paymentsLeft(b, a.today); return left ? [{b, left}] : []; });
  const line = (lang: Lang, x: (typeof ending)[number]) => x.left.ended ? say(lang, `${plain(x.b.title)} has ended: its last payment was on ${dayIn('en', x.left.last, a.today)}`, `${plain(x.b.title)} is gestopt: de laatste betaling was op ${dayIn('nl', x.left.last, a.today)}`)
    : say(lang, `${plain(x.b.title)}: ${x.left.of !== null ? `${x.left.left} of ${x.left.of} payments left` : `${x.left.left} ${x.left.left === 1 ? 'payment' : 'payments'} left`}, the last on ${dayIn('en', x.left.last, a.today)} (${moneyIn('en', cents(x.b.amount), x.b.currency)} each)`,
      `${plain(x.b.title)}: ${x.left.of !== null ? `nog ${x.left.left} van ${x.left.of} betalingen` : `nog ${x.left.left} ${x.left.left === 1 ? 'betaling' : 'betalingen'}`}, de laatste op ${dayIn('nl', x.left.last, a.today)} (${moneyIn('nl', cents(x.b.amount), x.b.currency)} per keer)`);
  const how = (lang: Lang) => say(lang, ` Set when a bill ends in ${PLACES.bills.en}: after a number of payments or on a date; after its last payment it leaves Upcoming, the calendar and the reminders.`, ` Stel in wanneer een rekening stopt via ${PLACES.bills.nl}: na een aantal betalingen of op een datum; na de laatste betaling verdwijnt hij uit Upcoming, de kalender en de herinneringen.`);
  if (!bills.length) return answer(say(a.lang, `No bills are kept yet.${how('en')}`, `Er zijn nog geen rekeningen.${how('nl')}`), calls);
  if (named.length === 1) {
    const b = named[0]!, x = ending.find(e => e.b.id === b.id);
    if (x) return answer(say(a.lang, `${line('en', x)}.`, `${line('nl', x)}.`), calls);
    return answer(say(a.lang, `${plain(b.title)} has no end set, so it keeps coming round.${how('en')}`, `${plain(b.title)} heeft geen einde ingesteld, dus hij blijft terugkomen.${how('nl')}`), calls);
  }
  if (!ending.length) return answer(say(a.lang, `None of your bills has an end set.${how('en')}`, `Geen van je rekeningen heeft een einde ingesteld.${how('nl')}`), calls);
  return answer(say(a.lang, `Bills with an end: ${list(ending.map(x => line('en', x)), 'en')}.`, `Rekeningen met een einde: ${list(ending.map(x => line('nl', x)), 'nl')}.`), calls);
}

// ── A card's next payment (#464) ──────────────────────────────────────────────────────────────────────────────────
/** "How much is my next credit card payment", "what is on my credit card so far this statement", "hoeveel is mijn volgende creditcardbetaling". */
function cardPayment(a: Asked): LocalReply | null {
  const en = /\bnext (?:credit ?card |card )payment\b|\b(?:credit ?card|card)(?:'s)? next payment\b|\bso far this statement\b|\b(?:on|to) my (?:credit ?)?card this statement\b|\bhow much will i (?:pay|owe) on my (?:credit ?)?card\b/.test(a.f);
  const nl = /\bvolgende (?:creditcardbetaling|betaling (?:van|op) (?:mijn |de )?(?:credit ?card|kaart))\b|\btot nu toe op (?:mijn |de )?(?:credit ?card|kaart)\b|\b(?:credit ?card|kaart) (?:dit|deze) afschrift\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'wealth'); if (shut) return shut;
  const calls = call('accounts', {kind: 'credit-card', statement: true}, 'Accounts · credit card statement');
  const accounts = (a.env.accounts ?? null) as Accounts | null, sheet = ak(a.env).wealthSheet ?? null, entries = a.env.moneyLog?.entries ?? [];
  const cards = (accounts?.items ?? []).filter(c => c.kind === 'credit-card' && !c.archivedAt);
  if (!cards.length) return answer(say(a.lang, 'No credit card is kept in Wealth → Accounts yet. Add one with its statement and due days to see its next payment worked out from your own entries.', 'Er staat nog geen creditcard in Vermogen → Rekeningen. Voeg er een toe met de afschrift- en betaaldag om de volgende betaling te zien, berekend uit je eigen boekingen.'), calls);
  const rows = (lang: Lang) => cards.map(c => {
    const days = sheet?.cards?.[c.id], s = cardStatement(c, entries, {statementDay: days?.statementDay ?? null, dueDay: days?.dueDay ?? null, onlyCard: onlyCreditCard(accounts, c)}, a.today);
    const m = (amount: string) => moneyIn(lang, cents(amount), c.currency);
    if (s.state === 'no-day') return say(lang, `${c.name}: not known yet — keep its statement day in ${PLACES.accounts.en}`, `${c.name}: nog niet bekend — leg de afschriftdag vast via ${PLACES.accounts.nl}`);
    if (s.state === 'no-entries') return say(lang, `${c.name}: not known yet — no entry in your money log is on this card (entries from its bank file, or marked “Paid with: credit card” while it is your only card in ${c.currency}, count)`, `${c.name}: nog niet bekend — geen boeking in je geldlog staat op deze kaart (boekingen uit het bankbestand, of met “Paid with: credit card” zolang het je enige kaart in ${c.currency} is, tellen mee)`);
    const next = s.next && !s.next.open && s.next.amount !== null
      ? say(lang, `next payment on ${dayIn('en', s.next.due, a.today)}: ${m(s.next.amount)} (statement of ${dayIn('en', s.next.statement, a.today)}${s.next.paid ? `, after ${m(s.next.paid)} you recorded paid` : ''})`, `volgende betaling op ${dayIn('nl', s.next.due, a.today)}: ${m(s.next.amount)} (afschrift van ${dayIn('nl', s.next.statement, a.today)}${s.next.paid ? `, na ${m(s.next.paid)} die je als betaald noteerde` : ''})`)
      : s.next?.open ? say(lang, `next payment on ${dayIn('en', s.next.due, a.today)}: its statement of ${dayIn('en', s.next.statement, a.today)} is still open`, `volgende betaling op ${dayIn('nl', s.next.due, a.today)}: het afschrift van ${dayIn('nl', s.next.statement, a.today)} loopt nog`)
      : say(lang, 'no due day kept, so no payment date', 'geen betaaldag vastgelegd, dus geen betaaldatum');
    return say(lang, `${c.name}: ${next}; so far this statement ${m(s.soFar.amount)}`, `${c.name}: ${next}; tot nu toe dit afschrift ${m(s.soFar.amount)}`);
  });
  return answer(say(a.lang, `${list(rows('en'), 'en')}. Worked out from your own entries on the card, less the payments you recorded; a fact, not advice.`, `${list(rows('nl'), 'nl')}. Berekend uit je eigen boekingen op de kaart, min de betalingen die je noteerde; een feit, geen advies.`), calls);
}
