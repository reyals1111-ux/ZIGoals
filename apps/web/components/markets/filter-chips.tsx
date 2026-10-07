/** One row of pressed/unpressed choices (Session W Part 16: Markets' views and layout, Portfolio's chart ranges). */
export function FilterChips<T extends string>({label, options, value, onChange, className = 'picker-tabs'}: {label: string; options: readonly {value: T; label: string}[]; value: T; onChange: (value: T) => void; className?: string}) {
  return <div className={className} role="group" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
