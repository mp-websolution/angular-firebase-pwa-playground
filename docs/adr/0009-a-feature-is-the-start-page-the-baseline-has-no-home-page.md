# A Feature is the start page; the Baseline has no home page

The Feature route list (`src/app/features/features.routes.ts`) exports a required `startPage`, typed `{ title, loadChildren }` without a `path`: the one Feature mounted at `/`, with its whole route tree at the root. `featureRoutes` keeps the other Features, each at its own path. The Template's start page is the notes Feature. The Baseline has no home page and no navigation shell: a Feature links `/profile`, `/` and other Features as literals, the profile page has sign-out, and every auth destination is `/` (`signedOutGuard`, the default return URL, sign-out).

What `/` shows used to be a Baseline file (home, in `app.routes.ts`), so a Project couldn't change it without Baseline drift (ADR 0008). The first Project needs a public Feature at `/` with its own URLs at the root (`/2026/10`), for parity with the site it replaces. A start page that a Project picks in the Feature route list, a Feature file, gives it that.

`src/app/app.routes.ts` mounts `{ path: '', ...startPage }` last, after the profile, auth and other Feature routes and before the `**` fallback. The router backtracks over empty-path parents, so a Baseline path or a named Feature always wins a clash with a start page child, and the start page's chunk loads only for URLs nothing before it matched. Order is the clash rule. The start page must still not reuse a Baseline or Feature path: a child at such a path is never reached.

## Considered options

- **Keep home, and let a Feature replace it.** Rejected: whichever way a Feature replaces it, `/` is decided in Baseline files, and the Project's root URLs would sit under a prefix or need a redirect.
- **Mount the start page first.** Rejected: a start page with a child at `sign-in` or `profile` would shadow the Baseline page, and its chunk would load for every URL.
- **A test or lint rule for "exactly one start page".** Not needed: `startPage` is a single value, so the type allows exactly one, and `app.routes.ts` fails to build without it.

## Consequences

- A Feature's `title` only sets the page title. Nothing reads the Feature route list but `app.routes.ts`.
- `startPage` being required replaces home's test as the rule that a Project keeps at least one Feature. Removing the start page's Feature means pointing `startPage` at another Feature first.
- First paint at `/` waits for the start page's lazy chunk. That keeps Firestore out of the initial bundle (ADR 0003), whose budget is unchanged.
- Until the notes Feature is public, visiting `/` signed out ends at `/sign-in` through its `signedInGuard`.
- A Baseline test that lands on `/` renders `standInStartPage` from `src/app/testing/` through `renderApp`'s `startPage` option, so it depends on no Feature.
