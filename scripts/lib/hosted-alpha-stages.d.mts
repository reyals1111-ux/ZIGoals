// Types for hosted-alpha-stages.mjs, used by apps/web/tests/hosted-verifier-order.spec.ts (Session AE Part 0b, ADR-027).
import type {Page} from '@playwright/test';
import type {EgressPolicy} from '../../apps/web/lib/csp-compose.mjs';
type Expect = typeof import('@playwright/test').expect;
export type LayoutRecord = {label: string; viewport: number; scrollWidth: number; pass: boolean};
/** The part of HOSTED_SMOKE.json the stages fill; each stage adds its own fields (diagnostics, recipeRefusals, …). */
export type StageReport = {stages: {name: string; status: string}[]; review: string[]; layouts: LayoutRecord[]; responses: unknown[]; builds: unknown[]} & Record<string, unknown>;
export type StageContext = {
  /** The origin every app check uses: the live Alpha, or ZIGOALS_VERIFY_BASE. */
  base: string;
  /** False on a local base: the live-only checks are skipped (LIVE_ONLY_CHECKS). */
  live: boolean;
  origins: typeof LIVE_ORIGINS;
  /** EXPECTED_COMMIT (40 hex) or null. */
  expectedCommit: string | null;
  expect: Expect;
  report: StageReport;
  /** The reviewed zigchaind versions: a list, or a pattern fragment (Session AJ: reviewedVersionPattern('zig-test-2')). */
  reviewedVersions: readonly string[] | string;
  /** Session AJ (A3): the verifier's own read-only fetch for zig-test-2's version and base fee (stage 4); absent in specs. */
  chainFetcher?: typeof fetch;
  /** Stage 1's header checks only. */
  egressPolicy?: EgressPolicy;
  /** The evidence directory (stage 7's screenshot). */
  output?: string;
};
export type VerifierStage = Readonly<{number: number; key: string; name: string; browser: boolean; liveOnly: boolean; reportsItself: boolean; run: (page: Page, ctx: StageContext) => Promise<void>}>;
export type LiveOnlyCheck = Readonly<{key: string; stage: string; label: string; reason: string; httpOnly?: boolean}>;
export const LIVE_ORIGINS: Readonly<{alpha: string; fallback: string; apex: string}>;
export const SENTINELS: readonly string[];
export const LANDING_LINE_SETS: readonly Readonly<{status: string; alpha: string; independence: string}>[];
export function verifyBase(raw: string | undefined): {base: string; live: boolean};
export function recordLayouts(page: Page, report: StageReport, label: string): Promise<void>;
export const VERIFIER_STAGES: readonly VerifierStage[];
export const LIVE_ONLY_CHECKS: readonly LiveOnlyCheck[];
export function liveOnlySkips(base: string): {stage: string; reason: string}[];
type HttpError = {url: string; status: number};
type ConsoleError = {message?: string; location?: {url?: string}};
export function setAsideUnboundApi(report: {httpErrors: HttpError[]; consoleErrors: ConsoleError[]; setAside?: {httpErrors: HttpError[]; consoleErrors: ConsoleError[]}}, base: string): void;
type NotConfiguredAnswer = Readonly<{path: string; search: string; method: string; status: number; body: Readonly<Record<string, string>>}>;
export const NOT_CONFIGURED_ANSWERS: readonly NotConfiguredAnswer[];
export function setAsideNotConfigured(report: {httpErrors: HttpError[]; consoleErrors: ConsoleError[]; notConfigured?: {count: number; answers: {url: string; status: number; error: string}[]; consoleErrors: ConsoleError[]}}, base: string, answerOf: (entry: HttpError) => {method?: string; body?: string} | undefined): void;
type FailedRequest = {url: string; failure?: {errorText?: string} | null; at?: number; rsc?: boolean};
export const NAVIGATION_WINDOW_MS: number;
export function classifyFailedRequests(report: {failedRequests: FailedRequest[]; abortedByNavigation?: {count: number; urls: string[]}}, navigations: number[]): void;
export function isRscRequest(url: string, headers?: Record<string, string>): boolean;
