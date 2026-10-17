'use client';
import type {LayoutAttrs} from '../layout-edit';
import Link from 'next/link';
import {useState} from 'react';
import {BUILT_IN_AREAS, type BuiltInArea} from '../../lib/goal-extras/store';
import {searchTemplates, type LibraryTemplate} from '../../lib/templates/goal-library';
import {SectionHeading} from '../ui/section-heading';
import {HeaderArtCorner, OrbitArt} from '../header-art/orbit-art';
import {TemplatesGlyph} from '../header-art/glyphs/templates';
import './goals.css';

const KIND_LABEL: Record<LibraryTemplate['kind'], string> = {value: 'Savings goal', project: 'Milestones goal', average: 'Keep an average', 'health-weight': 'Health goal'};
/** Where a template opens: the goal wizard, the average form, or Health goals for a weight. */
export const templateHref = (t: LibraryTemplate) => t.kind === 'average' ? `/app/goals/average/new?template=${t.id}` : t.kind === 'health-weight' ? '/app/goals#goals-health' : `/app/goals/new?template=${t.id}`;

/**
 * G6, the template library: 42 ready goals across every life area, searchable and filtered by area. A template fills
 * in the goal wizard (name, kind, area, milestones) and offers the habits that help; a money template never suggests an
 * amount. Nothing is saved until the wizard's own Save.
 */
export function TemplateLibrary() {
  const [query, setQuery] = useState(''), [area, setArea] = useState<BuiltInArea | null>(null);
  const results = searchTemplates(query, area);
  return <div className="template-library">
    <div className="page-heading header-art-host"><div>
      <p className="eyebrow page-eyebrow">Start from something proven</p>
      <h1>Goal templates</h1>
      <p className="page-lede">Forty-two ready goals for every part of life. Pick one; the name, steps and habits are yours to change.</p>
    </div><HeaderArtCorner><OrbitArt glyph={TemplatesGlyph} tone="goals" spin={30}/></HeaderArtCorner></div>
    <div className="template-controls">
      <label className="field template-search"><span>Search templates</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Run, savings, sleep, language…" /></label>
      <div className="area-filter" role="group" aria-label="Life areas">
        <button type="button" aria-pressed={area === null} onClick={() => setArea(null)}>All areas</button>
        {BUILT_IN_AREAS.map(a => <button key={a.id} type="button" aria-pressed={area === a.id} style={{'--area': a.color} as React.CSSProperties} onClick={() => setArea(area === a.id ? null : a.id)}>{a.label}</button>)}
      </div>
    </div>
    <p className="fine" aria-live="polite">{results.length} {results.length === 1 ? 'template' : 'templates'}</p>
    {results.length ? <ul className="template-grid">{results.map(t => <TemplateCard key={t.id} t={t} />)}</ul> : <div className="aa-empty"><h3>No template matches “{query}”.</h3><p>Try another word, or start your own goal from scratch.</p><Link className="primary" href="/app/goals/new">+ Create my own goal</Link></div>}
  </div>;
}

function TemplateCard({t}: {t: LibraryTemplate}) {
  const area = BUILT_IN_AREAS.find(a => a.id === t.area)!;
  return <li className="template-card" style={{'--area': area.color} as React.CSSProperties}>
    <div className="template-card-top"><span className="template-area">{area.label}</span><span className="template-kind">{KIND_LABEL[t.kind]}</span></div>
    <h2>{t.title}</h2>
    <p>{t.summary}</p>
    {t.average && <p className="template-detail">{t.average.direction === 'at-least' ? 'At least' : 'At most'} {t.average.target.toLocaleString('en')} {t.average.unit}, over {t.average.windowDays} days (yours to change)</p>}
    {t.milestones && <ol className="template-steps" aria-label="Steps">{t.milestones.map(m => <li key={m}>{m}</li>)}</ol>}
    {t.habits && <p className="template-detail"><strong>Habits that help:</strong> {t.habits.map(h => h.title).join(' · ')}</p>}
    <Link className="primary template-use" href={templateHref(t)} aria-label={`Use the template: ${t.title}`}>Use this template</Link>
  </li>;
}

/** A teaser for the Goals page: three templates and the way in. */
export function TemplateTeaser(layout: LayoutAttrs) {
  const picks = ['run-10k', 'emergency-fund', 'read-12'].map(id => searchTemplates('').find(t => t.id === id)!).filter(Boolean);
  return <section className="panel template-teaser" aria-labelledby="template-teaser-title" {...layout}>
    <SectionHeading id="template-teaser-title" eyebrow="Start from something proven" title="Goal templates" lede="Forty-two ready goals across every life area." action={<Link className="secondary" href="/app/goals/templates">Browse all</Link>} />
    <ul className="template-teaser-list">{picks.map(t => <li key={t.id}><Link href={templateHref(t)}><strong>{t.title}</strong><small>{t.summary}</small></Link></li>)}</ul>
  </section>;
}
