'use client';
import {NebulaFlow} from '../nebula-flow';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHealth} from './use-health';
import {useHealthToday} from './use-health-today';
import {coachCheckIn} from '../../lib/health-aa/coach';
import {answerCoach, HEALTH_COACH} from '../../lib/health-aa/coach-schema';
import {dailyData} from '../../lib/health-daily';
import {setHealthTargets, type HealthData} from '../../lib/health';
import {registerSlotCard} from '../game/slot-local';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HealthPerform} from './aa-types';
import './health-aa.css';

/**
 * N3: the weekly coach check-in: "This week: −0.4 kg/week; keep your target, or adjust?" with Keep and Adjust. Keep
 * records the answer; Adjust writes the suggested calorie target (from the energy estimate when ready) after the tap
 * and records it. One answer a week on this device; on Health, Today (`today:coach`) and the Life review (`review:coach`).
 */
export function CoachCard({data, today, perform, compact = false}: {data: HealthData; today: string; perform: HealthPerform; compact?: boolean}) {
  const coach = useDeviceRecord(HEALTH_COACH), unit = dailyData(data).preferences.weightUnit;
  const c = coachCheckIn(data, coach.loaded && !coach.unreadable ? coach.data : {version: 1}, today, unit);
  const answer = (what: 'keep' | 'adjust') => {
    const kcal = what === 'adjust' ? c.suggestion?.kcal : undefined;
    const record = () => { try { coach.update(r => answerCoach(r, c.weekStart, what, new Date().toISOString(), kcal)); } catch (e) { void perform(l => l, `Answer not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
    if (what === 'adjust' && kcal) void perform(latest => setHealthTargets(latest, {...latest.targets, kcal}), `Calorie target adjusted to ${kcal} kcal a day.`, record); else record();
  };
  return <section id={compact ? undefined : 'health-coach'} className={`panel health-aa-card health-coach${compact ? ' health-coach-compact' : ''}`} aria-labelledby="coach-title">
    <p className="eyebrow">Weekly check-in</p><h2 id="coach-title"><NebulaFlow identity={`coach-title${compact ? '-compact' : ''}`}>Your coach</NebulaFlow></h2>
    <p className="health-coach-line">{c.sentence}</p>
    {c.rateGrams !== null && (c.answered ? <p className="health-coach-answered">{c.answered === 'keep' ? 'You kept your target this week.' : 'You adjusted your target this week.'} Back next week.</p> : <div className="actions"><button type="button" className="primary" onClick={() => answer('keep')}>Keep my target</button><button type="button" className="secondary" onClick={() => answer('adjust')} disabled={!c.suggestion}>{c.suggestion ? `Adjust to ${c.suggestion.kcal} kcal` : 'Adjust (needs the estimate)'}</button></div>)}
    <p className="fine">{c.suggestion ? `The adjustment comes from your energy estimate and a pace of ${c.suggestion.paceKg} kg a week toward your goal.` : 'The adjustment appears once the energy estimate has two weeks of logs.'} <span className="health-estimate-tag">an estimate, not medical advice</span></p>
  </section>;
}
/** The slot card for Today and the Life review: the same check-in, from the Health store directly. */
export function CoachSlotCard() {
  const health = useHealth(), today = useHealthToday(dailyData(health.data).preferences.timezone);
  if (!health.loaded || health.error) return null;
  const perform: HealthPerform = async (updater, _message, after) => { await health.update(updater); after?.(); };
  return <CoachCard data={health.data} today={today} perform={perform} compact />;
}
let registered = false;
export function registerCoachCard() { if (registered) return; registered = true; registerSlotCard('today:coach', CoachSlotCard); registerSlotCard('review:coach', CoachSlotCard); }
