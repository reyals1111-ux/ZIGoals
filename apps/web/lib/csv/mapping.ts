/** Column guessing for the import mapping step (W3, I1): lower-case, no punctuation, each column used once. */
export type FieldSpec = {id: string; label: string; synonyms: readonly string[]; required?: boolean};
export const normalizeHeader = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '');
export function guessMapping(header: readonly string[], fields: readonly FieldSpec[]): Partial<Record<string, number>> {
  const normalized = header.map(normalizeHeader), used = new Set<number>(), mapping: Partial<Record<string, number>> = {};
  for (const field of fields) {
    const names = [field.id, ...field.synonyms].map(normalizeHeader);
    const index = normalized.findIndex((h, i) => !used.has(i) && h.length > 0 && names.includes(h));
    if (index >= 0) { mapping[field.id] = index; used.add(index); }
  }
  return mapping;
}
export const TRANSACTION_FIELDS: readonly FieldSpec[] = [
  {id: 'coin', label: 'Coin', synonyms: ['asset', 'symbol', 'ticker', 'currency', 'pair', 'market'], required: true},
  {id: 'kind', label: 'Type', synonyms: ['type', 'side', 'action', 'transaction type', 'operation', 'direction']},
  {id: 'quantity', label: 'Quantity', synonyms: ['amount', 'qty', 'units', 'size', 'volume'], required: true},
  {id: 'price', label: 'Price per coin', synonyms: ['unit price', 'price per coin', 'rate', 'price per unit']},
  {id: 'fee', label: 'Fee', synonyms: ['fees', 'commission']},
  {id: 'date', label: 'Date', synonyms: ['time', 'timestamp', 'executed at', 'datetime', 'date time'], required: true},
  {id: 'note', label: 'Note', synonyms: ['notes', 'memo', 'comment', 'description']},
];
export const HOLDINGS_FIELDS: readonly FieldSpec[] = [
  {id: 'name', label: 'Name', synonyms: ['asset name', 'holding', 'title'], required: true},
  {id: 'asset', label: 'Asset', synonyms: ['symbol', 'ticker', 'currency code', 'code']},
  {id: 'quantity', label: 'Quantity', synonyms: ['amount', 'qty', 'units', 'balance', 'size']},
  {id: 'class', label: 'Kind of asset', synonyms: ['kind of asset', 'kind', 'type', 'category', 'class', 'asset class', 'asset type']},
  {id: 'value', label: 'Value', synonyms: ['current value', 'total value', 'worth', 'market value']},
  {id: 'currency', label: 'Currency', synonyms: ['valuation currency', 'ccy', 'fiat'], required: true},
  {id: 'notes', label: 'Notes', synonyms: ['note', 'memo', 'comment']},
];
