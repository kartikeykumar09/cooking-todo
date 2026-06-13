/**
 * Deterministic derivations.
 *
 * The grocery list and budget are pure functions of a `Plan`. No model call, no
 * stored state, no arithmetic done by the LLM. Accepting a substitution mutates
 * one ingredient and these recompute — that is the whole architecture in code.
 *
 * Keep every number here in integer cents.
 */

import type {
  Plan,
  Meal,
  Ingredient,
  GroceryList,
  GroceryLineItem,
  BudgetBreakdown,
  IngredientCategory,
} from './types';

/** A line rolls up ingredients that share the same name and unit. */
function rollupKey(ingredient: Ingredient): string {
  return `${ingredient.name.trim().toLowerCase()}::${ingredient.unit ?? 'count'}`;
}

function lineCost(ingredient: Ingredient): number | null {
  if (ingredient.unitCostCents === null) return null;
  return Math.round(ingredient.unitCostCents * ingredient.quantity);
}

/**
 * Aggregate every ingredient across every meal into a deduplicated,
 * categorized shopping list. "2 eggs" + "3 eggs" becomes "5 eggs".
 */
export function deriveGroceryList(plan: Plan): GroceryList {
  const lines = new Map<string, GroceryLineItem>();

  for (const meal of plan.meals) {
    for (const ingredient of meal.ingredients) {
      const key = rollupKey(ingredient);
      const existing = lines.get(key);
      const addedCost = lineCost(ingredient);

      if (existing) {
        existing.quantity += ingredient.quantity;
        existing.ingredientIds.push(ingredient.id);
        existing.costIsEstimated ||= ingredient.costIsEstimated;
        // A line cost is known only if every contributing ingredient is priced.
        existing.totalCostCents =
          existing.totalCostCents === null || addedCost === null
            ? null
            : existing.totalCostCents + addedCost;
      } else {
        lines.set(key, {
          name: ingredient.name,
          category: ingredient.category,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          totalCostCents: addedCost,
          costIsEstimated: ingredient.costIsEstimated,
          ingredientIds: [ingredient.id],
        });
      }
    }
  }

  const items = [...lines.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );

  const byCategory: GroceryList['byCategory'] = {};
  for (const item of items) {
    (byCategory[item.category] ??= []).push(item);
  }

  return { items, byCategory };
}

function mealCost(meal: Meal): number {
  return meal.ingredients.reduce((sum, ing) => sum + (lineCost(ing) ?? 0), 0);
}

/**
 * Budget is SUM(quantity * unitCost) over the plan, compared to the cap.
 * Substitution savings are already baked in because they mutate the
 * underlying ingredients before this runs.
 */
export function deriveBudget(plan: Plan): BudgetBreakdown {
  const list = deriveGroceryList(plan);

  const totalCents = list.items.reduce(
    (sum, line) => sum + (line.totalCostCents ?? 0),
    0,
  );
  const hasEstimates = list.items.some((line) => line.costIsEstimated);

  const byMeal = plan.meals.map((meal) => ({
    mealId: meal.id,
    title: meal.title,
    costCents: mealCost(meal),
  }));

  const categoryTotals = new Map<IngredientCategory, number>();
  for (const line of list.items) {
    categoryTotals.set(
      line.category,
      (categoryTotals.get(line.category) ?? 0) + (line.totalCostCents ?? 0),
    );
  }
  const byCategory = [...categoryTotals.entries()].map(([category, costCents]) => ({
    category,
    costCents,
  }));

  return {
    capCents: plan.preferences.budgetCapCents,
    totalCents,
    remainingCents: plan.preferences.budgetCapCents - totalCents,
    isOverBudget: totalCents > plan.preferences.budgetCapCents,
    hasEstimates,
    byMeal,
    byCategory,
  };
}

/** The highest-cost lines, for "trim the budget" suggestions in the UI. */
export function mostExpensiveLines(plan: Plan, n = 3): GroceryLineItem[] {
  return [...deriveGroceryList(plan).items]
    .filter((line) => line.totalCostCents !== null)
    .sort((a, b) => (b.totalCostCents ?? 0) - (a.totalCostCents ?? 0))
    .slice(0, n);
}
