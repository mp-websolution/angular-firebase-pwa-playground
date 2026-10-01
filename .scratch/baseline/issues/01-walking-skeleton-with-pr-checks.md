# 01: Walking skeleton with PR checks

**Spec:** `.scratch/baseline/spec.md`

**What to build:** A developer can clone the Playground, install, and start a zoneless Angular 22 app that shows one routed placeholder page styled with Tailwind v4. Lint, formatting, a Testing Library component test and a production build all run locally. The same checks run automatically on every pull request in GitHub Actions. This is the base every later ticket builds on.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A new Angular 22 app (standalone, zoneless, no SSR, npm) exists at the repo root, alongside the existing `CONTEXT.md`, `AGENTS.md` and `docs/`, which are kept unchanged
- [x] Tailwind v4 is wired in with plain CSS. No SCSS anywhere, including component styles
- [x] angular-eslint and Prettier are configured, with npm scripts for lint and format check
- [x] Node 24 is pinned for local use and CI
- [x] Vitest runs through Angular's official unit-test builder, with `@testing-library/angular` installed
- [x] One component test renders the placeholder page through the router and asserts on visible content by role or text
- [x] A GitHub Actions workflow runs install, lint, unit tests and a production build on pull requests
- [x] `npm start`, `npm test`, lint and the production build all pass locally
