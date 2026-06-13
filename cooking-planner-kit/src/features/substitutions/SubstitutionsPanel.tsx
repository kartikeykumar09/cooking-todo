import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';

import type { Plan, Substitution, SubstitutionReason } from '@/domain/types';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function postSuggestSubstitutions(plan: Plan): Promise<Substitution[]> {
  const res = await fetch('/api/suggest-substitutions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const json = (await res.json()) as ApiResult<Substitution[]>;
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

const REASON_LABEL: Record<SubstitutionReason, string> = {
  allergy: 'allergy',
  cost: 'cost',
  availability: 'availability',
  preference: 'preference',
};

const REASON_CHIP: Record<SubstitutionReason, string> = {
  // Terracotta for allergy (serious), accent green for cost (positive),
  // muted for availability (informational), surface-tone for preference.
  allergy: 'bg-primary text-primary-foreground',
  cost: 'bg-accent text-accent-foreground',
  availability: 'bg-muted text-muted-foreground',
  preference: 'bg-surface text-foreground border border-border',
};

function ArrowIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-muted-foreground"
    >
      <path
        d="M4 10h12m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path
        d="M10 3v3m0 8v3m7-7h-3M6 10H3m11.5-4.5-2 2m-5 5-2 2m9 0-2-2m-5-5-2-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SubstitutionsPanel({ plan }: { plan: Plan }): JSX.Element {
  const mutation = useMutation<Substitution[], Error, Plan>({
    mutationFn: postSuggestSubstitutions,
  });

  const disabled = !plan || mutation.isPending;
  const ingredientNameById = new Map<string, string>();
  for (const meal of plan.meals) {
    for (const ing of meal.ingredients) {
      ingredientNameById.set(ing.id, ing.name);
    }
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl text-foreground">Substitutions</h2>
        <p className="text-sm text-muted-foreground">
          Swap ingredients to save money, dodge an allergen, or use what your store
          actually stocks.
        </p>
      </header>

      <button
        type="button"
        onClick={() => mutation.mutate(plan)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SparkleIcon />
        Find substitutions
      </button>

      {mutation.isPending ? (
        <p className="text-sm text-muted-foreground">Looking for swaps…</p>
      ) : null}

      {mutation.isError ? (
        <p className="text-sm text-rose-700">
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Substitution lookup failed.'}
        </p>
      ) : null}

      {mutation.isSuccess ? (
        mutation.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No useful swaps found.</p>
        ) : (
          <ul className="space-y-3">
            {mutation.data.map((sub) => (
              <SubstitutionCard
                key={sub.id}
                substitution={sub}
                originalName={
                  ingredientNameById.get(sub.ingredientId) ?? 'Unknown ingredient'
                }
              />
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}

function SubstitutionCard({
  substitution,
  originalName,
}: {
  substitution: Substitution;
  originalName: string;
}): JSX.Element {
  const { replacementName, reason, costDeltaCents, note } = substitution;

  let costClass: string;
  let costLabel: string;
  if (costDeltaCents < 0) {
    costClass = 'text-accent';
    costLabel = `saves ${formatCents(costDeltaCents)}`;
  } else if (costDeltaCents > 0) {
    costClass = 'text-primary';
    costLabel = `adds ${formatCents(costDeltaCents)}`;
  } else {
    costClass = 'text-muted-foreground';
    costLabel = 'no change';
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{originalName}</span>
        <ArrowIcon />
        <span className="font-medium text-foreground">{replacementName}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${REASON_CHIP[reason]}`}
        >
          {REASON_LABEL[reason]}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className={`text-sm font-medium ${costClass}`}>{costLabel}</span>
      </div>
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
    </li>
  );
}
