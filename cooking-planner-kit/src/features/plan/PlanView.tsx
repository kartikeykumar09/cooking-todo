import type { Meal, Plan } from '@/domain/types';

export function PlanView({ plan }: { plan: Plan }) {
  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Plan for {plan.preferences.date}
        </h2>
        <span className="text-sm text-slate-500">
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

function MealCard({ meal }: { meal: Meal }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
          {meal.type}
        </span>
        <span className="text-xs text-slate-500">{meal.prepMinutes} min</span>
      </div>
      <h3 className="mt-1 text-base font-semibold text-slate-900">{meal.title}</h3>

      <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ingredients
      </h4>
      <ul className="mt-1 space-y-1 text-sm text-slate-700">
        {meal.ingredients.map((ing) => (
          <li key={ing.id}>
            {ing.quantity}
            {ing.unit ? ` ${ing.unit}` : ''} {ing.name}
          </li>
        ))}
      </ul>

      <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Steps
      </h4>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        {meal.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </article>
  );
}
