'use client';
import {useEffect, useState} from 'react';
import './help-screenshots.css';

/**
 * Session AT (ADR-043 D14; NEXT_SESSION_BACKLOG #12 "Help: screenshots"): what each main page looks like, as example
 * pictures made from the Showcase (fictional data; scripts/help-screenshots.mjs) in the theme the person uses, a phone's
 * picture on a narrow screen and a computer's on a wide one. They sit inside a closed Help answer and load lazily, so
 * nothing is downloaded until the answer is opened; each says it is example data. Nothing is read from the person's own
 * records.
 */
const SHOTS = [
  {id: 'today', title: 'Today', what: 'your day in one place: goals, habits, health and money at a glance'},
  {id: 'habits', title: 'Habits', what: 'today’s rhythm and each habit’s check-ins'},
  {id: 'health', title: 'Health', what: 'food, water, sleep and activity for the day'},
  {id: 'wealth', title: 'Wealth', what: 'what you hold and how it moves, each figure with its source'},
  {id: 'nova', title: 'NOVA', what: 'your private command center: the star, its widgets and one field to ask in'},
] as const;
type Theme = 'nebula' | 'light' | 'dark';
const THEME_WORD: Record<Theme, string> = {nebula: 'Nebula', light: 'Light', dark: 'Dark'};
const readTheme = (): Theme => { const t = document.documentElement.dataset.theme; return t === 'light' || t === 'dark' ? t : 'nebula'; };

export function HelpScreenshots() {
  const [theme, setTheme] = useState<Theme>('nebula');
  useEffect(() => {
    setTheme(readTheme());
    const watch = new MutationObserver(() => setTheme(readTheme()));
    watch.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    return () => watch.disconnect();
  }, []);
  return <div className="help-shots">
    <p className="fine">Example pictures from the Showcase (fictional data, as Settings &rarr; Load Showcase Demo shows it), in the {THEME_WORD[theme]} theme you use. Your own pages show your own records.</p>
    <ul className="help-shots-list">
      {SHOTS.map(shot => <li key={shot.id}>
        <figure className="help-shot">
          <picture>
            <source media="(max-width: 600px)" srcSet={`/help/${shot.id}-${theme}-phone.webp`} width={390} height={844}/>
            <img src={`/help/${shot.id}-${theme}-desktop.webp`} width={1440} height={900} loading="lazy" decoding="async"
              alt={`Example: ${shot.title} with the Showcase's fictional data, in the ${THEME_WORD[theme]} theme`}/>
          </picture>
          <figcaption><strong>{shot.title}</strong>: {shot.what}. <span className="help-shot-tag">Example data</span></figcaption>
        </figure>
      </li>)}
    </ul>
  </div>;
}
