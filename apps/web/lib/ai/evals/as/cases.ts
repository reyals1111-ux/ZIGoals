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
import {AV2_R3_HEALTH} from './cases-av2-r3-health';
import {AV2_R4_PLAN} from './cases-av2-r4-plan';
import {AV2_R4_MIND} from './cases-av2-r4-mind';
import {AV2_R4_HEALTH} from './cases-av2-r4-health';
import {AV2_R4_MONEY} from './cases-av2-r4-money';
import {AV2_R4_NOTES} from './cases-av2-r4-notes';
import {AV2_R5_BODY} from './cases-av2-r5-body';
import {AV2_R5_NOTES} from './cases-av2-r5-notes';
import {AV2_R5_PLAN} from './cases-av2-r5-plan';
import {AV2_R5_MONEY} from './cases-av2-r5-money';
import {AV2_R5_GYM} from './cases-av2-r5-gym';
import {AV2_R6_PLAN} from './cases-av2-r6-plan';
import {AV2_R6_NOTES} from './cases-av2-r6-notes';
import {AV2_R6_MONEY} from './cases-av2-r6-money';
import {AV2_R6_BODY} from './cases-av2-r6-body';
import {AW_KCAL} from './cases-aw-kcal';
import {AW_PROGRAMMES} from './cases-aw-programmes';
import {AW_X2} from './cases-aw-x2';
import {AW_X3} from './cases-aw-x3';
import {AW_X1} from './cases-aw-x1';
import {AW_X4} from './cases-aw-x4';
import {AW_X5} from './cases-aw-x5';
import {AW_X6} from './cases-aw-x6';
import {AW_X7_MONEY} from './cases-aw-x7';
import {AW_P5} from './cases-aw-p5';
import {AW_FR_MONEY} from './cases-aw-fr-money';
import {AW_FR_ANSWERS} from './cases-aw-fr-answers';

/**
 * Session AS (ADR-042 Part 1): the corpus — what people ask every day, in the ways they ask it (English and Dutch, typos
 * and casual forms among them). One `Intent` is one question; every phrasing of it must give the same facts. What each
 * must say is in expected.ts, as literals for the Showcase on 17 November 2026 and for a fresh profile.
 * `never`: what the answer must not contain (the wrong answer the question used to get).
 */
export type Intent = {id: string; pillar: Pillar; en: readonly string[]; nl: readonly string[]; never?: readonly string[]};
export const CORPUS: readonly Intent[] = [...HABITS, ...HEALTH, ...MONEY, ...DAYS, ...AV, /* Session AV lane 2 */ ...AV2_TASKS, ...AV2_HABITS, ...AV2_JOURNAL, ...AV2_ROADMAP, ...AV2_MONEY, ...AV2_FOOD, ...AV2_BODY, ...AV2_SYNC, ...AV2_REST, ...AV2_MONEY_R2, ...AV2_TASKS_R2, ...AV2_BODYMIND_R2, ...AV2_R3_PLAN, ...AV2_R3_MONEY, ...AV2_R3_NOTES, ...AV2_R3_HEALTH, ...AV2_R4_PLAN, ...AV2_R4_MIND, ...AV2_R4_HEALTH, ...AV2_R4_MONEY, ...AV2_R4_NOTES, ...AV2_R5_BODY, ...AV2_R5_NOTES, ...AV2_R5_PLAN, ...AV2_R5_MONEY, ...AV2_R5_GYM, ...AV2_R6_PLAN, ...AV2_R6_NOTES, ...AV2_R6_MONEY, ...AV2_R6_BODY, /* Session AW */ ...AW_KCAL, ...AW_PROGRAMMES, ...AW_X2, ...AW_X3, ...AW_X1, ...AW_X4, ...AW_X5, ...AW_X6, ...AW_X7_MONEY, ...AW_P5, ...AW_FR_MONEY, ...AW_FR_ANSWERS];
export const questionCount = (): number => CORPUS.reduce((n, c) => n + c.en.length + c.nl.length, 0);
