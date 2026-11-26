'use client';
import Link from 'next/link';
import {ITEM_KIND_LABEL, collectionById, itemWords, type CollectionItem} from '../../lib/guided/collections';
import {LESSON_CARE, lessonWords, type SleepLesson} from '../../lib/guided/sleep-lessons';
import type {CollectionId} from '../../lib/guided/collection-titles';
import {ReadAloud} from '../read-aloud/read-aloud';

/**
 * Session AW (content; owner decision 1d, ADR-046; LEDGER #82, #278): one collection's body, loaded when its fold first
 * opens: the intro, the care line, (Sleep better) the seven lessons as folds, each with its care line, Read aloud in the
 * device's own voice and a link where its idea is tried; then the items, each saying what it is, with a written guide's
 * or stretch's steps readable in place. A programme or journey is on this page: its link moves there (focused). Nothing
 * is stored. Tokens only; every control a 44 px target; nothing moves.
 */
export default function CollectionBody({id, goToProgram}: {id: CollectionId; goToProgram: (programId: string) => void}) {
  const c = collectionById(id);
  if (!c) return null;
  return <div className="guided-collection-body">
    <p className="guided-collection-intro">{c.intro}</p>
    {c.care && <p className="fine guided-care">{c.care}</p>}
    {c.lessons && <section className="guided-lessons-part" aria-labelledby={`guided-lessons-${id}`}>
      <h3 id={`guided-lessons-${id}`}>Seven short lessons on sleeping better</h3>
      <p className="guided-note">A few minutes each, in any order. Reading one stores nothing.</p>
      <ol className="guided-days guided-lessons">{c.lessons.map((l, i) => <Lesson key={l.id} lesson={l} n={i + 1} />)}</ol>
    </section>}
    <h3 className="guided-collection-items-title">In this collection</h3>
    <ul className="guided-collection-items">{c.items.map(item => <Item key={item.id} item={item} goToProgram={goToProgram} />)}</ul>
  </div>;
}

function Lesson({lesson, n}: {lesson: SleepLesson; n: number}) {
  const what = `Lesson ${n}, ${lesson.title}`;
  return <li className="guided-day guided-lesson">
    <details>
      <summary><span className="guided-day-head"><span className="eyebrow guided-step-number">Lesson {n}</span><span className="guided-day-title">{lesson.title}</span></span></summary>
      <div className="guided-day-body">
        {lesson.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        <p className="fine guided-care">{LESSON_CARE}</p>
        <ReadAloud what={what} text={() => lessonWords(lesson, n)} />
        {lesson.action && <div className="guided-step-actions"><Link className="secondary" href={lesson.action.href}>{lesson.action.label}</Link></div>}
      </div>
    </details>
  </li>;
}

function Item({item, goToProgram}: {item: CollectionItem; goToProgram: (programId: string) => void}) {
  return <li className="guided-step guided-collection-item">
    <p className="eyebrow guided-step-number">{ITEM_KIND_LABEL[item.kind]}</p>
    <h4>{item.title}</h4>
    <p className="guided-note">{item.note}</p>
    {item.text && <details className="guided-preview">
      <summary>Read it here<span className="sr-only">: {item.title}</span></summary>
      <ol>{item.text.map((t, i) => <li key={i}>{t}</li>)}</ol>
      <ReadAloud what={item.title} text={() => itemWords(item)} />
    </details>}
    <div className="guided-step-actions">{item.onPage
      ? <a className="secondary" href={`#guided-program-${item.onPage}`} aria-label={`See it on this page: ${item.title}`}
          onClick={e => { e.preventDefault(); goToProgram(item.onPage!); }}>See it on this page</a>
      : item.action && <Link className="secondary" href={item.action.href}>{item.action.label}</Link>}</div>
  </li>;
}
