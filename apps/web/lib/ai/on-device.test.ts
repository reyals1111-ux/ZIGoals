import {expect, it, vi} from 'vitest';
import {availabilityLine, languageModel, ON_DEVICE_OPTIONS, onDeviceAvailability, onDeviceSession} from './on-device';
import {chatSystem, CHAT_SYSTEM, parseRewrite, shortReply} from './on-device-chat';

// Session V Part 15: Chrome's on-device model, with a stand-in LanguageModel (no test browser has the real one).
const fake = (answer: unknown, create = vi.fn(async () => ({prompt: async () => 'ok', promptStreaming: () => new ReadableStream<string>(), destroy() {}}))) =>
  ({LanguageModel: {availability: vi.fn(async () => { if (answer instanceof Error) throw answer; return answer; }), create}});
it('used only where the browser has it; any odd answer reads as unavailable', async () => {
  expect(languageModel({})).toBeNull();
  expect(languageModel({LanguageModel: {availability: () => 'available'}})).toBeNull();
  expect(await onDeviceAvailability({})).toBe('unavailable');
  for (const state of ['available', 'downloadable', 'downloading', 'unavailable'] as const) expect(await onDeviceAvailability(fake(state))).toBe(state);
  expect(await onDeviceAvailability(fake('readily'))).toBe('unavailable');
  expect(await onDeviceAvailability(fake(new Error('denied')))).toBe('unavailable');
});
it('asking about the model downloads nothing; a session is created only when asked, with the same options and the instructions as its system prompt', async () => {
  const scope = fake('downloadable');
  await onDeviceAvailability(scope);
  expect(scope.LanguageModel.availability).toHaveBeenCalledWith(ON_DEVICE_OPTIONS);
  expect(scope.LanguageModel.create).not.toHaveBeenCalled();
  const seen: number[] = [];
  const create = vi.fn(async (options: {monitor?: (m: EventTarget) => void}) => {
    const monitor = new EventTarget(); options.monitor?.(monitor);
    for (const loaded of [0, 0.5, 1, 1.4]) monitor.dispatchEvent(Object.assign(new Event('downloadprogress'), {loaded}));
    return {prompt: async () => 'ok', promptStreaming: () => new ReadableStream<string>(), destroy() {}};
  });
  await onDeviceSession({system: 'Be brief.', onProgress: share => seen.push(share), scope: {LanguageModel: {availability: async () => 'downloadable', create}}});
  expect(create).toHaveBeenCalledWith(expect.objectContaining({...ON_DEVICE_OPTIONS, initialPrompts: [{role: 'system', content: 'Be brief.'}]}));
  expect(seen).toEqual([0, 0.5, 1, 1]);
  await expect(onDeviceSession({system: 'x', scope: {}})).rejects.toThrow('not available');
});
it('plain words for each state', () => {
  expect(availabilityLine('available')).toBe('Ready on this computer.');
  expect(availabilityLine('unavailable')).toMatch(/^Not available/);
});
it('the rewrite is one plain question or nothing', () => {
  expect(parseRewrite('How many times did I stretch this week?')).toBe('How many times did I stretch this week?');
  expect(parseRewrite('"How much water did I drink today?"')).toBe('How much water did I drink today?');
  for (const bad of ['NONE', 'none.', '', 'Sure! Here it is:\nHow many?', 'Stretch this week', `${'x'.repeat(220)}?`]) expect(parseRewrite(bad), bad).toBeNull();
});
it('careful mode joins the instructions for a risky health topic; replies stay short', () => {
  expect(chatSystem('what is a good stretch')).toBe(CHAT_SYSTEM);
  expect(chatSystem('how can I eat only 500 calories a day')).toMatch(/Careful mode/);
  expect(shortReply('a '.repeat(500)).length).toBeLessThanOrEqual(601);
  expect(shortReply('Fine.')).toBe('Fine.');
});
