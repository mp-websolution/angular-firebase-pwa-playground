# Baseline page modules expose a routes file that owns its paths

A Baseline module with pages (auth, profile, home) exposes them only through one public `<module>.routes.ts`, e.g. `authRoutes` in `src/app/auth/auth.routes.ts`. Its pages live in the module's `internal/` folder (ADR 0006), as does a guard that only its own routes use, such as auth's `signedOutGuard`. The routes file declares the module's top-level routes in full: path, title, guard, and `loadComponent` where a page must stay lazy, like profile's (ADR 0003). `src/app/app.routes.ts` spreads these lists and the Feature route list, and imports nothing else.

A Feature has the same shape, one public routes file and the rest in `internal/`, but not the same ownership: its path and title belong to its entry in the Feature route list, because home reads them there to build its navigation, so its routes file declares routes relative to that path. A Baseline module's path belongs to the module itself, so its guards, redirects and links sit next to the paths they point to: auth's `signedInGuard` redirects to `'/sign-in'`, and sign-in and sign-up link to each other, in the module that declares those paths. Nothing reads a Baseline path from a list the way home reads the Features, so there is no reason to move the paths out to the app shell.

## Consequences

- `app.routes.ts` reads as a list of route areas and needs no change when a Baseline module changes a path, title or guard.
- A new Baseline page goes into its module's `internal/` folder and into that module's routes file.
- Sheriff's encapsulation keeps other modules, the app routes included, out of a page. Nothing but the written rule keeps `app.routes.ts` to routes files: no extra lint rule checks it.
- A module whose routes file uses `signedInGuard` needs `baseline:auth` in its Sheriff rule, as profile and home have.
- A routes file is loaded eagerly, so it must not import Firestore code: a page that needs Firestore is reached through `loadComponent`.
- Paths are still literals outside their module where another module navigates to them, e.g. home's sign-out navigation to `'/sign-in'`.
