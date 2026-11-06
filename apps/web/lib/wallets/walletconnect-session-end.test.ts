import {describe, expect, test, vi} from 'vitest';
import {WALLETCONNECT_CHANGE, startWalletConnect, stopWalletConnect, walletConnectPeerName, walletConnectSession} from './walletconnect';

// Session AL (Z1C-I2, Z1C-I3; `TIER 3 (wallet)`, bookkeeping only): the wallet ending or letting the session expire on its
// side drops this tab's session and announces it; labels use the name the approved session reports. Fake clients only.
const ID = '0123456789abcdef0123456789abcdef';
const PAIRING = 'wc:' + 'c'.repeat(64) + '@2?relay-protocol=irn&symKey=' + 'd'.repeat(64);
function fakeLoader() {
  const listeners = new Map<string, ((args: {topic?: unknown}) => void)[]>();
  let approve!: (s: unknown) => void;
  const client = {
    connect: vi.fn(async () => ({uri: PAIRING, approval: () => new Promise(r => { approve = r; })})),
    disconnect: vi.fn(async () => undefined),
    on: vi.fn((event: string, listener: (args: {topic?: unknown}) => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]); return client; }),
  };
  const loader = vi.fn(async () => ({SignClient: {init: vi.fn(async () => client)}}));
  return {client, loader, approve: (s: unknown) => approve(s), emit: (event: string, args: {topic?: unknown}) => { for (const l of listeners.get(event) ?? []) l(args); }};
}
async function paired(name: unknown = 'Fictional Keplr') {
  const fake = fakeLoader();
  const started = await startWalletConnect({projectId: ID, origin: 'https://alpha.zigoals.app', loader: fake.loader, stakingMethods: ['cosmos_getAccounts', 'cosmos_signDirect']});
  fake.approve({topic: 'live-topic', peer: {metadata: {name}}, namespaces: {}});
  await started.approval;
  return fake;
}

describe('Z1C-I2: the wallet ends the session', () => {
  for (const event of ['session_delete', 'session_expire']) test(`${event} for this tab's topic drops the session and announces the change; nothing is asked of the wallet`, async () => {
    const target = new EventTarget(), heard = vi.fn();
    vi.stubGlobal('window', target);
    target.addEventListener(WALLETCONNECT_CHANGE, heard);
    try {
      const fake = await paired();
      expect(fake.client.on).toHaveBeenCalledWith('session_delete', expect.any(Function));
      expect(fake.client.on).toHaveBeenCalledWith('session_expire', expect.any(Function));
      heard.mockClear();
      fake.emit(event, {topic: 'some-other-topic'});
      expect(walletConnectSession()?.session?.topic).toBe('live-topic');
      expect(heard).not.toHaveBeenCalled();
      fake.emit(event, {topic: 'live-topic'});
      expect(walletConnectSession()).toBeNull();
      expect(heard).toHaveBeenCalledTimes(1);
      // Ended by the wallet: ZIGoals sends nothing back (no disconnect request on a topic that is gone).
      expect(fake.client.disconnect).not.toHaveBeenCalled();
      fake.emit(event, {topic: 'live-topic'});
      expect(heard).toHaveBeenCalledTimes(1);
    } finally { await stopWalletConnect(); vi.unstubAllGlobals(); }
  });
  test('an end event from an older client never drops the newer pairing', async () => {
    const older = await paired('Older');
    const newer = await paired('Newer');
    older.emit('session_delete', {topic: 'live-topic'});
    expect(walletConnectSession()?.client).toBe(newer.client);
    await stopWalletConnect();
  });
});

describe('Z1C-I3: the wallet is named by its approved session', () => {
  test('the peer name, cleaned and trimmed; null when the session gives none', async () => {
    await paired('Fictional Keplr');
    expect(walletConnectPeerName()).toBe('Fictional Keplr');
    await stopWalletConnect();
    expect(walletConnectPeerName()).toBeNull();
    expect(walletConnectPeerName({session: {peer: {metadata: {name: '  Trust\u0000 Wallet\n '}}}})).toBe('Trust Wallet');
    expect(walletConnectPeerName({session: {peer: {metadata: {name: 'x'.repeat(80)}}}})).toHaveLength(40);
    for (const name of [undefined, 7, '', '   ']) expect(walletConnectPeerName({session: {peer: {metadata: {name}}}})).toBeNull();
  });
});
