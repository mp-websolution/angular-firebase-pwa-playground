# Spec: Baseline page modules expose a routes file, not pages

**Status:** resolved

## Problem Statement

`src/app/app.routes.ts` imports the Baseline's pages directly: home, sign-in, sign-up and, lazily, the profile page. So every page is a public file of its module (ADR 0006), and auth's interface carries two page components and `signedOutGuard` that only the app routes use. The knowledge of a route is split across modules: auth's `signedInGuard` redirects to `'/sign-in'` and sign-in and sign-up link to each other, but the paths, titles and guards are declared in the app shell. Features already have the tighter shape: one public `<name>.routes.ts`, everything else in `internal/`.

## Solution

Every Baseline module with pages (auth, profile, home) gets one public `<module>.routes.ts` that declares its top-level routes: path, title, guard, and for profile the lazy `loadComponent`. Its pages move into the module's `internal/` folder, and `signedOutGuard` moves into auth's `internal/`. `app.routes.ts` spreads the route lists and imports nothing else from the Baseline. Sheriff's existing encapsulation then keeps the app shell, and everything else, out of the pages.

## User Stories

1. As a developer, I want `npm run lint` to fail when the app routes or any other module import a Baseline page, so that pages are reached only through their module's routes.
2. As a developer, I want a Baseline route's path, title and guard to live in the module that owns the page, so that a change to sign-in's path is made next to the guard that redirects to it.
3. As a developer, I want `app.routes.ts` to import only routes files, so that the app shell reads as a list of route areas.
4. As a developer, I want `signedOutGuard` private to auth, so that only auth's routes use it.
5. As a developer, I want `signedInGuard` to stay public in `auth-guards.ts`, so that home, profile and Features keep guarding their routes.
6. As a developer, I want the profile page to stay out of the initial bundle, so that Firestore loads only with it (ADR 0003).
7. As a developer reading the Baseline next to a Feature, I want one module shape (a public routes file, the rest in `internal/`), so that a Baseline page module and a Feature look alike.
8. As a future reader, I want an ADR to say why a Baseline module owns its paths while a Feature's path is owned by the Feature route list, so that nobody "unifies" the two shapes without knowing why.
9. As an agent writing code, I want `AGENTS.md` to say that a module with pages exposes them only through `<module>.routes.ts`, so that a new page lands in `internal/`.
10. As a maintainer, I want every existing spec to pass unchanged apart from import paths, so that I know the move changed no behaviour.

## Implementation Decisions

- **Scope:** auth, profile and home. Other Baseline modules have no pages.
- **Routes files:** `src/app/auth/auth.routes.ts` exports `authRoutes`, `src/app/profile/profile.routes.ts` exports `profileRoutes`, `src/app/home/home.routes.ts` exports `homeRoutes`, matching `notesRoutes`. Each declares full top-level paths, titles and guards, exactly as `app.routes.ts` does today:
  - home: `''`, `canActivate: [signedInGuard]`, title `Angular Firebase PWA Playground`;
  - profile: `'profile'`, `loadComponent` of the edit-profile page in `internal/`, `canActivate: [signedInGuard]`, title `Profile`. The comment "Lazy, or the Firestore SDK joins the initial bundle." moves with it. `profile.routes.ts` itself is imported eagerly, so it must not import Firestore code;
  - auth: `'sign-in'` and `'sign-up'`, `canActivate: [signedOutGuard]`, titles `Sign in` and `Create account`.
- **`app.routes.ts`:** `[...homeRoutes, ...profileRoutes, ...authRoutes, ...featureRoutes, { path: '**', redirectTo: '' }]`. It imports no page and no guard.
- **Moves, not rewrites:** page subfolders keep their names one level deeper: `auth/internal/sign-in/`, `auth/internal/sign-up/`, `profile/internal/edit-profile/`, `home/internal/home.ts` and `home.html`. Templates and specs move with their components. Only import paths change.
- **Guards:** `signedOutGuard` moves from `auth-guards.ts` to `auth/internal/signed-out-guard.ts`. `auth-guards.ts` keeps its name and holds only `signedInGuard`.
- **Sheriff config:** `baseline:profile` gains `baseline:auth`, because `profile.routes.ts` imports `signedInGuard`. Profile already depends on auth through Live data, so no new cycle. No other config change.
- **Home's sign-out navigation** to `'/sign-in'` stays a literal in home.
- **ADR 0007, "Baseline page modules expose a routes file that owns its paths":** records the rule, and why it differs from a Feature: a Feature's path and title belong to the Feature route list because home reads them there for its navigation, while a Baseline module's path belongs to the module so its guards, redirects and links sit with it. Consequences: `app.routes.ts` imports only routes files; a new Baseline page goes into `internal/` and into its module's routes file; nothing but encapsulation and the written rule enforces it (no extra lint rule).
- **`AGENTS.md`:** the "Module-private files" rule gains one sentence: a module with pages exposes them only through `<module>.routes.ts`; `app.routes.ts` imports only routes files. Points to ADR 0007.
- **`docs/features.md`:** one sentence contrasting a Feature's routes (relative paths, path and title in the Feature route list) with the Baseline's (each module declares its own top-level paths).
- **`CONTEXT.md` and `README.md`:** no change.

## Testing Decisions

- **Seams:** `npm run lint` for encapsulation, `renderApp` for behaviour. The page specs already render through `renderApp` and the app routes, so they test the routes files without changes beyond import paths.
- **Verification, recorded in the PR, not committed:**
  - `npm run lint` green.
  - Throwaway violations fail with Sheriff's encapsulation message, one at a time, then revert: `app.routes.ts` importing the sign-in page; home importing `signedOutGuard`.
  - `npx sheriff list src/main.ts` shows the same 11 modules.
  - `npm test`, `npm run test:integration` and `npm run build` green; the profile page is still in its own lazy chunk and the initial bundle stays under the 500 kB budget.

## Out of Scope

- An extra Sheriff rule limiting `app.routes.ts` to `*.routes.ts` imports.
- Moving `'/sign-in'` out of home, or exporting path constants from auth.
- Renaming `auth-guards.ts`.
- Changing the Feature shape or the Feature route list.
- `AuthFailure` and other private-type leaks (separate architecture candidate).

## Further Notes

- Came from an architecture review of Sheriff encapsulation after `.scratch/encapsulation/spec.md` (PR #44). That spec listed "giving a Baseline folder its own public API file" as out of scope; this spec takes it up for page modules only.
- One ticket, one branch and PR: `baseline-routes/01-routes-files`, off `main`.
