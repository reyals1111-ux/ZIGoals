'use client';
import {useId, useState} from 'react';
import type {ModelInfo} from '../../lib/ai/types';

/** A model list the person searches and picks from (ADR-012): never a hard-coded "best", only what the provider lists. */
export function ModelPicker({models, value, onChange, label = 'Model'}: {models: readonly ModelInfo[]; value: string | null; onChange: (id: string) => void; label?: string}) {
  const [query, setQuery] = useState(''), id = useId();
  const shown = models.filter(m => !query.trim() || m.id.toLowerCase().includes(query.trim().toLowerCase()) || m.label.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="ai-model-picker">
    {models.length > 8 && <label className="field" htmlFor={`${id}-q`}>Search models<input id={`${id}-q`} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type part of a name" autoComplete="off"/></label>}
    <p className="ai-note" aria-live="polite">{models.length === 0 ? 'No chat models were listed.' : `${shown.length} of ${models.length} chat model${models.length === 1 ? '' : 's'}${value ? ` · chosen: ${value}` : ' · choose one'}`}</p>
    <ul className="ai-model-options" role="listbox" aria-label={label}>
      {shown.slice(0, 300).map(m => <li key={m.id}><button type="button" role="option" aria-selected={m.id === value} onClick={() => onChange(m.id)}><strong>{m.label}</strong>{m.label !== m.id && <small>{m.id}</small>}</button></li>)}
    </ul>
  </div>;
}
