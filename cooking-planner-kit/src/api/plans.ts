import type { Plan } from '@/domain/types';
import {
  deletePlanById,
  getPlanById,
  listPlans,
  savePlan,
  type PlanSummary,
} from '@/server/plans-repository';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    Array.isArray(v.meals) &&
    typeof v.preferences === 'object' &&
    v.preferences !== null
  );
}

export async function handleSavePlan(rawInput: unknown): Promise<ApiResult<Plan>> {
  if (!isPlan(rawInput)) {
    return { ok: false, error: 'Invalid plan payload.' };
  }
  try {
    const saved = await savePlan(rawInput);
    return { ok: true, data: saved };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed.' };
  }
}

export async function handleListPlans(): Promise<ApiResult<PlanSummary[]>> {
  try {
    const summaries = await listPlans();
    return { ok: true, data: summaries };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'List failed.' };
  }
}

export async function handleGetPlan(id: unknown): Promise<ApiResult<Plan | null>> {
  if (!id || typeof id !== 'string') {
    return { ok: false, error: 'Invalid id.' };
  }
  try {
    const plan = await getPlanById(id);
    return { ok: true, data: plan };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Fetch failed.' };
  }
}

export async function handleDeletePlan(id: unknown): Promise<ApiResult<{ id: string }>> {
  if (!id || typeof id !== 'string') {
    return { ok: false, error: 'Invalid id.' };
  }
  try {
    await deletePlanById(id);
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed.' };
  }
}
