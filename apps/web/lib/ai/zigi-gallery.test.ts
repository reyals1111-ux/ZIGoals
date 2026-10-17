import {expect, test} from 'vitest';
import {SLEEPY_AFTER_MS, stateForEvent, type ZigiEvent} from '../../components/zigi/events';
import {ZIGI_MANIFEST, ZIGI_STATES} from '../../components/zigi/manifest';
import {CELEBRATIONS_PER_DAY, DEFAULT_QUIET} from '../../components/zigi/semantic';
import {GALLERY_GROUPS, STATE_TEXT} from '../../components/zigi/state-gallery';

// Session AD item 13 (ADR-026): Meet ZIGi's words cover exactly the manifest's states, each in one group, each with a
// meaning and when it appears; the numbers it quotes are the code's own.
test('the gallery\'s table covers exactly the manifest\'s states, no extra and none missing', () => {
  expect(Object.keys(STATE_TEXT).sort()).toEqual([...ZIGI_STATES].sort());
  expect(Object.keys(STATE_TEXT).sort()).toEqual(Object.keys(ZIGI_MANIFEST.states).sort());
  expect(ZIGI_STATES).toHaveLength(25);
});
test('every state sits in one known group, with a one-line meaning and when it appears', () => {
  const groups = new Set(GALLERY_GROUPS.map(g => g.id));
  expect(groups.size).toBe(GALLERY_GROUPS.length);
  for (const state of ZIGI_STATES) {
    const text = STATE_TEXT[state];
    expect(groups.has(text.group), state).toBe(true);
    expect(text.meaning.trim().length, state).toBeGreaterThan(0);
    expect(text.meaning, state).not.toMatch(/\n/);
    expect(text.when.trim().length, state).toBeGreaterThan(0);
    expect(text.when, state).not.toMatch(/\n/);
  }
  for (const group of GALLERY_GROUPS) expect(ZIGI_STATES.some(s => STATE_TEXT[s].group === group.id), group.id).toBe(true);
});
test('a state the machine reaches is never called unused, and the numbers quoted are the code\'s', () => {
  const events: ZigiEvent[] = ['open', 'close', 'reply-pending', 'reply-streaming', 'reply-done', 'reply-with-proposals', 'action-applied', 'error', 'listening', 'speaking', 'sleepy',
    'tool-call', 'writing-proposal', 'local-answer', 'ambiguity', 'not-understood', 'streak-milestone', 'careful', 'encourage', 'offline', 'reminder-due', 'model-loading', 'success', 'surprise', 'attention'];
  for (const event of events) expect(STATE_TEXT[stateForEvent(event)].when, event).not.toMatch(/Not used yet/);
  expect(STATE_TEXT.sleepy.when).toContain(`${SLEEPY_AFTER_MS / 1000} seconds`);
  expect(STATE_TEXT.celebrate.when).toContain(`at most ${CELEBRATIONS_PER_DAY} a day`);
  expect(STATE_TEXT.reminder.when).toContain(`between ${String(DEFAULT_QUIET[0]).padStart(2, '0')}:00 and ${String(DEFAULT_QUIET[1]).padStart(2, '0')}:00`);
  // The Playwright spec (zigi-emotions.spec.ts) reads these words on the page.
  expect(STATE_TEXT.celebrate.meaning).toContain('A moment the app confirmed');
});
