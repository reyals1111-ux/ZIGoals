/** Numbers in a CSV cell: blank stays unknown (null), the other sign's thousands separators are removed, nothing is guessed. */
export type NumberStyle = 'point' | 'comma';
/** A decimal text ("1234.5") or null for a blank cell; throws a reason for text, exponents and negatives. */
export function parseNumberCell(raw: string, style: NumberStyle): string | null {
  const cell = raw.trim();
  if (!cell) return null;
  if (/[eE]/.test(cell)) throw Error('uses exponent notation');
  if (cell.startsWith('-') || cell.startsWith('−')) throw Error('is negative');
  const cleaned = style === 'comma' ? cell.replace(/[.\s']/g, '').replace(',', '.') : cell.replace(/[,\s']/g, '');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) throw Error('is not a number');
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const text = fraction.replace(/0+$/, '') ? `${whole.replace(/^0+(?=\d)/, '')}.${fraction.replace(/0+$/, '')}` : whole.replace(/^0+(?=\d)/, '');
  return text === '' ? '0' : text;
}
/** Comma only when every cell with a comma has one or two digits after it and no cell mixes both signs; otherwise point. */
export function guessNumberStyle(cells: readonly string[]): NumberStyle {
  const withComma = cells.map(c => c.trim()).filter(c => c.includes(','));
  if (!withComma.length) return 'point';
  if (withComma.some(c => c.includes('.'))) return 'point';
  return withComma.every(c => /,\d{1,2}$/.test(c)) ? 'comma' : 'point';
}
