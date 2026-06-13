import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GroceryList } from './GroceryList';

import type { Ingredient, Plan } from '@/domain/types';

function makeEgg(id: string, quantity: number, unitCostCents: number | null): Ingredient {
  return {
    id,
    name: 'eggs',
    quantity,
    unit: 'piece',
    category: 'dairy',
    unitCostCents,
    costIsEstimated: false,
  };
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan-1',
    userId: null,
    preferences: {
      date: '2026-06-13',
      householdSize: 2,
      budgetCapCents: 5000,
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: [],
      maxPrepMinutes: null,
      pantryItems: [],
    },
    meals: [],
    substitutions: [],
    createdAt: '2026-06-13T00:00:00.000Z',
    updatedAt: '2026-06-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('GroceryList', () => {
  it('rolls up duplicate ingredients across meals into one line', () => {
    const plan = makePlan({
      meals: [
        {
          id: 'm1',
          type: 'breakfast',
          title: 'Scramble',
          steps: ['cook'],
          prepMinutes: 5,
          locked: false,
          ingredients: [makeEgg('i1', 2, 50)],
        },
        {
          id: 'm2',
          type: 'lunch',
          title: 'Omelette',
          steps: ['cook'],
          prepMinutes: 5,
          locked: false,
          ingredients: [makeEgg('i2', 3, 50)],
        },
      ],
    });

    const html = renderToStaticMarkup(<GroceryList plan={plan} />);

    // The rolled-up label appears exactly once.
    const matches = html.match(/5 piece eggs/g) ?? [];
    expect(matches).toHaveLength(1);
    // And the per-meal quantities do NOT appear.
    expect(html).not.toContain('2 piece eggs');
    expect(html).not.toContain('3 piece eggs');
  });

  it('renders an em dash when totalCostCents is null', () => {
    const plan = makePlan({
      meals: [
        {
          id: 'm1',
          type: 'breakfast',
          title: 'Scramble',
          steps: ['cook'],
          prepMinutes: 5,
          locked: false,
          ingredients: [makeEgg('i1', 2, null)],
        },
      ],
    });

    const html = renderToStaticMarkup(<GroceryList plan={plan} />);
    expect(html).toContain('—');
    expect(html).not.toContain('$0.00');
  });

  it('shows empty state when there are no meals', () => {
    const html = renderToStaticMarkup(<GroceryList plan={makePlan()} />);
    expect(html).toContain('No items yet.');
  });
});
