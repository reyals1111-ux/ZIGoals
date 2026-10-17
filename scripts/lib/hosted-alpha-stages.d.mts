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
  /** The reviewed zigchaind versions (@zigoals/chain-config REVIEWED_TESTNET_VERSIONS). */
  reviewedVersions: readonly string[];
  /** Stage 1's header checks only. */
  egressPolicy?: EgressPolicy;
  /** The evidence directory (stage 7's screenshot). */
  output?: string;
};
export type VerifierStage = Readonly<{number: number; key: string; name: string; browser: boolean; liveOnly: boolean; reportsItself: boolean; run: (page: Page, ctx: StageContext) => Promise<void>}>;
export type LiveOnlyCheck = Readonly<{key: string; stage: string; label: string; reason: string; httpOnly?: boolean}>;
export const LIVE_ORIGINS: Readonly<{alpha: string; fallback: string; apex: string}>;
export const SENTINELS: readonly string[];
export function verifyBase(raw: string | undefined): {base: string; live: boolean};
export function recordLayouts(page: Page, report: StageReport, label: string): Promise<void>;
export const VERIFIER_STAGES: readonly VerifierStage[];
export const LIVE_ONLY_CHECKS: readonly LiveOnlyCheck[];
export function liveOnlySkips(base: string): {stage: string; reason: string}[];
type HttpError = {url: string; status: number};
type ConsoleError = {message?: string; location?: {url?: string}};
export function setAsideUnboundApi(report: {httpErrors: HttpError[]; consoleErrors: ConsoleError[]; setAside?: {httpErrors: HttpError[]; consoleErrors: ConsoleError[]}}, base: string): void;
