import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {engineErrorText} from '../../components/ai/voice-engine';
import {checkMeet} from '../nova/setup-checks';
import {ollamaSteps} from '../nova/setup-guide';
import {LOCAL_SERVERS, probeServer, scanLocalServers} from '../nova/local-servers';

/**
 * Session AL final pass (lane L7): the setup, voice and composer rows still open on 1a7b0163 (GROK53_REPLAY_ZIGI_3.md,
 * GROK53_REPLAY_PRIMITIVES_3.md). Mock servers only; nothing reaches a model.
 */
describe('8. setup honesty (N-BN-14, N-SL-02, N-BN-15, N-SL-04, BN-033, LA-012)', () => {
  test('N-BN-14: planet 1 says what it read, not that a key is safely stored', () => {
    const r = checkMeet(['{"version":1}', 'plain text']);
    expect(r).toEqual({ok: true, note: 'Checked on this device: the 2 values in this browser’s readable storage (local and session storage), and none looks like an API key in plain text. This check reads only that storage; a key you add is sealed in this browser’s own key store, never synced, never sent to ZIGoals.'});
    expect(r.note).not.toContain('no API key sits');
    expect(checkMeet(['{"key":"sk-proj-abcdefghijklmnop"}']).ok).toBe(false);
  });
  test.each([['linux'], ['mac'], ['windows']] as const)('%s: the guide checks port 11434 is Ollama and says what to do when a pull fails', os => {
    const steps = ollamaSteps(os, 'https://alpha.zigoals.app', 'qwen3.5:4b'), texts = steps.map(s => s.text);
    const pull = steps.findIndex(s => s.command === 'ollama pull qwen3.5:4b');
    expect(texts[pull + 1]).toMatch(/^If the download fails: check there is free disk space \(a model takes a few GB\), then run the same command again/);
    expect(texts[pull + 1]).toContain(os === 'linux' ? 'start it with ollama serve in another terminal' : 'Ollama is not running: start it, then pull again');
    expect(texts.at(-1)).toMatch(/^Check that port 11434 really is Ollama: the answer’s last line should read \{"version":"…"\}/);
    expect(texts.at(-1)).toContain('ZIGoals checks this as well: Find models and the connection test ask the port for Ollama’s version and model list, and say “not Ollama”');
  });
  test('LA-012: with nothing running, Find models sends one request per server (it sent two)', async () => {
    const seen: string[] = [];
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => { seen.push(`${init?.mode} ${String(input)}`); throw new TypeError('Failed to fetch'); }) as typeof fetch;
    const results = await scanLocalServers({fetcher, ms: 300});
    expect(results.every(r => !r.found && r.reason === 'unreachable')).toBe(true);
    expect(seen).toHaveLength(LOCAL_SERVERS.length);
    expect(new Set(seen).size).toBe(seen.length);
  });
  test('LA-012: a real Ollama is asked for each URL once per probe (the model list was asked three times)', async () => {
    const seen: string[] = [], tag = {name: 'qwen2.5:0.5b', model: 'qwen2.5:0.5b', modified_at: '2026-11-03T22:00:00Z', size: 397_821_319, digest: 'a'.repeat(64), details: {format: 'gguf', family: 'qwen2', parameter_size: '494M', quantization_level: 'Q4_K_M'}};
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); seen.push(`${init?.mode} ${url}`);
      if (init?.mode === 'no-cors') return new Response(null, {status: 200});
      return new Response(JSON.stringify(url.endsWith('/api/version') ? {version: '0.40.14'} : {models: [tag]}), {status: 200, headers: {'content-type': 'application/json'}});
    }) as typeof fetch;
    expect(await probeServer(LOCAL_SERVERS[0]!, {fetcher, verify: true})).toMatchObject({found: true, version: '0.40.14'});
    expect(seen.filter(s => s.startsWith('cors') && s.endsWith('/api/tags')).length).toBeLessThanOrEqual(2);
    expect(seen.length).toBeLessThanOrEqual(4);
  });
});

describe('9. voice with no microphone (LA-015, LZ-034)', () => {
  test('no microphone on this device is said so, whatever code the browser gives', () => {
    for (const code of ['not-allowed', 'service-not-allowed', 'no-speech', 'audio-capture', 'something-else']) expect(engineErrorText(code, true, true)).toBe('No microphone was found. Use your keyboard’s dictation, or type.');
    expect(engineErrorText('aborted', true, true)).toBe('');
    expect(engineErrorText('network', false, true)).toMatch(/^You’re offline/);
  });
  test('with a microphone: a blocked one is named, the rest as before', () => {
    expect(engineErrorText('not-allowed', true)).toBe('The microphone is blocked for this site. Allow it from the icon left of the address, then try again, or type.');
    expect(engineErrorText('audio-capture', true)).toBe('No microphone was found. Use your keyboard’s dictation, or type.');
    expect(engineErrorText('something-else', true)).toBe('Listening stopped unexpectedly. Try again, or type.');
  });
});

describe('10. ZIGi\'s Send says why it is off (DV:Z-032)', () => {
  test('the Send button points to its hint while there is nothing to send, and an empty Enter shows it', () => {
    const source = readFileSync(fileURLToPath(new URL('../../components/ai/ai-chat.tsx', import.meta.url)), 'utf8');
    expect(source).toContain('aria-describedby={!text.trim() && !attached ? sendHintId : undefined}');
    expect(source).toContain('const SEND_OFF = \'Send is off until there is something to send: type a question first (spaces alone are not sent).\';');
    expect(source).toContain('if (!value && !attached) { if (!command) setEmptyTry(true); return; }');
  });
});
