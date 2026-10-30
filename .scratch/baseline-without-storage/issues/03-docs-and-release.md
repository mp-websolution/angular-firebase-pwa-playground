# Docs and the baseline-v3.0.0 release note

**Spec:** `.scratch/baseline-without-storage/spec.md` (user stories 2, 15–17)

**Blocked by:** none (docs only)

**Status:** agent-done

## What to build

The spec's Implementation Decisions under Docs and Release:

- Baseline manual, Features docs, Testing docs, ADRs 0002 and 0003 and the deploy step name as the spec lists.
- A `baseline-v3.0.0` entry in `docs/upgrade-notes.md`, in that file's entry format, with the spec's Project actions.
- `CODING_STANDARDS.md` examples as the spec lists.

Don't touch code; tickets 01 and 02 do that.

## Acceptance criteria

No Baseline doc mentions Cloud Storage, a Storage bucket, Blaze, a budget alert or the avatar upload, except the upgrade note.

## Comments

- 2026-10-30, PR 66/67 review: the manual's sentence that a Project wires up Storage itself went; how a Project adds Storage is decided when one first needs it. User story 16 went with it, so 17 and 18 are now 16 and 17.
