# Spec: One note form for adding and changing notes

**Status:** ready-for-agent

## Problem Statement

The notes Prototype has two signal forms that do almost the same thing: one adds a note, the other changes a note in place. Each has its own model, its own `form()` call with the same schema, its own submit method, and its own copy of the label, textarea, error list and submit button in the template. The copies are long, and they have already drifted apart: the "Add note" button uses `px-4 py-2` while "Save" uses `px-3 py-1`. Any fix to how a note is entered (validation display, accessibility, styling) has to be made twice, and a missed copy goes unnoticed. The edit form also needs a `viewChild`, an `Injector` and a `startEditing` method only to seed its value and move focus, which makes `Notes` harder to read than the page it renders.

## Solution

A single `NoteForm` component inside the notes Prototype, used twice on the notes page: once to add a note, once in the list item being edited. It owns the note model, the schema, the label, the textarea, the field errors and the submit button. The page tells it the label, the submit label, the starting text, whether to take focus, and what to do with the trimmed text on submit. The edit form projects its Cancel button next to Save.

Both submit buttons use `px-4 py-2`. Apart from the "Save" and "Cancel" buttons' padding, users see no change.

## User Stories

1. As a note taker, I want a "New note" field above my notes, so that I can write a note without leaving the page.
2. As a note taker, I want an "Add note" button, so that I can save what I wrote.
3. As a note taker, I want the field to clear once my note is added, so that I can write the next one straight away.
4. As a note taker, I want the cleared field not to show an error, so that I'm not told off for a note I just saved.
5. As a note taker, I want spaces around my note left out, so that stray whitespace isn't stored.
6. As a note taker, I want to be told "Write something first." when I add a blank note, so that I don't store empty notes.
7. As a note taker, I want to be told "Use at most 1000 characters." when my note is too long, so that I know why it wasn't saved.
8. As a note taker, I want spaces around a note not to count towards the 1000 characters, so that the limit matches what is stored.
9. As a note taker, I want errors to appear only after I've touched the field, so that an untouched form doesn't greet me with errors.
10. As a note taker, I want the "Add note" button disabled while the note is being saved, so that I don't add it twice.
11. As a note taker, I want an "Edit" button on each note, so that I can change it.
12. As a note taker, I want the note's text in a "Note" field when I start editing, so that I change it rather than retype it.
13. As a keyboard user, I want the cursor placed in the "Note" field when I start editing, so that I don't lose my place once the Edit button disappears.
14. As a note taker, I want a "Save" button, so that I can store my change.
15. As a note taker, I want the field to close once my change is saved, so that the list shows the updated note.
16. As a note taker, I want spaces around a changed note left out, so that edits behave like new notes.
17. As a note taker, I want to be told "Write something first." when I save a blank note, so that I don't blank out a note by accident.
18. As a note taker, I want to be told "Use at most 1000 characters." when a changed note is too long, so that edits follow the same rule as new notes.
19. As a note taker, I want the "Save" button disabled while the change is being saved, so that I don't save it twice.
20. As a note taker, I want a "Cancel" button next to "Save", so that I can drop my change.
21. As a note taker, I want the note left as it was when I cancel, so that cancelling never changes data.
22. As a note taker, I want to edit only one note at a time, with the first left as it was when I edit another, so that half-made changes don't pile up.
23. As a note taker, I want "Add note" and "Save" to look like the same kind of button, so that the page feels consistent.
24. As a screen-reader user, I want each note field's errors announced as its description, so that I hear what to fix when I land on it.
25. As a screen-reader user, I want the field marked invalid only once I've touched it and it has an error, so that I'm not told it's wrong before I start.
26. As a screen-reader user, I want the "New note" and "Note" fields to each be described by their own errors, so that an error on one field isn't read out for the other.
27. As a note taker working offline, I want an added or changed note to say it's saved on this device until it syncs, so that I trust it isn't lost.
28. As a developer, I want one place that defines how a note is entered, so that a fix to note entry applies to adding and changing alike.
29. As a developer, I want `Notes` to hold only page state (which note is being edited) and the add and change commands, so that the page component reads like the page.
30. As a developer copying the notes Prototype, I want it to show how to share one form between two uses, so that new Prototypes don't copy duplicated forms.

## Implementation Decisions

