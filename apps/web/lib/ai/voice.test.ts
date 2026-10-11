import {expect, test} from 'vitest';
import {AiError} from './errors';
import {FAKE_KEY} from './fixtures/mock-streams';
import {browserSpeechDisclosure, detectBrowser, iso639, MAX_RECORDING_MS, recognitionConstructor, recognitionErrorText, recognitionText, recorderMimeType, speechLanguage, transcribe, TRANSCRIPTION_MODELS, transcriptionFileName} from './voice';

// ADR-012, Part 7: voice is either the provider's documented endpoint or the browser, both disclosed; MOCK only here.
test('the recorder falls back from WebM/Opus to Safari\'s MP4 and names the upload after the container', () => {
  expect(recorderMimeType(t => t === 'audio/webm;codecs=opus' || t === 'audio/webm')).toBe('audio/webm;codecs=opus');
  expect(recorderMimeType(t => t.startsWith('audio/mp4'))).toBe('audio/mp4;codecs=mp4a.40.2');
  expect(recorderMimeType(() => false)).toBeNull(); expect(recorderMimeType(() => { throw Error('no recorder'); })).toBeNull();
  expect(transcriptionFileName('audio/webm;codecs=opus')).toBe('speech.webm'); expect(transcriptionFileName('audio/mp4')).toBe('speech.m4a'); expect(transcriptionFileName('audio/ogg;codecs=opus')).toBe('speech.ogg'); expect(transcriptionFileName(null)).toBe('speech.webm');
  expect(MAX_RECORDING_MS).toBe(60_000); expect(TRANSCRIPTION_MODELS).toContain('whisper-1');
});
test('browsers are told apart and each gets its own honest disclosure; the language falls back sensibly', () => {
  const chrome = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';
  expect(detectBrowser(chrome)).toBe('chrome'); expect(detectBrowser(safari)).toBe('safari'); expect(detectBrowser(firefox)).toBe('firefox'); expect(detectBrowser('curl/8')).toBe('other');
  expect(browserSpeechDisclosure('chrome', false)).toMatch(/Google/); expect(browserSpeechDisclosure('chrome', true)).toMatch(/on this device/); expect(browserSpeechDisclosure('safari', false)).toMatch(/Apple/); expect(browserSpeechDisclosure('firefox', false)).toMatch(/no speech recognition/);
  for (const b of ['chrome', 'safari', 'other'] as const) expect(browserSpeechDisclosure(b, false)).toMatch(/Nothing goes through ZIGoals/);
  // Session Z-Cloud Part 3: English and Dutch only; any other choice or device language maps onto the four.
  expect(speechLanguage('nl-BE', 'en-US')).toBe('nl-BE'); expect(speechLanguage('de-DE', 'en-US')).toBe('en-US'); expect(speechLanguage(null, 'fr-FR')).toBe('en-GB'); expect(speechLanguage('fr-FR', 'nl-BE')).toBe('nl-BE'); expect(speechLanguage('nonsense value', undefined)).toBe('en-GB'); expect(iso639('pt-BR')).toBe('pt');
  expect(recognitionConstructor({})).toBeNull(); expect(recognitionConstructor({webkitSpeechRecognition: class {}})).not.toBeNull();
  expect(recognitionText([Object.assign([{transcript: 'log two '}], {isFinal: true}), Object.assign([{transcript: 'glasses'}], {isFinal: false})])).toEqual({final: 'log two', interim: 'glasses'});
  expect(recognitionErrorText('not-allowed')).toMatch(/microphone was not allowed/); expect(recognitionErrorText('aborted')).toBe('');
});
test('provider transcription: multipart to the documented endpoint with the key in a header, never in the URL; limits and errors in plain words', async () => {
  const calls: {url: string; init: RequestInit}[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => { calls.push({url: String(url), init: init!}); return new Response(JSON.stringify({text: '  Log two glasses of water. '}), {status: 200, headers: {'content-type': 'application/json'}}); }) as typeof fetch;
  const blob = new Blob([new Uint8Array(2048)], {type: 'audio/webm'});
  await expect(transcribe({provider: 'openai', key: FAKE_KEY, blob, mime: 'audio/webm;codecs=opus', model: 'gpt-4o-mini-transcribe', language: 'en-GB', fetcher})).resolves.toBe('Log two glasses of water.');
  expect(calls[0]!.url).toBe('https://api.openai.com/v1/audio/transcriptions'); expect(calls[0]!.url).not.toContain(FAKE_KEY);
  expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(`Bearer ${FAKE_KEY}`); expect(calls[0]!.init.method).toBe('POST');
  const form = calls[0]!.init.body as FormData;
  expect(form.get('model')).toBe('gpt-4o-mini-transcribe'); expect(form.get('language')).toBe('en'); expect(form.get('response_format')).toBe('json'); expect((form.get('file') as File).name).toBe('speech.webm');
  await expect(transcribe({provider: 'anthropic', key: FAKE_KEY, blob, mime: null, model: 'x', fetcher})).rejects.toMatchObject({kind: 'request', message: expect.stringMatching(/no transcription endpoint/)});
  await expect(transcribe({provider: 'openai', key: null, blob, mime: null, model: 'x', fetcher})).rejects.toMatchObject({kind: 'bad-key'});
  await expect(transcribe({provider: 'openai', key: FAKE_KEY, blob: new Blob([new Uint8Array(26 * 1024 * 1024)]), mime: null, model: 'x', fetcher})).rejects.toMatchObject({kind: 'request', message: expect.stringMatching(/25 MB/)});
  await expect(transcribe({provider: 'openai', key: FAKE_KEY, blob: new Blob([]), mime: null, model: 'x', fetcher})).rejects.toMatchObject({message: 'Nothing was recorded.'});
  const unauthorized = (async () => new Response(JSON.stringify({error: {message: 'Incorrect API key provided: sk-test-FAKE', type: 'invalid_request_error', code: 'invalid_api_key'}}), {status: 401})) as typeof fetch;
  const failure = await transcribe({provider: 'openai', key: FAKE_KEY, blob, mime: null, model: 'x', fetcher: unauthorized}).then(() => null, e => e as AiError);
  expect(failure).toBeInstanceOf(AiError); expect(failure!.kind).toBe('bad-key'); expect(failure!.message).not.toContain('sk-test-FAKE');
  const broken = (async () => new Response('not json', {status: 200})) as typeof fetch;
  await expect(transcribe({provider: 'openai', key: FAKE_KEY, blob, mime: null, model: 'x', fetcher: broken})).rejects.toMatchObject({kind: 'unreadable'});
  const offline = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
  await expect(transcribe({provider: 'openai', key: FAKE_KEY, blob, mime: null, model: 'x', fetcher: offline})).rejects.toBeInstanceOf(AiError);
});
