'use client';
import type {LiveState} from '../lib/earn/client';
import type {DefillamaData} from '../lib/earn/live/types';
import {formatTime} from '../lib/visual-format';

/**
 * Session AH (CO7; owner note: "reuse it in ecosystem where it fits"): the value locked that Earn already reads from
 * DefiLlama (a third party, through ZIGoals' own /api/earn/defillama route), on the five Ecosystem cards Earn covers,
 * with its source, the time it was read and a way to Earn's section. Nothing new is fetched from outside.
 */
export const ECOSYSTEM_LIVE: Readonly<Record<string, {slug: keyof DefillamaData['protocols']; earn: string}>> = Object.freeze({
  valdora: {slug: 'valdora-finance', earn: 'valdora'},
  oroswap: {slug: 'oroswap', earn: 'oroswap'},
  nawa: {slug: 'nawa-protocol', earn: 'nawa'},
  'defa-invoicemate': {slug: 'defa-by-invoicemate', earn: 'defa'},
  permapod: {slug: 'permapod', earn: 'permapod'},
});
const usd = (n: number) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1}).format(n);

export function EcosystemLiveLine({id, llama}: {id: string; llama: LiveState<DefillamaData>}) {
  const link = ECOSYSTEM_LIVE[id];
  if (!link) return null;
  const protocol = llama.phase === 'ok' ? llama.answer.data.protocols[link.slug] : undefined;
  const figure = llama.phase === 'loading' ? 'reading…' : protocol?.status === 'ok' && protocol.tvlUsd !== null ? usd(protocol.tvlUsd) : 'unavailable right now';
  return <p className="ecosystem-live fine" data-live={protocol?.status === 'ok' && protocol.tvlUsd !== null || undefined}>
    Value locked: <strong>{figure}</strong>
    {llama.phase === 'ok' && <> · DefiLlama, a third party · read <time dateTime={llama.answer.fetchedAt}>{formatTime(llama.answer.fetchedAt)}</time>{llama.answer.stale ? ' (earlier read)' : ''}</>}
    {' · '}<a className="text-link" href={`/app/earn#${link.earn}`}>On Earn →</a>
  </p>;
}
