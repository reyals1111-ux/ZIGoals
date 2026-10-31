import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

/**
 * Session AK (F4, lead's request): Leap ended its wallet on 28 May 2026 and Cosmostation has been winding its wallet
 * down since 1 September 2026 (lib/wallet-link.ts records both; docs/research/session-ak/COMPETITORS_2.md item 2). No
 * Earn, staking, governance or ZIGChain-ecosystem copy may suggest either as a wallet to connect. The only places that
 * name them are the linked-wallet code and Help, which say they ended; those are outside the folders read here.
 */
const WEB = fileURLToPath(new URL('../../', import.meta.url));
const FOLDERS = ['components/earn', 'components/staking', 'components/governance', 'components/zigchain-eco', 'lib/earn', 'lib/staking', 'lib/governance', 'lib/zigchain-eco'];
function files(dir: string): string[] {
  let names: string[];
  try { names = readdirSync(dir); } catch { return []; }
  return names.flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []; });
}
describe('closed wallets are never suggested', () => {
  it('no Earn, staking, governance or ecosystem source names Leap or Cosmostation', () => {
    const all = FOLDERS.flatMap(f => files(join(WEB, f)));
    expect(all.length).toBeGreaterThan(50);
    const hits = all.filter(path => /\b(Leap|Cosmostation)\b/.test(readFileSync(path, 'utf8'))).map(path => path.slice(WEB.length));
    expect(hits).toEqual([]);
  });
  it('the OroSwap guide names Keplr, and Keplr Mobile on a phone', async () => {
    const {OROSWAP_GUIDE} = await import('../../components/earn/oroswap-section');
    expect(OROSWAP_GUIDE.steps[0]).toBe('On OroSwap, connect Keplr (on a phone, the Keplr Mobile app) and check ZIGChain is selected.');
  });
});
