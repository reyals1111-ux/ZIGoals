import {expect, test} from 'vitest';
import {AiError} from './errors';
import {lines, ndjson, sseEvents, Stalled} from './sse';

// ADR-012, Part 1: the readers cope with any chunking, both line endings, comments and an abort.
/** A body that delivers `text` in chunks of `size` bytes (so lines and multi-byte characters split anywhere). */
function body(text: string, size = 7): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text); let offset = 0;
  return new ReadableStream({pull(controller) { if (offset >= bytes.length) { controller.close(); return; } controller.enqueue(bytes.slice(offset, offset + size)); offset += size; }});
}
const collect = async <T,>(iterable: AsyncIterable<T>) => { const out: T[] = []; for await (const item of iterable) out.push(item); return out; };

test('lines: chunk boundaries inside lines and inside multi-byte characters, CRLF and a final line without a break', async () => {
  for (const size of [1, 2, 3, 7, 64]) expect(await collect(lines(body('first ✓ line\r\nsecond é line\n\nlast', size)))).toEqual(['first ✓ line', 'second é line', '', 'last']);
});
test('sseEvents: data lines joined with newlines, event names, comments and ids ignored, a trailing event flushed', async () => {
  const text = ': keep-alive\nevent: message_start\ndata: {"a":1}\nid: 7\n\ndata: first\ndata: second\n\ndata:no-space\n\nretry: 100\n\ndata: tail';
  for (const size of [1, 5, 1000]) expect(await collect(sseEvents(body(text, size)))).toEqual([{event: 'message_start', data: '{"a":1}'}, {event: null, data: 'first\nsecond'}, {event: null, data: 'no-space'}, {event: null, data: 'tail'}]);
});
test('ndjson: one value per line, blank lines skipped, a line that is not JSON ends the read as unreadable', async () => {
  expect(await collect(ndjson(body('{"n":1}\n\n{"n":2}\n', 3)))).toEqual([{n: 1}, {n: 2}]);
  await expect(collect(ndjson(body('{"n":1}\nnot json\n')))).rejects.toMatchObject({name: 'AiError', kind: 'unreadable'});
});
test('abort: a never-ending body stops with an aborted error and the reader is cancelled', async () => {
  let cancelled = false;
  const endless = new ReadableStream<Uint8Array>({pull() { return new Promise<void>(() => undefined); }, cancel() { cancelled = true; }});
  const controller = new AbortController();
  const read = collect(sseEvents(endless, controller.signal));
  await new Promise(resolve => setTimeout(resolve, 10));
  controller.abort();
  const error = await read.catch(e => e as AiError);
  expect(error).toBeInstanceOf(AiError); expect((error as AiError).kind).toBe('aborted');
  expect(cancelled).toBe(true);
  await expect(collect(sseEvents(body('data: x\n\n'), AbortSignal.abort()))).rejects.toMatchObject({kind: 'aborted'});
});

// Session X-Local Part 5c: a stream that stops sending is ended by the watchdog as `stalled`; what arrived was yielded.
test('stall: a body that goes quiet ends with a stalled error after the watchdog, the reader cancelled, the earlier events kept', async () => {
  let cancelled = false, pulls = 0;
  const quiet = new ReadableStream<Uint8Array>({pull(controller) { if (pulls++ === 0) { controller.enqueue(new TextEncoder().encode('data: first\n\n')); return; } return new Promise<void>(() => undefined); }, cancel() { cancelled = true; }});
  const seen: string[] = [];
  const error = await (async () => { try { for await (const e of sseEvents(quiet, undefined, 40)) seen.push(e.data); return null; } catch (e) { return e as AiError; } })();
  expect(seen).toEqual(['first']);
  expect(error).toBeInstanceOf(Stalled); expect(error!.kind).toBe('stalled'); expect(error!.message).toMatch(/sent nothing for 0 seconds|sent nothing/);
  expect(cancelled).toBe(true);
  // A body that keeps sending within the window never stalls, and the watchdog never fires after the end.
  await expect(collect(lines(body('a\nb\nc\n', 2), undefined, 40))).resolves.toEqual(['a', 'b', 'c']);
  await new Promise(resolve => setTimeout(resolve, 60));
});
