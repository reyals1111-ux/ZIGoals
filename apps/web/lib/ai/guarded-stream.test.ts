import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {AiError} from './errors';
import {guardedStreamChat} from './guarded-stream';
import {photoDestination, photoSendLine} from './photo-consent';
import {GUARDED_PHOTO_REFUSAL, STRICT_REFUSAL} from './privacy-mode';
import type {ChatRequest} from './types';

/**
 * Security review Z1A-1 (High) and Z1B-10 (lane ZF): a photo of a lab sheet or a receipt went straight to the model, past the
 * privacy mode. Every path now reaches the wire through the engine's hook; this test fails when a file outside the engine
 * names `streamChat` (calls it, or hands it to a reader as its stream) without being one of the guarded call sites.
 */
const WEB = join(__dirname, '../..');
const sources = (dir: string): string[] => readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});
const code = (file: string) => readFileSync(join(WEB, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
/** The engine's own call sites, each with the hook in front of the wire. */
const GUARDED: Record<string, RegExp> = {
  'lib/ai/chat.ts': /export function streamChat\(/,
  'lib/ai/guarded-stream.ts': /streamChat\(await guardRequest\(request\)\)/,
  'components/ai/use-chat-session.ts': /r = await guardRequest\(r, \{hosted: [^}]*\}\); let seen = false; for await \(const event of hosted && account \? streamHosted\(r, account\) : streamChat\(r\)\)/,
  'components/nova/workflows/use-nova-model.ts': /streamChat\(await guardRequest\(\{/,
  'lib/nova/hermes.ts': /yield\* streamChat\(await guard\(/,
};
describe('Z1A-1: every request to a model passes the privacy hook', () => {
  test('no file outside the guarded call sites names streamChat', () => {
    const users = [...sources('lib'), ...sources('components'), ...sources('app')].filter(file => /(?<![\w.])streamChat\b/.test(code(file)));
    expect(users.sort()).toEqual(Object.keys(GUARDED).sort());
    for (const [file, shape] of Object.entries(GUARDED)) expect(code(file), file).toMatch(shape);
  });
  test('the three photo readers use the guarded stream and ask before sending', () => {
    for (const file of ['components/health/label-scan.tsx', 'components/health-numbers/lab-sheet-scan.tsx', 'components/money-photos/receipt-draft.tsx']) expect(code(file), file).toMatch(/guardedStream(?:Chat)?\)?[,)]/);
    for (const file of ['components/health-numbers/lab-sheet-scan.tsx', 'components/money-photos/receipt-draft.tsx']) {
      const text = code(file);
      expect(text, file).toMatch(/setState\(\{kind: 'confirm', file\}\)/); // a picked photo waits for the person
      expect(text, file).toMatch(/<PhotoSendConfirm [^>]*onSend=\{\(\) => void read\(state\.file\)\}/);
      expect(text, file).not.toMatch(/if \(file\) void read\(file\)/);
    }
  });
  test('without a readable privacy mode (fail closed: Strict) a cloud photo request is refused before any fetch; a local one goes', async () => {
    let calls = 0;
    const fetcher = (async () => { calls++; return new Response(`data: ${JSON.stringify({choices: [{delta: {content: 'ok'}, finish_reason: 'stop'}]})}\n\ndata: [DONE]\n\n`, {status: 200, headers: {'content-type': 'text/event-stream'}}); }) as typeof fetch;
    const photo = (provider: ChatRequest['provider']): ChatRequest => ({provider, model: 'vision', system: 'Read the sheet.', messages: [{role: 'user', content: 'Copy the values.', images: [{mime: 'image/jpeg', data: 'AAAA'}]}], maxOutputTokens: 64, key: provider === 'local' ? null : 'sk-test', ...(provider === 'local' ? {baseUrl: 'http://127.0.0.1:11434', localServer: 'openai-compatible' as const} : {}), fetcher});
    const drain = async (r: ChatRequest) => { for await (const e of guardedStreamChat(r)) void e; };
    const refused = await drain(photo('openai')).then(() => null, (e: unknown) => e);
    expect(refused).toBeInstanceOf(AiError); expect((refused as AiError).kind).toBe('blocked'); expect((refused as AiError).message).toBe(STRICT_REFUSAL);
    expect(calls).toBe(0);
    await drain(photo('local'));
    expect(calls).toBe(1);
  });
});
describe('Z1B-10: the photo is shown with where it goes', () => {
  test('the brain is named; Strict and Guarded say why a cloud gets no photo; local and Relaxed may send', () => {
    expect(photoDestination({provider: 'openai', model: 'gpt-x'}, 'strict')).toEqual({name: 'OpenAI', local: false, refusal: STRICT_REFUSAL});
    expect(photoDestination({provider: 'openai', model: 'gpt-x'}, 'guarded').refusal).toBe(GUARDED_PHOTO_REFUSAL);
    expect(photoDestination({provider: 'openai', model: 'gpt-x'}, 'relaxed').refusal).toBeNull();
    expect(photoDestination({provider: 'openai', model: 'gpt-x'}, null).refusal).toBeNull();
    expect(photoDestination({provider: 'local', model: 'gemma4:12b', localServer: 'ollama'}, 'strict')).toEqual({name: 'Ollama on this computer', local: true, refusal: null});
    expect(photoDestination({provider: 'local', model: 'gpt-oss:120b-cloud', localServer: 'ollama'}, 'strict')).toEqual({name: 'Ollama’s cloud (ollama.com)', local: false, refusal: STRICT_REFUSAL});
    const line = photoSendLine('lab sheet', {name: 'OpenAI', local: false});
    expect(line).toContain('goes to OpenAI, outside this device'); expect(line).toContain('a birth date');
    expect(photoSendLine('receipt', {name: 'Ollama on this computer', local: true})).not.toContain('outside');
  });
});
