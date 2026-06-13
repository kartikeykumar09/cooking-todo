import { create } from 'zustand';

import type { Plan } from '@/domain/types';

interface PlanState {
  plan: Plan | null;
  setPlan: (plan: Plan | null) => void;
  toggleMealLock: (mealId: string) => void;
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  toggleMealLock: (mealId) =>
    set((state) => {
      if (!state.plan) return state;
      const meals = state.plan.meals.map((meal) =>
        meal.id === mealId ? { ...meal, locked: !meal.locked } : meal,
      );
      return { plan: { ...state.plan, meals } };
    }),
}));
