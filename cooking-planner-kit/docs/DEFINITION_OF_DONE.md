# Definition of done

A change is done when all of the following are true. This turns "is it
finished?" from a judgment call into a checklist.

- [ ] Domain types defined or updated; the contract still compiles everywhere.
- [ ] Inputs and model outputs validated at their boundaries (Zod).
- [ ] The four-feature pipeline still composes — a change to meal generation
      does not silently break grocery aggregation or the budget.
- [ ] Tests cover the new logic and pass (`npm test`).
- [ ] `typecheck`, `lint`, and `format:check` are green in CI.
- [ ] Reviewed via PR. Edits to `src/domain/types.ts` got explicit sign-off.
- [ ] Preview deployment is green and the feature works there, not just locally.
- [ ] Money handled in integer cents; the model set no prices.
- [ ] If a significant decision was made, an ADR was added.
