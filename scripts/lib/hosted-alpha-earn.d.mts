// Types for hosted-alpha-earn.mjs, used by apps/web/tests/hosted-earn-stage.spec.ts (Session AF chunk 2, L1).
import type {Page} from '@playwright/test';
type Expect = typeof import('@playwright/test').expect;
export type EarnFigure = {id: string | null; state: string | null; reason: string | null; text: string; source: string};
export const EARN_PATH: string;
export const EARN_TITLE: string;
export const FIGURE: string;
export const OUTGOING: string;
export const UNAVAILABLE_WORD: RegExp;
export const AS_OF: RegExp;
export function readFigures(page: Page): Promise<EarnFigure[]>;
export function figureProblems(figure: EarnFigure): string[];
export function linkProblems(links: {href: string | null; target: string | null; rel: string | null}[]): string[];
export function earnStage(page: Page, ctx: {base: string; expect: Expect; report?: Record<string, unknown>}): Promise<void>;
export const EARN_STAGE: Readonly<{number: 9; key: 'earn'; name: string; browser: true; liveOnly: false; reportsItself: false; run: typeof earnStage}>;
