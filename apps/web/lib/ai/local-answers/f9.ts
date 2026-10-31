import {weekStartOf} from '../../agenda/build';
import {dayDoses} from '../../supplements/log';
import {STATUS_WORDS, TOP_N, powerRanks, spreadLine, statusOf} from '../../zigchain-eco/validators';
import {addLocalDays} from '../../local-date';
import {formatClock, formatDate} from '../../visual-format';
import {ACTION_FENCE} from '../context/specialists';
import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED, text as clean} from '../tools/format';
import {DEBT_MODEL, DEBT_PLANNER_WHERE, debtSentence, debtView} from '../tools/f9-debt';
import {VALIDATORS_NOT_READ, agendaDays, chooserValidators} from '../tools/f9-tools';
import type {LocalReply} from './engine';

/**
 * Owner follow-up 1 (F9): the plain questions about the F4–F5 features answered on this device, with no AI request and
 * nothing sent: when the person is debt-free (the debt planner's own model), what is on their agenda, which supplements
 * are taken or still open today, and ZIGChain's validators in plain words (from what the Earn or Staking page read in this
 * visit); plus "open my agenda" and "open my Wrapped" as navigation cards. Asked after Session AF's answers and before the
 * lookups (engine.ts). English lookups only (a whole Dutch question stays the model's, as the engine's rule); the two
 * navigation asks in Dutch too. Advice, plans and anything that also asks for a change are never answered here.
 */
