# 02: Feature rules fragments, assembled before use

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** A Feature keeps its security rules in its own folder, so adding one never edits a shared rules file. The Baseline's Firestore and Storage rules become sources with one insertion marker. The notes Feature's delimited section becomes its Firestore fragment. A Node script assembles each service's rules (Baseline source plus every Feature's fragment, in Feature-name order, each wrapped in comments naming its Feature) into a gitignored folder the Firebase config points to. `npm start`, the integration tests and the deploy run it before the emulators start or the rules deploy. This ticket also starts the new script-test suite beside the Sheriff tests, run inside `npm run check`. See the spec's "Rules assembly" decision.

**Blocked by:** None (can start immediately)

**Status:** agent-done

- [ ] The notes, profile and avatar rules integration specs pass unchanged against the assembled rules
- [ ] No committed rules file contains Feature rules; the assembled output is gitignored
- [ ] `npm start`, `npm run test:integration` and the deploy workflow assemble the rules first
- [ ] Script tests: a Feature-less fixture assembles to valid rules; a fragment whose Feature has no routes file, or whose name breaks the lowercase-and-hyphens rule, fails with a clear message
- [ ] The script-test suite runs inside `npm run check`; it clears leftover fixtures like the Sheriff tests do
- [ ] The features doc and README say a Feature owns 3 things: route entry, folder (including its rules fragments), seeder
- [ ] `npm run check` and `npm run test:integration` pass