- **New component `NoteForm`** in the notes Prototype folder, with a template file (it's over 10 lines). It belongs to the Prototype; nothing outside the folder uses it, and the Baseline doesn't change.
- **Follows `CredentialsForm`'s shape**, the existing example of one form shared by two pages (sign-in, sign-up):
  - `label` (required): the field's visible label, "New note" or "Note".
  - `submitLabel` (required): "Add note" or "Save".
  - `text` (optional, default empty): the starting text.
  - `autofocus` (optional, default false): focus the field once it renders.
  - `noteSubmit` (required): a function taking the trimmed text and returning a promise; the form awaits it, so `submitting()` covers the save.
  - Content projection beside the submit button, for the edit form's Cancel button.
- **Signal-forms shape** per AGENTS.md: private `#noteModel` of type `NoteModel`, `FieldTree` `noteForm`, `submission: { action }` calling a private method named for what it does. The model is a plain `signal()`, seeded once from `text` in `ngOnInit`. Not a `linkedSignal`: `@for` tracks notes by id, so the edit form stays mounted when the note changes elsewhere, and a `linkedSignal` would throw away what the user typed.
- **After a successful submit** the form resets to empty text, clearing its interaction state. The edit form is removed by the page at the same time, so the reset only matters for adding.
- **Schema** (`noteSchema`, required after trim, at most `maxNoteLength` after trim) moves into `NoteForm`. `NoteModel` moves with it.
- **Focus** uses the field's `focusBoundControl()` after the next render, as `CredentialsForm` does, instead of a `viewChild` on the textarea. Keep the intent in a named private method (as now: keyboard users stay in the note once its Edit button is gone).
- **Error IDs** are unique per instance (e.g. a module-level counter) instead of the hardcoded `new-note-errors` and `edit-note-errors`, so `aria-describedby` stays correct whichever forms are on the page.
- **Submit button** is `px-4 py-2` in both uses, and so is the projected Cancel button, so the edit row's buttons match. It sits in a `flex gap-2` row with the projected content, aligned to the start.
- **`Notes` after the change** keeps `editingId`, plus two arrow-function properties, `createNote` and `updateNote`, passed as `noteSubmit`. `updateNote` reads `editingId()`, calls `NotesData.update`, then clears `editingId`. `Notes` loses both models, both forms, `startEditing`, the `viewChild`, the `Injector` and the focus method. Edit buttons set `editingId` directly.
- **Why extract despite "Readability over DRY":** the copies are long and have already drifted (button padding), which meets AGENTS.md's bar for removing duplication.
- **Not changed:** `NotesData`, `Note`, `maxNoteLength`, rules, seed data, routes. `CONTEXT.md` gains no term and there's no ADR, since this is cheap to reverse.

## Testing Decisions

- **One seam: the existing notes page test**, which renders the whole app through `renderApp('/notes', …)` with `FakeNotesData` and drives it with `userEvent`. `NoteForm` gets no test file of its own: tests describe what a user sees, not which component renders it (`docs/agents/testing.md`, ADR 0004).
- **Every existing notes test must pass unchanged.** They already pin adding, trimming, blank and too-long errors, clearing after add, editing, focus and starting text on edit, one edit at a time, cancel, offline status and delete. That is the refactor's safety net.
- **New tests**, written and passing against the current code before the extraction, named after the behaviour:
  - the "New note" field is described by its error once touched (`toHaveAccessibleDescription`);
  - the "Note" field is described by its own error, not the new-note field's, while both are on the page;
  - asks for at most 1000 characters when saving a changed note;
  - the field isn't marked invalid before it's touched;
  - keeps what is typed when the note being changed is changed elsewhere (needs `FakeNotesData.updateElsewhere`, mirroring `createElsewhere`).
- **Button padding** isn't tested: it's a style class, not behaviour.
- **Prior art:** `notes.spec.ts` for the notes page; `sign-in`/`sign-up` specs, which cover the shared `CredentialsForm` through each page.

## Out of Scope

- A shared field-errors component for every signal form (credentials, profile, notes). That's worth a separate spec, since the block is repeated across the Baseline and Prototypes.
- Any change to note validation messages, the length limit, or Firestore rules.
- Styling changes beyond the "Save" and "Cancel" buttons' padding.
- Reusing `NoteForm` outside the notes Prototype.

## Further Notes

- Keep the seam check in mind: no test reaches into `NoteForm`'s inputs. If a later change seems to need that, the behaviour probably belongs in the page test.
