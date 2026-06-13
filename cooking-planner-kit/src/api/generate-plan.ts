/**
 * Server-side handler: generate a day's meal plan via Gemini structured output.
 *
 * The trust boundary. The API key lives here and never reaches the browser.
 * Input is validated with Zod; the model's response is validated again before
 * we trust it. All arithmetic (pricing, totals) happens in our code.
 */

import { randomUUID } from 'node:crypto';

import {
  preferencesSchema,
  generatedPlanSchema,
  mealPlanToolInputSchema,
} from '@/domain/schemas';
import type { Plan, Meal, Ingredient, Preferences } from '@/domain/types';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

function buildPrompt(prefs: Preferences): string {
  const restrictions =
    [...prefs.dietaryRestrictions, ...prefs.allergies].join(', ') || 'none';
  const cuisines = prefs.cuisinePreferences.join(', ') || 'any';
  const pantry = prefs.pantryItems.join(', ') || 'nothing specified';
  const prepCap = prefs.maxPrepMinutes
    ? `Keep each meal under ${prefs.maxPrepMinutes} minutes of prep.`
    : '';

  return [
    `Plan breakfast, lunch, and dinner for ${prefs.householdSize} people for one day (${prefs.date}).`,
    `Dietary restrictions and allergies to respect strictly: ${restrictions}.`,
    `Preferred cuisines: ${cuisines}.`,
    `Prefer recipes that use these pantry items the user already has: ${pantry}.`,
    prepCap,
    `Return ingredients with realistic quantities and a category for each.`,
    `Do not include prices — those are added separately.`,
    `Return exactly three meals: one breakfast, one lunch, one dinner.`,
  ]
    .filter(Boolean)
    .join(' ');
}

// Gemini's responseSchema dialect doesn't accept nullable enums the way JSON
// Schema does, so we translate the tool input schema into Gemini's shape.
const geminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    meals: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['breakfast', 'lunch', 'dinner'] },
          title: { type: 'STRING' },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          prepMinutes: { type: 'INTEGER' },
          ingredients: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                quantity: { type: 'NUMBER' },
                unit: {
                  type: 'STRING',
                  nullable: true,
                  enum: ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece', 'pinch'],
                },
                category: {
                  type: 'STRING',
                  enum: [
                    'produce',
                    'dairy',
                    'meat',
                    'pantry',
                    'frozen',
                    'bakery',
                    'beverages',
                    'other',
                  ],
                },
              },
              required: ['name', 'quantity', 'category'],
            },
          },
        },
        required: ['type', 'title', 'steps', 'prepMinutes', 'ingredients'],
      },
    },
  },
  required: ['meals'],
};

// Touch the imported tool schema so the Anthropic-shaped contract stays under
// the type checker even while the active generator is Gemini.
void mealPlanToolInputSchema;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Generation service not configured.' };
  }

  let raw: string;
  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(prefs) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
        },
      }),
    });
    if (!response.ok) {
      return { ok: false, error: 'Generation service error.' };
    }
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: 'Model returned no structured plan.' };
    }
    raw = text;
  } catch {
    return { ok: false, error: 'Generation service unavailable.' };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Generated plan was not valid JSON.' };
  }

  const generated = generatedPlanSchema.safeParse(candidate);
  if (!generated.success) {
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
