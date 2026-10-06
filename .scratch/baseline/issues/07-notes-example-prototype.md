# 07: Notes example Prototype

**Spec:** `.scratch/baseline/spec.md`

**What to build:** The first Prototype: a lazy-loaded notes area where a signed-in end user can create, list, edit and delete their own notes, with the list updating in real time. It shows the full Prototype pattern (own route area, data-access service, rules section, seed data, tests) and can be deleted without touching the Baseline. It is the reference future Prototypes are copied from.

**Blocked by:** 04 (Profile display name)

**Status:** ready-for-agent

- [x] A notes route area, lazily loaded and protected by the auth guard, and linked from home
- [x] A notes service exposing the current user's notes as a realtime signal, plus create, update and delete commands. It gets Firestore with `await inject(FIRESTORE)()` and, like the rest of the notes area, is only reachable from the lazy route
- [x] Notes are owner-only, following the per-user pattern from ticket 04
- [x] The Firestore rules section for notes is clearly delimited, so it can be removed on its own
- [x] The seed script adds sample notes for the demo user, in a notes-specific section
- [x] Rules tests cover owner allowed and cross-user and unauthenticated denied
- [x] Component tests (seam A, faked notes service) cover the list, create, edit and delete
- [x] Integration tests (seam B) cover CRUD and realtime updates against the emulator
- [x] Deleting the notes Prototype (route entry, folder, rules section, seed section, tests) leaves the Baseline building and all remaining tests green. Verified once, then the deletion is reverted
- [x] A short developer note explains how to add or remove a Prototype, including that Firestore code must stay behind the Prototype's lazy route

## Comments

### Deletion dry run (2026-10-06, at `c128832`)

Followed "Removing a Prototype" in `docs/prototypes.md`: deleted the `notes` entry in `src/app/prototypes.routes.ts`, `src/app/notes/`, the `Prototype: notes` block in `firestore.rules` and `scripts/seed/prototype-notes.mjs`. Nothing outside those parts and the docs mentions notes.

- `npm run lint`: passes.
- `npm test`: 6 files, 56 tests pass (76 with notes).
- `npm run test:integration`: 5 files, 56 tests pass (77 with notes).
- `npm run build`: passes, initial total 466.72 kB (474.96 kB with notes).
- `npm run seed` in the emulators: runs the 2 Baseline seeders and exits 0.
- `npm run format:check`: only flags the emptied `prototypeRoutes` array, which a scripted deletion left as `[\n]`. Prettier turns it into `[]`; deleting by hand in an editor that formats on save doesn't hit this.

Then restored everything with `git restore`.
