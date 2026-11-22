import type {Pillar} from './harness';
import {HABITS} from './cases-habits';
import {HEALTH} from './cases-health';
import {MONEY} from './cases-money';
import {DAYS} from './cases-day';
import {AV} from './cases-av';
import {AV2_TASKS} from './cases-av2-tasks';
import {AV2_HABITS} from './cases-av2-habits';
import {AV2_JOURNAL} from './cases-av2-journal';
import {AV2_ROADMAP} from './cases-av2-roadmap';
import {AV2_MONEY} from './cases-av2-money';
import {AV2_FOOD} from './cases-av2-food';
import {AV2_BODY} from './cases-av2-body';
import {AV2_SYNC} from './cases-av2-sync';
import {AV2_REST} from './cases-av2-rest';
import {AV2_MONEY_R2} from './cases-av2-money-r2';
import {AV2_TASKS_R2} from './cases-av2-tasks-r2';
import {AV2_BODYMIND_R2} from './cases-av2-bodymind-r2';
import {AV2_R3_PLAN} from './cases-av2-r3-plan';
import {AV2_R3_MONEY} from './cases-av2-r3-money';
import {AV2_R3_NOTES} from './cases-av2-r3-notes';

/**
 * Session AS (ADR-042 Part 1): the corpus — what people ask every day, in the ways they ask it (English and Dutch, typos
 * and casual forms among them). One `Intent` is one question; every phrasing of it must give the same facts. What each
 * must say is in expected.ts, as literals for the Showcase on 17 November 2026 and for a fresh profile.
 * `never`: what the answer must not contain (the wrong answer the question used to get).
 */
export type Intent = {id: string; pillar: Pillar; en: readonly string[]; nl: readonly string[]; never?: readonly string[]};
export const CORPUS: readonly Intent[] = [...HABITS, ...HEALTH, ...MONEY, ...DAYS, ...AV, /* Session AV lane 2 */ ...AV2_TASKS, ...AV2_HABITS, ...AV2_JOURNAL, ...AV2_ROADMAP, ...AV2_MONEY, ...AV2_FOOD, ...AV2_BODY, ...AV2_SYNC, ...AV2_REST, ...AV2_MONEY_R2, ...AV2_TASKS_R2, ...AV2_BODYMIND_R2, ...AV2_R3_PLAN, ...AV2_R3_MONEY, ...AV2_R3_NOTES];
export const questionCount = (): number => CORPUS.reduce((n, c) => n + c.en.length + c.nl.length, 0);
