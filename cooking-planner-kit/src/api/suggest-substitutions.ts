/**
 * Server-side handler: propose ingredient substitutions via Gemini structured
 * output.
 *
 * Mirrors `generate-plan.ts`: the API key stays here, Zod validates the model
 * output, and our code does the (small amount of) arithmetic. The model
 * proposes alternates; we map them onto our domain `Substitution` shape by
 * resolving ingredient IDs in our own data.
 */

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { generatedSubstitutionsSchema } from '@/domain/schemas';
import type { Plan, Substitution } from '@/domain/types';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const inputIngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const inputMealSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  ingredients: z.array(inputIngredientSchema).min(1),
});

const inputPlanShapeSchema = z.object({
  plan: z.object({
    preferences: z.object({
      householdSize: z.number().int().min(1),
      budgetCapCents: z.number().int().min(0),
      dietaryRestrictions: z.array(z.string()).default([]),
      allergies: z.array(z.string()).default([]),
    }),
    meals: z.array(inputMealSchema).min(1),
  }),
});

function buildPrompt(plan: Plan): string {
  const restrictions =
    [...plan.preferences.dietaryRestrictions, ...plan.preferences.allergies].join(
      ', ',
    ) || 'none';
  const ingredientLines = plan.meals
    .flatMap((m) =>
      m.ingredients.map((ing) => `- ${ing.name} (used in ${m.title})`),
    )
    .join('\n');

  return [
    `Suggest ingredient substitutions for a meal plan serving ${plan.preferences.householdSize} people.`,
    `Total budget cap is ${plan.preferences.budgetCapCents} cents.`,
    `Dietary restrictions and allergies to respect strictly: ${restrictions}.`,
    `Only propose substitutions that genuinely save money, address an allergy or restriction, improve availability at a typical grocery store, or match a stated preference.`,
    `For each suggestion, set "ingredientName" to the EXACT original ingredient name as listed below.`,
    `Estimate the cost delta in integer cents for the full quantity used in the plan. Negative means the swap saves money.`,
    `Skip any ingredient where no helpful swap exists. Return an empty array if nothing is worth swapping.`,
    `Ingredients in the plan:\n${ingredientLines}`,
  ].join(' ');
}

const geminiResponseSchema = {
  type: 'OBJECT',
  properties: {
    substitutions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ingredientName: { type: 'STRING' },
          replacementName: { type: 'STRING' },
          reason: {
            type: 'STRING',
            enum: ['allergy', 'cost', 'availability', 'preference'],
          },
          estimatedCostDeltaCents: { type: 'INTEGER' },
          note: { type: 'STRING', nullable: true },
        },
        required: [
          'ingredientName',
          'replacementName',
          'reason',
          'estimatedCostDeltaCents',
        ],
      },
    },
  },
  required: ['substitutions'],
};

export async function suggestSubstitutions(
  rawInput: unknown,
): Promise<ApiResult<Substitution[]>> {
  const parsed = inputPlanShapeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid plan.' };
  }
  // The validated subset shares the same field shapes as Plan for the fields
  // we need; cast at this single boundary rather than duplicating the full
  // Plan schema (which lives in domain/types.ts as the source of truth).
  const plan = (rawInput as { plan: Plan }).plan;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Substitution service not configured.' };
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
        contents: [{ parts: [{ text: buildPrompt(plan) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
        },
      }),
    });
    if (!response.ok) {
      return { ok: false, error: 'Substitution service error.' };
    }
    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: 'Model returned no substitutions.' };
    }
    raw = text;
  } catch {
    return { ok: false, error: 'Substitution service unavailable.' };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Substitutions response was not valid JSON.' };
  }

  const generated = generatedSubstitutionsSchema.safeParse(candidate);
  if (!generated.success) {
    return { ok: false, error: 'Substitutions failed validation.' };
  }

  // Build a name -> id lookup across all meals. First match wins; if a name
  // recurs across meals we still produce one suggestion (the substitution
  // applies to that ingredient identity, not to a specific meal row).
  const nameToId = new Map<string, string>();
  for (const meal of plan.meals) {
    for (const ing of meal.ingredients) {
      const key = ing.name.trim().toLowerCase();
      if (!nameToId.has(key)) nameToId.set(key, ing.id);
    }
  }

  const substitutions: Substitution[] = [];
  for (const s of generated.data.substitutions) {
    const id = nameToId.get(s.ingredientName.trim().toLowerCase());
    if (!id) continue; // Model named an ingredient we don't have — drop it.
    substitutions.push({
      id: randomUUID(),
      ingredientId: id,
      replacementName: s.replacementName,
      reason: s.reason,
      costDeltaCents: s.estimatedCostDeltaCents,
      note: s.note,
    });
  }

  return { ok: true, data: substitutions };
}
