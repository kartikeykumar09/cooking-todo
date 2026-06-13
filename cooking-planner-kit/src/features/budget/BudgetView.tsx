import type { JSX } from 'react';

import { deriveBudget, mostExpensiveLines } from '@/domain/derive';
import type { Plan } from '@/domain/types';

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

export function BudgetView({ plan }: { plan: Plan }): JSX.Element {
  if (plan.meals.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-foreground">Budget</h2>
        <p className="text-muted-foreground">Generate a plan to see your budget.</p>
      </section>
    );
  }

  const budget = deriveBudget(plan);
  const topLines = mostExpensiveLines(plan, 3);

  const fillRatio =
    budget.capCents > 0 ? Math.min(1, budget.totalCents / budget.capCents) : 0;
  const fillPercent = `${(fillRatio * 100).toFixed(1)}%`;

  return (
    <section className="space-y-6">
      <h2 className="font-display text-2xl text-foreground">Budget</h2>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Cap</dt>
            <dd className="font-display text-lg text-foreground">
              {formatCents(budget.capCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-display text-lg text-foreground">
              {formatCents(budget.totalCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd
              className={`font-display text-lg ${
                budget.isOverBudget ? 'text-destructive' : 'text-accent'
              }`}
            >
              {formatCents(budget.remainingCents)}
            </dd>
          </div>
        </dl>

        <div
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={budget.capCents}
          aria-valuenow={budget.totalCents}
        >
          <div
            className={`h-full ${budget.isOverBudget ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: fillPercent }}
          />
        </div>

        {budget.isOverBudget ? (
          <p className="mt-2 text-sm text-destructive">Over budget</p>
        ) : null}

        {budget.hasEstimates ? (
          <p className="mt-2 text-xs text-muted-foreground">Includes estimated prices.</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="font-display text-base text-foreground">By meal</h3>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {budget.byMeal.map((row) => (
              <li key={row.mealId} className="flex justify-between">
                <span>{row.title}</span>
                <span className="text-muted-foreground">
                  {formatCents(row.costCents)}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="font-display text-base text-foreground">By category</h3>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {budget.byCategory.map((row) => (
              <li key={row.category} className="flex justify-between capitalize">
                <span>{row.category}</span>
                <span className="text-muted-foreground">
                  {formatCents(row.costCents)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {topLines.length > 0 ? (
        <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="font-display text-base text-foreground">Top cost drivers</h3>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {topLines.map((line) => (
              <li
                key={`${line.name}-${line.unit ?? 'count'}`}
                className="flex justify-between"
              >
                <span>{line.name}</span>
                <span className="text-muted-foreground">
                  {formatCents(line.totalCostCents ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
