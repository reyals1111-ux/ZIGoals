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
import {safetyFirst} from '../safety-guard';
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
// Session AK (Part 12): a what-if (a projection card) and a scan (opens a page) write nothing either.
// Owner follow-up 1 (F9): opening the agenda or Wrapped writes nothing either (the agenda's chosen view is a display choice).
// Owner follow-up 2 (N5): opening Focus sessions writes nothing either (the session starts on the person's tap there).
const READ_ONLY_BLOCK = /"kind"\s*:\s*"(?:open-page|open-search|open-review|calculator-scenario|what-if|scan-food|open-agenda|open-wrapped|start-focus)"/i;
const clausesOf = (message: string): string[] => normalizeSpoken(message).split(/(?<=[.!?])\s+|\n+|;\s*|:\s+|,\s*(?=(?:and|then|en|dan)\s)/i).map(s => s.replace(/^(?:and|then|en|dan)\s+/i, '').trim()).filter(Boolean);
/**
 * Owner follow-up 2 (N9): a polite ask to read, sum up or explain ("can you summarise the file I imported?", "kun je mijn
 * notities samenvatten?") is a question too, when no write verb follows anywhere: a card that the material asked for (a
 * note, a pasted email, an imported file) is then dropped like any card in a reply to a question.
 */
const POLITE_READ = new RegExp(`^${FILLERS}(?:can|could|would|will|kun|kan|zou)\\s+(?:you|u|je|jij)\\s+(?:please\\s+|even\\s+)?(?:summari[sz]e|explain|describe|tell me|show me|read|list|compare|go through|vat|lees|leg|beschrijf|vertel)\\b`, 'i');
const WRITE_ANYWHERE = new RegExp(`\\b${WRITE_VERB}\\b`, 'i');
const politeRead = (clause: string) => POLITE_READ.test(clause) && !COMMAND.test(clause) && !WRITE_ANYWHERE.test(clause.replace(POLITE_READ, ''));
const asksOnly = (clause: string): boolean => {
  if (politeRead(clause)) { const intent = detectIntent(clause); return !(intent.log || intent.plan || intent.refuse); }
  if (POLITE_REQUEST.test(clause) || COMMAND.test(clause)) return false;
  const intent = detectIntent(clause);
  if (intent.log || intent.plan || intent.refuse) return false;
  return QUESTION_LEAD.test(clause) || /\?\s*$/.test(clause) || EXPLAIN_ASK.test(clause);
};
/** Whether the message only asks (every clause a question or an explain ask; no command, no polite request). */
export function isPureQuestion(message: string): boolean {
  const clauses = clausesOf(message);
  if (POLITE_REQUEST.test(normalizeSpoken(message)) && !clauses.filter(c => POLITE_REQUEST.test(c)).every(politeRead)) return false;
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
/** Every block that would write is dropped (read-only blocks stay); used in careful mode, where no card sets or logs a restriction. */
export function stripWriteBlocks(reply: string): string {
  if (reply.search(FENCE) < 0) return reply;
  const kept = reply.replace(FENCE, block => READ_ONLY_BLOCK.test(block) ? block : '');
  return kept === reply ? reply : tidy(kept);
}
/**
 * Session AL (lane L7; ZI1 family: BN-068, NB-103/118/121, MO-056, LA-018, TK-053, P-LA-09): whether ZIGi's no-AI panel may
 * put a Quick add preview ("Will save: Water 250 mL") under its answer. Never under a question ("How much water did I
 * drink?", "Hoeveel water heb ik gedronken?", "Explain my P&L", "average water this week"), a negation ("I didn't drink
 * any water"), a goal statement ("lose 10 kg in 1 week"), a careful-mode message or anything the safety guard answered.
 * A log line ("drank 2 glasses of water") still gets it.
 */
const NEGATION = /\b(?:didn'?t|did not|don'?t|do not|haven'?t|have not|hasn'?t|never|no longer|not yet|niet|geen|nooit|nog niet)\b/i;
const CREATE_RECORD = /\b(?:create|make|set ?up|start|plan|new|add|maak|nieuwe?|begin)\b[^.?!]{0,25}\b(?:goals?|habits?|doel(?:en)?|gewoontes?)\b/i; // DV-060: "create a goal … by next Friday" is not a workout line
const GOAL_STATEMENT = /\b(?:want to|wanna|going to|gonna|plan to|trying to|try to|need to|goal (?:is|of)|wil|ga|moet|doel)\b[^.?!]{0,30}\b(?:lose|gain|reach|drink|walk|run|sleep|eat|afvallen|aankomen|halen|drinken|lopen|slapen|eten)\b/i;
export function quickAddOffered(message: string, flags: {guarded?: boolean; careful?: boolean} = {}): boolean {
  const text = message.trim();
  // Session AL fourth pass (L7-4a): the guard is read here as well, so no caller's flags can let a guarded text through.
  if (!text || flags.guarded || flags.careful || safetyFirst(text)) return false;
  if (isPureQuestion(text) || /\?\s*$/.test(text)) return false;
  if (NEGATION.test(text) || GOAL_STATEMENT.test(text) || CREATE_RECORD.test(text)) return false;
  if (/\bp\s*&\s*l\b|\bpnl\b|\bprofit and loss\b/i.test(text)) return false; // TK-053: the "L" in P&L is not litres
  if (NOT_A_LOG.test(text)) return false;
  return true;
}
/**
 * Session AL fourth pass (lane L7-4b; Lisbon #280–289a, #330–333, ZIGi-F9; Nairobi H6, NB-121, P18/P20/P27): words that are
 * no log line for Quick add: an ask for a suggestion, a plan or a habit change ("suggest a habit stack to sleep better" was
 * "Sleep · 1 h"), a check-off in another language ("hak Drink water ab" was "Water · 1 glass"), and a walk or run counted
 * in something that is no distance ("I walked 2 dogs" was "2 steps").
 */
const NOT_A_LOG = new RegExp([
  String.raw`^\s*(?:please\s+)?(?:suggest|recommend|plan|help me|how (?:do|can|should) i|what should|give me|tell me|brief|organi[sz]e|make|change|skip|pause|resume|snooze|move|create|add (?:a )?habit)\b`,
  String.raw`^\s*(?:coche|cocher|marque|hak|hake|markiere|erledige|marca|marcar)\b`,
  String.raw`\b(?:walked|ran|biked|cycled|swam)\s+(?:the\s+|my\s+)?(?:\d+|a|one|two|three|four|five)\s+(?!steps?\b|km\b|kms\b|k\b|miles?\b|mi\b|minutes?\b|mins?\b|min\b|hours?\b|hrs?\b|h\b|m\b|meters?\b|metres?\b|laps?\b|kilomet)[a-z]+`,
  // Session AL fifth pass (L7-5b; Nairobi H7): a period is no one day's log ("Exercise last week" was "Exercise · +1 time ·
  // today"); the device answers it as a question instead.
  String.raw`\b(?:last|past|previous|this)\s+(?:week|weekend|month|year)\b|\b(?:the\s+)?last\s+\d+\s+(?:days|weeks|months)\b|\b\d+\s+(?:days|weeks|months)\s+ago\b|\b(?:vorige|afgelopen|deze)\s+(?:week|maand)\b|\bvorig\s+jaar\b`,
].join('|'), 'i');
/**
 * Session AL fourth pass (lane L7-4b; Lisbon #006, #008, #021, LA-018 family): the Quick add preview sits only under the
 * device's "I don't have an answer" reply (the examples list). When the device answered, or made its own card (a check-off,
 * a task, a goal card), a second write offer under it ("Will save: Water · 1 glass" under a check-off card, "Use a number
 * above zero" under a task) is a stray: one message, one proposal.
 */
export function quickAddUnder(reply: {kind: string} | null | undefined): boolean {
  return !reply || reply.kind === 'examples';
}
