import { create } from 'zustand';

import type { Plan } from '@/domain/types';

interface PlanState {
  plan: Plan | null;
  setPlan: (plan: Plan | null) => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
}));
