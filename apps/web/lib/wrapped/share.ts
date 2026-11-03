import type {ShareCard} from '../share-image';
import {EXAMPLE_FOOTER, FOOTER} from '../share-cards/kinds';
import type {StoryPillar} from '../stories/days';
import type {Wrapped, WrappedCard} from './build';

/**
 * A Wrapped card as a share image (Session AK, F5d), in the one share-card system (lib/share-cards): the same footer, the
 * Showcase's "Example" label in the eyebrow and the footer, the same 1080 × 1350 renderer (lib/share-image.ts). Sensitive
 * numbers — money put in, average sleep and steps — go on the image only when the person ticks "Include numbers" for
 * that share (off by default); `hasSensitive` says whether there is anything for the box to add.
 */
export type WrappedShareSpec = ShareCard & {kind: 'wrapped'; hasSensitive: boolean; fileName: string; example: boolean};
const ACCENT: Record<StoryPillar, readonly [string, string, string]> = {
  habits: ['#23eaff', '#8fa6ff', '#c790f6'], health: ['#ff74be', '#c790f6', '#8fa6ff'],
  goals: ['#9273ff', '#c790f6', '#f08bd6'], wealth: ['#ffd27a', '#f08bd6', '#c790f6'],
};
export function wrappedShareCard(wrapped: Pick<Wrapped, 'year' | 'example'>, card: WrappedCard, {sensitive = false}: {sensitive?: boolean} = {}): WrappedShareSpec {
  const example = wrapped.example, name = `ZIGoals Wrapped ${wrapped.year}`;
  const lines = [...card.lines, ...(sensitive ? card.numbers : [])].slice(0, 6);
  return {
    kind: 'wrapped', hasSensitive: card.numbers.length > 0, example,
    eyebrow: example ? `Example · ${name}` : name,
    title: card.big && card.id !== 'opener' && !card.title.includes(card.big) ? `${card.big} · ${card.title}` : card.title,
    lines: lines.length ? lines : ['A quiet stretch, and that is fine.'],
    footer: example ? EXAMPLE_FOOTER : FOOTER,
    ...(card.pillar ? {accent: ACCENT[card.pillar]} : {}),
    fileName: `zigoals-${example ? 'example-' : ''}wrapped-${wrapped.year}-${card.id}.png`,
  };
}
