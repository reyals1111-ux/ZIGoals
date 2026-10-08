#!/usr/bin/env node
/**
 * Session X-Local Part 2: builds the "studio4" fixture, a tiny but valid Studio-4-shaped delivery (the same names and
 * formats the studio ships, solid-colour frames, a few hundred bytes each) plus its SHA256SUMS and a reactions.json.
 * Every WebP is a real VP8L (lossless) image: a single-symbol Huffman code costs no bits per pixel, so a solid image of
 * any size is the 1×1 probe image with its size fields changed. Animated WebPs wrap two such frames in VP8X/ANIM/ANMF;
 * APNGs are IHDR + acTL + fcTL + IDAT + fdAT. Re-run after changing the contract: `node scripts/zigi/fixtures/make-studio4.mjs`.
 */
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
const out = join(fileURLToPath(new URL('.', import.meta.url)), 'studio4');
const u24 = (n) => Buffer.from([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]);
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const chunk = (type, body) => Buffer.concat([Buffer.from(type, 'latin1'), u32(body.length), body, body.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)]);
/** A VP8L chunk for a solid 1-colour W×H image with alpha (the probe's bitstream with its size fields set). */
function vp8l(w, h) {
  const head = Buffer.alloc(4); head.writeUInt32LE(((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14) | (1 << 28));
  return chunk('VP8L', Buffer.concat([Buffer.from([0x2f]), head, Buffer.from([0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0x00])]));
}
const riff = (chunks) => { const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]); return Buffer.concat([Buffer.from('RIFF', 'latin1'), u32(body.length), body]); };
const stillWebp = (w, h) => riff([chunk('VP8X', Buffer.concat([Buffer.from([0x10, 0, 0, 0]), u24(w - 1), u24(h - 1)])), vp8l(w, h)]);
function animWebp(w, h, loops, frames = 2) {
  const anmf = Buffer.concat([u24(0), u24(0), u24(w - 1), u24(h - 1), u24(42), Buffer.from([0]), vp8l(w, h)]);
  return riff([chunk('VP8X', Buffer.concat([Buffer.from([0x12, 0, 0, 0]), u24(w - 1), u24(h - 1)])), chunk('ANIM', Buffer.concat([u32(0), Buffer.from([loops & 0xff, loops >> 8])])), ...Array.from({length: frames}, () => chunk('ANMF', anmf))]);
}
const crc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return (buf) => { let c = 0xffffffff; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
const png = (type, body) => { const t = Buffer.from(type, 'latin1'), len = Buffer.alloc(4); len.writeUInt32BE(body.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, body]))); return Buffer.concat([len, t, body, c]); };
const be32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
function apng(w, h, plays, frames = 2) {
  const raw = Buffer.alloc((1 + w * 4) * h), idat = deflateSync(raw);
  const ihdr = Buffer.concat([be32(w), be32(h), Buffer.from([8, 6, 0, 0, 0])]);
  const fctl = (seq) => png('fcTL', Buffer.concat([be32(seq), be32(w), be32(h), be32(0), be32(0), Buffer.from([0, 1, 0, 24, 0, 0])]));
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), png('IHDR', ihdr), png('acTL', Buffer.concat([be32(frames), be32(plays)])), fctl(0), png('IDAT', idat)];
  let seq = 1; for (let f = 1; f < frames; f++) { parts.push(fctl(seq++)); parts.push(png('fdAT', Buffer.concat([be32(seq++), idat]))); }
  parts.push(png('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}
const CLIPS = [['F001', 'idle', 0], ['F002', 'greeting', 1], ['F003', 'insight', 1], ['F004', 'listening', 0], ['F005', 'speaking', 0], ['F006', 'presenting', 1], ['F007', 'attention', 0], ['F008', 'sleepy', 0], ['F009', 'celebrate', 1], ['T001', 'thinking', 0], ['E001', 'error', 1],
  ['X001', 'greeting-in-place', 1], ['X010', 'idle-glance', 0], ['X011', 'idle-settle', 0], ['X020', 'gaze-chat-input', 0], ['X021', 'gaze-viewer', 0], ['X022', 'gaze-pointed-target', 0],
  ...Array.from({length: 13}, (_, i) => [`R${String(i + 1).padStart(3, '0')}`, `reaction-${i + 1}`, 1])];
rmSync(out, {recursive: true, force: true}); mkdirSync(out, {recursive: true});
for (const [code, state, loops] of CLIPS) {
  writeFileSync(join(out, `${code}-${state}.webp`), stillWebp(96, 126));
  writeFileSync(join(out, `${code}-${state}-2x.webp`), stillWebp(192, 253));
  writeFileSync(join(out, `${code}-${state}-large.webp`), stillWebp(480, 632));
  writeFileSync(join(out, `${code}-${state}.anim.webp`), animWebp(96, 126, loops));
  writeFileSync(join(out, `${code}-${state}.anim.png`), apng(96, 126, loops));
}
writeFileSync(join(out, 'reactions.json'), JSON.stringify({R001: 'card_accepted', R002: 'goal_milestone'}, null, 2) + '\n');
const sums = readdirSync(out).filter(n => n !== 'reactions.json').sort().map(n => `${createHash('sha256').update(readFileSync(join(out, n))).digest('hex')}  ${n}`);
writeFileSync(join(out, 'SHA256SUMS'), sums.join('\n') + '\n');
console.log(`${CLIPS.length * 5} files written to ${out}`);
