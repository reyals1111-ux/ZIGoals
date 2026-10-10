import {expect, test} from 'vitest';
import {forgetZigiFace} from './z-device-forget';
import {ZIGI_SUGGESTIONS_KEY, ZIGI_VOICE_KEY} from './z-device-keys';

test('Turn off ZIGi, Disconnect and the account erase remove the suggestions and keep the voice choices', () => {
  const map = new Map<string, string>([[ZIGI_SUGGESTIONS_KEY, '{"version":1}'], [ZIGI_VOICE_KEY, '{"version":1,"micShown":false}'], ['zigoals:habits:v1', '{}']]);
  forgetZigiFace({removeItem: key => void map.delete(key)});
  expect([...map.keys()].sort()).toEqual(['zigoals:habits:v1', ZIGI_VOICE_KEY].sort());
});
test('a storage that refuses never throws', () => {
  expect(() => forgetZigiFace({removeItem: () => { throw Error('quota'); }})).not.toThrow();
});
