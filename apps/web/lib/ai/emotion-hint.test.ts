import {describe, expect, it, test} from 'vitest';
import {EMOTION_HINTS, extractHint, HINT_NOTE, stripHint} from './emotion-hint';
import {assistantTurn, messagesFor, userTurn} from './session';
import {continuePrompt, turnMarkdown} from './continue';
import {buildSystemPrompt} from './context/specialists';

/**
 * Session X-Local Part 4 (owner addition 9): the marker is stripped before display and before every stored or outbound
 * path. The paths below are the functions those paths call: the stored turn, the history sent back to a model, "Continue
 * in my AI" (the clipboard), "Copy as Markdown"; the context pack holds no chat text; push labels hold habit names;
 * "Actions by ZIGi" holds card titles made by the planner from validated fields, never reply text.
 */
const SENTINEL = 'SENTINEL-WEIGHT-81.4';
describe('extracting and stripping', () => {
  it('reads one valid hint and strips every marker, whichever brackets', () => {
    expect(extractHint('Seven days in a row. ⟦zigi: encouraging⟧')).toEqual({text: 'Seven days in a row.', hint: 'encouraging'});
    expect(extractHint('Which fund?\n\n[[zigi: curious]]')).toEqual({text: 'Which fund?', hint: 'curious'});
    expect(extractHint('⟦ZIGi: Surprised ⟧ Oh.')).toEqual({text: 'Oh.', hint: 'surprised'});
    expect(extractHint('A ⟦zigi: curious⟧ and B ⟦zigi: confused⟧')).toEqual({text: 'A  and B', hint: 'curious'});
  });
  it('anything that is not a listed mood is dropped with the marker, never kept and never a hint', () => {
    expect(extractHint(`Done. ⟦zigi: celebrate⟧`)).toEqual({text: 'Done.', hint: null});
    expect(extractHint(`Done. ⟦zigi: ${SENTINEL}⟧`)).toEqual({text: 'Done.', hint: null});
    expect(extractHint('⟦zigi: reminder⟧⟦zigi: attention⟧⟦zigi: error⟧')).toEqual({text: '', hint: null});
    for (const hint of EMOTION_HINTS) expect(extractHint(`x ⟦zigi: ${hint}⟧`).hint).toBe(hint);
  });
  it('a reply that is only a marker leaves empty text, nothing odd', () => {
    expect(stripHint('⟦zigi: insight⟧')).toBe('');
    expect(stripHint('[[zigi: insight]]\n\n')).toBe('');
    expect(stripHint('No marker here.')).toBe('No marker here.');
    expect(stripHint('Brackets that are not a marker: [[note]] ⟦x⟧ zigi: curious')).toBe('Brackets that are not a marker: [[note]] ⟦x⟧ zigi: curious');
  });
  it('the prompt carries the note with the fixed list', () => {
    expect(HINT_NOTE).toContain(EMOTION_HINTS.join(', '));
    expect(buildSystemPrompt({area: 'today', context: null, customInstructions: '', providerName: 'Mock'})).toContain(HINT_NOTE);
  });
});
describe('every path a reply travels', () => {
  const raw = `Your week looks steady. ⟦zigi: ${SENTINEL}⟧ ⟦zigi: encouraging⟧`;
  const turn = assistantTurn({text: stripHint(raw), provider: 'openai', model: 'm', usage: null});
  it('the stored turn (finish strips before assistantTurn)', () => { expect(turn.text).toBe('Your week looks steady.'); expect(turn.text).not.toContain(SENTINEL); });
  it('the history sent back to a model strips a marker even if one slipped into a stored turn', () => {
    const stored = assistantTurn({text: raw, provider: 'openai', model: 'm', usage: null});
    const messages = messagesFor([userTurn('How is my week?'), stored]);
    expect(messages.map(m => m.content).join('\n')).not.toMatch(/⟦|zigi:|SENTINEL/);
  });
  it('"Continue in my AI" (the clipboard)', () => {
    const stored = assistantTurn({text: raw, provider: 'openai', model: 'm', usage: null});
    expect(continuePrompt({turns: [userTurn('How is my week?'), stored], context: null})).not.toMatch(/⟦|zigi:|SENTINEL/);
  });
  it('"Copy as Markdown"', () => {
    const stored = assistantTurn({text: raw, provider: 'openai', model: 'm', usage: null});
    expect(turnMarkdown(stored, 'Answer from your AI (Mock), not from ZIGoals.')).toBe('Your week looks steady.\n\n_Answer from your AI (Mock), not from ZIGoals._');
  });
});

// Session Z-Local Part 7 (SECURITY_REVIEW_Y F5, F6)
test('F5: a marker opened and never closed, followed by twenty thousand spaces, is read in linear time', () => {
  const text = `Fine.\n[[zigi:${' '.repeat(20_000)}`;
  const t0 = performance.now(); const {text: shown, hint} = extractHint(text); const ms = performance.now() - t0;
  expect(hint).toBeNull(); expect(shown.trimEnd()).toBe(text.trimEnd()); expect(ms).toBeLessThan(200);
});
test('F6: nested markers are stripped to nothing; only a marker that was whole in the reply can name the hint', () => {
  expect(extractHint('Hello [[zi[[zigi: x]]gi: curious]] there')).toEqual({text: 'Hello  there', hint: null}); // the outer one only exists after the strip: never read
  expect(extractHint('Hi ⟦zi⟦zigi: curious⟧gi: insight⟧!')).toEqual({text: 'Hi !', hint: 'curious'}); // the inner one was whole
  expect(extractHint('Sure. ⟦zigi: curious⟧')).toEqual({text: 'Sure.', hint: 'curious'});
});
