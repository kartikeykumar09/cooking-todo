import { useState } from 'react';

import type { DietaryRestriction, Preferences } from '@/domain/types';

const DIETARY_OPTIONS: DietaryRestriction[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'pescatarian',
];

interface Props {
  onSubmit: (prefs: Preferences) => void;
  disabled?: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function splitCSV(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function PreferencesForm({ onSubmit, disabled = false }: Props) {
  const [date, setDate] = useState<string>(todayISO());
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [budgetCapDollars, setBudgetCapDollars] = useState<number>(30);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>(
    [],
  );
  const [allergies, setAllergies] = useState<string>('');
  const [cuisinePreferences, setCuisinePreferences] = useState<string>('');
  const [maxPrepMinutes, setMaxPrepMinutes] = useState<string>('');
  const [pantryItems, setPantryItems] = useState<string>('');

  function toggleDiet(option: DietaryRestriction) {
    setDietaryRestrictions((prev) =>
      prev.includes(option) ? prev.filter((d) => d !== option) : [...prev, option],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const prepNum = maxPrepMinutes.trim() === '' ? null : Number(maxPrepMinutes);
    onSubmit({
      date,
      householdSize,
      budgetCapCents: Math.round(budgetCapDollars * 100),
      dietaryRestrictions,
      allergies: splitCSV(allergies),
      cuisinePreferences: splitCSV(cuisinePreferences),
      maxPrepMinutes: prepNum && prepNum > 0 ? prepNum : null,
      pantryItems: splitCSV(pantryItems),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Household size">
          <input
            type="number"
            min={1}
            max={20}
            value={householdSize}
            onChange={(e) => setHouseholdSize(Number(e.target.value))}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Budget cap (USD)">
          <input
            type="number"
            min={0}
            step={0.5}
            value={budgetCapDollars}
            onChange={(e) => setBudgetCapDollars(Number(e.target.value))}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Max prep minutes (optional)">
          <input
            type="number"
            min={1}
            value={maxPrepMinutes}
            placeholder="any"
            onChange={(e) => setMaxPrepMinutes(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Dietary restrictions">
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => {
            const active = dietaryRestrictions.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleDiet(opt)}
                className={
                  'rounded-full border px-3 py-1 text-sm transition ' +
                  (active
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-surface text-foreground hover:border-primary/50')
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Allergies (comma-separated)" hint="e.g. peanuts, shellfish">
        <input
          type="text"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Cuisine preferences (comma-separated)"
        hint="e.g. italian, thai, mexican"
      >
        <input
          type="text"
          value={cuisinePreferences}
          onChange={(e) => setCuisinePreferences(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Pantry items already on hand (comma-separated)"
        hint="planner will prefer these to reduce shopping"
      >
        <input
          type="text"
          value={pantryItems}
          onChange={(e) => setPantryItems(e.target.value)}
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {disabled ? 'Generating…' : 'Generate plan'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}
