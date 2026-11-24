import {formatUnits} from '@zigoals/chain-config';
import {readDeviceRecord} from '../../device-record';
import {LINKED_WALLETS, linkedWalletsOf} from '../../linked-wallets';
import {getAppStorage} from '../../showcase-storage';
import {WALLET_BALANCES_KEY} from '../../af-wallet-keys';
import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {instantText, localQty, nlDayText} from './words';

/**
 * Session AV lane 2 (fr-answers; FR-TJ-5): what a linked (watched) wallet holds, as Wealth's linked wallets and Portfolio
 * show it: the last balance this device read for the address (`zigoals:wallet-balances:v1`), per coin, with its read
 * time. Read-only and view-only: nothing is fetched, signed or changed here, and no value is made without a price on
 * this device. Read at the moment of the question from this device's records (none in the Showcase, whose record has
 * no linked wallets), and only while Wealth is shared with the answer. The balances record is read as plain data (no
 * module under lib/wallets is imported into ZIGi's tree, lib/ai/zigi-guard.test.ts).
 */
export type Watched = {label: string; symbol: string; quantity: string; at: string};
type Observed = {walletId?: unknown; at?: unknown; assets?: unknown};
export type WalletSources = {wallets?: ReturnType<typeof linkedWalletsOf>; balances?: {observations?: Record<string, Observed>} | null};
export function readWalletSources(): WalletSources {
  try {
    if (typeof window === 'undefined') return {};
    const storage = getAppStorage();
    const raw = storage.getItem(WALLET_BALANCES_KEY), balances = raw ? JSON.parse(raw) as WalletSources['balances'] : null;
    return {wallets: linkedWalletsOf(readDeviceRecord(storage, LINKED_WALLETS).data), balances: balances && typeof balances === 'object' ? balances : null};
  } catch { return {}; }
}
export function watchedHoldings(env: ToolEnv, symbol: string | null, sources: WalletSources = readWalletSources()): Watched[] {
  if (env.areas.wealth === false || env.showcase) return [];
  const out: Watched[] = [];
  const linked = new Map((sources.wallets ?? []).map(w => [w.id, w]));
  for (const o of Object.values(sources.balances?.observations ?? {})) {
    const wallet = typeof o?.walletId === 'string' ? linked.get(o.walletId) : undefined;
    if (!wallet || typeof o.at !== 'string' || !Array.isArray(o.assets)) continue;
    for (const asset of o.assets as {symbol?: unknown; decimals?: unknown; amount?: unknown}[]) {
      if (typeof asset?.symbol !== 'string' || typeof asset.decimals !== 'number' || !Number.isInteger(asset.decimals) || asset.decimals < 0 || asset.decimals > 30) continue;
      if (symbol && asset.symbol.toUpperCase() !== symbol.toUpperCase()) continue;
      let quantity = '';
      try { quantity = formatUnits(BigInt(String(asset.amount)).toString(), asset.decimals); } catch { continue; }
      if (!/^\d+(?:\.\d+)?$/.test(quantity) || /^0(?:\.0+)?$/.test(quantity)) continue;
      out.push({label: clean(wallet.label, 40), symbol: asset.symbol.toUpperCase(), quantity, at: o.at});
    }
  }
  return out;
}
/** "0.18234271 BTC in your linked wallet “Bitcoin address” (view only, read Tue, Nov 24, 11:30 AM UTC)". */
export function watchedWords(rows: readonly Watched[], lang: 'en' | 'nl', today: string): string {
  return rows.map(r => lang === 'nl'
    ? `${localQty(r.quantity)} ${r.symbol} in je gekoppelde wallet “${r.label}” (alleen bekijken, gelezen ${nlDayText(r.at.slice(0, 10), today.slice(0, 4))} ${r.at.slice(11, 16)} UTC)`
    : `${localQty(r.quantity)} ${r.symbol} in your linked wallet “${r.label}” (view only, read ${instantText(r.at, today)})`).join('; ');
}
