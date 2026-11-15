'use client';
import {useMemo} from 'react';
import {runSplitsCard, runSplitsRows} from '../../../lib/nova/cards/health-insights';
import {WORKOUT_SPLITS} from '../../../lib/workouts/splits-schema';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useWorkouts} from '../../health/workouts/use-workouts';
import {CardFoot, CardNotice, Columns, Fact, HeartMark, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {useHealthDay, useHealthGate} from './use-health-gate';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 5): "Run splits" in Health's pink — the latest run that has a
 * pace from an imported GPX or TCX file: its average pace, each kilometre as a column (taller is faster; decoration over
 * the table, which gives each kilometre's pace) and the fastest and slowest whole kilometre (lib/workouts/splits.ts;
 * figures in lib/nova/cards/health-insights.ts). The record is health-type: this widget exists only behind the Health
 * switches (the frame's gate, and `useHealthGate` here). Never the route: the app keeps no track points. Read only.
 */
export default function RunSplitsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="run-splits"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <RunSplits size={size}/>;
}
/** Mounted only once the Health switch is open: the records are read here and nowhere before. */
function RunSplits({size}: {size: CardProps['size']}) {
  const record = useWorkouts(), splits = useDeviceRecord(WORKOUT_SPLITS), day = useHealthDay();
  const ready = record.loaded && !record.unreadable && splits.loaded && !splits.unreadable;
  const card = useMemo(() => { if (!ready) return null; try { return runSplitsCard(record.data, splits.data, day); } catch { return null; } }, [ready, record.data, splits.data, day]);
  if (!record.loaded || !splits.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your workout log"/>;
  const run = card.run;
  if (!run) return <CardNotice kind="empty" ghost="columns" title="No run with a pace yet" href="/app/health?view=workouts" action="Import a run">{size === 'S' ? null : 'Import a GPX or TCX file of a run on Health, under Workouts. Its pace for each kilometre shows here.'}</CardNotice>;
  const many = run.splits.length > 12, mark = run.fastest ? run.splits.findIndex(s => s.km === run.fastest!.km) : undefined;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top">
      <Hero value={run.paceText.replace(/ \/km$/, '')} unit="/km" label={size === 'S' ? 'Average pace' : `${run.name} · ${run.dateText}`}>
        {size !== 'S' && run.distanceText && <p className="nx-note">Average pace over {run.distanceText}</p>}
      </Hero>
      {size === 'S' && <span className="nc-mini" aria-hidden="true"><HeartMark size={36}/></span>}
    </div>
    {size !== 'S' && <div className="nx-main">
      {size === 'L' && run.splits.length > 0 && <p className="nx-cap">Each kilometre · taller is faster</p>}
      {run.splits.length > 0
        ? <Columns values={run.splits.map(s => s.speed)} labels={run.splits.map((s, i) => !many || i === 0 || i === run.splits.length - 1 || s.km % 5 === 0 ? s.label : '')} height={size === 'L' ? 96 : 52} mark={mark !== undefined && mark >= 0 ? mark : undefined}/>
        : <p className="nx-note">This run is too long to keep every kilometre; its average pace is kept.</p>}
    </div>}
    {size === 'L' && <div className="nc-facts">
      {run.fastest && <Fact label="Fastest kilometre" value={`${run.fastest.paceText} · km ${run.fastest.km}`}/>}
      {run.slowest && <Fact label="Slowest kilometre" value={`${run.slowest.paceText} · km ${run.slowest.km}`}/>}
      {card.earlier.slice(0, 2).map(r => <Fact key={r.id} label={`${r.name} · ${r.dateText}`} value={r.paceText}/>)}
    </div>}
    <HoloTable caption={`Run splits: ${run.name}, ${run.dateText}`} rows={runSplitsRows(card)}/>
    <CardFoot source="Your Health records" asOf={`run logged ${run.dateText}`}/>
  </div>;
}
