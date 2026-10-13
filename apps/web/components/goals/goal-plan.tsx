'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import {addCustomArea, ancestorsOf, areasOf, childrenOf, GRADIENTS, setGoalArea, setGoalParent, setGoalReasons, setGoalStory, setGoalVision, type Vision} from '../../lib/goal-extras/store';
import {compressPhoto, newImageId, putImage} from '../../lib/vision/store';
import {rollUp, rollUpWords} from '../../lib/goal-hierarchy';
import {formatGoalAmount, type GoalSummary} from '../../lib/goal-summary';
import {useShowcase} from '../showcase-controls';
import {showToast} from '../ui/undo-toast';
import {SectionHeading} from '../ui/section-heading';
import {useAverageGoals, useGoalExtras, visionScope} from './use-goal-extras';
import {averageSummary} from './average-summary';
import {useHealth} from '../health/use-health';
import {useLocalToday} from '../use-local-today';
import {GRADIENT_CSS, VisionArt} from './vision-art';
import './goals.css';

const now = () => new Date().toISOString();
const AREA_COLORS = ['#7fd8c9', '#a3b5ff', '#f5c97a', '#f39ccf', '#8fdcf4', '#d2a6f6', '#ffb09e', '#b9e88f'];

/**
 * The goal page's plan (Session AA-Cloud Part 2): the life area and the vision (G2, G3), why it matters, what could get in
 * the way and the if-then plan (G4), where the goal sits among others (G5), and for a finished goal its story (G7). Kept
 * on this device and, with an account, in the encrypted extras (Session AB-Cloud, ADR-023 C1). Every change offers Undo.
 */
export function GoalPlan({goalKey, name, summary, goals: tracked, finished}: {goalKey: string; name: string; summary?: GoalSummary; goals: readonly GoalSummary[]; finished: boolean}) {
  const extras = useGoalExtras(), averages = useAverageGoals(), health = useHealth(), today = useLocalToday();
  // Average goals sit in the same tree (G5, G8): a sub-goal that keeps an average is listed here too.
  const goals = [...tracked, ...(averages.unreadable ? [] : averages.data.goals.map(g => averageSummary(g, health.loaded && !health.error ? health.data : undefined, today)))];
  const extra = extras.data.goals[goalKey];
  return <section className="goal-plan" aria-labelledby="goal-plan-title">
    <SectionHeading id="goal-plan-title" eyebrow="Your plan" title="Why, and how you get there" />
    {extras.unreadable && <p role="alert" className="notice">Your goal details on this device could not be read. Nothing here can change until they can.</p>}
    <div className="goal-plan-grid">
      <AreaAndVision goalKey={goalKey} name={name} extras={extras} />
      <Reasons key={`${goalKey}:${extra?.updatedAt ?? ''}`} goalKey={goalKey} extras={extras} />
      <SubGoals goalKey={goalKey} summary={summary} goals={goals} extras={extras} />
      {finished && <Story key={`story:${extra?.story ?? ''}`} goalKey={goalKey} extras={extras} />}
    </div>
  </section>;
}

type Extras = ReturnType<typeof useGoalExtras>;

