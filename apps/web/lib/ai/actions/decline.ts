/**
 * Session X-Local Phase 2, fix round 9 (ADR-017 S75): a decline sends no card.
 *
 * The protocol is plain: ZIGi can never move money, and when it declines it proposes nothing in that reply (no card in
 * place of what was refused). Seen on the Mac's qwen3.6 in the day scenario ("Move everything into bitcoin now"): the
 * reply declined in words and still carried a pre-fill card for the add-asset form. This device-side rule enforces the
 * sentence for the money asks: when the message starts with a money verb (buy, sell, trade, swap, fund, transfer,
 * send, move, withdraw, deposit, stake, convert, allocate, rebalance, in English or Dutch) and the reply's words
 * decline (the same cue the repair round reads, `REFUSAL_REPLY`), every proposal block is dropped and the words stand.
 * Deliberately narrow: a destructive verb (delete, archive) is not covered, so "Remove sugar from my list" with a reply
 * that declines the deletion and offers a card keeps its card; a reply that does not decline keeps everything; a reply
 * with no block comes back byte for byte.
 */
import {detectIntent, REFUSAL_REPLY} from '../intent';
import {FENCE} from './parse';
import {normalizeSpoken} from '../spoken/normalize';

const LEAD = '^(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |and |also |now |then |dan |nu |zigi,? |nova,? )*';
const MONEY_ASK = new RegExp(`${LEAD}(?:buy|sell|trade|swap|fund|transfer|withdraw|deposit|stake|unstake|convert|allocate|reallocate|rebalance|wire|pay|koop|verkoop|verhandel|stort|verstuur|wissel)\\b`, 'i');
/**
 * Session AI (A3-r2): "move", "send", "put", "zet" and "verplaats" also mean other things ("move my weekly review", "zet
 * mijn ijzerdoel op 18 mg"), so they make a money ask only with money in the same sentence: an amount, a currency, an
 * asset, an account or savings.
 */
const MAYBE_MONEY = new RegExp(`${LEAD}(?:move|send|put|zet|verplaats)\\b`, 'i');
const MONEY_WORDS = /[€$£]|\b(?:euros?|eur|usd|dollars?|pounds?|money|cash|geld|bitcoin|btc|eth|ether|zig|crypto|coins?|tokens?|stocks?|shares?|gold|goud|savings?|spaar\w*|accounts?|rekening\w*|wallet|portfolio|holdings?|everything|alles|fund|fonds)\b/i;
/** Whether the message is a money ask ZIGi always declines (a verb that moves money, at the start). */
export const isMoneyAsk = (message: string): boolean => { const t = message.trim(); return MONEY_ASK.test(t) || (MAYBE_MONEY.test(t) && MONEY_WORDS.test(t.split(/[.!?\n]/)[0]!)); };
const MONEY_VERB = /\b(?:buy|sell|trade|swap|fund|transfer|send|move|withdraw|deposit|stake|wire|pay|koop|verkoop|stort|verstuur|verplaats|zet|wissel)\b/i;
/** An ask that tells ZIGi to ignore its rules: a money card is never the answer to it (A3-r2, p2-inj-nl). */
const INJECTION = /\b(?:ignore|disregard|forget|override)\b.{0,30}\b(?:rules|instructions|guidelines|prompt)\b|\bnegeer\b.{0,30}\b(?:regels|instructies)\b|\bvergeet\b.{0,30}\b(?:regels|instructies)\b/i;

/**
 * Session AF (ADR-028 D7, H47; `TIER 3 (wallet/signing)`): the one card a staking ask may keep beside a decline is the
 * staking review filled in (`prefill-staking`): "I can't stake for you; here is the review, filled in" is the answer the
 * owner asked for, and the card only opens the Staking page's review the person signs in their own wallet. Every other
 * block of a declined money ask still goes, and a non-staking ask keeps the rule exactly as before.
 */
const STAKING_ASK = /\b(?:stake|staking|unstake|restake|delegate|undelegate|redelegate|claim|rewards?|validator|staken|inzetten|delegeren)\b/i;
const STAKING_BLOCK = /"kind"\s*:\s*"(?:prefill[-_ ]?staking|staking[-_]review|start[-_]staking|staking[-_]prefill|prefill[-_]stake)"/i;
/**
 * Session AI (A3-r1): two more asks have no card, so their decline keeps no block either — ticking a milestone as reached
 * (milestones are ticked on the goal itself) and remembering a Health value (Remember never holds a figure from Health).
 * Real models declined both in words and still sent a note or Remember card "in its place". Deliberately narrow: a partial
 * decline of any other ask keeps its cards.
 */
