# Spec: Signal forms conventions

**Status:** ready-for-agent

## Problem Statement

The Playground's four signal forms (credentials, new note, edit note, profile) each create their model signal inline inside `form()` and submit imperatively: a `(submit)` handler calls a component method, which calls `submit()` and calls `preventDefault()` in the template. Model types are named `…Form`, the same suffix used for the `FieldTree`. The credentials form keeps submit failures in a separate `error` signal beside the form. Nothing written tells agents how a signal form should look, so each new form invents its own shape.

## Solution

One shape for every signal form, written down in AGENTS.md:

- The model is its own signal, named `…Model`; the `FieldTree` from `form()` is named `…Form`. The model is never created inside `form()`.
- Submission is declared in `form()`'s options (`submission: { action }`) and the template binds `<form [formRoot]="…Form">`. No submit methods, no `(submit)` handlers.
- Expected failures of the action (ones the user fixes by editing) are returned from `action` as validation errors, so the form owns its submit state. Unexpected failures (offline, timeouts) go in a separate signal, so they don't block resending the same values.
- A model holds only what the user edits. Context such as which record is being edited comes from component state, read inside `action`.

No user-visible behaviour changes.

## Implementation Decisions

- **Names.** Type `XModel`, signal `#xModel`, `FieldTree` `xForm`. `interface ProfileForm` → `ProfileModel`, `interface NoteForm` → `NoteModel`. Named domain types (`Credentials`) stay.
- **Visibility.** The model is `readonly #xModel`: templates read through the form. Code that sets the value writes the model directly.
- **Submission.** `form(this.#xModel, schema, { submission: { action: async (form) => … } })`. Templates use `[formRoot]`, which sets `novalidate` and prevents the default submit.
- **Errors.** `CredentialsForm` replaces its `error` signal with `unexpectedError`; `action` returns `{ kind: 'auth', message }` for expected failures (`userFixable`: wrong credentials, invalid or taken email, weak password) and sets `unexpectedError` for the rest. The template shows both in `role="alert"` paragraphs.
- **Edit note.** `action` reads `editingId()` rather than taking the id as an argument or holding it in the model.
- **Rules.** New `### Signal forms` section under Code style in AGENTS.md.
- **Not changed.** `CONTEXT.md` gains no term (no domain language). No ADR: cheap to reverse.

## Testing Decisions

Refactor: existing component tests are the safety net. Lint, unit tests, integration tests and the build pass.

## Out of Scope

Google sign-in (not a form), new validation, new forms.
