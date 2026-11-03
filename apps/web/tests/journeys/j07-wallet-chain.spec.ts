import {createCipheriv, createDecipheriv, createHash, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes} from 'node:crypto';
import {test, type Page, type WebSocketRoute} from '@playwright/test';
import {fromBase64, toBase64, toBech32} from '@cosmjs/encoding';
import {MsgDelegate} from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import {TxBody, TxRaw} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import {desktopOnly, expect, hydrated, offlineApis, seedRecords, stored} from './journey-helpers';
import {openStatusSheet} from '../ab-shell';
import {chooseChain} from '../chain-choice';
import {ME, V1, ZIG as zigOf, fakeChain, openStaking, relay as stakingRelay} from '../staking-chain';

/**
 * Session AK F2, journey 7: phone wallets over WalletConnect, MOCKED end to end. The WalletConnect relay
 * (wss://relay.walletconnect.org) is answered by this test (Playwright's routeWebSocket), and a fictional wallet on
 * "another phone" is emulated here with the protocol's own cryptography (X25519, HKDF-SHA256, ChaCha20-Poly1305): it
 * reads the pairing proposal the app publishes, approves it with fictional accounts and settles the session. Nothing
 * reaches WalletConnect's servers or any chain.
 * 1. Read-only linking: the proposal asks for accounts only (no Ethereum or Solana method; Cosmos only
 *    cosmos_getAccounts); the approved addresses are linked read-only.
 * 2. Keplr Mobile for staking on the testnet: the staking pairing asks for the account read and exactly one signing
 *    method, for ZIGChain mainnet and testnet only; once approved, nothing at all is asked of the wallet: no signature
 *    without a reviewed action and the person's own Sign press.
 * 7b. Keplr Mobile stakes on the testnet with no Keplr in the browser: paired from Staking, it connects the Staking panel
 *    (the account read only), a delegation is reviewed, and the person's Sign press sends exactly one cosmos_signDirect of
 *    the reviewed document; the fictional wallet answers it (a stubbed signature) and the signed transaction goes to the
 *    testnet double of tests/staking-chain.ts, never to a real chain.
 */
test.use({actionTimeout: 20_000, timezoneId: 'UTC', viewport: {width: 390, height: 844}});
desktopOnly();
const ZIG = toBech32('zig', new Uint8Array(20).fill(7)), EVM = '0x52908400098527886E0F7030069857D2E4169EE7';
type Json = Record<string, unknown>;
const seal = (key: Buffer, text: string) => { const iv = randomBytes(12), c = createCipheriv('chacha20-poly1305', key, iv, {authTagLength: 16}); const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]); return Buffer.concat([Buffer.from([0]), iv, ct, c.getAuthTag()]).toString('base64'); };
const open = (key: Buffer, b64: string) => { const b = Buffer.from(b64, 'base64'), iv = b.subarray(1, 13), sealed = b.subarray(13), d = createDecipheriv('chacha20-poly1305', key, iv, {authTagLength: 16}); d.setAuthTag(sealed.subarray(sealed.length - 16)); return Buffer.concat([d.update(sealed.subarray(0, sealed.length - 16)), d.final()]).toString('utf8'); };
/** The raw JSON id of a message (WalletConnect's ids exceed a double's precision, so they are echoed as written). */
const rawId = (text: string) => /"id"\s*:\s*("?[0-9]+"?)/.exec(text)?.[1] ?? '0';

/** The Verify frame's double: it posts the attestation the client waits for, `{type: 'verify_attestation', attestation}`. */
const VERIFY_PAGE = `<!doctype html><title>verify</title><script>
const id = new URLSearchParams(location.search).get('id') || '', b = text => btoa(text).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
parent.postMessage(JSON.stringify({type: 'verify_attestation', attestation: [b('{"alg":"none","typ":"JWT"}'), b(JSON.stringify({id, isVerified: true})), b('fictional')].join('.')}), '*');
</script>`;
/** The relay, answered here, with a fictional wallet that approves the proposal with `accounts` (CAIP-10); with
 *  `answers`, the wallet also answers each session request (method, params) on the session topic, sealed. */
