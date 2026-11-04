'use client';
import {NebulaFlow} from '../nebula-flow';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHealth} from './use-health';
import {useHealthToday} from './use-health-today';
import {coachCheckIn} from '../../lib/health-aa/coach';
import {energyProgress} from '../../lib/health-aa/energy-progress';
import {answerCoach, clearCoachAnswer, HEALTH_COACH} from '../../lib/health-aa/coach-schema';
import {formatNumber} from '../../lib/visual-format';
import {dailyData} from '../../lib/health-daily';
import {setHealthTargets, type HealthData} from '../../lib/health';
import {scaledTargets} from '../../lib/health-aa/energy';
import {ConfirmInline} from '../ui/confirm-inline';
import {showUndo} from '../ui/undo-toast';
import {useState} from 'react';
import {registerSlotCard} from '../game/slot-local';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HealthPerform} from './aa-types';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {coachSlotShown, LOG_WEIGHT_HREF} from '../../lib/health-aa/coach-slot';
import Link from 'next/link';
import './health-aa.css';

/**
 * N3: the weekly coach check-in: "This week: −0.4 kg/week; keep your target, or adjust?" with Keep and Adjust. Keep
 * records the answer; Adjust writes the suggested calorie target (from the energy estimate when ready) after the tap
 * and records it. One answer a week on this device; on Health, Today (`today:coach`) and the Life review (`review:coach`).
 */
/** Gate C design review (copy): the pace in the check-in's own style — a true minus, the person's weight unit and "/week",
 *  as the line above it reads ("−0.4 kg/week", not "-0.4 kg a week"). */
