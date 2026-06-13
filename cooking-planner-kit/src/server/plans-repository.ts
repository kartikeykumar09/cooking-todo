import type { Plan } from '@/domain/types';
import { getSupabase } from '@/server/supabase';

const TABLE = 'plans';

export interface PlanSummary {
  id: string;
  date: string;
  householdSize: number;
  mealCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlanRow {
  id: string;
  user_id: string | null;
  data: Plan;
  created_at: string;
  updated_at: string;
}

function toSummary(
  row: Pick<PlanRow, 'id' | 'data' | 'created_at' | 'updated_at'>,
): PlanSummary {
  return {
    id: row.id,
    date: row.data.preferences.date,
    householdSize: row.data.preferences.householdSize,
    mealCount: row.data.meals.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function savePlan(plan: Plan): Promise<Plan> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const row = {
    id: plan.id,
    user_id: plan.userId,
    data: { ...plan, updatedAt: now },
    created_at: plan.createdAt,
    updated_at: now,
  };
  const { error } = await supabase.from(TABLE).upsert(row);
  if (error) throw new Error(error.message);
  return row.data;
}

export async function listPlans(limit = 50): Promise<PlanSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Pick<
    PlanRow,
    'id' | 'data' | 'created_at' | 'updated_at'
  >[];
  return rows.map(toSummary);
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data.data as Plan;
}

export async function deletePlanById(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
