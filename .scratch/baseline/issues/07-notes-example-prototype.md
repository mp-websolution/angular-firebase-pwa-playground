# 07: Notes example Prototype

**Spec:** `.scratch/baseline/spec.md`

**What to build:** The first Prototype: a lazy-loaded notes area where a signed-in end user can create, list, edit and delete their own notes, with the list updating in real time. It shows the full Prototype pattern (own route area, data-access service, rules section, seed data, tests) and can be deleted without touching the Baseline. It is the reference future Prototypes are copied from.

**Blocked by:** 04 (Profile display name)

**Status:** ready-for-agent

- [ ] A notes route area, lazily loaded and protected by the auth guard, and linked from home
- [ ] A notes service exposing the current user's notes as a realtime signal, plus create, update and delete commands
- [ ] Notes are owner-only, following the per-user pattern from ticket 04
- [ ] The Firestore rules section for notes is clearly delimited, so it can be removed on its own
- [ ] The seed script adds sample notes for the demo user, in a notes-specific section
- [ ] Rules tests cover owner allowed and cross-user and unauthenticated denied
- [ ] Component tests (seam A, faked notes service) cover the list, create, edit and delete
- [ ] Integration tests (seam B) cover CRUD and realtime updates against the emulator
- [ ] Deleting the notes Prototype (route entry, folder, rules section, seed section, tests) leaves the Baseline building and all remaining tests green. Verified once, then the deletion is reverted
- [ ] A short developer note explains how to add or remove a Prototype
