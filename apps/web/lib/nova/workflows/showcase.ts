import {saveCustom, emptyNovaWorkflows, noteRun, type NovaWorkflows} from './schema';
import type {AiMemory} from '../../ai/store/records';

/**
 * The Showcase's NOVA examples (Session AK, owner follow-up 2; the lead wires them into lib/showcase-data.ts): one workflow
 * of "the person's own" made from a template, with "Review my week" already run, and a fictional long-term memory — a
 * preference, a decision, a person and some context, one pinned — every text labelled "(Showcase)". The briefs need no
 * example: NOVA composes them from the Showcase's own records on view.
 */
export function showcaseNovaWorkflows(day: string): NovaWorkflows {
  const at = new Date(`${day}T08:00:00.000Z`);
  return noteRun(saveCustom(emptyNovaWorkflows(), 'review-week', {title: 'Sunday look back (Showcase)', instruction: 'Summarise my week in two calm lines, then three small adjustments.', skip: ['week-money']}, at), 'review-week', new Date(at.getTime() + 60_000));
}
export function showcaseNovaMemory(day: string): AiMemory {
  const at = `${day}T08:00:00.000Z`, note = (id: string, text: string, category: 'preferences' | 'goals' | 'other', kind: 'preference' | 'decision' | 'person' | 'context', by: 'person' | 'nova' | 'zigi', extra: Record<string, unknown> = {}) =>
    ({id, text, category, source: by === 'person' ? 'person' as const : 'zigi' as const, createdAt: at, updatedAt: at, kind, from: {by, ...(by === 'nova' ? {label: 'NOVA chat'} : {})}, ...extra});
  return {version: 1, consent: {given: true, at}, notes: [
    note('note_showcase-1', 'Prefers short answers in the morning (Showcase)', 'preferences', 'preference', 'person', {pinned: true}),
    note('note_showcase-2', 'Decided to review the week on Sundays (Showcase)', 'goals', 'decision', 'nova', {about: day}),
    note('note_showcase-3', 'Sam is a running partner on Saturdays (Showcase)', 'other', 'person', 'zigi'),
    note('note_showcase-4', 'Works from home on Fridays (Showcase)', 'other', 'context', 'person'),
  ]};
}