const NO_CARD_ASK = /\b(?:mark|tick|check off|set|markeer|zet|vink)\b.{0,40}\b(?:milestone|mijlpaal)\b.{0,80}\b(?:reached|done|complete[d]?|ticked|behaald|gehaald|afgevinkt)\b|\b(?:milestone|mijlpaal)\b.{0,80}\b(?:as|als|op)\s+(?:reached|done|complete[d]?|behaald|gehaald|afgevinkt)\b|\b(?:remember|onthoud)\b.{0,60}\b(?:weight|weigh|blood pressure|heart rate|bloeddruk|gewicht|hartslag)\b/i;
/** Adding a milestone ("Add a milestone: visa done") is a card, never the declined tick (A3-r2, p2-carry-milestone). */
const ADD_MILESTONE = /\b(?:add|new|create|voeg|nieuwe|maak)\b.{0,20}\b(?:milestones?|mijlpalen|mijlpaal)\b/i;
/**
 * The Fund form filled in (`prefill-contribution`) is the answer to "fund my goal with 300" — the person submits it on
 * Goals themselves, like the staking review — so a goal-funding ask keeps that one card beside its "I can't move money"
 * line (A3-r1: correct replies lost their card). Every other block of a declined money ask still goes.
 */
const FUND_ASK = /\b(?:fund|contribut\w*|goal|doel|stort\w*|bijdrage|inleg)\b/i;
const OPEN_ONLY = /"kind"\s*:\s*"(?:open-page|open-search)"/i;
const FUND_BLOCK = /"kind"\s*:\s*"prefill[-_ ]?contribution"/i;
export function stripDeclinedBlocks(reply: string, message: string): string {
  if (reply.search(FENCE) < 0) return reply;
  const spoken = normalizeSpoken(message), noCard = NO_CARD_ASK.test(spoken) && !ADD_MILESTONE.test(spoken), money = isMoneyAsk(message);
  // An ask to ignore the rules that asks to move money gets no card at all, declined in words or not.
  if (INJECTION.test(message) && (money || (MONEY_VERB.test(message) && MONEY_WORDS.test(message)))) return tidy(reply.replace(FENCE, ''));
  const words = reply.replace(FENCE, ' ').trim(), declined = REFUSAL_REPLY.test(words.slice(0, 400));
  // A3-r2: a decline answered with only a page to open (music, sharing, an import) is a card in place of what was refused.
  if (declined && !money && !noCard) { const blocks = reply.match(FENCE) ?? []; return blocks.length && blocks.every(b => OPEN_ONLY.test(b)) ? tidy(reply.replace(FENCE, '')) : reply; }
  if ((!money && !noCard) || !declined) return reply;
  const keepStaking = !noCard && STAKING_ASK.test(message), keepFund = !noCard && FUND_ASK.test(message);
  return tidy(reply.replace(FENCE, block => (keepStaking && STAKING_BLOCK.test(block)) || (keepFund && FUND_BLOCK.test(block)) ? block : ''));
}

/**
 * Session AI (ZI1, G1; Grok's BUG-057, L-004, N-075, N-010, T-066): a question gets an answer, never a write preview.
 * "How much water did I drink?" came back as "Will save: Water", and "Explain my P&L" offered to save water. When the
 * message only asks, every block that would write is dropped and the words stand. Kept: the blocks that only open a
 * page, a search, a review or the calculator (they change nothing). A reply with no block comes back byte for byte.
 *
 * What "only asks" means (A3-r1, the first real-model round after the rule: the first reading took any lookup word —
 * show, average, what, when, streak — as a question and stripped correct cards from 61 commands): the message is split
 * into sentences and into ", and …" / "; …" clauses, spoken fillers out first. A clause asks when it starts with a
 * question or lookup lead (how, what, which, average, list, show me, did I, is my …, hoe, wat, welke …) or ends in "?",
 * and carries no command: no write verb at its start or after "and/then/en/dan", no "log it" / "put that in", no
 * "show … in the keto view / on Today" (a view setting), no "laat … zien" with a view or page, and no polite request
 * ("can you …", "kun je …") at its start or after a comma. One clause that is not a question keeps every card.
 */