function AreaAndVision({goalKey, name, extras}: {goalKey: string; name: string; extras: Extras}) {
  const showcase = useShowcase(), groupId = useId(), [adding, setAdding] = useState(false), [label, setLabel] = useState(''), [busy, setBusy] = useState(false);
  const extra = extras.data.goals[goalKey], areas = areasOf(extras.data);
  const setVision = (vision: Vision | null, message: string) => extras.change(goalKey, x => setGoalVision(x, goalKey, vision, now()), message);
  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (showcase) { showToast({message: 'The Showcase keeps no photos. Choose a gradient here, or add a photo to your own goals.'}); return; }
    setBusy(true);
    try {
      const {blob, width, height} = await compressPhoto(file), id = newImageId();
      await putImage({id, scope: visionScope(), blob, type: blob.type, bytes: blob.size, width, height, createdAt: now()});
      // The previous photo stays until the next tidy-up (useGoalExtrasConsistency) so Undo can bring it back.
      setVision({kind: 'photo', imageId: id, alt: `Your photo for ${name}`}, 'Photo saved on this device.');
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? e.message : 'That photo could not be kept on this device.'});
    } finally { setBusy(false); }
  }
  return <article className="panel goal-plan-card" aria-labelledby={`${groupId}-title`}>
    <h3 id={`${groupId}-title`}>Life area and vision</h3>
    <fieldset className="area-chips" disabled={!extras.writable}><legend>Life area</legend>
      {areas.map(a => <label key={a.id} className="area-chip" style={{'--area': a.color} as React.CSSProperties}><input type="radio" name={`${groupId}-area`} checked={extra?.area === a.id} onChange={() => extras.change(goalKey, x => setGoalArea(x, goalKey, a.id, now()), `${name} is in ${a.label} now.`)} /><span>{a.label}</span></label>)}
      {extra?.area && <button type="button" className="text-link" onClick={() => extras.change(goalKey, x => setGoalArea(x, goalKey, null, now()), 'Area cleared.')}>No area</button>}
      {adding ? <form className="area-add" onSubmit={e => { e.preventDefault(); try { let created = ''; extras.change(goalKey, x => { const r = addCustomArea(x, label, AREA_COLORS[x.areas.length % AREA_COLORS.length]!); created = r.id; return setGoalArea(r.extras, goalKey, r.id, now()); }, `Area “${label.trim()}” added.`); void created; setAdding(false); setLabel(''); } catch (err) { showToast({message: err instanceof Error ? err.message : 'That area could not be added.'}); } }}>
        <label className="field"><span>New area</span><input value={label} maxLength={30} onChange={e => setLabel(e.target.value)} placeholder="For example: Garden" /></label>
        <button className="secondary" disabled={!label.trim()}>Add</button><button type="button" className="quiet" onClick={() => setAdding(false)}>Cancel</button>
      </form> : <button type="button" className="text-link" onClick={() => setAdding(true)}>+ Your own area</button>}
    </fieldset>
    <div className="vision-picker">
      <VisionArt vision={extra?.vision} name={name} className="vision-preview" />
      <fieldset disabled={!extras.writable || busy}><legend>Vision</legend>
        <div className="gradient-swatches">{GRADIENTS.map(g => <button key={g} type="button" className="gradient-swatch" style={{background: GRADIENT_CSS[g]}} aria-pressed={extra?.vision?.kind !== 'photo' && extra?.vision?.gradient === g} aria-label={`The ${g} gradient`} onClick={() => setVision({kind: 'gradient', gradient: g, ...(extra?.vision && extra.vision.kind !== 'photo' && extra.vision.emoji ? {emoji: extra.vision.emoji} : {})}, 'Vision saved.')} />)}</div>
        <label className="field vision-emoji-field"><span>An emoji on it (optional)</span><input defaultValue={extra?.vision && extra.vision.kind !== 'photo' ? extra.vision.emoji ?? '' : ''} maxLength={8} onBlur={e => { const emoji = e.target.value.trim(); const gradient = extra?.vision && extra.vision.kind !== 'photo' ? extra.vision.gradient ?? 'nebula' : 'nebula'; if ((extra?.vision?.kind !== 'photo' ? extra?.vision?.emoji ?? '' : '') !== emoji) setVision(emoji ? {kind: 'gradient', gradient, emoji} : {kind: 'gradient', gradient}, 'Vision saved.'); }} /></label>
        <label className="secondary vision-photo-button"><input type="file" accept="image/*" className="sr-only" onChange={e => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />{busy ? 'Keeping your photo…' : 'Use a photo'}</label>
        <p className="fine">A photo is made smaller on this device and kept here only; it is never uploaded or synced.</p>
        {extra?.vision && <button type="button" className="text-link" onClick={() => setVision(null, 'Vision removed.')}>Remove the vision</button>}
      </fieldset>
    </div>
  </article>;
}

