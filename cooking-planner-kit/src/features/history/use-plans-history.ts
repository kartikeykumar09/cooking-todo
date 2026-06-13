import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Plan } from '@/domain/types';
import type { PlanSummary } from '@/server/plans-repository';
import { usePlanStore } from '@/store/plan-store';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const HISTORY_KEY = ['plans', 'history'] as const;

async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResult<T>;
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

export function usePlansHistory() {
  return useQuery<PlanSummary[]>({
    queryKey: HISTORY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/plans/list');
      return unwrap<PlanSummary[]>(res);
    },
  });
}

export function useSavePlan() {
  const queryClient = useQueryClient();
  const setPlan = usePlanStore((s) => s.setPlan);
  return useMutation<Plan, Error, Plan>({
    mutationFn: async (plan) => {
      const res = await fetch('/api/plans/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      return unwrap<Plan>(res);
    },
    onSuccess: (saved) => {
      setPlan(saved);
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

export function useLoadPlan() {
  const setPlan = usePlanStore((s) => s.setPlan);
  return useMutation<Plan, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/plans/get?id=${encodeURIComponent(id)}`);
      const plan = await unwrap<Plan | null>(res);
      if (!plan) throw new Error('Plan not found.');
      return plan;
    },
    onSuccess: (plan) => setPlan(plan),
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch('/api/plans/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return unwrap<{ id: string }>(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}
