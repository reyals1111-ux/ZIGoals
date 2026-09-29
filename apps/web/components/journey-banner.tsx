import Link from 'next/link';
import {FINANCIAL_EXECUTION_ALLOWED} from '../lib/app-environment';
import './journey-banner.css';
const STEPS=[
 {n:'01',title:'Choose your orbit',body:'Pick what matters to you: Goals, Habits, Health or Wealth. Arrange each page your way.'},
 {n:'02',title:'Take a small step',body:'Log a habit, a meal or a few push-ups, review a Goal or record what you hold. Every entry adds to the pattern.'},
 {n:'03',title:'Keep it yours',body:'Your records stay private in this browser unless you choose an account. You decide what to keep and share.'},
] as const;
/** What ZIGoals is, in the orbit theme: three steps and the Alpha's standing truths. */
export function JourneyBanner(){
 return <section id="how-it-works" className="journey-panel journey-orbit" aria-labelledby="journey-title">
  <div className="journey-orbit-art" aria-hidden="true"><i/><i/><i/><span/></div>
  <div className="journey-intro">
   <p className="eyebrow">One journey. Your pace.</p>
   <h2 id="journey-title">Your goals, habits and health, <span className="journey-title-flow">in one orbit.</span></h2>
   <p className="journey-lede">ZIGoals is a private place to plan what matters, take small steps each day and watch tomorrow take shape.</p>
  </div>
  <ol className="journey-steps">{STEPS.map(s=><li key={s.n}><span className="journey-step-mark" aria-hidden="true">{s.n}</span><strong>{s.title}</strong><p>{s.body}</p></li>)}</ol>
  <div className="journey-truths">
   {!FINANCIAL_EXECUTION_ALLOWED&&<p><span aria-hidden="true">◇</span>Financial execution is disabled on this Alpha.</p>}
   <p><span aria-hidden="true">◇</span>Browser storage is not a backup. <Link className="text-link" href="/app/settings">Make a backup in Settings →</Link></p>
  </div>
 </section>;
}
