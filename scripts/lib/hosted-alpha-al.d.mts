// Types for hosted-alpha-al.mjs (Session AL, stage 12), for a browser spec that runs the stage against the local build.
import type {Page} from '@playwright/test';
type Expect = typeof import('@playwright/test').expect;
export const AL_PATHS: Readonly<{plans: '/app/plans'; tasks: '/app/tasks'}>;
export const PLANS_LINES: readonly string[];
export const SIDEBAR_GROUP: string;
export const EXTRAS_BUTTON: string;
export const EXTRAS_DIALOG: string;
export const AL_WIDTHS: Readonly<{desktop: number; narrow: number}>;
export function htmlText(html: string | null | undefined): string;
export function pageState(path: string, status: number): 'present' | 'absent' | string;
export function plansMissing(text: string | null | undefined): string[];
export function readAlPages(options: {base: string; fetcher?: typeof fetch}): Promise<{absent: string[]; problems: string[]; plansNeedPage: string[]}>;
declare function alStage(page: Page, ctx: {base: string; expect: Expect; report: Record<string, unknown>}): Promise<void>;
export const AL_STAGE: Readonly<{number: 12; key: 'al'; name: string; browser: true; liveOnly: false; reportsItself: false; run: typeof alStage}>;
