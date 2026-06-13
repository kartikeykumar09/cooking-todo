# Contributing

This project stays coherent through tooling-enforced rules, not memory. Most of
what follows is checked automatically; the rest is short enough to keep in mind.

## The contract comes first

`src/domain/types.ts` is the single source of truth for the shape of a plan. The
SPA, the API layer, and the Zod schemas all import from it. Editing it is
load-bearing — a change there ripples through all four features (plan, grocery,
substitutions, budget), so those edits get explicit review.

Grocery lists and budgets are **derived**, never stored or generated. If you find
yourself prompting the model for a grocery list or doing budget math in a
component, stop — that logic belongs in `src/domain/derive.ts`.

## Coding style

- **TypeScript is strict.** `any` is an error. Model the domain with explicit
  types and let the compiler enforce the contract.
- **Formatting is automatic.** Prettier owns formatting; ESLint owns correctness.
  Both run on commit (Husky + lint-staged) and again in CI. Don't argue style in
  review — the tools already decided.
- **Naming:** components `PascalCase`, hooks `useThing`, vars/functions
  `camelCase`, constants `SCREAMING_SNAKE_CASE`, types `PascalCase`. Files match
  their export. Booleans read as predicates (`isOverBudget`, `hasEstimates`).
- **Components stay small and single-purpose.** Function components with hooks.
  Split rendering from data fetching/mutation. Break up anything over ~200 lines
  or with too many props.
- **State has one home each:** server/generated state → TanStack Query;
  in-progress plan → the Zustand store; ephemeral UI state → `useState`. No
  global mutable singletons, no server data parked in component state.
- **API handlers stay thin:** validate input with Zod at the boundary, call one
  function, return the shared result/error shape. Always `async/await` with
  explicit `try/catch`; no floating promises.
- **Money is integer cents.** Never floats for currency.
- **Imports** use the `@/` alias, not `../../../`. Order is linter-enforced.
- **Comments explain _why_, not _what_.**

## AI layer

Prompts and their JSON schemas live in `src/domain/schemas.ts` and are reviewed
like any other code — never pasted ad hoc. The model proposes meals; our code
does all arithmetic and pricing. When you change a prompt, watch the
schema-validation failure rate to confirm you didn't regress.

## Workflow

1. Branch off `main`. Keep PRs small and reviewable.
2. Commit with [Conventional Commits](https://www.conventionalcommits.org):
   `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
3. CI must pass before merge: `typecheck`, `lint`, `format:check`, `test`, and a
   green preview deploy.
4. Tie the work to the roadmap. Every issue maps to one of the four features. If
   it doesn't, question whether it belongs now.
5. Significant decisions get an ADR (see `docs/adr/`).

See `docs/DEFINITION_OF_DONE.md` for what "finished" means.
