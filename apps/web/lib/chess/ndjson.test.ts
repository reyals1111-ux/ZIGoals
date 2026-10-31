import {describe, expect, it} from 'vitest';
import {followNdjson, NdjsonError, parseJsonObject, readNdjson, type StreamStatus} from './ndjson';

// Session AK (lane C): the ndjson reader with chunked input, keep-alive lines and malformed lines; the follower's
// reconnect, back-off, 429 wait, 401 stop and clean end. No network: every answer is made here.
const chunks = (...parts: (string | Uint8Array)[]) => new ReadableStream<Uint8Array>({start(c) { for (const p of parts) c.enqueue(typeof p === 'string' ? new TextEncoder().encode(p) : p); c.close(); }});
async function read(body: ReadableStream<Uint8Array>, options = {}) {
  const values: unknown[] = [], keep: number[] = [], bad: string[] = [];
  await readNdjson(body, v => values.push(v), {onKeepAlive: () => keep.push(1), onBadLine: l => bad.push(l), ...options});
  return {values, keep: keep.length, bad};
}

describe('readNdjson', () => {
  it('joins lines split across chunks, at any byte, multi-byte characters included', async () => {
    const text = '{"type":"gameFull","id":"aB3dE6gH"}\n\n{"type":"chatLine","text":"Bonne chance ♞"}\r\n{"n":1}';
    const bytes = new TextEncoder().encode(text);
    for (const size of [1, 2, 3, 7, 64]) {
      const parts: Uint8Array[] = [];
      for (let i = 0; i < bytes.length; i += size) parts.push(bytes.slice(i, i + size));
      const r = await read(chunks(...parts));
      expect(r.values, `chunk size ${size}`).toEqual([{type: 'gameFull', id: 'aB3dE6gH'}, {type: 'chatLine', text: 'Bonne chance ♞'}, {n: 1}]);
      expect(r.keep).toBe(1);
    }
  });
  it('skips a few malformed lines (not JSON, not an object) and ends the stream after too many', async () => {
    const r = await read(chunks('{"a":1}\nnot json\n[1,2]\n42\nnull\n{"b":2}\n'));
    expect(r.values).toEqual([{a: 1}, {b: 2}]);
    expect(r.bad).toEqual(['not json', '[1,2]', '42', 'null']);
    await expect(read(chunks('x\n'.repeat(3)), {maxBadLines: 2})).rejects.toBeInstanceOf(NdjsonError);
  });
  it('a line over the cap ends the stream, whether or not its newline has come', async () => {
    await expect(read(chunks(`{"a":"${'x'.repeat(100)}"}\n`), {maxLineChars: 50})).rejects.toMatchObject({kind: 'line-too-long'});
    await expect(read(chunks('{"a":"', 'x'.repeat(100)), {maxLineChars: 50})).rejects.toMatchObject({kind: 'line-too-long'});
  });
  it('parseJsonObject accepts objects only', () => {
    expect(parseJsonObject('{"x":1}')).toEqual({x: 1});
    for (const no of ['', '1', '"s"', '[]', 'null', '{', 'true']) expect(parseJsonObject(no)).toBeNull();
  });
});

describe('followNdjson', () => {
  const ndjson = (body: string, status = 200) => new Response(body, {status, headers: {'content-type': 'application/x-ndjson'}});
  function run(answers: (() => Response | Promise<Response>)[], extra: Partial<Parameters<typeof followNdjson>[0]> = {}) {
    const controller = new AbortController(), values: unknown[] = [], statuses: StreamStatus[] = [], waits: number[] = [], calls: RequestInit[] = [];
    let i = 0;
    const fetcher = (async (_url: string, init: RequestInit) => {
      calls.push(init);
      const next = answers[i++];
      if (!next) { controller.abort(); throw new DOMException('aborted', 'AbortError'); }
      return next();
    }) as typeof fetch;
    const done = followNdjson({url: 'https://lichess.org/api/stream/event', token: 'lio_fixture123', signal: controller.signal, onValue: v => values.push(v), onStatus: s => statuses.push(s), fetcher, wait: async ms => { waits.push(ms); }, ...extra});
    return {done, values, statuses, waits, calls, controller};
  }
  it('sends the token in the Authorization header only, with no cookie or referrer; reconnects after a drop with a growing back-off', async () => {
    const r = run([() => { throw new TypeError('network'); }, () => ndjson('', 502), () => ndjson('{"type":"gameStart"}\n')]);
    await r.done;
    expect(r.calls[0]).toMatchObject({headers: {Authorization: 'Bearer lio_fixture123', Accept: 'application/x-ndjson'}, credentials: 'omit', referrerPolicy: 'no-referrer'});
    expect(r.values).toEqual([{type: 'gameStart'}]);
    expect(r.waits).toEqual([1000, 2000, 1000]); // after lines arrived, the back-off starts again
  });
  it('waits a minute after a 429, stops on 401 or 404', async () => {
    const busy = run([() => ndjson('', 429), () => ndjson('', 401)]);
    await busy.done;
    expect(busy.waits).toEqual([60_000]);
    expect(busy.statuses.at(-1)).toEqual({state: 'unauthorized'});
    const gone = run([() => ndjson('', 404)]);
    await gone.done;
    expect(gone.statuses.at(-1)).toEqual({state: 'gone'});
  });
  it('ends when the stream closes and `reconnect` says it is done (a finished game)', async () => {
    const r = run([() => ndjson('{"type":"gameFull"}\n{"type":"gameState","status":"mate"}\n')], {reconnect: () => false});
    await r.done;
    expect(r.values).toHaveLength(2);
    expect(r.statuses.at(-1)).toEqual({state: 'ended'});
    expect(r.waits).toEqual([]);
  });
  it('a malformed stream (too many bad lines) is treated as a drop and reopened', async () => {
    const r = run([() => ndjson('bad\n'.repeat(10)), () => ndjson('{"ok":1}\n')], {reconnect: () => false});
    await r.done;
    expect(r.values).toEqual([{ok: 1}]);
    expect(r.waits).toEqual([1000]);
  });
  it('stops at once when aborted, without another request', async () => {
    const controller = new AbortController(); controller.abort();
    let asked = 0;
    await followNdjson({url: 'https://lichess.org/api/stream/event', token: 't0k3n-fixture', signal: controller.signal, onValue: () => undefined, fetcher: (async () => { asked++; return ndjson(''); }) as typeof fetch});
    expect(asked).toBe(0);
  });
});
