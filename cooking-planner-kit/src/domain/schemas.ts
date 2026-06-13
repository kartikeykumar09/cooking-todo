/**
 * Runtime validation.
 *
 * Types vanish at runtime, so anything crossing a boundary — user input into the
 * API, model output back from Claude — gets validated here with Zod. The
 * `MealPlanToolInput` JSON schema is what we hand to Claude so it returns a typed
 * object instead of prose we have to parse.
 */

import { z } from 'zod';

export const dietaryRestrictionSchema = z.enum([
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'halal',
  'kosher',
  'pescatarian',
]);

export const preferencesSchema = z.object({
  date: z.string().date(),
  householdSize: z.number().int().min(1).max(20),
  budgetCapCents: z.number().int().min(0),
  dietaryRestrictions: z.array(dietaryRestrictionSchema).default([]),
  allergies: z.array(z.string()).default([]),
  cuisinePreferences: z.array(z.string()).default([]),
  maxPrepMinutes: z.number().int().positive().nullable().default(null),
  pantryItems: z.array(z.string()).default([]),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

/**
 * What we expect Claude to return via the tool. Note: no costs here. The model
 * proposes meals and ingredients; pricing is attached afterward from a trusted
 * source (see ADR 0002). Validate the model's response against this before use.
 */
export const generatedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece', 'pinch']).nullable(),
  category: z.enum([
    'produce',
    'dairy',
    'meat',
    'pantry',
    'frozen',
    'bakery',
    'beverages',
    'other',
  ]),
});

export const generatedMealSchema = z.object({
  type: z.enum(['breakfast', 'lunch', 'dinner']),
  title: z.string().min(1),
  steps: z.array(z.string()).min(1),
  prepMinutes: z.number().int().nonnegative(),
  ingredients: z.array(generatedIngredientSchema).min(1),
});

export const generatedPlanSchema = z.object({
  meals: z.array(generatedMealSchema).length(3),
});

export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

/**
 * JSON schema for the Anthropic tool definition. Keep this in sync with
 * `generatedPlanSchema` above — they describe the same contract for two
 * audiences (the model, and our runtime validator).
 */
export const mealPlanToolInputSchema = {
  type: 'object',
  properties: {
    meals: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      description: 'Exactly one breakfast, one lunch, and one dinner.',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner'] },
          title: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          prepMinutes: { type: 'integer' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: {
                  type: ['string', 'null'],
                  enum: [
                    'g',
                    'kg',
                    'ml',
                    'l',
                    'tsp',
                    'tbsp',
                    'cup',
                    'piece',
                    'pinch',
                    null,
                  ],
                },
                category: {
                  type: 'string',
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
} as const;

export const generatedSubstitutionSchema = z.object({
  ingredientName: z.string().min(1),
  replacementName: z.string().min(1),
  reason: z.enum(['allergy', 'cost', 'availability', 'preference']),
  estimatedCostDeltaCents: z.number().int(), // negative = saves money
  note: z.string().nullable(),
});
export const generatedSubstitutionsSchema = z.object({
  substitutions: z.array(generatedSubstitutionSchema),
});
export type GeneratedSubstitutions = z.infer<typeof generatedSubstitutionsSchema>;
