'use client';
import {useEffect, useState} from 'react';
import {getAppStorage} from '../lib/showcase-storage';
import {localDate} from '../lib/local-date';
import {readTvlHistory, saveTvlHistory, trendWords, tvlTrend, withTvlRead} from '../lib/zigchain-eco/tvl-history';
import type {LiveState} from '../lib/earn/client';
import type {DefillamaData} from '../lib/earn/live/types';
import {formatDate, formatDateTime} from '../lib/visual-format';
const store = () => { try { return getAppStorage(); } catch { return null; } };

/**
 * Session AH (CO7; owner note: "reuse it in ecosystem where it fits"): the value locked that Earn already reads from
 * DefiLlama (a third party, through ZIGoals' own /api/earn/defillama route), on the five Ecosystem cards Earn covers,
 * with its source, the time it was read and a way to Earn's section. Nothing new is fetched from outside.
 * Session AL (BN-027): the read says its date with its time ("Nov 4, 2026, 1:33 AM"), never a time alone.
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
  const protocol = link && llama.phase === 'ok' ? llama.answer.data.protocols[link.slug] : undefined;
  const figure = llama.phase === 'loading' ? 'reading…' : protocol?.status === 'ok' && protocol.tvlUsd !== null ? usd(protocol.tvlUsd) : 'unavailable right now';
  // Session AL (C-BN-14, GAP-144): each fresh read is kept, one figure a day, so the card can say how it moved since this
  // device first read it. An earlier (stale) read is not recorded again.
  const tvl = protocol?.status === 'ok' ? protocol.tvlUsd : null, fresh = llama.phase === 'ok' && !llama.answer.stale;
  const [trend, setTrend] = useState<ReturnType<typeof tvlTrend>>(null);
  useEffect(() => {
    if (!link) return;
    const s = store(); let h = readTvlHistory(s);
    if (fresh && tvl !== null) { const next = withTvlRead(h, link.slug, localDate(), tvl); if (next !== h) { saveTvlHistory(s, next); h = next; } }
    setTrend(tvlTrend(h, link.slug));
  }, [link, fresh, tvl]);
  const moved = trendWords(trend);
  if (!link) return null;
  return <p className="ecosystem-live fine" data-live={protocol?.status === 'ok' && protocol.tvlUsd !== null || undefined}>
    Value locked: <strong>{figure}</strong>
    {llama.phase === 'ok' && <> · DefiLlama, a third party · read <time dateTime={llama.answer.fetchedAt}>{formatDateTime(llama.answer.fetchedAt)}</time>{llama.answer.stale ? ' (earlier read)' : ''}</>}
    {trend && moved && <span className="ecosystem-tvl-trend"> · Since {formatDate(trend.from)}: {moved}, from the reads on this device ({trend.days} days), not a full history</span>}
    {' · '}<a className="text-link" href={`/app/earn#${link.earn}`}>On Earn →</a>
  </p>;
}
