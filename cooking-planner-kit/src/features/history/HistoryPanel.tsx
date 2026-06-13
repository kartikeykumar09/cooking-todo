import type { JSX } from 'react';

import {
  useDeletePlan,
  useLoadPlan,
  usePlansHistory,
} from '@/features/history/use-plans-history';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function HistoryPanel(): JSX.Element {
  const history = usePlansHistory();
  const loadPlan = useLoadPlan();
  const deletePlan = useDeletePlan();

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl text-foreground">History</h2>
        <p className="text-sm text-muted-foreground">
          Plans you've saved. Open one to swap it in as the current plan.
        </p>
      </header>

      {history.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : history.isError ? (
        <p className="text-sm text-destructive">
          {history.error instanceof Error
            ? history.error.message
            : 'Could not load saved plans. Is Supabase configured?'}
        </p>
      ) : history.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved plans yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {history.data.map((summary) => (
            <li
              key={summary.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  Plan for {summary.date}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.mealCount} meals · {summary.householdSize}{' '}
                  {summary.householdSize === 1 ? 'person' : 'people'} · saved{' '}
                  {formatTimestamp(summary.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadPlan.mutate(summary.id)}
                  disabled={loadPlan.isPending}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => deletePlan.mutate(summary.id)}
                  disabled={deletePlan.isPending}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete plan for ${summary.date}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {loadPlan.isError ? (
        <p className="text-sm text-destructive">
          {loadPlan.error instanceof Error
            ? loadPlan.error.message
            : 'Could not load plan.'}
        </p>
      ) : null}
      {deletePlan.isError ? (
        <p className="text-sm text-destructive">
          {deletePlan.error instanceof Error
            ? deletePlan.error.message
            : 'Could not delete plan.'}
        </p>
      ) : null}
    </section>
  );
}