function Reasons({goalKey, extras}: {goalKey: string; extras: Extras}) {
  const extra = extras.data.goals[goalKey], id = useId();
  const [why, setWhy] = useState(extra?.why ?? ''), [obstacle, setObstacle] = useState(extra?.obstacle ?? ''), [ifThen, setIfThen] = useState(extra?.ifThen ?? '');
  const dirty = why !== (extra?.why ?? '') || obstacle !== (extra?.obstacle ?? '') || ifThen !== (extra?.ifThen ?? '');
  return <article className="panel goal-plan-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Why it matters</h3>
    <form onSubmit={e => { e.preventDefault(); extras.change(goalKey, x => setGoalReasons(x, goalKey, {why, obstacle, ifThen}, now()), 'Your plan is saved on this device.'); }}>
      <fieldset disabled={!extras.writable} className="goal-reasons">
        <label className="field"><span>Why it matters to you</span><textarea value={why} maxLength={1000} onChange={e => setWhy(e.target.value)} placeholder="So I can sleep without money worries" /></label>
        <label className="field"><span>What could get in the way</span><textarea value={obstacle} maxLength={1000} onChange={e => setObstacle(e.target.value)} placeholder="Weekend spending" /></label>
        <label className="field"><span>Your if-then plan</span><textarea value={ifThen} maxLength={1000} onChange={e => setIfThen(e.target.value)} placeholder="If I want to buy something big, then I wait one day" /></label>
        <button className="secondary" disabled={!dirty}>Save the plan</button>
      </fieldset>
    </form>
    <p className="fine">The weekly review reminds you of these words.</p>
  </article>;
}

function SubGoals({goalKey, summary, goals, extras}: {goalKey: string; summary?: GoalSummary; goals: readonly GoalSummary[]; extras: Extras}) {
  const id = useId(), x = extras.data;
  const byKey = new Map(goals.map(g => [g.key, g]));
  const parent = x.goals[goalKey]?.parentKey, parentGoal = parent ? byKey.get(parent) : undefined;
  const kids = childrenOf(x, goalKey).map(k => byKey.get(k)).filter((g): g is GoalSummary => !!g);
  const below = new Set<string>(); const walk = (k: string) => { for (const c of childrenOf(x, k)) if (!below.has(c)) { below.add(c); walk(c); } }; walk(goalKey);
  const options = goals.filter(g => g.key !== goalKey && !below.has(g.key) && ancestorsOf(x, g.key).length < 2 && g.status !== 'closed');
  const r = summary ? rollUp(summary, kids) : null;
  return <article className="panel goal-plan-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Bigger and smaller goals</h3>
    <label className="field"><span>Part of a bigger goal</span>
      <select disabled={!extras.writable} value={parentGoal ? parent : ''} onChange={e => { const next = e.target.value || null; extras.change(goalKey, y => setGoalParent(y, goalKey, next, now()), next ? `Now part of ${byKey.get(next)?.name ?? 'that goal'}.` : 'Now a goal of its own.'); }}>
        <option value="">None: a goal of its own</option>
        {options.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
      </select>
    </label>
    {parentGoal && <p className="fine">Part of <Link href={parentGoal.href}>{parentGoal.name}</Link>.</p>}
    {kids.length > 0 ? <>
      <p className="goal-rollup"><strong>{rollUpWords(r!, (v, c) => formatGoalAmount(v, c))}</strong></p>
      <ul className="goal-tree" aria-label="Sub-goals">{kids.map(k => <li key={k.key}><Link href={k.href}>{k.name}</Link><span className="goal-tree-meta">{k.status === 'completed' ? 'Done' : k.progressBound === 'unavailable' ? 'Progress unknown' : `${Math.floor(Number(k.progressPct))}%`}</span>{childrenOf(x, k.key).length > 0 && <ul>{childrenOf(x, k.key).map(c => byKey.get(c)).filter((g): g is GoalSummary => !!g).map(c => <li key={c.key}><Link href={c.href}>{c.name}</Link><span className="goal-tree-meta">{c.status === 'completed' ? 'Done' : `${Math.floor(Number(c.progressPct))}%`}</span></li>)}</ul>}</li>)}</ul>
    </> : <p className="fine">No smaller goals yet. On another goal, choose this one under “Part of a bigger goal” (year → quarter → month, three levels at most).</p>}
  </article>;
}

function Story({goalKey, extras}: {goalKey: string; extras: Extras}) {
  const id = useId(), [story, setStory] = useState(extras.data.goals[goalKey]?.story ?? '');
  return <article className="panel goal-plan-card" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your story</h3>
    <form onSubmit={e => { e.preventDefault(); extras.change(goalKey, x => setGoalStory(x, goalKey, story, now()), 'Your story is on the Hall of achievements.'); }}>
      <label className="field"><span>A few words for the Hall of achievements</span><textarea value={story} maxLength={2000} onChange={e => setStory(e.target.value)} /></label>
      <button className="secondary" disabled={!extras.writable || story === (extras.data.goals[goalKey]?.story ?? '')}>Save the story</button>
    </form>
  </article>;
}
