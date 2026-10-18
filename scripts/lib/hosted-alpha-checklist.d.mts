// Types for hosted-alpha-checklist.mjs, used by apps/web/tests/hosted-checklist-stage.spec.ts (Session AF, L3).
import type {Locator, Page} from '@playwright/test';
type Expect = typeof import('@playwright/test').expect;
export const CHECKLIST_SENTINELS: Readonly<{habit: string}>;
export const CHECKLIST_PATH: string;
export function doneName(title: string): RegExp;
export function createFictionalHabit(page: Page, expect: Expect, base: string, title?: string): Promise<Locator>;
export function starHabit(page: Page, expect: Expect, title?: string): Promise<void>;
export function openChecklist(page: Page, expect: Expect, base: string, title?: string): Promise<Locator>;
export function habitEntryToday(page: Page, title?: string): Promise<{readable: boolean; entry: {count: number; disposition: string} | null}>;
export function tickAndCheck(page: Page, expect: Expect, title?: string): Promise<void>;
export function undoAndCheck(page: Page, expect: Expect, base: string, title?: string): Promise<void>;
export function checklistStage(page: Page, ctx: {base: string; expect: Expect; report?: Record<string, unknown>}): Promise<void>;
export const CHECKLIST_STAGE: Readonly<{number: 10; key: 'checklist'; name: string; browser: true; liveOnly: false; reportsItself: false; run: typeof checklistStage}>;