async function walletConnectRelay(page: Page, accounts: string[], walletName: string, answers?: (method: string, params: Json) => unknown) {
  const state = {proposals: [] as Json[], sessionRequests: [] as Json[], pairingKey: null as Buffer | null, sessionKey: null as Buffer | null, sessionTopic: '', approved: false};
  const subs = new Map<string, string>();
  const wallet = generateKeyPairSync('x25519'), walletPub = Buffer.from(wallet.publicKey.export({format: 'jwk'}).x!, 'base64url').toString('hex');
  let ws: WebSocketRoute | null = null, n = 1;
  const pending: Json[] = [];
  const deliver = (topic: string, message: string, tag: number) => ws!.send(JSON.stringify({id: Date.now() * 1000 + n++, jsonrpc: '2.0', method: 'irn_subscription', params: {id: subs.get(topic) ?? createHash('sha256').update(topic).digest('hex'), data: {topic, message, publishedAt: Date.now(), tag}}}));
  const settle = () => {
    const chains = [...new Set(accounts.map(a => a.split(':').slice(0, 2).join(':')))];
    const namespaces: Json = {};
    for (const ns of new Set(chains.map(c => c.split(':')[0]!))) {
      const proposal = state.proposals.at(-1) as {requiredNamespaces?: Record<string, {methods: string[]}>; optionalNamespaces?: Record<string, {methods: string[]}>};
      const methods = proposal.optionalNamespaces?.[ns]?.methods ?? proposal.requiredNamespaces?.[ns]?.methods ?? [];
      namespaces[ns] = {chains: chains.filter(c => c.startsWith(`${ns}:`)), accounts: accounts.filter(a => a.startsWith(`${ns}:`)), methods, events: []};
    }
    deliver(state.sessionTopic, seal(state.sessionKey!, JSON.stringify({id: Date.now() * 1000 + n++, jsonrpc: '2.0', method: 'wc_sessionSettle', params: {relay: {protocol: 'irn'}, namespaces, controller: {publicKey: walletPub, metadata: {name: walletName, description: 'A fictional wallet in a test', url: 'https://wallet.invalid', icons: []}}, expiry: Math.floor(Date.now() / 1000) + 7 * 86400}})), 1102);
    state.approved = true;
  };
  await page.routeWebSocket(/^wss:\/\/relay\.walletconnect\.(org|com)/, route => {
    ws = route;
    route.onMessage(raw => {
      const text = String(raw), msg = JSON.parse(text) as {id?: number; method?: string; params?: Json; result?: unknown};
      if (!msg.method) return; // the app's acknowledgement of a delivered message
      const reply = (result: unknown) => route.send(`{"id":${rawId(text)},"jsonrpc":"2.0","result":${JSON.stringify(result)}}`);
      const p = msg.params ?? {};
      if (msg.method.endsWith('_subscribe')) { const id = createHash('sha256').update(String(p.topic)).digest('hex'); subs.set(String(p.topic), id); reply(id); if (p.topic === state.sessionTopic && !state.approved) setTimeout(settle, 50); return; }
      if (msg.method.endsWith('_batchSubscribe')) { const ids = (p.topics as string[]).map(t => { const id = createHash('sha256').update(t).digest('hex'); subs.set(t, id); return id; }); reply(ids); if ((p.topics as string[]).includes(state.sessionTopic) && !state.approved) setTimeout(settle, 50); return; }
      if (msg.method.endsWith('_batchFetchMessages')) return reply({messages: [], hasMore: false});
      if (msg.method === 'wc_proposeSession') {
        reply(true);
        if (!state.pairingKey) { pending.push(p); return; }
        answer(p);
        return;
      }
      if (msg.method.endsWith('_publish') && state.sessionKey && p.topic === state.sessionTopic) {
        const text = open(state.sessionKey, String(p.message)), body = JSON.parse(text) as Json;
        if (body.method === 'wc_sessionRequest') {
          state.sessionRequests.push(body);
          const request = (body.params as {request: {method: string; params: Json}}).request;
          if (answers) { const result = answers(request.method, request.params); setTimeout(() => deliver(state.sessionTopic, seal(state.sessionKey!, `{"id":${rawId(text)},"jsonrpc":"2.0","result":${JSON.stringify(result)}}`), 1109), 50); }
        }
      }
      reply(true);
    });
  });
  /** The fictional wallet reads the proposal and answers it on the pairing topic with its own public key. */
  function answer(p: Json) {
    const proposalText = open(state.pairingKey!, String(p.sessionProposal)), proposal = JSON.parse(proposalText) as {params: Json & {proposer: {publicKey: string}}};
    state.proposals.push(proposal.params);
    const peer = createPublicKey({key: {kty: 'OKP', crv: 'X25519', x: Buffer.from(proposal.params.proposer.publicKey, 'hex').toString('base64url')}, format: 'jwk'});
    state.sessionKey = Buffer.from(hkdfSync('sha256', diffieHellman({privateKey: wallet.privateKey, publicKey: peer}), Buffer.alloc(0), Buffer.alloc(0), 32));
    state.sessionTopic = createHash('sha256').update(state.sessionKey).digest('hex');
    // The wallet answers the proposal on the pairing topic with its own public key.
    const response = `{"id":${rawId(proposalText)},"jsonrpc":"2.0","result":${JSON.stringify({relay: {protocol: 'irn'}, responderPublicKey: walletPub})}}`;
    setTimeout(() => deliver(String(p.pairingTopic), seal(state.pairingKey!, response), 1101), 50);
  }
  // WalletConnect's Verify page and API, answered here (nothing reaches it). The page answers the app's attestation
  // request as Verify does (a postMessage naming the request id; the fake token is unsigned, the dapp only passes it on),
  // so no wallet request waits out the client's 5 s Verify timeout (which made every request take 5 s).
  await page.route(/^https:\/\/verify\.walletconnect\.(org|com)\//, route => route.fulfill({status: 200, contentType: route.request().resourceType() === 'document' ? 'text/html' : 'application/json', body: route.request().resourceType() === 'document' ? VERIFY_PAGE : '{}'}));
  return {state, takeKey: (uri: string) => { state.pairingKey = Buffer.from(new URL(uri.replace(/^wc:/, 'wc://x/')).searchParams.get('symKey')!, 'hex'); for (const p of pending.splice(0)) answer(p); }};
}
async function pair(page: Page, button: RegExp, relay: Awaited<ReturnType<typeof walletConnectRelay>>) {
  const sheet = await openStatusSheet(page);
  await sheet.locator('.wallet-choices').getByRole('button', {name: button}).click();
  const uri = sheet.locator('code.wallet-wc-uri');
  await expect(uri).toHaveText(/^wc:[0-9a-f]{64}@2\?/, {timeout: 20_000});
  relay.takeKey((await uri.textContent())!);
  await expect(sheet.getByRole('list', {name: 'Open the pairing link in a wallet app'})).toBeVisible();
  return sheet;
}

test('@journey 7 wallet: read-only WalletConnect linking, then Keplr Mobile paired for testnet staking and never asked to sign by itself', async ({page}) => {
  test.setTimeout(150_000);
  const outside: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(u.hostname) && !/verify\.walletconnect/.test(u.hostname)) outside.push(r.url()); });
  await offlineApis(page);
  await seedRecords(page, {});

  // Session AK X1 (RELEASE_REVIEW R2–R5): a new device meets no wallet until the person chooses the chain; this journey is
  // about wallets, so the person first switches a money tool on, in Settings → Your pages & buttons (as a person does).
  await page.goto('/app/settings'); await hydrated(page);
  const stakingSwitch = page.getByRole('region', {name: 'Your pages & buttons'}).getByRole('switch', {name: 'Staking', exact: true});
  await expect(stakingSwitch).not.toBeChecked();
  await stakingSwitch.click(); // the switch shows the saved choice once it is saved (a controlled switch), so no check()
  await expect(stakingSwitch).toBeChecked();

  // 1. Read-only linking: a fictional wallet approves with a ZIGChain and an Ethereum address.
  const relay = await walletConnectRelay(page, [`cosmos:zigchain-1:${ZIG}`, `eip155:1:${EVM}`], 'Fictional Wallet');
  await page.goto('/app'); await hydrated(page);
  const sheet = await pair(page, /^Connect by WalletConnect/, relay);
  await expect.poll(() => relay.state.proposals.length, {timeout: 20_000}).toBe(1);
  const proposal = relay.state.proposals[0] as {requiredNamespaces?: Record<string, {methods: string[]}>; optionalNamespaces?: Record<string, {chains: string[]; methods: string[]}>};
  const asked = {...proposal.requiredNamespaces, ...proposal.optionalNamespaces};
  expect(asked.eip155?.methods).toEqual([]);
  expect(asked.solana?.methods).toEqual([]);
  expect(asked.cosmos?.methods).toEqual(['cosmos_getAccounts']);
  await expect(sheet.getByRole('status').filter({hasText: /Fictional Wallet: 2 addresses linked, read-only/})).toBeVisible({timeout: 20_000});
  const linked = (await stored<{wallets: {kind: string; address: string; via?: string}[]}>(page, 'zigoals:linked-wallets:v1'))!.wallets;
  expect(linked.map(w => [w.kind, w.address, w.via]).sort()).toEqual([['cosmos', ZIG, 'walletconnect'], ['evm', EVM, 'walletconnect']]);
  expect(relay.state.sessionRequests).toEqual([]); // nothing asked of the wallet beyond the session

  // 2. Keplr Mobile for staking, on a fresh page: the pairing asks for the account read and one signing method, ZIGChain only.
  const keplr = await walletConnectRelay(page, [`cosmos:zigchain-1:${ZIG}`, `cosmos:zig-test-2:${ZIG}`], 'Fictional Keplr');
  await page.goto('/app'); await hydrated(page);
  const stake = await pair(page, /^Stake with Keplr Mobile/, keplr);
  await expect.poll(() => keplr.state.proposals.length, {timeout: 20_000}).toBe(1);
  const staking = keplr.state.proposals[0] as {requiredNamespaces?: Record<string, {chains: string[]; methods: string[]}>; optionalNamespaces?: Record<string, {chains: string[]; methods: string[]}>};
  const cosmos = {...staking.requiredNamespaces, ...staking.optionalNamespaces}.cosmos!;
  expect(cosmos.chains.sort()).toEqual(['cosmos:zig-test-2', 'cosmos:zigchain-1']);
  expect(cosmos.methods).toHaveLength(2);
  expect(cosmos.methods).toContain('cosmos_getAccounts');
  expect({...staking.requiredNamespaces, ...staking.optionalNamespaces}.eip155?.methods ?? []).toEqual([]);
  await expect(stake.getByRole('status').filter({hasText: 'Fictional Keplr is ready: review a staking action here and press Sign'})).toBeVisible({timeout: 20_000});
  // Never auto-signed: once paired, the wallet is asked for nothing until a reviewed action's Sign press.
  await page.goto('/app/staking'); await hydrated(page);
  await expect(page.locator('main h1').first()).toBeVisible();
  expect(keplr.state.sessionRequests).toEqual([]);
  expect(outside).toEqual([]);
});

