'use client';
import {useEffect, useMemo, useState} from 'react';
import {ACADEMY_LESSONS, academyModel, lessonOf, lessonState, scoreQuiz, type Lesson} from '../../lib/earn/academy';
import {recordLesson, type EarnAcademy} from '../../lib/earn/records';
import {Path} from '../path/path';

/**
 * Session AF chunk 2 (P1.27): the Academy's mini path and its lessons, its own chunk (loaded after the page's first paint).
 * Pressing a dot opens the lesson under it: a few short paragraphs, then three questions. All three right passes the
 * lesson (its dot lights once; XP is derived by the game layer, only while it is on); fewer shows which were wrong and why,
 * and the quiz can be taken again. Answers are kept on this device only.
 */
type Props = {record: EarnAcademy; update: (change: (current: EarnAcademy) => EarnAcademy) => void; error?: string};
function LessonPanel({lesson, record, update, error}: {lesson: Lesson} & Props) {
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]), [checked, setChecked] = useState(false);
  const state = lessonState(record, lesson.id), score = scoreQuiz(lesson, answers);
  // Opening a lesson marks it read (once).
  useEffect(() => { if (!state.read) update(r => recordLesson(r, lesson.id, {read: true})); }, [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps -- once per lesson
  const check = () => { setChecked(true); update(r => recordLesson(r, lesson.id, {score})); };
  return <div className="earn-lesson" data-lesson={lesson.id} role="region" aria-label={`Lesson: ${lesson.title}`}>
    <p className="eyebrow">About {lesson.minutes} minutes · {state.passed ? 'passed' : 'not passed yet'}</p>
    {lesson.body.map((p, i) => <p key={i}>{p}</p>)}
    <form className="earn-quiz" onSubmit={e => { e.preventDefault(); check(); }}>
      <h4>Three questions</h4>
      {lesson.quiz.map((q, qi) => <fieldset key={qi} data-question={qi} data-right={checked ? answers[qi] === q.answer || undefined : undefined} data-wrong={checked && answers[qi] !== q.answer ? '' : undefined}>
        <legend>{qi + 1}. {q.q}</legend>
        {q.options.map((o, oi) => <label key={oi}><input type="radio" name={`${lesson.id}-q${qi}`} checked={answers[qi] === oi} onChange={() => { setChecked(false); setAnswers(a => a.map((x, i) => i === qi ? oi : x)); }}/><span>{o}</span></label>)}
        {checked && <p className="fine earn-quiz-why">{answers[qi] === q.answer ? 'Right.' : 'Not quite.'} {q.why}</p>}
      </fieldset>)}
      <div className="earn-quiz-actions">
        <button type="submit" className="primary" disabled={answers.some(a => a === null)}>Check my answers</button>
        {checked && <p className="earn-quiz-score" aria-live="polite" data-score={score}><b>{score} of 3 right.</b> {score === 3 ? 'Lesson passed. While the game layer is on, a first pass earns 15 XP.' : 'Change the ones marked and check again.'}</p>}
      </div>
      {error && <p role="alert" className="fine">{error}</p>}
    </form>
  </div>;
}
export default function AcademyPath({record, update, error}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const model = useMemo(() => academyModel(record), [record]);
  const next = ACADEMY_LESSONS.find(l => !lessonState(record, l.id).passed);
  return <Path model={model} ariaLabel="Earn Academy: eight lessons" layout="snake" className="earn-academy-path"
    panelFor={open} onStep={step => setOpen(open === step.id ? null : step.id)}
    zigi={{say: next ? `Next: ${next.title}` : 'Every lesson passed!'}} jumpLabel="Jump to your next lesson"
    renderPanel={step => { const lesson = lessonOf(step.id.replace(/^lesson-/, '')); return lesson ? <LessonPanel key={lesson.id} lesson={lesson} record={record} update={update} error={error}/> : null; }}/>;
}
