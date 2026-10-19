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
import {REFUSAL_REPLY} from '../intent';
import {FENCE} from './parse';

const MONEY_ASK = /^(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |and |also |now |then |dan |nu |zigi,? |nova,? )*(?:buy|sell|trade|swap|fund|transfer|send|move|withdraw|deposit|stake|unstake|convert|allocate|reallocate|rebalance|wire|pay|koop|verkoop|verhandel|stort|verstuur|verplaats|zet|wissel)\b/i;

/** Whether the message is a money ask ZIGi always declines (a verb that moves money, at the start). */
export const isMoneyAsk = (message: string): boolean => MONEY_ASK.test(message.trim());

/**
 * Session AF (ADR-028 D7, H47; `TIER 3 (wallet/signing)`): the one card a staking ask may keep beside a decline is the
 * staking review filled in (`prefill-staking`): "I can't stake for you; here is the review, filled in" is the answer the
 * owner asked for, and the card only opens the Staking page's review the person signs in their own wallet. Every other
 * block of a declined money ask still goes, and a non-staking ask keeps the rule exactly as before.
 */
const STAKING_ASK = /\b(?:stake|staking|unstake|restake|delegate|undelegate|redelegate|claim|rewards?|validator|staken|inzetten|delegeren)\b/i;
const STAKING_BLOCK = /"kind"\s*:\s*"(?:prefill[-_ ]?staking|staking[-_]review|start[-_]staking|staking[-_]prefill|prefill[-_]stake)"/i;
export function stripDeclinedBlocks(reply: string, message: string): string {
  if (!isMoneyAsk(message) || reply.search(FENCE) < 0) return reply;
  const words = reply.replace(FENCE, ' ').trim();
  if (!REFUSAL_REPLY.test(words.slice(0, 400))) return reply;
  const keepStaking = STAKING_ASK.test(message);
  return reply.replace(FENCE, block => keepStaking && STAKING_BLOCK.test(block) ? block : '').replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
