'use client';
import {useId, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHealthExtras} from './meal-names';
import {showUndo} from '../ui/undo-toast';
import {formatDate} from '../../lib/visual-format';
import {mealHeading, mealLabel} from '../../lib/health-extras';
import {MAX_WORDS_CHARS, MEAL_WORDS, MEAL_WORDS_MEALS, addMealWords, mealWordsFor, newMealWordsId, removeMealWords, wordsSchema, type MealWordsEntry, type MealWordsMeal} from '../../lib/meal-words/schema';
import './meal-words.css';

/**
 * Session AU (ADR-044 F-MEAL): a meal logged in words alone. Today's "Your first five" promises "What you ate, in your own
 * words", and every person in the rehearsal typed words first, so the Diary's "Log a meal" offers "Just describe it" before
 * the forms that need calories and a portion. The words go to their own device-only record (lib/meal-words/schema.ts),
 * never into Health's strict diary, and their calories stay unknown: no total counts them as 0. It rides HealthPlus's lazy
 * chunk (plus/health-plus.tsx) in the Health page's three places (the form, a meal's list, a meal's "+ N in words"), so
 * /app/health's first scripts barely grow.
 */
export type MealWordsProps =
  | {part: 'form'; date: string; meal: MealWordsMeal}
  | {part: 'list'; date: string; meal: MealWordsMeal}
  | {part: 'count'; date: string; meal: MealWordsMeal};
export default function MealWords(props: MealWordsProps) {
  if (props.part === 'form') return <WordsForm date={props.date} meal={props.meal}/>;
  if (props.part === 'list') return <WordsList date={props.date} meal={props.meal}/>;
  return <WordsCount date={props.date} meal={props.meal}/>;
}

function WordsForm({date, meal: initialMeal}: {date: string; meal: MealWordsMeal}) {
  const record = useDeviceRecord(MEAL_WORDS), {extras} = useHealthExtras(), id = useId();
  const [words, setWords] = useState(''), [chosen, setChosen] = useState<MealWordsMeal | null>(null);
  const [said, setSaid] = useState<{error: boolean; text: string} | null>(null);
  const meal = chosen ?? initialMeal;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const checked = wordsSchema.safeParse(words);
    if (!checked.success) { setSaid({error: true, text: words.trim() ? `Keep it to ${MAX_WORDS_CHARS} characters on one line.` : 'Write what you ate, in a few words.'}); return; }
    const entry: MealWordsEntry = {id: newMealWordsId(), date, meal, words: checked.data, at: new Date().toISOString()};
    try { record.update(current => addMealWords(current, entry)); }
    catch { setSaid({error: true, text: 'This device did not save it. Nothing was logged; try again.'}); return; }
    setWords('');
    setSaid({error: false, text: `Logged in words for ${mealLabel(extras, meal)}, ${formatDate(date)}: “${entry.words}”. Calories unknown.`});
  };
  return <form className="health-form meal-words-form" aria-label="Just describe it" onSubmit={submit} noValidate>
    <h3 className="meal-words-title">Just describe it</h3>
    <div className="meal-words-grid">
      <label className="field" htmlFor={`${id}-words`}><span>What did you eat?</span><input id={`${id}-words`} type="text" autoComplete="off" enterKeyHint="done" maxLength={MAX_WORDS_CHARS} placeholder="Porridge with a banana" value={words} aria-invalid={said?.error || undefined} aria-describedby={said?.error ? `${id}-said` : undefined} onChange={e => { setWords(e.target.value); if (said?.error) setSaid(null); }}/></label>
      <label className="field" htmlFor={`${id}-meal`}><span>Meal</span><select id={`${id}-meal`} value={meal} onChange={e => setChosen(e.target.value as MealWordsMeal)}>{MEAL_WORDS_MEALS.map(m => <option key={m} value={m}>{mealHeading(extras, m)}</option>)}</select></label>
    </div>
    <button className="primary" type="submit">Log in words</button>
    <p className="fine">Calories stay unknown, never zero. Add numbers any time with the full form below.</p>
    {said?.error && <p id={`${id}-said`} className="field-error" role="alert">{said.text}</p>}
    <p className="fine meal-words-said" role="status">{said && !said.error ? said.text : ''}</p>
  </form>;
}

function WordsList({date, meal}: {date: string; meal: MealWordsMeal}) {
  const record = useDeviceRecord(MEAL_WORDS);
  const entries = mealWordsFor(record.data, date, meal);
  if (!entries.length) return null;
  const remove = (entry: MealWordsEntry) => {
    try { record.update(current => removeMealWords(current, entry.id)); } catch { return; }
    showUndo({message: `Removed “${entry.words}”.`, restore: () => record.update(current => addMealWords(current, entry)), undone: 'Put back.'});
  };
  return <ul className="meal-words-list" aria-label={`${meal} in words`}>
    {entries.map(entry => <li className="health-entry meal-words-entry" key={entry.id}>
      <div className="health-entry-main"><strong>{entry.words}</strong><small>In words · calories unknown</small></div>
      <button type="button" className="quiet meal-words-remove" aria-label={`Remove ${entry.words}`} onClick={() => remove(entry)}>Remove</button>
    </li>)}
  </ul>;
}

function WordsCount({date, meal}: {date: string; meal: MealWordsMeal}) {
  const record = useDeviceRecord(MEAL_WORDS);
  const n = mealWordsFor(record.data, date, meal).length;
  return n ? <small className="meal-words-count"> + {n} in words</small> : null;
}
