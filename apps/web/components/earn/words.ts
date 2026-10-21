/**
 * Critique round 2 (L5c): a dated fact written as its own sentence ("Circle stopped new minting…") continued inside another
 * sentence ("…still arrives, but circle stopped…") lost a name's capital. `continueSentence` lowers the first letter only
 * when the first word is an ordinary word: a name (an app, a company, a network) or a word with more than one capital
 * (ZIGChain, USDC, OroSwap) keeps its case.
 */
const NAMES = new Set(['Circle', 'Valdora', 'Nawa', 'Zignaly', 'Permapod', 'Noble', 'Keplr', 'Injective', 'Skip', 'Binance', 'Ethereum', 'Cosmos', 'Osmosis', 'Leap', 'Banxa', 'InvoiceMate', 'DeFa', 'DefiLlama', 'Shariah']);
export function continueSentence(text: string): string {
  const first = /^[A-Za-z][A-Za-z’'-]*/.exec(text)?.[0] ?? '';
  if (!first || NAMES.has(first.replace(/[’'-].*$/, '')) || /[A-Z]/.test(first.slice(1))) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}
