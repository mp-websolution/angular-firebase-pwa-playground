# 05: Lint enforces the 10-line inline-template limit

**Spec:** `.scratch/agent-streamlining/spec.md`

**What to build:** `npm run lint` fails on an inline component template longer than 10 lines, so the rule holds without a reviewer: angular-eslint's `component-max-inline-declarations` with a 10-line template limit in the TypeScript block of the ESLint config. Any existing violation moves to a `templateUrl` file next to its component. The lint test suite pins the bound (11 lines fail, 10 pass), and the "Component templates" section leaves `CODING_STANDARDS.md`, since lint now carries it.

**Blocked by:** 03 (Code style moves to CODING_STANDARDS.md), 04 (Lint tests for the module boundaries)

**Status:** agent-done

- [x] `npm run lint` passes on the codebase with the rule on
- [x] Lint tests: an 11-line inline template fails with `@angular-eslint/component-max-inline-declarations`, a 10-line one passes
- [x] "Component templates" section removed from `CODING_STANDARDS.md`
- [x] `npm run check` green