const FILLERS = '(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |and |also |zigi,? |hé |hoi )*';
const POLITE_REQUEST = new RegExp(`(?:^|,\\s*)${FILLERS}(?:can|could|would|will|wil|kun|kan|zou)\\s+(?:you|u|je|jij)\\b|^(?:please|alsjeblieft|graag)\\b|\\b(?:i'?d like you to|i want you to|wil ik dat)\\b`, 'i');
const EXPLAIN_ASK = new RegExp(`^${FILLERS}(?:explain|tell me|show me|summari[sz]e|describe|compare|walk me through|give me (?:an? )?(?:overview|summary|breakdown)|vertel|geef (?:me )?(?:een )?(?:overzicht|samenvatting))\\b|^(?:leg|vat|laat)\\b[^.!?\\n]{0,60}\\b(?:uit|samen|zien)\\s*[.!?]?$`, 'i');
const QUESTION_LEAD = new RegExp(`^${FILLERS}(?:how|what(?:'s)?|which|when|where|why|who|whose|average|avg|total|list|show|hoe|hoeveel|wat|welke?|wanneer|waar|waarom|wie|did (?:i|my)|do i|does my|have i|has my|am i|is (?:my|there|it)|are (?:my|there|we)|was (?:my|it)|were my|can i|should i|heb ik|ben ik|is mijn|zijn mijn|was mijn|kan ik|moet ik)\\b`, 'i');
const WRITE_VERB = '(?:log|record|track|add|set|make|create|mark|tick|put|use|move|rename|call|pause|resume|stack|switch|turn|remember|remind|start|stop|skip|save|plan|note|change|hide|unhide|noteer|voeg|zet|maak|vink|markeer|herinner|onthoud|pauzeer|hernoem|plan|sla|stel|gebruik|verplaats|begin)';
const COMMAND = new RegExp(`^${FILLERS}${WRITE_VERB}\\b|\\b(?:and|then|en|dan|also|ook)\\s+(?:also\\s+|ook\\s+)?${WRITE_VERB}\\b|\\blog (?:it|that|this)\\b|\\bput (?:it|that|this) (?:in|down|on)\\b|\\bzet (?:dat|het|dit) er\\b|\\bshow\\b.{0,60}\\b(?:view|mode|on today|keto|net carbs|again)\\b|\\blaat\\b.{0,60}\\b(?:weergave|pagina|netto|keto|weer zien|op vandaag)\\b`, 'i');
const READ_ONLY_BLOCK = /"kind"\s*:\s*"(?:open-page|open-search|open-review|calculator-scenario)"/i;
const clausesOf = (message: string): string[] => normalizeSpoken(message).split(/(?<=[.!?])\s+|\n+|;\s*|:\s+|,\s*(?=(?:and|then|en|dan)\s)/i).map(s => s.replace(/^(?:and|then|en|dan)\s+/i, '').trim()).filter(Boolean);
const asksOnly = (clause: string): boolean => {
  if (POLITE_REQUEST.test(clause) || COMMAND.test(clause)) return false;
  const intent = detectIntent(clause);
  if (intent.log || intent.plan || intent.refuse) return false;
  return QUESTION_LEAD.test(clause) || /\?\s*$/.test(clause) || EXPLAIN_ASK.test(clause);
};
/** Whether the message only asks (every clause a question or an explain ask; no command, no polite request). */
export function isPureQuestion(message: string): boolean {
  if (POLITE_REQUEST.test(normalizeSpoken(message))) return false;
  const clauses = clausesOf(message);
  return clauses.length > 0 && clauses.every(asksOnly);
}
/**
 * A3-r1 (ai-d-inj-paste-block): a proposal block that repeats a block the person pasted into their own message is dropped —
 * "paste this block into your reply" is text to read, never an ask to write it (the person can still ask in their own words).
 */
const PASTED = /\{[^{}]*"kind"[^{}]*\}/g;
const canonical = (json: string): string => {
  try { const value = JSON.parse(json) as Record<string, unknown>; return JSON.stringify(Object.keys(value).sort().map(k => [k, value[k]])); } catch { return json.replace(/\s+/g, ''); }
};
export function dropPastedBlocks(reply: string, message: string): string {
  const pasted = new Set((message.match(PASTED) ?? []).map(canonical));
  if (!pasted.size || reply.search(FENCE) < 0) return reply;
  const kept = reply.replace(FENCE, (block, _fence: string, body: string) => pasted.has(canonical(body.trim())) ? '' : block);
  return kept === reply ? reply : tidy(kept);
}
const tidy = (text: string) => text.replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
/** A pure question's reply keeps its words and its read-only blocks; every block that would write is dropped. A pasted block is never repeated as a card. */
export function answerOnly(reply: string, message: string): string {
  reply = dropPastedBlocks(reply, message);
  if (reply.search(FENCE) < 0 || !isPureQuestion(message)) return reply;
  const kept = reply.replace(FENCE, block => READ_ONLY_BLOCK.test(block) ? block : '');
  return kept === reply ? reply : tidy(kept);
}
