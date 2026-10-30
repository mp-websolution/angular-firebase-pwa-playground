# Storage leaves the Firebase wiring, rules, deploy and emulators

**Spec:** `.scratch/baseline-without-storage/spec.md` (user stories 1–5, 13, 14)

**Blocked by:** 01 (`ProfileData` uses the Storage token until then)

**Status:** ready-for-agent

## What to build

The spec's Implementation Decisions for Firebase wiring, Rules, Deploy, Emulators and seeding, and Environments:

- `provide-firebase.ts`: the Storage token, factory, SDK import and emulator connection go; `storagePort` leaves the settings model.
- `storage.rules` and its avatar rules tests go. `scripts/assemble-rules.mjs` assembles Firestore only; a stray `<name>.storage.rules` gets no special handling.
- `firebase.json`: the `storage` rules entry and Storage emulator port go.
- `.github/workflows/deploy.yml` deploys `firestore:rules` only.
- `npm start`, `test:integration` and `scripts/seed.mjs` use Auth and Firestore only.
- `storageBucket` leaves both environment configs. Pasting a full console config with `storageBucket` must still work.

Docs are ticket 03.

## Acceptance criteria

The spec's Testing Decisions for the rules assembly script (Storage cases go) and the removed Storage avatar rules tests. Unit, integration and script tests and lint pass.
