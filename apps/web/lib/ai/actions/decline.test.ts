import {describe, expect, test} from 'vitest';
import {parseReply} from './parse';
import {isMoneyAsk, stripDeclinedBlocks} from './decline';

const block = (json: string) => `\`\`\`zigoals-action\n${json}\n\`\`\``;
const PREFILL = block('{"kind":"prefill-holding","symbol":"BTC","amount":1}');

describe('stripDeclinedBlocks (ADR-017 S75): a decline sends no card', () => {
  test('a money ask answered with a decline and a card keeps the words and loses the card', () => {
    const reply = `I do not move money, sell assets, or reallocate holdings. Your records show 0.45 BTC.\n\n${PREFILL}`;
    const out = stripDeclinedBlocks(reply, 'Move everything into bitcoin now');
    expect(out).toBe('I do not move money, sell assets, or reallocate holdings. Your records show 0.45 BTC.');
    expect(parseReply(out).proposals).toEqual([]);
  });
  test('the decline cues of the repair round count: cannot, won\'t, never and the Dutch forms', () => {
    for (const [ask, words] of [['Sell my ETH', 'I cannot sell anything for you.'], ['Transfer 500 to savings', 'ZIGi won’t transfer money.'], ['Verkoop mijn bitcoin', 'Ik kan geen bitcoin verkopen.']] as const) {
      expect(stripDeclinedBlocks(`${words}\n\n${PREFILL}`, ask)).toBe(words);
    }
  });
  test('a reply that does not decline keeps its card; a reply without a block comes back byte for byte', () => {
    const offered = `Here is the form, filled in.\n\n${PREFILL}`;
    expect(stripDeclinedBlocks(offered, 'Move 500 to savings')).toBe(offered);
    const words = 'I do not move money. Only you can do that from Wealth.';
    expect(stripDeclinedBlocks(words, 'Move everything into bitcoin now')).toBe(words);
  });
  test('only money asks: a log, a question, or a deletion with a decline and a card keeps the card', () => {
    const water = `I can’t see the glass size, so two glasses as said.\n\n${block('{"kind":"log-water","glasses":2}')}`;
    expect(stripDeclinedBlocks(water, 'Log 2 glasses of water')).toBe(water);
    const removal = `I cannot delete entries, but here is the list item.\n\n${block('{"kind":"grocery-item","items":["sugar"]}')}`;
    expect(stripDeclinedBlocks(removal, 'Remove sugar from my grocery list')).toBe(removal);
    expect(isMoneyAsk('How much did I spend on groceries?')).toBe(false);
    expect(isMoneyAsk('Please move everything into bitcoin')).toBe(true);
    expect(isMoneyAsk('Stake my ETH')).toBe(true);
  });
  test('several blocks all go; the prose around them is kept clean', () => {
    const reply = `I can’t move money.\n\n${PREFILL}\n\nAnd:\n\n${block('{"kind":"update-account-balance","account":"a1","balance":1}')}\n\nAsk from Wealth.`;
    expect(stripDeclinedBlocks(reply, 'Swap my stocks for gold')).toBe('I can’t move money.\n\nAnd:\n\nAsk from Wealth.');
  });
});
