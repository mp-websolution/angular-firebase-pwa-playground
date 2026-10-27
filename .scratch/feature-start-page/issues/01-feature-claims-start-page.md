# A Feature is the start page at `/`; home goes

**Release:** `baseline-v2.0.0`, shared with `.scratch/public-live-data/` and `.scratch/sign-in-methods/`

**What to build:** Delete the home module. The Feature route list gets a required `startPage` export: the one Feature mounted at `/`, with its whole route tree at the root. In the Template, that's the notes Feature. Sign-out moves to the profile page, and every auth destination is `/`.

**Blocked by:** none

**Status:** ready-for-agent

## Why

The first Project, `tango-calendar-pwa`, has a public, anonymous Calendar Feature. It must be the start page, with month URLs at the root (`/2026/10`) for parity with the site it replaces. Its Admin section is signed in. Everything that decides what `/` does is a Baseline file today (`app.routes.ts`, home, auth), so the Project can't change it without Baseline drift.

## Decisions (grilling, 2026-10-27)

1. **How a Feature claims `/`:** `src/app/features/features.routes.ts` exports a required `startPage`, typed `{ title, loadChildren }` (no `path`). It's a single value, so the type allows exactly one start page, and no test or lint rule enforces it. `featureRoutes` keeps the other Features, which is `[]` in the Template.
2. **Root paths:** `app.routes.ts` mounts `{ path: '', ...startPage }` **last**, after `profileRoutes`, `authRoutes` and `featureRoutes` and before `**`. The router backtracks over empty-path parents, so Baseline paths and named Features always win clashes, and the start page's chunk loads only for URLs nothing else matched. Order is the clash rule, so there's no clash test. ADR 0009 says the start page must not reuse Baseline or Feature paths.
3. **Home is deleted, with no replacement shell:** The `src/app/home/` module and its spec go, and so does the Features navigation. A Feature's `title` now only sets the page title. Home's jobs move:
   - Sign out, with its error alert, moves to the profile page.
   - Profile's "Back to home" becomes "Back", linking to `/`.
   - Notes' "Back to home" becomes a "Profile" link to `/profile`.
   - Features link `/profile`, `/` and each other as literals.
4. **The Template's start page is notes:** notes moves from `featureRoutes` (`path: 'notes'`) to `startPage`. Until `.scratch/public-live-data/` lands, visiting `/` signed out still ends at `/sign-in` through notes' `signedInGuard`. That ticket then makes notes public.
5. **Auth destinations are all `/`:** `signedOutGuard` and the default return URL (`injectReturnUrl()`) keep `/`. Sign-out (now on profile) goes to `/` instead of `/sign-in`. `returnUrlQueryParams` still leaves `/` out.
6. **`**` fallback:** unchanged; it redirects to `/`.
7. **ADR 0003:** unchanged, and so is the initial-bundle budget. The start page is a lazy chunk, so Firestore stays out of the initial bundle. First paint at `/` waits on that chunk, and ADR 0009 records the trade-off.
8. **Sheriff:** drop `baseline:home` and its rules from `sheriff.config.ts`. Only `app.routes.ts` imports the Feature route list. ADR 0005's "Features may not import home" cycle note goes.
9. **Release:** part of `baseline-v2.0.0`, one tag for all 3 tickets. It's a major release because the Feature route list changes shape. The tickets merge to `main` in any order. The first to merge creates `### baseline-v2.0.0` under Releases in `docs/upgrade-notes.md`, and each ticket adds its own sentence to the summary paragraph and its own **Project action** steps. The tag goes on `main` after the third ticket merges. This ticket's Project actions:
   - Set `startPage` to the Feature that should own `/`.
   - Home is gone: link `/profile` from a Feature where people need it.
   - Sign-out is on the profile page.
10. **Docs:**
    - Add ADR 0009, "A Feature is the start page; the Baseline has no home page".
    - ADR 0007: drop home from the page modules.
    - ADR 0008: change "Home reads the Feature route list" to `app.routes.ts`.
    - `CONTEXT.md`: add a **Start page** term ("the one Feature mounted at `/`, set by `startPage` in the Feature route list"). Make the **Feature route list** term mention `startPage`.
    - `docs/features.md` and `docs/baseline-manual.md`:
      - No more "home links to it": `title` is the page title.
      - `startPage` is required, which now enforces "keep at least one Feature" in place of home's test.
      - Removing the notes Feature means pointing `startPage` at another Feature first.
      - Features link `/profile` and `/` as literals.
    - The doc comment in `features.routes.ts`.

## Acceptance

- [ ] Home module and spec deleted. `app.routes.ts` mounts the start page last.
- [ ] `startPage` exported and required. Notes is the Template's start page.
- [ ] Route tests:
  - `/` renders the start page.
  - `/sign-in` and `/profile` beat a start page with root children, without loading its chunk.
  - `**` goes to `/`.
- [ ] Guard and return URL tests target `/`. The profile spec covers sign-out going to `/`.
- [ ] Sheriff config without `baseline:home`.
- [ ] ADR 0009, ADR 0005/0007/0008 edits, glossary, `docs/features.md`, `docs/baseline-manual.md`.
- [ ] The `baseline-v2.0.0` upgrade-notes entry carries this ticket's sentence and Project actions.
- [ ] `npm run lint`, `npm test`, `npm run test:integration` and `npm run build` pass. The initial bundle stays under budget.

## Out of scope

- Reading shared or public Firestore data signed out: `.scratch/public-live-data/`.
- Choosing sign-in methods and turning off public sign-up: `.scratch/sign-in-methods/`.
- Translating Baseline pages.
