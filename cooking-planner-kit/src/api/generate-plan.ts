/**
 * Serverless handler: generate a day's meal plan.
 *
 * This is the trust boundary. The Anthropic key lives here and never reaches the
 * browser. The handler stays thin: validate input, call the one function that
 * does the work, return a consistent shape. All arithmetic (pricing, totals)
 * happens in our code, not the model's.
 *
 * Pattern shown: forced tool use so Claude returns a structured object, then a
 * Zod check on the result, then prices attached from a trusted source.
 */

import { randomUUID } from 'node:crypto';

import Anthropic from '@anthropic-ai/sdk';

import {
  preferencesSchema,
  generatedPlanSchema,
  mealPlanToolInputSchema,
} from '@/domain/schemas';
import type { Plan, Meal, Ingredient, Preferences } from '@/domain/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Workhorse model for most plans; escalate to Opus for tight-constraint requests.
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const COMPLEX_MODEL = 'claude-opus-4-8';

/** Consistent error envelope so the client has one error-handling path. */
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function pickModel(prefs: Preferences): string {
  const tightBudget = prefs.budgetCapCents > 0 && prefs.budgetCapCents < 1500;
  const manyConstraints = prefs.dietaryRestrictions.length + prefs.allergies.length >= 3;
  return tightBudget || manyConstraints ? COMPLEX_MODEL : DEFAULT_MODEL;
}

function buildPrompt(prefs: Preferences): string {
  const restrictions =
    [...prefs.dietaryRestrictions, ...prefs.allergies].join(', ') || 'none';
  const cuisines = prefs.cuisinePreferences.join(', ') || 'any';
  const pantry = prefs.pantryItems.join(', ') || 'nothing specified';
  const prepCap = prefs.maxPrepMinutes
    ? `Keep each meal under ${prefs.maxPrepMinutes} minutes of prep.`
    : '';

  return [
    `Plan breakfast, lunch, and dinner for ${prefs.householdSize} people for one day.`,
    `Dietary restrictions and allergies to respect strictly: ${restrictions}.`,
    `Preferred cuisines: ${cuisines}.`,
    `Prefer recipes that use these pantry items the user already has: ${pantry}.`,
    prepCap,
    `Return ingredients with realistic quantities and a category for each.`,
    `Do not include prices — those are added separately.`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Trusted pricing. Swap this stub for a real grocery price source or a
 * maintained regional dataset (see ADR 0002). The model never sets prices.
 * Returns cents-per-unit, or null when no trusted price exists.
 */
function priceFor(_name: string): Promise<number | null> {
  // TODO: integrate pricing source. Returning null keeps the cost honest
  // (UI shows "price unknown") rather than inventing a number.
  return Promise.resolve(null);
}

export async function generatePlan(rawInput: unknown): Promise<ApiResult<Plan>> {
  const parsed = preferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid preferences.' };
  }
  const prefs = parsed.data;

  let response;
  try {
    response = await anthropic.messages.create({
      model: pickModel(prefs),
      max_tokens: 2048,
      tool_choice: { type: 'tool', name: 'emit_meal_plan' },
      tools: [
        {
          name: 'emit_meal_plan',
          description: 'Return the day’s three meals as structured data.',
          input_schema: mealPlanToolInputSchema,
        },
      ],
      messages: [{ role: 'user', content: buildPrompt(prefs) }],
    });
  } catch {
    return { ok: false, error: 'Generation service unavailable.' };
  }

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { ok: false, error: 'Model did not return a structured plan.' };
  }

  // Validate the model output against our contract before trusting it.
  const generated = generatedPlanSchema.safeParse(toolUse.input);
  if (!generated.success) {
    // In production: retry once, feeding the validation errors back to the model.
    return { ok: false, error: 'Generated plan failed validation.' };
  }

  const now = new Date().toISOString();

  const meals: Meal[] = await Promise.all(
    generated.data.meals.map(async (m): Promise<Meal> => {
      const ingredients: Ingredient[] = await Promise.all(
        m.ingredients.map(async (ing): Promise<Ingredient> => {
          const unitCostCents = await priceFor(ing.name);
          return {
            id: randomUUID(),
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
            unitCostCents,
            // Prices from the trusted source are not estimates; null = unknown.
            // Set true only when a fallback estimator is used (see ADR 0002).
            costIsEstimated: false,
          };
        }),
      );
      return {
        id: randomUUID(),
        type: m.type,
        title: m.title,
        steps: m.steps,
        prepMinutes: m.prepMinutes,
        ingredients,
        locked: false,
      };
    }),
  );

  const plan: Plan = {
    id: randomUUID(),
    userId: null,
    preferences: prefs,
    meals,
    substitutions: [],
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, data: plan };
}
