# 01: Routes files

**Spec:** `.scratch/baseline-routes/spec.md`

**What to build:** Give auth, profile and home each a public `<module>.routes.ts` (`authRoutes`, `profileRoutes`, `homeRoutes`) that declares their top-level paths, titles and guards, with profile's page still lazy through `loadComponent`. Move their pages into `internal/` (sign-in, sign-up, edit-profile keep their subfolders; home's page and template go to `home/internal/`), move `signedOutGuard` to `auth/internal/signed-out-guard.ts`, and make `app.routes.ts` spread only the routes lists. Add `baseline:auth` to `baseline:profile` in `sheriff.config.ts`. Add ADR 0007 and the `AGENTS.md` and `docs/features.md` sentences as the spec's Implementation Decisions say. Verification (lint green, two throwaway violations, `sheriff list` unchanged, tests and build green, profile chunk still lazy) is recorded in the PR, not committed.

**Blocked by:** none

**Status:** ready-for-agent
