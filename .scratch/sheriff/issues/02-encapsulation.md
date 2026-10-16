# 02: Encapsulation

**Spec:** `.scratch/sheriff/spec.md` (Out of Scope, "Encapsulation")

**What to build:** Move module-private files into `internal/` so Sheriff's `encapsulation` rule hides them. Candidates: the credentials form, auth failure model and return URL in auth; everything in the notes Feature except its routes. Changes the shape `docs/features.md` tells new Features to copy.

**Blocked by:** 01

**Status:** needs-triage
