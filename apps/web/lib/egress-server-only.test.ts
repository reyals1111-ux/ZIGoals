import {describe, expect, test} from 'vitest';
import egress from './egress-policy.json';
import {connectSources} from './csp-compose.mjs';
import {EARN_EGRESS} from './server/earn/upstream';
import {RECIPE_RESOLVER} from './server/recipe-resolve';
import {VALIDATOR_LCDS} from './server/chain-validators';
import {RAMP_EGRESS} from './onramps/server/ramp-assets';
import {ATTESTATION_SOURCE} from './server/chain-attestations';

// Session AF (the lead, ADR-028 H16, H71): the server-only list names every fixed public origin the app's server reads, and
// none of them reaches the browser's connect-src on any document class, except the testnet LCD, which the browser has also
// read directly since before Session AF (chainOrigins). The entries are taken from the code that holds them,
// so a new upstream that is not listed here fails.
const named = Object.entries(egress.serverOnly).filter(([key]) => key !== 'note').flatMap(([, text]) => String(text).match(/https:\/\/[a-z0-9.-]+/g) ?? []);

describe('server-only egress', () => {
  test('every fixed origin the Earn routes, the chain relay and the recipe resolver reach is named', () => {
    for (const origin of EARN_EGRESS) expect(named, origin).toContain(origin);
    expect(named).toContain(new URL(RECIPE_RESOLVER).origin);
    expect(named).toContain(RAMP_EGRESS);
    expect(named).toContain(new URL(ATTESTATION_SOURCE).origin);
    expect(egress.serverOnly).toHaveProperty('chainRelay');
    for (const host of Object.values(VALIDATOR_LCDS)) expect(named, host).toContain(host);
  });
  test('none of them enters connect-src, for app pages or site pages, except a chain origin the browser also reads', () => {
    for (const cls of ['app', 'site'] as const) {
      const connect = connectSources(egress, cls);
      for (const origin of new Set(named)) if (!egress.chainOrigins.includes(origin)) expect(connect, `${cls}: ${origin}`).not.toContain(origin);
      // H16: the mainnet LCD is read by the server only; the browser signs through the RPC host.
      expect(connect).not.toContain('https://api.zigchain.com');
    }
    expect(egress.chainOrigins.filter(origin => named.includes(origin))).toEqual(['https://testnet-api.zigchain.com']);
  });
});
