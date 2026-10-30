# Docs and the baseline-v3.0.0 release note

**Spec:** `.scratch/baseline-without-storage/spec.md` (user stories 2, 15–18)

**Blocked by:** none (docs only)

**Status:** ready-for-agent

## What to build

The spec's Implementation Decisions under Docs and Release:

- Baseline manual, Features docs, Testing docs and ADR 0002 as the spec lists. Also drop "with avatar" from the manual's Baseline description and the avatar upload from the post-deploy check.
- A `baseline-v3.0.0` entry in `docs/upgrade-notes.md`, in that file's entry format, with the spec's Project actions.
- `CODING_STANDARDS.md` examples name the avatar code that goes (`maxAvatarBytes`, `uploadAvatar`, the SVG comment): swap them for examples from code that stays.

Don't touch code; tickets 01 and 02 do that.

## Acceptance criteria

No Baseline doc mentions Cloud Storage, a Storage bucket, Blaze, a budget alert or the avatar upload, except the manual's one sentence that a Project wires up Storage itself and the upgrade note.
