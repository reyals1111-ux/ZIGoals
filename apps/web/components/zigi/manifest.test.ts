import {existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import manifest from './manifest.json';
import {stateForEvent, type ZigiEvent} from './events';

// ADR-012: the mascot is a static manifest; every state has a frame on disk, within the documented size budget.
const PUBLIC = join(__dirname, '..', '..', 'public');
test('every size file exists, is a WebP under its budget, and keeps the 96:126 proportion', () => {
  for (const [name, size] of Object.entries(manifest.sizes)) {
    const file = join(PUBLIC, size.file);
    expect(existsSync(file), `${name}: ${size.file}`).toBe(true);
    expect(size.file.endsWith('.webp'), name).toBe(true);
    expect(statSync(file).size, `${name} size`).toBeLessThanOrEqual(manifest.budgetBytes[name as keyof typeof manifest.budgetBytes]);
    expect(Math.abs(size.width / size.height - 96 / 126), `${name} proportion`).toBeLessThan(0.01);
  }
});
test('the eleven states carry their codes; an animated state would need a file under the animated budget', () => {
  const states = Object.keys(manifest.states);
  expect(states).toEqual(['idle', 'greeting', 'insight', 'listening', 'speaking', 'presenting', 'attention', 'sleepy', 'celebrate', 'thinking', 'error']);
  expect(Object.values(manifest.states).slice(0, 9).map(s => s.code)).toEqual(['F001', 'F002', 'F003', 'F004', 'F005', 'F006', 'F007', 'F008', 'F009']);
  for (const state of Object.values(manifest.states)) expect(state.animated).toBeNull();
  expect(manifest.budgetBytes.animated).toBeGreaterThan(manifest.budgetBytes.large);
});
test('chat events map onto states the manifest knows', () => {
  const events: ZigiEvent[] = ['open', 'reply-pending', 'reply-streaming', 'reply-done', 'reply-with-proposals', 'action-applied', 'error', 'listening', 'speaking', 'idle'];
  for (const event of events) expect(Object.keys(manifest.states), event).toContain(stateForEvent(event));
  expect(stateForEvent('reply-pending')).toBe('thinking'); expect(stateForEvent('action-applied')).toBe('celebrate'); expect(stateForEvent('reply-with-proposals')).toBe('presenting');
});
