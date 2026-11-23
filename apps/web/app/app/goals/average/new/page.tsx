import {AverageGoalForm} from '../../../../../components/goals/average-goals';
import {PageHeader} from '../../../../../components/page-header';
import {OrbitArt} from '../../../../../components/header-art/orbit-art';
import {AverageGlyph} from '../../../../../components/header-art/glyphs/average';
import type {Metadata} from 'next';
// Session AA-Cloud Part 2 (G8): a new "keep an average" goal, optionally from a library template.
export const metadata: Metadata = {title: 'Keep an average'};
export default async function Page({searchParams}: {searchParams: Promise<{template?: string | string[]; name?: string | string[]}>}) {
  // A repeated parameter arrives as a list; only its first value is read.
  const params = await searchParams, first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
  const template = first(params.template);
  // Friend-readiness (FR-S-12): the name typed in the goal wizard comes along ("Keep an average instead →"), as the person's words.
  const name = first(params.name)?.trim().slice(0, 120) || undefined;
  return <div className="dashboard average-goal-new">
    <PageHeader className="page-heading" eyebrow="A goal you keep" title="Keep an average" lede="Sleep, steps, water or your own measure, held over a rolling window. Kept on this device for now." art={<OrbitArt glyph={AverageGlyph} tone="goals" spin={-40}/>} />
    <AverageGoalForm templateId={template} initialName={name} />
  </div>;
}
