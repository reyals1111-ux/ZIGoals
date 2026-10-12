'use client';
import Link from 'next/link';
import {useState} from 'react';
import {achievementsOf, durationWords, type Achievement} from '../../lib/achievements';
import {areasOf} from '../../lib/goal-extras/store';
import {drawShareCard, shareOrSave} from '../../lib/share-image';
import {usePlatform} from '../platform/use-platform';
import {SectionHeading} from '../ui/section-heading';
import {showToast} from '../ui/undo-toast';
import {useAverageGoals, useGoalExtras} from './use-goal-extras';
import {VisionArt} from './vision-art';
import {formatDay} from './format';
import './goals.css';

/**
 * G7, the Hall of achievements: finished goals as a wall of cards (the day, how long it took, the area, the story), each
 * with a share image drawn on this device (nothing is uploaded).
 */
export function AchievementsHall() {
  const platform = usePlatform(), averages = useAverageGoals(), extras = useGoalExtras();
  const list = platform.loaded && averages.loaded && extras.loaded ? achievementsOf(platform.data.goals, averages.unreadable ? [] : averages.data.goals, extras.data) : null;
  return <section className="achievements-hall" aria-labelledby="hall-title">
    <SectionHeading id="hall-title" eyebrow="Finished, with a story" title="Hall of achievements" lede="Every goal you finish keeps its place here." />
    {!list ? <div className="aa-skeleton" aria-hidden="true"><i /><i /><i /></div> : list.length ? <ul className="hall-wall">
      {list.map(a => <AchievementCard key={a.key} a={a} color={a.area ? areasOf(extras.data).find(x => x.id === a.area)?.color : undefined} vision={extras.data.goals[a.key]?.vision} />)}
    </ul> : <div className="aa-empty"><h3>Your first finished goal will shine here.</h3><p>When a goal is done, mark it complete on its page and write a line about how it went.</p><Link className="secondary" href="/app/goals">See your goals</Link></div>}
  </section>;
}

function AchievementCard({a, color, vision}: {a: Achievement; color?: string; vision?: Parameters<typeof VisionArt>[0]['vision']}) {
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const blob = await drawShareCard({eyebrow: a.areaLabel ? `Achievement · ${a.areaLabel}` : 'Achievement', title: a.name, lines: [a.finished ? `Finished ${formatDay(a.finished)}` : 'Finished', durationWords(a.days), ...(a.story ? [`“${a.story}”`] : [])]});
      const how = await shareOrSave(blob, `${a.name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'achievement'}.png`, a.name);
      showToast({message: how === 'saved' ? 'Image saved to your device.' : 'Image ready to share.'});
    } catch (e) { showToast({message: e instanceof Error ? e.message : 'The image could not be made.'}); }
    finally { setBusy(false); }
  }
  return <li className="hall-card" style={color ? {'--area': color} as React.CSSProperties : undefined}>
    <VisionArt vision={vision} name={a.name} className="hall-art" />
    <div className="hall-body">
      {a.areaLabel && <span className="hall-area">{a.areaLabel}</span>}
      {/* The goal's name is its card's title, not a heading: the same goal's own card on Goals already has the heading. */}
      <p className="hall-title">{a.name}</p>
      <p className="hall-when">{a.finished ? `Finished ${formatDay(a.finished)}` : 'Finished'} · {durationWords(a.days)}</p>
      {a.story && <blockquote>{a.story}</blockquote>}
      <div className="hall-actions"><Link className="text-link" href={a.key.startsWith('private:') ? `/app/goals/tracked/${a.key.slice(8)}` : `/app/goals/average/${a.key.slice(8)}`}>Open →</Link><button type="button" className="secondary" disabled={busy} onClick={() => void share()}>{busy ? 'Making the image…' : 'Share image'}</button></div>
    </div>
  </li>;
}
