/** Types for harness.mjs (Session AP Part 3), for the Playwright replay apps/web/tests/ap/service-rows.spec.ts. */
export type UpstreamCall = {worker: 'app' | 'market' | 'food'; host: string; path: string};
export type Refusal = UpstreamCall & {why: string};
export type LcdFixture = {recordedAt: string; height: string; wallet: string; validators: Record<'aurora' | 'beacon' | 'cobalt' | 'delta', {operator: string; account: string; moniker: string; jailed: boolean}>; routes: Record<string, unknown>};
export type ServiceRowsHarness = {
  origin: string;
  fixtures: {lcd: LcdFixture} & Record<string, unknown>;
  calls: UpstreamCall[];
  refused: Refusal[];
  servesPages: boolean;
  hosts(): Record<'app' | 'market' | 'food', string[]>;
  setQuoteVariant(n: 1 | 2): Promise<void>;
  stop(): Promise<void>;
};
export const ROUTES: Readonly<Record<string, string>>;
export function start(options?: {clock?: () => number; port?: number; bundle?: string | null; clientIp?: string}): Promise<ServiceRowsHarness>;
export function rebase(value: unknown, delta: number, key?: string): unknown;
export function loadFixtures(): Promise<Record<string, unknown>>;
export function serviceRowBundles(): Promise<{app: string; market: string; food: string}>;
