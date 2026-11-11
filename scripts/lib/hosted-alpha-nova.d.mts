// Types for hosted-alpha-nova.mjs (Session AM, stage 13), for a browser spec that runs the stage against the local build.
import type {Page} from '@playwright/test';
import type {EgressPolicy} from '../../apps/web/lib/csp-compose.mjs';
type Expect = typeof import('@playwright/test').expect;
export const NOVA_PATH: '/app/nova';
export const MET_ORIGIN: 'https://api.met.no';
export const NOVA_REQUESTS: Readonly<{habits: string; weather: string; clear: string}>;
export const NOVA_WIDGETS: Readonly<{habits: Readonly<{id: string; title: string}>; weather: Readonly<{id: string; title: string}>}>;
export const NOVA_SELECTORS: Readonly<Record<'hydrated' | 'root' | 'fullWindow' | 'sidebar' | 'frame' | 'stage' | 'calm' | 'set' | 'widget' | 'made' | 'star' | 'command' | 'oneTap' | 'answer' | 'status' | 'habits' | 'weather' | 'inlineActions' | 'moreButton' | 'moreItem' | 'dockChip' | 'toast' | 'toastUndo', string>>;
export const NOVA_ACTIONS: Readonly<Record<'pin' | 'hide' | 'close', Readonly<{inline: string; more: string}>>>;
export const NOVA_WORDS: Readonly<{answer: readonly string[]; announced: string; weatherOff: readonly string[]; closed: string}>;
/** What the stage leaves under report.nova: `absent` becomes one review reason, any `problems` entry fails the stage, `notes` are information. */
export type NovaStageReport = {absent: string[]; problems: string[]; notes: string[]; requests: number; requestOrigins: string[]};
export function appOrigins(base: string): string[];
export function requestFindings(urls: readonly string[], base: string): {weather: string[]; foreign: string[]; origins: string[]};
export function connectFindings(csp: string | null | undefined, options?: {known?: readonly string[]; base?: string}): {read: boolean; problems: string[]; notes: string[]};
declare function novaStage(page: Page, ctx: {base: string; expect?: Expect; report: Record<string, unknown> & {review?: string[]}; egressPolicy?: EgressPolicy}): Promise<void>;
export const NOVA_STAGE: Readonly<{number: 13; key: 'nova'; name: string; browser: true; liveOnly: false; reportsItself: false; run: typeof novaStage}>;
