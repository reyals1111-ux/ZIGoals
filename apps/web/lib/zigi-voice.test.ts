import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from './device-record';
import {VOICE_LANGUAGES, VOICE_LANGUAGE_LABELS, ZIGI_VOICE, deviceVoiceLanguage, resolveVoiceLanguage, voicePrefs} from './zigi-voice';
import {ZIGI_VOICE_KEY} from './z-device-keys';

describe('the voice choices (zigoals:zigi-voice:v1)', () => {
  it('reads as the defaults when empty or unreadable: the mic shown, send when I stop, spoken replies read aloud, tap opens', () => {
    expect(voicePrefs({version: 1})).toEqual({micShown: true, sendOnStop: true, readSpoken: true, tapToTalk: false, muted: false});
    const storage = {getItem: () => '{"version":2}'};
    const read = readDeviceRecord(storage, ZIGI_VOICE);
    expect(read).toEqual({data: {version: 1}, unreadable: true});
    expect(voicePrefs(read.data).micShown).toBe(true);
  });
  it('keeps the person\'s choices and unknown later fields', () => {
    const map = new Map<string, string>([[ZIGI_VOICE_KEY, JSON.stringify({version: 1, later: 'x'})]]);
    const storage = {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v)};
    const next = updateDeviceRecord(storage, ZIGI_VOICE, r => ({...r, micShown: false, tapToTalk: true, disclosed: {safari: '2026-10-10T12:00:00.000Z'}}));
    expect(next).toEqual({version: 1, later: 'x', micShown: false, tapToTalk: true, disclosed: {safari: '2026-10-10T12:00:00.000Z'}});
    expect(voicePrefs(next)).toEqual({micShown: false, sendOnStop: true, readSpoken: true, tapToTalk: true, muted: false});
    expect(() => updateDeviceRecord(storage, ZIGI_VOICE, r => ({...r, disclosed: {opera: 'x'}} as never))).toThrow();
  });
});

describe('languages: English and Dutch only', () => {
  it('offers exactly en-GB, en-US, nl-BE and nl-NL, and no French', () => {
    expect(VOICE_LANGUAGES).toEqual(['en-GB', 'en-US', 'nl-BE', 'nl-NL']);
    expect(Object.keys(VOICE_LANGUAGE_LABELS)).toEqual([...VOICE_LANGUAGES]);
    expect(JSON.stringify(VOICE_LANGUAGE_LABELS)).not.toMatch(/fr|Fran/i);
  });
  it('the device default maps every language onto the four', () => {
    expect(deviceVoiceLanguage('nl-BE')).toBe('nl-BE');
    expect(deviceVoiceLanguage('nl_be')).toBe('nl-BE');
    expect(deviceVoiceLanguage('nl')).toBe('nl-NL');
    expect(deviceVoiceLanguage('nl-NL')).toBe('nl-NL');
    expect(deviceVoiceLanguage('en-US')).toBe('en-US');
    expect(deviceVoiceLanguage('en-GB')).toBe('en-GB');
    expect(deviceVoiceLanguage('en')).toBe('en-GB');
    expect(deviceVoiceLanguage('fr-BE')).toBe('en-GB');
    expect(deviceVoiceLanguage('de-DE')).toBe('en-GB');
    expect(deviceVoiceLanguage(undefined)).toBe('en-GB');
  });
  it('a stored choice outside the four (an old French one) reads as the device default', () => {
    expect(resolveVoiceLanguage('nl-BE', 'en-US')).toBe('nl-BE');
    expect(resolveVoiceLanguage('fr-FR', 'nl-BE')).toBe('nl-BE');
    expect(resolveVoiceLanguage('fr', 'en-US')).toBe('en-US');
    expect(resolveVoiceLanguage(null, 'nl-NL')).toBe('nl-NL');
  });
});
