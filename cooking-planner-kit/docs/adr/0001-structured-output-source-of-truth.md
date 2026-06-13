# ADR 0001: Structured model output is the source of truth

- **Status:** accepted
- **Date:** 2026-06-13

## Context

The app produces four things — a meal plan, a grocery list, substitutions, and a
budget. They could each be generated independently by the model, or three of
them could be derived from one richly-structured plan.

## Decision

The model generates only the meal plan, and it returns it as structured data
(forced tool use, validated against a Zod schema). Each ingredient carries a
quantity, unit, and category. The grocery list and budget are pure
deterministic functions of that plan; a substitution mutates one ingredient and
the dependent views recompute.

## Consequences

- The four features compose from one generation instead of four — cheaper,
  faster, and internally consistent (the grocery list always matches the meals).
- Arithmetic is correct because code does it, not the model.
- We must keep the JSON tool schema and the Zod schema in sync, and validate
  every model response before trusting it.

## Alternatives considered

- Generating each feature separately: more model calls, higher cost, and risk of
  the grocery list disagreeing with the meals. Rejected.
