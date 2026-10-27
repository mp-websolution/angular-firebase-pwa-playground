# How a Feature claims `/` as an anonymous start page

Type: grilling

## Question

How can a Project make one of its Features the start page at `/`, open to visitors who aren't signed in, without Baseline drift? Today `/` is always home, and home sends anyone signed out to sign-in.

## Why

The first Project, `tango-calendar-pwa`, has a public, anonymous Calendar Feature. It must be the start page, with month URLs at the root (`/2026/10`) for parity with the site it replaces. Its Admin section is signed in. The Project can't get there on its own: everything that decides what `/` does is a Baseline file, and the drift check fails on every PR that changes one (`docs/syncing-baseline-releases.md`). Moving the Calendar to `/calendar/...` would keep sending visitors at `/` to sign-in. So the hook has to come from the Template, in a Baseline release.

## Facts

- `src/app/app.routes.ts` spreads `homeRoutes` first, then profile, auth and `featureRoutes`, and ends with `{ path: '**', redirectTo: '' }`. Home's route is `path: ''` with `canActivate: [signedInGuard]`, so it matches `/` before any Feature can, and the guard redirects signed-out visitors to `/sign-in`.
- `/` is also where auth sends people: `signedOutGuard` sends a signed-in user to `/`, `injectReturnUrl()` defaults to `/` after sign-in, and `returnUrlQueryParams` leaves `/` out of the return URL. Home's sign-out goes to `/sign-in`.
- Home links every entry of the Feature route list as `'/' + feature.path`, by its `title`. A `FeatureRoute` needs a `path` and a `title`. An entry with `path: ''` would type-check today, but home's route wins the match.
- The Feature route list (`src/app/features/features.routes.ts`) is a Feature file in `scripts/baseline-config.json`, so a Project may edit it. `app.routes.ts`, home and auth are Baseline files.
- Sheriff: Features may not import home (that would close a cycle), and only `app.routes.ts` and home import the Feature route list.
- ADR 0003: Firestore stays out of the initial bundle. A lazy Feature at `/` would load its chunk, and possibly the Firestore SDK, at first paint.
- ADR 0007: a Feature's path and title belong to its Feature route list entry; a Baseline module's paths belong to its own routes file.

## Decisions to settle

- How a Feature claims `/`: a flag on its Feature route list entry, a separate export next to `featureRoutes`, or a Project-owned file. How "at most one claimant" is enforced (type, test or lint).
- Whether the claiming Feature's routes sit at the root (`/2026/10`) or only its start page does, with the rest under its own path. How its root paths avoid clashing with Baseline paths (`/sign-in`, `/profile`) and with other Features.
- Where home goes when a Feature claims `/`: a fixed path such as `/home`, how it is still reached (e.g. after sign-in, from the Feature), and whether it still lists the claiming Feature.
- What `/` does when no Feature claims it: the same as today, so the notes Feature and existing Projects see no change.
- Where auth sends people once `/` is public: `signedOutGuard`, the default return URL after sign-in, and sign-out's destination. Do they go to `/`, or to home's new path?
- The `**` fallback: does it still go to `/`?
- Whether ADR 0003's lazy-Firestore rule holds as written when the start page is a Feature that reads Firestore, and the initial-bundle budget.
- Release and docs: minor or major Baseline release and its upgrade note, a Baseline glossary term (e.g. **Start page**), an ADR, `docs/features.md`, and the tests (home's Features navigation test, guard tests).

## Out of scope

- Reading shared or public Firestore data signed out: `.scratch/public-live-data/`.
- Choosing sign-in methods and turning off public sign-up: `.scratch/sign-in-methods/`.
- Translating Baseline pages.
