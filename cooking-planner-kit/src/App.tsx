import { useMemo, useState, type JSX } from 'react';

import { BudgetView } from '@/features/budget/BudgetView';
import { GroceryList } from '@/features/grocery/GroceryList';
import { HistoryPanel } from '@/features/history/HistoryPanel';
import { useSavePlan } from '@/features/history/use-plans-history';
import { PlanView } from '@/features/plan/PlanView';
import { useGeneratePlan } from '@/features/plan/use-generate-plan';
import { PreferencesForm } from '@/features/preferences/PreferencesForm';
import { SubstitutionsPanel } from '@/features/substitutions/SubstitutionsPanel';
import { usePlanStore } from '@/store/plan-store';

type TabId = 'plan' | 'grocery' | 'budget' | 'substitutions' | 'history';

interface Tab {
  id: TabId;
  label: string;
  /** True if the tab needs a plan to render anything useful. */
  needsPlan: boolean;
}

const TABS: Tab[] = [
  { id: 'plan', label: 'Plan', needsPlan: true },
  { id: 'grocery', label: 'Grocery', needsPlan: true },
  { id: 'budget', label: 'Budget', needsPlan: true },
  { id: 'substitutions', label: 'Substitutions', needsPlan: true },
  { id: 'history', label: 'History', needsPlan: false },
];

export function App(): JSX.Element {
  const plan = usePlanStore((s) => s.plan);
  const setPlan = usePlanStore((s) => s.setPlan);
  const generate = useGeneratePlan();
  const savePlan = useSavePlan();
  const [activeTab, setActiveTab] = useState<TabId>('plan');

  const visibleTabs = useMemo(
    () => (plan ? TABS : TABS.filter((tab) => !tab.needsPlan)),
    [plan],
  );

  // If the active tab requires a plan and we lost the plan, drop back to history.
  const effectiveTab: TabId = visibleTabs.some((t) => t.id === activeTab)
    ? activeTab
    : 'history';

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">
            Cooking Planner
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground sm:text-base">
            One day. Three meals. Your constraints, your budget, your pantry.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem),1fr]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Preferences
              </h2>
              <PreferencesForm
                disabled={generate.isPending}
                onSubmit={(prefs) => generate.mutate(prefs)}
              />
              {generate.isError ? (
                <p className="mt-3 text-sm text-destructive">
                  {generate.error instanceof Error
                    ? generate.error.message
                    : 'Generation failed.'}
                </p>
              ) : null}
            </section>

            {plan ? (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current plan
                </h2>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => savePlan.mutate(plan)}
                    disabled={savePlan.isPending}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savePlan.isPending ? 'Saving…' : 'Save plan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan(null)}
                    className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                {savePlan.isSuccess ? (
                  <p className="mt-2 text-xs text-accent">Saved to history.</p>
                ) : null}
                {savePlan.isError ? (
                  <p className="mt-2 text-xs text-destructive">
                    {savePlan.error instanceof Error
                      ? savePlan.error.message
                      : 'Save failed.'}
                  </p>
                ) : null}
              </section>
            ) : null}
          </aside>

          <section>
            {generate.isPending ? (
              <PlanSkeleton />
            ) : (
              <>
                <nav
                  role="tablist"
                  aria-label="Plan views"
                  className="mb-6 flex flex-wrap gap-1 border-b border-border"
                >
                  {visibleTabs.map((tab) => {
                    const isActive = tab.id === effectiveTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveTab(tab.id)}
                        className={
                          'rounded-t-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ' +
                          (isActive
                            ? 'border-b-2 border-primary text-primary'
                            : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground')
                        }
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>

                {plan ? (
                  <ActivePanel tab={effectiveTab} plan={plan} />
                ) : effectiveTab === 'history' ? (
                  <HistoryPanel />
                ) : (
                  <EmptyState />
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ActivePanel({
  tab,
  plan,
}: {
  tab: TabId;
  plan: NonNullable<ReturnType<typeof usePlanStore.getState>['plan']>;
}): JSX.Element {
  switch (tab) {
    case 'plan':
      return <PlanView plan={plan} />;
    case 'grocery':
      return <GroceryList plan={plan} />;
    case 'budget':
      return <BudgetView plan={plan} />;
    case 'substitutions':
      return <SubstitutionsPanel plan={plan} />;
    case 'history':
      return <HistoryPanel />;
  }
}

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <h3 className="font-display text-xl text-foreground">No plan yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Fill in your preferences on the left, then generate a plan to see meals,
        groceries, budget, and substitutions.
      </p>
    </div>
  );
}

function PlanSkeleton(): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Generating your plan"
      className="space-y-4"
    >
      <div className="h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
