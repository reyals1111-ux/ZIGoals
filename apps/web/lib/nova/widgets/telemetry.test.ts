import {describe, expect, it} from 'vitest';
import {bytesWords, deviceFacts, factLines, isWakePhrase, loadedLine, ollamaLoaded, parseOllamaPs, wakeSupport} from './telemetry';

describe('device facts: only what the browser really says', () => {
  it('unknown stays unknown, never zero', () => {
    const none = factLines(deviceFacts(undefined));
    expect(none.map(l => l.value)).toEqual(['Unknown in this browser', 'Unknown in this browser', 'Unknown in this browser', 'Unknown']);
    const safari = factLines(deviceFacts({hardwareConcurrency: 8, onLine: true}));
    expect(safari.map(l => l.value)).toEqual(['8 logical', 'Unknown in this browser', 'Unknown in this browser', 'Online']);
    const chrome = factLines(deviceFacts({hardwareConcurrency: 12, deviceMemory: 8, onLine: false}, {level: .42, charging: true}));
    expect(chrome.map(l => l.value)).toEqual(['12 logical', 'About 8 GB or more', '42 %, charging', 'Offline']);
    expect(deviceFacts({hardwareConcurrency: 0, deviceMemory: -1}).cores).toBeNull();
  });
});

describe('Ollama’s loaded models (/api/ps)', () => {
  const ps = {models: [{name: 'llama3.2:3b', size: 3_400_000_000, size_vram: 3_400_000_000}, {model: 'qwen3:8b', size: 6_100_000_000, size_vram: 0}, {nothing: true}]};
  it('reads names and memory; anything else is not a list', () => {
    expect(parseOllamaPs(ps)).toEqual([{name: 'llama3.2:3b', size: 3.4e9, vram: 3.4e9}, {name: 'qwen3:8b', size: 6.1e9, vram: 0}]);
    expect(parseOllamaPs({})).toBeNull(); expect(parseOllamaPs(null)).toBeNull(); expect(parseOllamaPs({models: []})).toEqual([]);
    expect(loadedLine({name: 'llama3.2:3b', size: 3.4e9, vram: 3.4e9})).toBe('llama3.2:3b: 3.4 GB in memory, 100 % on the GPU');
    expect(loadedLine({name: 'x', size: null, vram: null})).toBe('x: loaded');
    expect(bytesWords(820e6)).toBe('820 MB'); expect(bytesWords(Number.NaN)).toBe('unknown size');
  });
  it('asks only localhost; a server that is down or answers badly reads as null (offline), never as zero models', async () => {
    const ok = async () => new Response(JSON.stringify(ps), {status: 200});
    expect(await ollamaLoaded('http://127.0.0.1:11434', {fetcher: ok})).toHaveLength(2);
    expect(await ollamaLoaded('http://127.0.0.1:11434', {fetcher: async () => { throw new TypeError('Failed to fetch'); }})).toBeNull();
    expect(await ollamaLoaded('http://127.0.0.1:11434', {fetcher: async () => new Response('no', {status: 500})})).toBeNull();
    let asked = false;
    expect(await ollamaLoaded('https://example.com', {fetcher: async () => { asked = true; return new Response('{}'); }})).toBeNull();
    expect(asked).toBe(false);
  });
});

describe('the wake phrase', () => {
  it('is offered only where speech is recognised on the device', async () => {
    expect((await wakeSupport({})).ok).toBe(false);
    const cloudOnly = await wakeSupport({webkitSpeechRecognition: {}});
    expect(cloudOnly).toEqual({ok: false, reason: expect.stringContaining('servers')});
    expect(await wakeSupport({SpeechRecognition: {available: async () => 'available'}})).toEqual({ok: true});
    expect((await wakeSupport({SpeechRecognition: {available: async () => 'downloadable'}})).ok).toBe(false);
    expect((await wakeSupport({SpeechRecognition: {available: async () => { throw Error('x'); }}})).ok).toBe(false);
  });
  it('hears "Hey NOVA" in the persona’s own name, not inside other words', () => {
    expect(isWakePhrase('Hey Nova, what is next?', 'NOVA')).toBe(true);
    expect(isWakePhrase('ok vega', 'Vega')).toBe(true);
    expect(isWakePhrase('casanova', 'NOVA')).toBe(false);
    expect(isWakePhrase('hey novak', 'NOVA')).toBe(false);
    expect(isWakePhrase('', 'NOVA')).toBe(false);
  });
});
