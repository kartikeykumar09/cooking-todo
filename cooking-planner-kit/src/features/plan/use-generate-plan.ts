import { useMutation } from '@tanstack/react-query';

import type { PreferencesInput } from '@/domain/schemas';
import type { Plan } from '@/domain/types';
import { usePlanStore } from '@/store/plan-store';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function postGeneratePlan(prefs: PreferencesInput): Promise<Plan> {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
  const json = (await res.json()) as ApiResult<Plan>;
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export function useGeneratePlan() {
  const setPlan = usePlanStore((s) => s.setPlan);
  return useMutation({
    mutationFn: postGeneratePlan,
    onSuccess: (plan) => setPlan(plan),
  });
}