const paceLabel = (kg: number, unit: string) => `${kg < 0 ? '−' : kg > 0 ? '+' : ''}${unit === 'lb' ? (Math.abs(kg) / 0.45359237).toFixed(1) : String(Math.abs(kg))} ${unit === 'lb' ? 'lb' : 'kg'}/week`;
export function CoachCard({data, today, perform, compact = false}: {data: HealthData; today: string; perform: HealthPerform; compact?: boolean}) {
  const coach = useDeviceRecord(HEALTH_COACH), unit = dailyData(data).preferences.weightUnit;
  const c = coachCheckIn(data, coach.loaded && !coach.unreadable ? coach.data : {version: 1}, today, unit);
  // Session AL (P-PR-23, PR-020): one count for the estimate's progress, said the same way here, on the Energy card and the tile.
  const waiting = energyProgress({loggedDays: c.progress.loggedDays, weights: c.progress.weights, implausible: c.progress.implausible});
  // Session AH (HE2; D-094, L-046, M-054, M-097, B-100, N-035): Adjust asks first, names the change, scales the macro
  // targets with it, moves at most 15 % a step (never under 1,200 kcal), and offers Undo.
  const [asking, setAsking] = useState(false);
  const answer = (what: 'keep' | 'adjust') => {
    const kcal = what === 'adjust' ? c.suggestion?.kcal : undefined;
    const record = () => { try { coach.update(r => answerCoach(r, c.weekStart, what, new Date().toISOString(), kcal)); } catch (e) { void perform(l => l, `Answer not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
    setAsking(false);
    if (what === 'adjust' && kcal) {
      const before = data.targets;
      void perform(latest => setHealthTargets(latest, scaledTargets(latest.targets, kcal)), `Calorie target adjusted to ${kcal} kcal a day; protein, carbs and fat scaled with it.`, () => { record(); showUndo({message: `Calorie target now ${kcal} kcal a day.`, undone: `Calorie target back to ${before.kcal ?? 'none'}.`, restore: () => perform(latest => setHealthTargets(latest, before), 'Your earlier targets are back.')}); });
    } else { record(); if (what === 'keep') showUndo({message: 'Target kept for this week.', undone: 'Your answer for this week is cleared.', restore: () => { try { coach.update(r => clearCoachAnswer(r, c.weekStart)); } catch { /* the answer stays; the next week asks again */ } }}); }
  };
  // Session AK (task 4.5): the week's facts: the estimated maintenance once two weeks of logs are in, the weekly trend,
  // and the small step the suggestion takes (or how far the logs still are from it).
  const signed = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : '±'}${formatNumber(Math.abs(n))}`;
  return <section id={compact ? undefined : 'health-coach'} className={`panel health-aa-card health-coach${compact ? ' health-coach-compact' : ''}`} aria-labelledby="coach-title">
    <p className="eyebrow">Weekly check-in</p><h2 id="coach-title"><NebulaFlow identity={`coach-title${compact ? '-compact' : ''}`}>Your coach</NebulaFlow></h2>
    <p className="health-coach-line">{c.sentence}</p>
    {!compact && (c.maintenance ? <dl className="health-aa-facts"><div><dt>Estimated maintenance</dt><dd>{formatNumber(c.maintenance.kcal)} kcal/day</dd></div><div><dt>Likely range</dt><dd>{formatNumber(c.maintenance.low)}–{formatNumber(c.maintenance.high)}</dd></div>{c.suggestion && c.changeKcal !== null && <div><dt>Suggested step</dt><dd>{c.changeKcal === 0 ? 'Keep as is' : `${signed(c.changeKcal)} kcal`}</dd></div>}</dl>
      : <p className="fine">{c.progress.implausible ? 'Your recent logs look incomplete, so there is no maintenance estimate this week. Check the diary and weights.' : `The maintenance estimate needs about two weeks of food and weight logs: ${waiting.figure} so far, ${waiting.note}.`}</p>)}
    {c.rateGrams !== null && (c.answered ? <p className="health-coach-answered">{c.answered === 'keep' ? 'You kept your target this week.' : 'You adjusted your target this week.'} Back next week.</p> : <div className="actions"><button type="button" className="primary" onClick={() => answer('keep')}>Keep my target</button><button type="button" className="secondary" onClick={() => setAsking(true)} disabled={!c.suggestion} aria-expanded={asking}>{c.suggestion ? `Adjust to ${c.suggestion.kcal} kcal…` : 'Adjust (needs the estimate)'}</button></div>)}
    {asking && c.suggestion && <ConfirmInline title={`Set your calorie target to ${c.suggestion.kcal} kcal a day?`} confirmLabel="Adjust my target" cancelLabel="Keep it as it is" tone="neutral" onConfirm={() => answer('adjust')} onCancel={() => setAsking(false)}><p>Now {c.currentKcal === null ? 'no target' : `${c.currentKcal} kcal`}{c.changeKcal !== null && c.changeKcal !== 0 ? ` (${signed(c.changeKcal)} kcal)` : ''}. Protein, carbs and fat scale with it. A change moves at most {c.rails.maxStepPercent} % at a time and never below {formatNumber(c.rails.floorKcal)} kcal. You can undo it right after.</p></ConfirmInline>}
    <p className="fine">{c.suggestion ? `The adjustment comes from your energy estimate and a pace of ${paceLabel(c.suggestion.paceKg, unit)} toward your goal.` : 'The adjustment appears once the energy estimate has two weeks of logs.'} <span className="health-estimate-tag">{/* Session AK P4 (FR-15): a sentence of its own, capitalised */}An estimate, not medical advice</span></p>
    {/* Session AK P4 (FR-15): with no weight yet, the card says where the first one goes. */}
    {/* Session AL (NB-254): to the Weight view with its field focused, not the Diary. */}
    {compact && !data.weights.length && <p><Link className="text-link" href={LOG_WEIGHT_HREF} prefetch={false}>Log a weight →</Link></p>}
  </section>;
}
/** The slot card for Today and the Life review: the same check-in, from the Health store directly. */
export function CoachSlotCard() {
  const health = useHealth(), today = useHealthToday(dailyData(health.data).preferences.timezone), view = usePagesView();
  if (!health.loaded || health.error) return null;
  // Session AK P4 (FIRST_RUN_REVIEW FR-15): a person who chose no Health (the page is hidden) and logged no weight is not
  // asked for weights on Today.
  // Session AL (NB-244): with nothing logged at all, a shown Health page alone does not bring the coach.
  const records = health.data.weights.length + health.data.diary.length + health.data.activity.length + dailyData(health.data).water.length;
  if (!coachSlotShown({healthShown: isShown(view, 'health'), weights: health.data.weights.length, records})) return null;
  const perform: HealthPerform = async (updater, _message, after) => { await health.update(updater); after?.(); };
  return <CoachCard data={health.data} today={today} perform={perform} compact />;
}
let registered = false;
export function registerCoachCard() { if (registered) return; registered = true; registerSlotCard('today:coach', CoachSlotCard); registerSlotCard('review:coach', CoachSlotCard); }
