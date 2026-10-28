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
  test('Session AF (H47): a staking ask keeps the staking review card beside a decline; every other block of it still goes', () => {
    const review = block('{"kind":"prefill-staking","action":"delegate","network":"practice","amount":"100"}');
    const reply = `I can’t stake for you. Here is the staking review, filled in; you review it and sign it in your own wallet.\n\n${review}\n\n${PREFILL}`;
    const out = stripDeclinedBlocks(reply, 'Stake 100 ZIG for me');
    expect(out).toContain(review); expect(out).not.toContain('prefill-holding');
    expect(parseReply(out).proposals.map(p => p.kind)).toEqual(['prefill-staking']);
    // Not a staking ask: the review card goes like any other block.
    expect(stripDeclinedBlocks(`I can’t move money.\n\n${review}`, 'Move everything into bitcoin now')).toBe('I can’t move money.');
  });
  test('several blocks all go; the prose around them is kept clean', () => {
    const reply = `I can’t move money.\n\n${PREFILL}\n\nAnd:\n\n${block('{"kind":"update-account-balance","account":"a1","balance":1}')}\n\nAsk from Wealth.`;
    expect(stripDeclinedBlocks(reply, 'Swap my stocks for gold')).toBe('I can’t move money.\n\nAnd:\n\nAsk from Wealth.');
  });
  test('Session AI (A3-r1): a goal-funding ask keeps the Fund form filled in; a milestone tick or a Health value to remember keeps nothing', () => {
    const fund = block('{"kind":"prefill-contribution","goal":"g1","amount":300}');
    const out = stripDeclinedBlocks(`I can’t move money, but here is the Fund form filled in; you submit it on Goals.\n\n${fund}\n\n${PREFILL}`, 'Fund the emergency fund from my savings account, 300 euros');
    expect(parseReply(out).proposals.map(p => p.kind)).toEqual(['prefill-contribution']);
    expect(stripDeclinedBlocks(`I can’t move money.\n\n${fund}`, 'Move everything into bitcoin now')).toBe('I can’t move money.');
    const note = block('{"kind":"add-goal-note","goal":"g2","text":"Flights booked"}');
    expect(stripDeclinedBlocks(`I can’t tick milestones; tick it on the goal.\n\n${note}`, 'Mark the milestone "Flights booked" as reached on the Japan goal')).toBe('I can’t tick milestones; tick it on the goal.');
    expect(stripDeclinedBlocks(`Dat kan ik niet afvinken; doe het bij het doel.\n\n${note}`, 'Euh, markeer de, eh, zet de mijlpaal vluchten geboekt op behaald bij het Japan-doel.')).toBe('Dat kan ik niet afvinken; doe het bij het doel.');
    const remember = block('{"kind":"remember","text":"Weighs 80 kg","category":"health"}');
    expect(stripDeclinedBlocks(`I don’t keep Health figures in notes.\n\n${remember}`, 'Remember my weight is 80 kg and my blood pressure')).toBe('I don’t keep Health figures in notes.');
    // Not a decline: the card stays.
    const kept = `Here is the note.\n\n${note}`;
    expect(stripDeclinedBlocks(kept, 'Mark the milestone "Flights booked" as reached on the Japan goal')).toBe(kept);
  });
});
