import { PlanView } from '@/features/plan/PlanView';
import { useGeneratePlan } from '@/features/plan/use-generate-plan';
import { PreferencesForm } from '@/features/preferences/PreferencesForm';
import { usePlanStore } from '@/store/plan-store';

export function App() {
  const plan = usePlanStore((s) => s.plan);
  const setPlan = usePlanStore((s) => s.setPlan);
  const generate = useGeneratePlan();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Cooking Planner
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          One day, three meals, your constraints.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem),1fr]">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Preferences
          </h2>
          <PreferencesForm
            disabled={generate.isPending}
            onSubmit={(prefs) => generate.mutate(prefs)}
          />
          {generate.isError ? (
            <p className="mt-3 text-sm text-rose-700">
              {generate.error instanceof Error
                ? generate.error.message
                : 'Generation failed.'}
            </p>
          ) : null}
        </section>

        <section>
          {generate.isPending ? (
            <p className="text-sm text-slate-500">Planning your day…</p>
          ) : plan ? (
            <>
              <PlanView plan={plan} />
              <button
                type="button"
                onClick={() => setPlan(null)}
                className="mt-4 text-sm text-slate-500 underline-offset-2 hover:underline"
              >
                Clear plan
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Fill in your preferences and generate a plan.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
