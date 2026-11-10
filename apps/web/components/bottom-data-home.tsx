'use client';
import './bottom-sections.css';
import {NebulaFlow} from './nebula-flow';

/** Settings: where your data lives (static information, not a movable card). */
export function DataHome(){
 const places=[
  ['In this browser','Goals, Habits, Health, Wealth, and your Today widgets and their order, are private records stored in this browser.'],
  ['Optional account','If you create an account, only the areas you agree to are encrypted before they sync.'],
  ['Backups you keep','An encrypted backup file you download. Browser storage is not a backup, so keep one somewhere safe.'],
  ['This device only','The card order you arrange on the other pages, the motion preference, reminder times and your Portfolio stay on this device. They are not synced or backed up.'],
  ['Showcase','Showcase data is fictional and lives only in its tab, separate from your records.'],
 ] as const;
 return <section className="bottom-section panel data-home" aria-labelledby="bottom-data-home"><div className="bottom-section-heading"><p className="eyebrow">YOUR DATA, YOUR ORBIT</p><h2 id="bottom-data-home"><NebulaFlow identity="bottom-data-home">Where your data lives.</NebulaFlow></h2></div>
  <ul className="bottom-places">{places.map(([title,body])=><li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ul>
 </section>;
}
