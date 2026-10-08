/**
 * Session X-Local Phase 2, fix round 9 (ADR-017 S75): a decline sends no card.
 *
 * The protocol is plain: ZIGi can never move money, and when it declines it proposes nothing in that reply (no card in
 * place of what was refused). Seen on the Mac's qwen3.6 in the day scenario ("Move everything into bitcoin now"): the
 * reply declined in words and still carried a pre-fill card for the add-asset form. This device-side rule enforces the
 * sentence for the money asks: when the message starts with a money verb (buy, sell, trade, swap, fund, transfer,
 * send, move, withdraw, deposit, stake, convert, allocate, rebalance, in English, Dutch or French) and the reply's words
 * decline (the same cue the repair round reads, `REFUSAL_REPLY`), every proposal block is dropped and the words stand.
 * Deliberately narrow: a destructive verb (delete, archive) is not covered, so "Remove sugar from my list" with a reply
 * that declines the deletion and offers a card keeps its card; a reply that does not decline keeps everything; a reply
 * with no block comes back byte for byte.
 */
import {REFUSAL_REPLY} from '../intent';
import {FENCE} from './parse';

const MONEY_ASK = /^(?:please |ok |okay |hey |hi |so |um+ |uh+ |euh |eh |and |also |now |then |alors |dan |nu |zigi,? |nova,? )*(?:buy|sell|trade|swap|fund|transfer|send|move|withdraw|deposit|stake|unstake|convert|allocate|reallocate|rebalance|wire|pay|koop|verkoop|verhandel|stort|verstuur|verplaats|zet|wissel|ach[eè]te[rz]?|vends?|vendre|transf[eè]re[rz]?|envoie[rz]?|d[ée]place[rz]?|retire[rz]?|d[ée]pose[rz]?|convertis|paie[rz]?|vire[rz]?)\b/i;

/** Whether the message is a money ask ZIGi always declines (a verb that moves money, at the start). */
export const isMoneyAsk = (message: string): boolean => MONEY_ASK.test(message.trim());

export function stripDeclinedBlocks(reply: string, message: string): string {
  if (!isMoneyAsk(message) || reply.search(FENCE) < 0) return reply;
  const words = reply.replace(FENCE, ' ').trim();
  if (!REFUSAL_REPLY.test(words.slice(0, 400))) return reply;
  return reply.replace(FENCE, '').replace(/[^\S\n]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
