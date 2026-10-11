// Types for hosted-alpha-goal-stage.mjs, used by apps/web/tests/hosted-alpha-goal-stage.spec.ts (Session V Part 1a).
import type {Locator, Page} from '@playwright/test';
type Expect = typeof import('@playwright/test').expect;
export const GOAL_SENTINELS: Readonly<{name: string; target: string; targetUnits: string; date: string; note: string}>;
export const LOCAL_SIMULATION_METADATA_KEY: string;
export function createFictionalGoal(page: Page, expect: Expect, options?: {name?: string; target?: string}): Promise<void>;
export function depositAndWithdraw(page: Page): Promise<void>;
export function openDiagnostics(page: Page): Promise<Locator>;
export function previewSafeDiagnostics(page: Page, expect: Expect): Promise<string>;
export function closeFictionalGoal(page: Page, expect: Expect, options?: {name?: string}): Promise<void>;
