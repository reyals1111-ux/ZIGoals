import {describe, expect, it} from 'vitest';
import {createSpeaker, localVoiceFor, speechChunks, type SynthLike, type UtteranceLike, type VoiceLike} from './speaker';

/**
 * Session AW (programmes; amendment 3, ADR-046): Read aloud offers only this device's own voices. A mocked speech
 * synthesis proves a network voice (`localService: false`, e.g. Chrome's "Google …") is never chosen, even as a fallback.
 */
const google: VoiceLike = {name: 'Google US English', lang: 'en-US', localService: false, default: true};
const googleNl: VoiceLike = {name: 'Google Nederlands', lang: 'nl-NL', localService: false};
const local: VoiceLike = {name: 'Samantha', lang: 'en-US', localService: true};
const localNl: VoiceLike = {name: 'Xander', lang: 'nl-NL', localService: true};
type Spoken = {text: string; voice: VoiceLike};
function mockSynth(voices: VoiceLike[]) {
  const listeners = new Set<() => void>(), spoken: (Spoken & UtteranceLike)[] = [];
  let cancels = 0, pauses = 0, resumes = 0;
  const synth: SynthLike = {
    getVoices: () => voices, speak: u => { spoken.push(u as Spoken & UtteranceLike); }, cancel: () => { cancels++; }, pause: () => { pauses++; }, resume: () => { resumes++; },
    addEventListener: (_t, f) => { listeners.add(f); }, removeEventListener: (_t, f) => { listeners.delete(f); },
  };
  return {synth, spoken, listeners, set: (v: VoiceLike[]) => { voices = v; listeners.forEach(f => f()); }, counts: () => ({cancels, pauses, resumes})};
}
const make = (text: string, voice: VoiceLike): Spoken & UtteranceLike => ({text, voice, onend: null, onerror: null});

describe('Read aloud: the voice filter', () => {
  it('chooses only a voice with localService true, for the language', () => {
    expect(localVoiceFor([google, local], 'en')).toBe(local);
    expect(localVoiceFor([google, local, localNl], 'nl')).toBe(localNl);
    expect(localVoiceFor([google], 'en')).toBeNull();
    expect(localVoiceFor([google, googleNl], 'nl')).toBeNull();
    // A local voice for another language is not used for this one, and an online one is never the fallback.
    expect(localVoiceFor([google, localNl], 'en')).toBeNull();
    expect(localVoiceFor([], 'en')).toBeNull();
    // Only the boolean true counts: a missing or truthy-but-not-true flag is treated as online.
    expect(localVoiceFor([{name: 'Odd', lang: 'en-US', localService: 1 as unknown as boolean}], 'en')).toBeNull();
    expect(localVoiceFor([{name: 'Odd', lang: 'en-US'} as VoiceLike], 'en')).toBeNull();
  });
  it('is not available without a local voice, and speaks nothing', () => {
    const m = mockSynth([google, googleNl]);
    const s = createSpeaker({synth: m.synth, makeUtterance: make, lang: 'en'});
    expect(s.snapshot()).toEqual({available: false, state: 'idle', voiceName: null});
    expect(s.speak('Hello there.')).toBe(false);
    expect(m.spoken).toEqual([]);
  });
  it('speaks every piece with the local voice, never the default online one', () => {
    const m = mockSynth([google, local]), seen: string[] = [];
    const s = createSpeaker({synth: m.synth, makeUtterance: make, lang: 'en', onChange: x => seen.push(x.state)});
    expect(s.snapshot()).toEqual({available: true, state: 'idle', voiceName: 'Samantha'});
    expect(s.speak('Sit so your back is upright. Notice three sounds. Feel the seat.')).toBe(true);
    expect(m.spoken.length).toBeGreaterThan(0);
    for (const u of m.spoken) { expect(u.voice).toBe(local); expect(u.voice.localService).toBe(true); }
    expect(s.snapshot().state).toBe('speaking');
    m.spoken.at(-1)!.onend!();
    expect(s.snapshot().state).toBe('idle');
    expect(seen).toEqual(['speaking', 'idle']);
  });
  it('reads the voice list again on voiceschanged, and at the moment of speaking', () => {
    const m = mockSynth([]);
    const s = createSpeaker({synth: m.synth, makeUtterance: make, lang: 'en'});
    expect(s.snapshot().available).toBe(false);
    m.set([google, local]);
    expect(s.snapshot().available).toBe(true);
    // The local voice goes away while speaking: it stops, and the online one left is not used.
    expect(s.speak('One. Two.')).toBe(true);
    m.set([google]);
    expect(s.snapshot()).toEqual({available: false, state: 'idle', voiceName: null});
    const before = m.spoken.length;
    expect(s.speak('Three.')).toBe(false);
    expect(m.spoken.length).toBe(before);
  });
  it('pauses, resumes and stops only what it started; dispose stops and stops listening', () => {
    const m = mockSynth([local]);
    const s = createSpeaker({synth: m.synth, makeUtterance: make, lang: 'en'});
    s.stop(); s.pause(); s.resume();
    expect(m.counts()).toEqual({cancels: 0, pauses: 0, resumes: 0});
    s.speak('Breathe in. Breathe out.');
    const afterSpeak = m.counts().cancels;
    s.pause(); expect(s.snapshot().state).toBe('paused');
    s.resume(); expect(s.snapshot().state).toBe('speaking');
    s.stop(); expect(s.snapshot().state).toBe('idle');
    expect(m.counts()).toEqual({cancels: afterSpeak + 1, pauses: 1, resumes: 1});
    // An old utterance's end after Stop changes nothing.
    m.spoken.at(-1)!.onend!();
    expect(s.snapshot().state).toBe('idle');
    s.speak('Again.');
    expect(m.listeners.size).toBe(1);
    s.dispose();
    expect(s.snapshot().state).toBe('idle');
    expect(m.listeners.size).toBe(0);
    expect(s.speak('After.')).toBe(false);
  });
  it('splits long text into sentence-sized pieces, at most 5,000 characters', () => {
    expect(speechChunks('')).toEqual([]);
    expect(speechChunks('One. Two? Three!')).toEqual(['One. Two? Three!']);
    const long = Array.from({length: 40}, (_, i) => `Sentence number ${i + 1} is here.`).join(' ');
    const pieces = speechChunks(long);
    expect(pieces.length).toBeGreaterThan(3);
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(220);
    expect(pieces.join(' ')).toBe(long);
    expect(speechChunks('x'.repeat(9000)).join('').length).toBe(5000);
  });
});
