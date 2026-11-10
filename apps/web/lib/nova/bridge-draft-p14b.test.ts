import {afterEach, describe, expect, it} from 'vitest';
import {clearNovaHandoff, HANDOFF_MS, noteNovaDraft, sendToNova, takeNovaDraft, takeNovaHandoff} from './bridge';

/**
 * Session AL Part 14 (Denver DV-070, N-057; P-DV-96): words typed in NOVA's command field reach the chat's composer when it
 * opens on the first keystroke, so a fast-typed "How far am I on my goals?" is never cut to "far am I on my goals?".
 */
afterEach(() => clearNovaHandoff());
describe('DV-070: the unsent words in NOVA’s field', () => {
  it('the composer takes the latest words once, whole', () => {
    noteNovaDraft('H'); noteNovaDraft('How'); noteNovaDraft('How far am I on my goals?');
    expect(takeNovaDraft()).toEqual({text: 'How far am I on my goals?', pasted: false});
    expect(takeNovaDraft()).toBeNull();
  });
  it('a paste is remembered (its card is never auto-accepted), blank words are no draft, and an old draft is dropped', () => {
    noteNovaDraft('my notes', {pasted: true});
    expect(takeNovaDraft()).toEqual({text: 'my notes', pasted: true});
    noteNovaDraft('   ');
    expect(takeNovaDraft()).toBeNull();
    noteNovaDraft('late words');
    expect(takeNovaDraft(Date.now() + HANDOFF_MS + 1)).toBeNull();
  });
  it('words sent with Enter go as the message and never come back as a draft', () => {
    noteNovaDraft('How far am I on my goals?');
    expect(sendToNova('How far am I on my goals?')).toBe(true);
    expect(takeNovaDraft()).toBeNull();
    expect(takeNovaHandoff('')).toEqual({kind: 'ask', text: 'How far am I on my goals?'});
  });
});
