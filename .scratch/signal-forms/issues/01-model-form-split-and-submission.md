# 01: Split model and form, declare submission in form options

**Spec:** `.scratch/signal-forms/spec.md`

**What to build:** Apply the spec's signal-forms shape to the credentials form, both notes forms and the profile form, and add the `### Signal forms` section to AGENTS.md.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Every form's model is a separate `#…Model` signal of type `…Model`; every `FieldTree` is named `…Form`
- [x] Every form declares `submission` in `form()` options; templates use `[formRoot]`; no submit methods or `(submit)` handlers left
- [x] `CredentialsForm` returns expected failures from `action`; unexpected ones go in `unexpectedError`, so resending the same details works
- [x] Edit-note `action` reads `editingId()`
- [x] AGENTS.md `### Signal forms` section with the credentials example and the model-holds-only-edited-data rule
- [x] `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` pass
