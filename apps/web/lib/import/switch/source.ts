import {entryStream, listZip} from '../zip-stream';

/**
 * What a person hands the importer (Session W Part 7): one or more ZIP archives (Google Takeout splits a large export
 * into several), a single file (an Apple export.xml already unpacked, a CSV), or a folder (Samsung Health saves a folder,
 * not an archive). Each becomes a list of files by path, opened one at a time as a stream; nothing is read up front but
 * the archives' directories.
 */
export type ImportFile = {path: string; size: number; open: () => Promise<ReadableStream<Uint8Array>>};
type Picked = File & {webkitRelativePath?: string};
const isZip = (file: File) => /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
export async function filesFrom(picked: readonly Picked[]): Promise<ImportFile[]> {
  const out: ImportFile[] = [];
  for (const file of picked) {
    if (isZip(file)) {
      for (const entry of await listZip(file)) {
        if (entry.name.endsWith('/')) continue;
        out.push({path: entry.name, size: entry.uncompressed, open: () => entryStream(file, entry)});
      }
    } else out.push({path: file.webkitRelativePath || file.name, size: file.size, open: async () => file.stream() as ReadableStream<Uint8Array>});
  }
  return out;
}
/** The last part of a path ("App Data/sleepmodel.csv" → "sleepmodel.csv"). */
export const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
/**
 * A file's text as a stream of strings, with the byte progress reported as it goes (one call per chunk, the bytes so far
 * across every file read through the same counter). A leading byte-order mark is dropped.
 */
export function textStream(file: ImportFile, progress?: {add: (bytes: number) => void}): ReadableStream<string> {
  let first = true;
  const counter = new TransformStream<Uint8Array, Uint8Array>({transform(chunk, controller) { progress?.add(chunk.length); controller.enqueue(chunk); }});
  const strip = new TransformStream<string, string>({transform(chunk, controller) { if (first) { first = false; if (chunk.charCodeAt(0) === 0xFEFF) chunk = chunk.slice(1); } if (chunk) controller.enqueue(chunk); }});
  return new ReadableStream<string>({
    async start(controller) {
      try {
        const reader = (await file.open()).pipeThrough(counter).pipeThrough(new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>).pipeThrough(strip).getReader();
        for (;;) { const {done, value} = await reader.read(); if (done) break; controller.enqueue(value); }
        controller.close();
      } catch (error) { controller.error(error); }
    },
  });
}
/** A small file's whole text (a JSON day list, a habit list); refused above `limit` bytes. */
export async function textOf(file: ImportFile, progress?: {add: (bytes: number) => void}, limit = 64 * 1024 * 1024): Promise<string> {
  if (file.size > limit) throw Error(`${baseName(file.path)} is larger than ZIGoals reads in one piece.`);
  const reader = textStream(file, progress).getReader();
  let text = '';
  for (;;) { const {done, value} = await reader.read(); if (done) return text; text += value; }
}
/** The first bytes of a file as text (detection reads the start of an XML file for its DOCTYPE). */
export async function headOf(file: ImportFile, bytes = 4096): Promise<string> {
  const reader = (await file.open()).getReader(), parts: Uint8Array[] = [];
  let got = 0;
  try { while (got < bytes) { const {done, value} = await reader.read(); if (done) break; parts.push(value); got += value.length; } }
  finally { void reader.cancel().catch(() => undefined); }
  const all = new Uint8Array(Math.min(got, bytes)); let at = 0;
  for (const p of parts) { const take = p.subarray(0, Math.min(p.length, all.length - at)); all.set(take, at); at += take.length; if (at >= all.length) break; }
  return new TextDecoder('utf-8', {fatal: false}).decode(all).replace(/^﻿/, '');
}
/** Byte progress across the files a reader opens: `add` from the streams, `report` throttled to every 256 KB. */
export function progressCounter(onProgress?: (done: number) => void) {
  let done = 0, reported = 0;
  return {add(bytes: number) { done += bytes; if (onProgress && done - reported >= 262_144) { reported = done; onProgress(done); } }, get done() { return done; }, flush() { onProgress?.(done); }};
}
