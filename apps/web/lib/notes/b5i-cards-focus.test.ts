import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/** Review b5i B5I-10 (Minor, a11y): after the last card, focus lands on "That is all for today", never on the page. */
describe('the end of a review keeps the place', () => {
  test('the next card, else the closing words, else the cards themselves take focus; each can hold it', () => {
    const src = readFileSync(join(__dirname, '../../components/notes/notes-cards.tsx'), 'utf8');
    expect(src).toMatch(/\?\? box\.current\?\.querySelector<HTMLElement>\('\.note-card-done'\) \?\? box\.current\)\?\.focus\(\)/);
    expect(src).toMatch(/<div className="note-card-done" tabIndex=\{-1\}>/);
    expect(src).toMatch(/<div className="note-cards" ref=\{box\} tabIndex=\{-1\}>/);
  });
});
