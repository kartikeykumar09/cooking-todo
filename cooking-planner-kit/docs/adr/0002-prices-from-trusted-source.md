# ADR 0002: Prices come from a trusted source, not the model

- **Status:** accepted
- **Date:** 2026-06-13

## Context

The budget feature needs per-ingredient prices. The model could supply them, or
we could attach prices from a grocery price API or a maintained regional
dataset.

## Decision

Prices come from a trusted pricing source, attached server-side after generation
(`priceFor` in the generation handler). The model never sets prices. When no
trusted price exists, the cost is null and the UI shows it as unknown rather than
inventing a number. Any genuine estimate is flagged with `costIsEstimated`.

## Consequences

- Budgets are trustworthy, which is the whole value of the feature.
- We carry an integration (or dataset) to maintain, and some items will show
  "price unknown" until covered.
- Money is handled in integer cents end to end to avoid float drift.

## Alternatives considered

- Letting the model estimate all prices: fast and free, but users lose trust the
  moment a budget is visibly wrong. Rejected as the default; allowed only as a
  clearly-flagged fallback.
