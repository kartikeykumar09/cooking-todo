# Cooking planner — starter kit

A guided meal-planning SPA that produces four things from one generation: a
breakfast/lunch/dinner plan, a grocery list, substitutions, and a budget.

This kit is the spine of the project — the shared contract, the deterministic
logic that makes the four features compose, a sample generation handler, and the
configs and docs that keep the codebase aligned as it grows. UI components are
intentionally not included; they build on top of this.

## Two load-bearing decisions (see `docs/adr/`)

1. **Structured model output is the source of truth.** The model generates only
   the meal plan, as structured data. The grocery list and budget are derived;
   substitutions mutate an ingredient and totals recompute. The four features
   never need four separate generations.
2. **Prices come from a trusted source, not the model.** Budgets are only worth
   building if they're correct.

## What's here

```
src/
  domain/
    types.ts      The contract. Everything imports from here.
    schemas.ts    Zod validation + the Claude tool input schema.
    derive.ts     Deterministic grocery list + budget from a plan.
  api/
    generate-plan.ts   Serverless handler: validate -> Claude (forced tool
                       use) -> validate -> attach prices -> typed Plan.
docs/
  CONTRIBUTING.md       Coding style + workflow (mostly tooling-enforced).
  DEFINITION_OF_DONE.md What "finished" means.
  ROADMAP.md            Phased plan; the four features.
  adr/                  Decision records + template.
tsconfig.json           Strict TypeScript, no `any`, `@/` path alias.
eslint.config.js        Correctness rules (formatting is Prettier's).
.prettierrc.json        One formatting config, zero debates.
package.json            Toolchain + quality gates wired to lint-staged.
.env.example            Server-side secrets; never shipped to the browser.
```

## Quickstart

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY (server-side only)
npm run typecheck
npm run lint
npm test
```

## How the pieces connect

`generate-plan.ts` takes user `Preferences`, asks Claude for a structured plan
via forced tool use, validates the result against `schemas.ts`, attaches prices
from a trusted source, and returns a typed `Plan`. The SPA then calls
`deriveGroceryList(plan)` and `deriveBudget(plan)` from `derive.ts` to render the
grocery and budget views — no extra model calls. Accepting a substitution edits
one ingredient on the plan and both views recompute.

## Conventions in one breath

Strict types, `any` banned, formatting automatic, money in integer cents, server
state via TanStack Query, the in-progress plan in a Zustand store, thin API
handlers with Zod-validated boundaries, small single-purpose components, and the
domain types treated as the spec the rest of the code conforms to. Details in
`docs/CONTRIBUTING.md`.
