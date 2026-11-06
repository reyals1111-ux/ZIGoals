import {describe, expect, test, vi} from 'vitest';
import {WC_ACCOUNT_NOT_APPROVED, WC_STAKING_METHODS, walletConnectKeplr, walletConnectStakingKeys} from './execute';

// Session AL (Z1C-I3; `TIER 3 (wallet)`, a refusal only): the account the wallet answers with must be one its approved
// session lists for the network (CAIP-10). Nothing about signing changes; a mismatch stops before any review or signature.
const ZIG = 'zig1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', OTHER = 'zig1zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
const PUB = btoa(String.fromCharCode(...new Uint8Array(33).fill(2)));
function live(answerAddress: string, accounts: string[]) {
  const request = vi.fn(async ({request: r}: {request: {method: string}}) => r.method === 'cosmos_getAccounts' ? [{address: answerAddress, algo: 'secp256k1', pubkey: PUB}] : null);
  return {request, value: {client: {request}, staking: true, session: {topic: 't', namespaces: {cosmos: {accounts, methods: [...WC_STAKING_METHODS]}}}}};
}

describe('Z1C-I3: account bound to the approved session', () => {
  test('the approved account connects as before', async () => {
    const keys = walletConnectStakingKeys(live(ZIG, [`cosmos:zig-test-2:${ZIG}`]).value, 'zig-test-2')!;
    expect((await keys.getKey('zig-test-2')).bech32Address).toBe(ZIG);
  });
  test('an account the session does not list for this network is refused, for connect and for the signer, and nothing is signed', async () => {
    // Approved on the other network only, or a different address altogether.
    for (const accounts of [[`cosmos:zig-test-2:${OTHER}`], [`cosmos:zig-test-2:${OTHER}`, `cosmos:zigchain-1:${ZIG}`]]) {
      const l = live(ZIG, accounts);
      await expect(walletConnectStakingKeys(l.value, 'zig-test-2')!.getKey('zig-test-2')).rejects.toThrow(WC_ACCOUNT_NOT_APPROVED);
      const signer = await walletConnectKeplr(l.value, 'zig-test-2')!.getOfflineSignerAuto('zig-test-2', {preferNoSetFee: true}) as unknown as {getAccounts: () => Promise<unknown>};
      await expect(signer.getAccounts()).rejects.toThrow(WC_ACCOUNT_NOT_APPROVED);
      expect(l.request.mock.calls.every(([args]) => args.request.method === 'cosmos_getAccounts')).toBe(true);
    }
    expect(WC_ACCOUNT_NOT_APPROVED).toMatch(/Nothing was connected or signed/);
  });
});