test('@journey 7b Keplr Mobile signs one reviewed testnet delegation through the review sheet (stubbed signer)', async ({page}) => {
  test.setTimeout(150_000);
  const outside: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(u.hostname) && !/verify\.walletconnect/.test(u.hostname)) outside.push(u.hostname); });
  await chooseChain(page);
  await offlineApis(page);
  await seedRecords(page, {});
  // The testnet's RPC and ZIGoals' relay answered by tests/staking-chain.ts (recorded fixtures; broadcasts kept in the test).
  const chain = await fakeChain(page, 'practice');
  await stakingRelay(page, 'practice');
  // The fictional Keplr Mobile: its account read, and a stubbed signature of exactly the document it is sent.
  const PUB = toBase64(new Uint8Array([2, ...new Array(32).fill(7)])), SIG = toBase64(new Uint8Array(64).fill(5));
  const keplr = await walletConnectRelay(page, [`cosmos:zigchain-1:${ME}`, `cosmos:zig-test-2:${ME}`], 'Fictional Keplr', (method, params) =>
    method === 'cosmos_getAccounts' ? [{address: ME, algo: 'secp256k1', pubkey: PUB}]
    : method === 'cosmos_signDirect' ? {signed: params.signDoc, signature: {pub_key: {type: 'tendermint/PubKeySecp256k1', value: PUB}, signature: SIG}}
    : null);
  const asked = () => keplr.state.sessionRequests.map(b => (b.params as {request: {method: string}}).request.method);

  // No Keplr in this browser: Staking offers no extension connect.
  const panel = await openStaking(page);
  await expect(panel.getByRole('button', {name: /^Connect Keplr for/})).toHaveCount(0);
  // Pair Keplr Mobile for staking from this page (the pairing lives in this tab's memory), then close the sheet.
  const sheet = await pair(page, /^Stake with Keplr Mobile/, keplr);
  await expect(sheet.getByRole('status').filter({hasText: 'Fictional Keplr is ready: review a staking action here and press Sign'})).toBeVisible({timeout: 20_000});
  await sheet.getByRole('button', {name: 'Close Status', exact: true}).click();
  await expect(sheet).toBeHidden();
  expect(asked(), 'paired: nothing asked of the wallet yet').toEqual([]);

  // Connect: the account read only.
  await panel.getByRole('button', {name: 'Connect Keplr Mobile for PRACTICE', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible({timeout: 20_000});
  await expect(panel.locator('.staking-wallet-row')).toContainText('Keplr Mobile');
  expect(asked()).toEqual(['cosmos_getAccounts']);

  // A delegation of 25 ZIG to Fictional Alpha, typed by the person, reviewed.
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('25');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const review = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(review).toContainText('Stake (delegate)');
  await expect(review).toContainText('(25000000000000000000 azig)');
  expect(asked().filter(m => m !== 'cosmos_getAccounts'), 'no signature before the Sign press').toEqual([]);
  expect(chain.broadcasts).toEqual([]);

  // The person's Sign press: exactly one signature request, of the reviewed document, on the testnet.
  await review.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 30_000});
  const signs = keplr.state.sessionRequests.filter(b => (b.params as {request: {method: string}}).request.method !== 'cosmos_getAccounts');
  expect(signs).toHaveLength(1);
  const sign = signs[0]!.params as {chainId: string; request: {method: string; params: {signerAddress: string; signDoc: {chainId: string; accountNumber: string; bodyBytes: string; authInfoBytes: string}}}};
  expect(sign.chainId).toBe('cosmos:zig-test-2');
  expect(sign.request.method).toBe('cosmos_signDirect');
  expect(sign.request.params.signerAddress).toBe(ME);
  expect(sign.request.params.signDoc).toMatchObject({chainId: 'zig-test-2', accountNumber: '42'});
  const messages = TxBody.decode(fromBase64(sign.request.params.signDoc.bodyBytes)).messages;
  expect(messages.map(m => m.typeUrl)).toEqual(['/cosmos.staking.v1beta1.MsgDelegate']);
  expect(MsgDelegate.decode(messages[0]!.value)).toMatchObject({delegatorAddress: ME, validatorAddress: V1, amount: {denom: 'azig', amount: zigOf(25)}});
  // The transaction "broadcast" (to the double only) carries exactly the signed document and the wallet's signature.
  expect(chain.broadcasts).toHaveLength(1);
  const raw = TxRaw.decode(chain.broadcasts[0]!.tx);
  expect(toBase64(raw.bodyBytes)).toBe(sign.request.params.signDoc.bodyBytes);
  expect(toBase64(raw.authInfoBytes)).toBe(sign.request.params.signDoc.authInfoBytes);
  expect(raw.signatures.map(s => toBase64(s))).toEqual([SIG]);
  // Nothing left the test but the doubles: the testnet RPC host (answered by fakeChain) and no other.
  expect([...new Set(outside)].filter(h => h !== 'testnet-rpc.zigchain.com')).toEqual([]);
});
