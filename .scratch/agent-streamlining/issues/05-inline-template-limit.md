# 05: Lint enforces angular-eslint's inline-template limit

**Spec:** `.scratch/agent-streamlining/spec.md`

**What to build:** `npm run lint` fails on an inline component template longer than 3 lines, so the rule holds without a reviewer: angular-eslint's `component-max-inline-declarations` in its default config in the TypeScript block of the ESLint config. Any existing violation moves to a `templateUrl` file next to its component. The "Component templates" section leaves `CODING_STANDARDS.md`, since lint now carries it.

**Blocked by:** 03 (Code style moves to CODING_STANDARDS.md)

**Status:** agent-done

- [x] `npm run lint` passes on the codebase with the rule on
- [x] "Component templates" section removed from `CODING_STANDARDS.md`
- [x] `npm run check` green
