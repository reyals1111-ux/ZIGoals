import type {MoneyEntry} from '../../money-log/schema';
import {mineParts} from '../../money-log/counted';
import {monthOf} from '../../money-log/engine';
import type {MoneyMore} from '../../money-more/schema';
import {PAID_WITH_WORDS, byPaidWith, bySub, savedLabel} from '../../money-more/quick';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, isQuestion, list, MIXED, money, say, type Asked} from './av-words';
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
    if (!a || MIXED.test(a.f) || !isQuestion(a)) return null;
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