const FILL = String.raw`^(?:(?:please|hey|hi|ok|okay|so|zigi|hé|hoi),?\s+)*(?:(?:can|could|would|will) you\s+(?:please\s+)?|(?:kun|kan|wil) je\s+)?`;
const POLITE_END = String.raw`(?:\s+(?:please|for me|alsjeblieft|graag|even))?[.!?]?$`;
const WRAPPED = new RegExp(`${FILL}(?:(?:open|show(?: me)?|see|view|play|start|take me to|go to|toon|laat (?:me )?zien)\\s+)?(?:my |the |mijn |de )?(?:zigoals )?wrapped(?:\\s+(?:story|openen|zien|bekijken|tonen))?${POLITE_END}`, 'i');
const AGENDA_OPEN = new RegExp(`${FILL}(?:open|show(?: me)?|go to|take me to|bring up|toon|ga naar)\\s+(?:my |the |mijn |de )?(?:agenda|calendar|kalender)(?:\\s+(?:page|view|pagina))?(?:\\s+(?:for |on |op )?(?:the |this |deze |vandaag )?(today|day|week|month|vandaag|dag|maand))?${POLITE_END}|${FILL}(?:mijn |de )?(?:agenda|kalender)\\s+(?:openen|tonen|zien)${POLITE_END}`, 'i');
const NOT_HERE = /\b(?:should|recommend|advi[cs]e|suggest|better|worth|safe to|pick (?:one|a)|choose for me)\b|\b(?:and|then|also|en|dan)\s+(?:also\s+)?(?:log|add|set|mark|start|keep|put|remind|plan|tick|stake|delegate)\b/i;
const DUTCH = /\b(?:wat|wanneer|welke|hoeveel|mijn|ik|heb|ben|staat|vandaag)\b/i;
const DEBT_FREE = /\b(?:when (?:will|would|do|can|could) i be|when am i|when'?s|what is|what's) (?:my )?debt[- ]free\b|\bdebt[- ]free (?:month|date|by)\b|\bwhen (?:are|will|do) (?:all )?my debts? (?:be )?(?:paid off|cleared|gone|done)\b|\bhow long (?:until|till|before) i(?:'m| am)? (?:be )?debt[- ]free\b/i;
const AGENDA_ASK = /\b(?:what(?:'s| is| do i have)|anything) (?:on )?(?:my |the )?(?:agenda|calendar|schedule)\b|\bon my (?:agenda|calendar)\b|\bwhat(?:'s| is) (?:planned|coming up|scheduled)\b/i;
const OUTSIDE_TOP = /\bvalidators?\b.*\b(?:outside|not (?:in|among|one of)|beyond|smaller than|besides)\b.*\b(?:top|largest|biggest)\b|\b(?:smaller|smallest|less known) validators\b/i;
const LARGEST = /\b(?:which|what|who) (?:are )?(?:the )?(?:10|ten|largest|biggest)\b.*\bvalidators?\b|\b(?:top (?:10|ten)|largest|biggest) validators\b/i;
const SPREAD = /\bhow (?:spread(?: out)?|decentrali[sz]ed|concentrated)\b.*\b(?:stake|validators?|zigchain|network)\b|\b(?:nakamoto (?:count|coefficient)|stake (?:spread|distribution|concentration))\b/i;
const STATUS = /^(?:is (?:the )?(?:validator )?(.{2,60}?) (?:still )?(?:jailed|active|tombstoned|removed|inactive|in the active set|leaving)|(?:what(?:'s| is) )?(?:the )?status of (?:the )?(?:validator )?(.{2,60}?))\s*\??$/i;
const VALIDATOR_WORD = /\bvalidators?\b/i;
const SUPP_WORD = String.raw`(?:supplements?|medications?|medicines?|meds|vitamins?|pills?|doses?|tablets?)`;
const SUPP_TODAY = new RegExp(`\\b(?:which|what) ${SUPP_WORD}\\b.*\\b(?:left|due|still|today|open|not (?:yet )?taken|to take)\\b|\\b(?:did|have) i (?:take|taken|had) (?:all )?(?:my )?${SUPP_WORD}\\b`, 'i');
const SUPP_NAMED = /^(?:did i|have i) (?:take|taken|had) (?:my )?(.{2,60}?)(?:\s+(?:today|this morning|tonight|yet|already))*\s*\??$/i;
const fence = (action: Record<string, unknown>) => `\n\n\`\`\`${ACTION_FENCE}\n${JSON.stringify(action)}\n\`\`\``;
const fold = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function f9LocalAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim().replace(/\s+/g, ' ');
  if (!q || q.length > 200) return null;
  // Navigation: a card, no record read.
  if (WRAPPED.test(q)) return {kind: 'answer', text: `Opening ZIGoals Wrapped on Journey.${fence({kind: 'open-wrapped'})}`, calls: []};
  const agenda = AGENDA_OPEN.exec(q);
  if (agenda) {
    const word = (agenda[1] ?? '').toLowerCase(), view = word === 'today' || word === 'day' || word === 'vandaag' || word === 'dag' ? 'day' : word === 'month' || word === 'maand' ? 'month' : word === 'week' ? 'week' : null;
    return {kind: 'answer', text: `Opening the agenda.${fence({kind: 'open-agenda', ...(view ? {view} : {})})}`, calls: []};
  }
  if (NOT_HERE.test(q) || DUTCH.test(q)) return null;
  if (DEBT_FREE.test(q)) return debtAnswer(env);
  if (AGENDA_ASK.test(q)) return agendaAnswer(q, env);
  if (SUPP_TODAY.test(q)) return supplementsAnswer(env, null);
  const named = SUPP_NAMED.exec(q);
  if (named && env.ak?.supplements?.items?.some(i => fold(i.name) === fold(named[1]!))) return supplementsAnswer(env, named[1]!);
  if (OUTSIDE_TOP.test(q) || LARGEST.test(q) || SPREAD.test(q)) return validatorsAnswer(q, env, null);
  const status = STATUS.exec(q);
  if (status) {
    // A validator by its exact name, or the one name that holds the words; anything else stays the model's.
    const name = fold(status[1] ?? status[2] ?? ''), list = chooserValidators(env.earn);
    if (!list.length) return VALIDATOR_WORD.test(q) ? validatorsAnswer(q, env, null) : null;
    const exact = list.filter(v => fold(v.moniker) === name), near = exact.length ? exact : list.filter(v => name.length >= 3 && fold(v.moniker).includes(name));
    if (near.length === 1) return validatorsAnswer(q, env, fold(near[0]!.moniker));
  }
  return null;
}

function debtAnswer(env: ToolEnv): LocalReply {
  const calls = [{tool: 'debt_plan', args: {}, label: 'Debt payoff plan'}];
  if (!env.areas.wealth) return {kind: 'refusal', text: 'Wealth isn\'t shared with ZIGi here, so your debts are not read. Its switch is in Settings → ZIGi · Your Personal AI Companion.', calls};
  const views = debtView(env.accounts, env.ak?.debtPlanner, env.habitDay);
  if (!views.length) return {kind: 'answer', text: 'No debt with a balance is recorded on this device, so there is no debt-free month to work out. A loan, mortgage or credit card goes under Wealth → Accounts, debts & net worth, with what you owe and your yearly rate.', calls};
  return {kind: 'answer', text: [`From your own figures (${DEBT_PLANNER_WHERE}):`, ...views.slice(0, 4).map(v => `• ${debtSentence(v, env.habitDay)}`), `${DEBT_MODEL} Nothing is paid or moved.`].join('\n'), calls};
}

function agendaAnswer(q: string, env: ToolEnv): LocalReply {
  const today = env.habitDay, lower = q.toLowerCase();
  const [from, days, words] = /\btomorrow\b/.test(lower) ? [addLocalDays(today, 1), 1, 'tomorrow'] as const : /\btoday\b|\btonight\b/.test(lower) ? [today, 1, 'today'] as const
    : /\bnext week\b/.test(lower) ? [addLocalDays(weekStartOf(today), 7), 7, 'next week'] as const : [weekStartOf(today), 7, 'this week'] as const;
  const calls = [{tool: 'agenda', args: {from, days}, label: `Agenda · ${days} days`}];
  if (!env.areas.today) return {kind: 'refusal', text: 'Today isn\'t shared with ZIGi here, so the agenda is not read.', calls};
  const list = agendaDays(env, from, days).filter(d => days === 1 || d.date >= today);
  const lines: string[] = []; let shown = 0, total = 0;
  for (const d of list) {
    total += d.items.length;
    if (!d.items.length || shown >= 24) continue;
    const items = d.items.slice(0, 24 - shown); shown += items.length;
    lines.push(`${days === 1 ? '' : `${formatDate(d.date)}: `}${items.map(i => `${i.time ? `${formatClock(i.time)} ` : ''}${clean(i.title, 80)}${i.state === 'done' ? ' (done)' : i.state === 'skipped' ? ' (skipped)' : ''}`).join(', ')}`);
  }
  if (!total) return {kind: 'answer', text: `Nothing is planned ${words} in your records. The agenda gathers habits, planned contributions, bills, meals and reviews.${fence({kind: 'open-agenda', view: days === 1 ? 'day' : 'week'})}`, calls};
  return {kind: 'answer', text: [`On your agenda ${words}${total > shown ? ` (the first ${shown} of ${total})` : ''}:`, ...lines.map(l => `• ${l}`), 'No amounts here; each item opens where it lives on the agenda.'].join('\n') + fence({kind: 'open-agenda', view: days === 1 ? 'day' : 'week'}), calls};
}

function supplementsAnswer(env: ToolEnv, named: string | null): LocalReply {
  const calls = [{tool: 'supplements', args: {}, label: 'Supplements · today'}];
  if (!env.health) return {kind: 'refusal', text: HEALTH_CLOSED, calls};
  const record = env.ak?.supplements;
  if (!record || !(record.items ?? []).length) return {kind: 'answer', text: 'Nothing is kept in your supplements and medication log yet. It is under Health → Diary → Supplements and medication (optional).', calls};
  const doses = dayDoses(record, env.healthDay).filter(d => !named || fold(d.name) === fold(named));
  if (!doses.length) return {kind: 'answer', text: named ? `${clean(named, 60)} is not planned today.` : 'Nothing on your list is planned today.', calls};
  const line = (d: (typeof doses)[number]) => `${clean(d.name, 60)}${d.dose ? ` (${clean(d.dose, 60)})` : ''}${d.slot === 'any' ? ', as needed' : ` at ${formatClock(d.slot)}`}: ${d.status ?? 'not logged yet'}`;
  const open = doses.filter(d => d.status === null && d.slot !== 'any').length;
  return {kind: 'answer', text: [`Today, from your own log${open ? ` (${open} planned ${open === 1 ? 'dose' : 'doses'} not logged yet)` : ''}:`, ...doses.slice(0, 16).map(d => `• ${line(d)}`), 'Your own log: no advice and no dose checks.'].join('\n'), calls};
}

function validatorsAnswer(q: string, env: ToolEnv, named: string | null): LocalReply {
  const calls = [{tool: 'validators', args: {}, label: 'ZIGChain validators'}], list = chooserValidators(env.earn);
  if (!list.length) return {kind: 'answer', text: VALIDATORS_NOT_READ, calls};
  const tail = 'As read on the Earn page in this visit; never ranked by return, and not advice.';
  if (named) {
    const v = list.find(x => fold(x.moniker) === named)!, s = STATUS_WORDS[statusOf(v)];
    return {kind: 'answer', text: `${clean(v.moniker, 60)}: ${s.label}. ${s.means}\n${tail}`, calls};
  }
  if (!list.some(v => v.tokens !== '0')) return {kind: 'answer', text: `The stake behind each validator was not part of this read, so ZIGi cannot say which are the ${TOP_N} largest. Earn → Validators shows it.`, calls};
  const ranks = powerRanks(list), active = list.filter(v => ranks.has(v.operator)), name = (v: (typeof list)[number]) => clean(v.moniker || v.operator, 60);
  const spread = spreadLine(list) ?? '';
  if (SPREAD.test(q)) return {kind: 'answer', text: [`${active.length} validators are active. ${spread}`, tail].join('\n'), calls};
  const byRank = [...active].sort((a, b) => ranks.get(a.operator)! - ranks.get(b.operator)!);
  if (OUTSIDE_TOP.test(q)) {
    const outside = byRank.slice(TOP_N).map(name).sort((a, b) => a.localeCompare(b, 'en'));
    if (!outside.length) return {kind: 'answer', text: `There are ${active.length} active validators, so none is outside the ${TOP_N} largest. ${spread}\n${tail}`, calls};
    return {kind: 'answer', text: [`Of the ${active.length} active validators, ${outside.length} ${outside.length === 1 ? 'is' : 'are'} outside the ${TOP_N} largest by stake: ${outside.slice(0, 40).join(', ')}.`, `Choosing one of them helps keep ZIGChain in many hands. ${spread}`, tail].join('\n'), calls};
  }
  return {kind: 'answer', text: [`The ${Math.min(TOP_N, byRank.length)} largest active validators by stake:`, ...byRank.slice(0, TOP_N).map((v, i) => `${i + 1}. ${name(v)}`), spread, tail].filter(Boolean).join('\n'), calls};
}
