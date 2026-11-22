import type {CardFormat} from './schema';

/**
 * Session AV lane 2, round 2 (money; Wallet's loyalty and club cards): ZIGoals' own small 1D barcode encoder, so no new
 * package is needed (the installed @zxing/library writes QR codes only; QR codes use lib/qr). EAN-13, EAN-8 and UPC-A with
 * their check digit, and Code 128 (set C for even runs of digits, set B for the rest, with its checksum). The result is a
 * row of modules (true: a bar), drawn on screen in black on white; the quiet zone is the renderer's. Pure.
 */
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = L.map(p => [...p].map(b => b === '0' ? '1' : '0').join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
/** The check digit of the digits before it (EAN and UPC: weights 3 and 1 from the right). */
export function checkDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += Number(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}
const validCheck = (code: string) => /^\d+$/.test(code) && checkDigit(code.slice(0, -1)) === Number(code.at(-1));
/** The full number with its check digit: a number one short gets it added; a full one must carry the right one. */
export function withCheck(number: string, length: 8 | 12 | 13): string | null {
  const n = number.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(n)) return null;
  if (n.length === length - 1) return n + checkDigit(n);
  return n.length === length && validCheck(n) ? n : null;
}
const bits = (s: string) => [...s].map(b => b === '1');
function ean13(code: string): boolean[] {
  const parity = PARITY[Number(code[0])]!, left = code.slice(1, 7), right = code.slice(7);
  return bits('101' + [...left].map((d, i) => (parity[i] === 'L' ? L : G)[Number(d)]).join('') + '01010' + [...right].map(d => R[Number(d)]).join('') + '101');
}
function ean8(code: string): boolean[] {
  return bits('101' + [...code.slice(0, 4)].map(d => L[Number(d)]).join('') + '01010' + [...code.slice(4)].map(d => R[Number(d)]).join('') + '101');
}

// Code 128: bar and space widths of each symbol value (0–105), and the stop.
export const CODE128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 '
  + '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 '
  + '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 '
  + '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 '
  + '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 '
  + '114131 311141 411131 211412 211214 211232').split(' ');
export const CODE128_STOP = '2331112';
const START_B = 104, START_C = 105, TO_B = 100, TO_C = 99;
/** The symbol values of a text in Code 128: set C for runs of four or more digits (pairs), set B for the rest. */
export function code128Values(text: string): number[] {
  if (!/^[\x20-\x7e]+$/.test(text)) throw new Error('A card number for Code 128 uses letters, digits and common signs only.');
  const out: number[] = [];
  let set: 'B' | 'C' | null = null, i = 0;
  const digitsAt = (k: number) => { let n = 0; while (k + n < text.length && /\d/.test(text[k + n]!)) n++; return n; };
  while (i < text.length) {
    const run = digitsAt(i);
    if (run >= 4 || (run >= 2 && run === text.length - i && set === 'C')) {
      const pairs = Math.floor(run / 2);
      if (set !== 'C') { out.push(set === null ? START_C : TO_C); set = 'C'; }
      for (let p = 0; p < pairs; p++, i += 2) out.push(Number(text.slice(i, i + 2)));
    } else {
      if (set !== 'B') { out.push(set === null ? START_B : TO_B); set = 'B'; }
      out.push(text.charCodeAt(i) - 32); i++;
    }
  }
  const check = out.reduce((sum, v, k) => sum + v * (k === 0 ? 1 : k), 0) % 103;
  return [...out, check];
}
function code128(text: string): boolean[] {
  const widths = [...code128Values(text).map(v => CODE128[v]!), CODE128_STOP].join(''), out: boolean[] = [];
  [...widths].forEach((w, k) => { for (let n = 0; n < Number(w); n++) out.push(k % 2 === 0); });
  return out;
}
export type Bars = {modules: boolean[]; text: string; format: Exclude<CardFormat, 'qr'>};
/** The bars for a card number in a format, or null with the reason when the number does not fit that format. */
export function encodeBars(number: string, format: Exclude<CardFormat, 'qr'>): {ok: true; bars: Bars} | {ok: false; problem: string} {
  if (format === 'code128') {
    const text = number.trim();
    if (!text) return {ok: false, problem: 'Type the card number.'};
    try { return {ok: true, bars: {modules: code128(text), text, format}}; } catch (e) { return {ok: false, problem: e instanceof Error ? e.message : 'This number cannot be drawn as Code 128.'}; }
  }
  const length = format === 'ean13' ? 13 : format === 'upca' ? 12 : 8, code = withCheck(number, length);
  if (!code) return {ok: false, problem: `${format === 'ean13' ? 'EAN-13' : format === 'upca' ? 'UPC-A' : 'EAN-8'} is ${length} digits (or ${length - 1}, and ZIGoals adds the check digit); this number does not fit. Choose Code 128 or QR code instead.`};
  return {ok: true, bars: {modules: format === 'ean8' ? ean8(code) : ean13(format === 'upca' ? `0${code}` : code), text: code, format}};
}
/** The format a number most likely uses: a valid EAN-13, UPC-A or EAN-8 check digit, else Code 128. */
export function guessFormat(number: string): Exclude<CardFormat, 'qr'> {
  const n = number.replace(/[\s-]/g, '');
  if (/^\d{13}$/.test(n) && validCheck(n)) return 'ean13';
  if (/^\d{12}$/.test(n) && validCheck(n)) return 'upca';
  if (/^\d{8}$/.test(n) && validCheck(n)) return 'ean8';
  return 'code128';
}
/** The format a scanner reported (BarcodeDetector or ZXing names), when it is one ZIGoals draws. */
export function formatFromScan(name: string): CardFormat | null {
  const k = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return k === 'ean13' ? 'ean13' : k === 'ean8' ? 'ean8' : k === 'upca' ? 'upca' : k === 'code128' ? 'code128' : k === 'qrcode' || k === 'qr' ? 'qr' : null;
}
/** Runs of bars as [start, width] in modules, for the SVG renderer. */
export function barRuns(modules: readonly boolean[]): [number, number][] {
  const runs: [number, number][] = [];
  for (let i = 0; i < modules.length; i++) if (modules[i]) { const start = i; while (modules[i + 1]) i++; runs.push([start, i - start + 1]); }
  return runs;
}
