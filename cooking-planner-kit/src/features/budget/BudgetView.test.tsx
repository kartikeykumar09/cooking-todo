import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BudgetView } from './BudgetView';

import type { Ingredient, Meal, Plan } from '@/domain/types';

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    name: 'Tomato',
    quantity: 1,
    unit: 'piece',
    category: 'produce',
    unitCostCents: 500,
    costIsEstimated: false,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'meal-1',
    type: 'lunch',
    title: 'Tomato Toast',
    steps: ['Toast bread', 'Slice tomato'],
    prepMinutes: 10,
    ingredients: [makeIngredient()],
    locked: false,
    ...overrides,
  };
}

function makePlan(capCents: number, meals: Meal[]): Plan {
  return {
    id: 'plan-1',
    userId: null,
    preferences: {
      date: '2026-06-13',
      householdSize: 1,
      budgetCapCents: capCents,
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: [],
      maxPrepMinutes: null,
      pantryItems: [],
    },
    meals,
    substitutions: [],
    createdAt: '2026-06-13T00:00:00Z',
    updatedAt: '2026-06-13T00:00:00Z',
  };
}

describe('BudgetView', () => {
  it('shows remaining = cap - total when within budget', () => {
    const plan = makePlan(2000, [makeMeal()]);
    const html = renderToStaticMarkup(<BudgetView plan={plan} />);

    // Cost is 500 cents = $5.00, remaining 1500 = $15.00.
    expect(html).toContain('$15.00');
    expect(html).toContain('$5.00');
    expect(html).toContain('$20.00');
    expect(html).not.toContain('Over budget');
  });

  it('indicates over budget when total exceeds cap', () => {
    const plan = makePlan(300, [
      makeMeal({ ingredients: [makeIngredient({ unitCostCents: 1000 })] }),
    ]);
    const html = renderToStaticMarkup(<BudgetView plan={plan} />);

    expect(html.toLowerCase()).toContain('over budget');
  });
});
