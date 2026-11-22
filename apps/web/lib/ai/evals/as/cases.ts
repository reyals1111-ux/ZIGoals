import type {Pillar} from './harness';
import {HABITS} from './cases-habits';
import {HEALTH} from './cases-health';
import {MONEY} from './cases-money';
import {DAYS} from './cases-day';
import {AV} from './cases-av';
import {AV2_TASKS} from './cases-av2-tasks';
import {AV2_HABITS} from './cases-av2-habits';

/**
 * Session AS (ADR-042 Part 1): the corpus — what people ask every day, in the ways they ask it (English and Dutch, typos
 * and casual forms among them). One `Intent` is one question; every phrasing of it must give the same facts. What each
 * must say is in expected.ts, as literals for the Showcase on 17 November 2026 and for a fresh profile.
 * `never`: what the answer must not contain (the wrong answer the question used to get).
 */
export type Intent = {id: string; pillar: Pillar; en: readonly string[]; nl: readonly string[]; never?: readonly string[]};
export const CORPUS: readonly Intent[] = [...HABITS, ...HEALTH, ...MONEY, ...DAYS, ...AV, /* Session AV lane 2 */ ...AV2_TASKS, ...AV2_HABITS];
export const questionCount = (): number => CORPUS.reduce((n, c) => n + c.en.length + c.nl.length, 0);
