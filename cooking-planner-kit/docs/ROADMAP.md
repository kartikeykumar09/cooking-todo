# Roadmap

Shared priority lives here so it isn't assumed. Each phase is shippable.

## Phase 0 — Skeleton

Repo, Vite + React + TS scaffold, Tailwind, CI, a deployed hello-world with
working preview deploys. Get deployment green before building features.

## Phase 1 — Generation core

Preferences form, serverless endpoint calling Claude with forced tool use,
render one day's breakfast/lunch/dinner. Client-only state. Proves reliable
structured generation early.

## Phase 2 — Derived features

Grocery aggregation, budget computation, substitutions. Mostly deterministic
code on Phase 1 data plus one substitution prompt. The product becomes useful.

## Phase 3 — Persistence & accounts

Supabase auth, saved plans, history, export/share. Anonymous use still works —
no signup wall on first visit.

## Phase 4 — Polish & expansion

Weekly planning, meal locking + partial regeneration, pantry-aware planning,
cost/observability dashboards.

## The four features (every issue maps to one)

1. Breakfast / lunch / dinner plan
2. Grocery list
3. Substitutions
4. Budgets
