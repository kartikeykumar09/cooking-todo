import type { JSX } from 'react';

import type { Meal, Plan } from '@/domain/types';
import { usePlanStore } from '@/store/plan-store';

function LockIcon({ locked }: { locked: boolean }): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      {locked ? (
        <path
          d="M6 9V6.5a4 4 0 1 1 8 0V9m-9 0h10v8H5V9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M6 9V6.5a4 4 0 0 1 7.5-2M5 9h10v8H5V9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function PlanView({ plan }: { plan: Plan }): JSX.Element {
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl text-foreground">
          Plan for {plan.preferences.date}
        </h2>
        <span className="text-sm text-muted-foreground">
          {plan.preferences.householdSize}{' '}
          {plan.preferences.householdSize === 1 ? 'person' : 'people'}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plan.meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}
      </div>
    </section>
  );
}

function MealCard({ meal }: { meal: Meal }): JSX.Element {
  const toggleMealLock = usePlanStore((s) => s.toggleMealLock);

  return (
    <article className="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          {meal.type}
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{meal.prepMinutes} min</span>
          <button
            type="button"
            onClick={() => toggleMealLock(meal.id)}
            aria-pressed={meal.locked}
            aria-label={meal.locked ? `Unlock ${meal.title}` : `Lock ${meal.title}`}
            className={
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ' +
              (meal.locked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary')
            }
          >
            <LockIcon locked={meal.locked} />
            {meal.locked ? 'Locked' : 'Lock'}
          </button>
        </div>
      </div>

      <h3 className="mt-2 font-display text-lg text-foreground">{meal.title}</h3>

      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ingredients
      </h4>
      <ul className="mt-1 space-y-1 text-sm text-foreground">
        {meal.ingredients.map((ing) => (
          <li key={ing.id}>
            <span className="tabular-nums">{ing.quantity}</span>
            {ing.unit ? ` ${ing.unit}` : ''} {ing.name}
          </li>
        ))}
      </ul>

      <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Steps
      </h4>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-foreground">
        {meal.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </article>
  );
}
