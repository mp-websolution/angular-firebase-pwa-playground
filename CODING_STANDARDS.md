# Coding standards

## Readability over DRY

Don't pull small duplicates into helpers. Bundling domain data into a named type is fine (e.g. `Credentials`), but never hide `inject()` calls behind a helper, unless it's an `inject*` function that asserts its injection context (e.g. `injectReturnUrl`, `injectLiveData`).

Report duplication only, unless the copies are long, likely to drift apart, or in 3+ places.

## Comments and naming

Names and tests carry the documentation. A comment that explains code marks a missing name or test.

- **Write no comments inside function bodies**, in any TypeScript or script file, spec files included. Move each explanation to where it can't drift: a behaviour goes into a test name, a reason for a step into the name of a small extracted function. Delete an explanation that only restates the code.

  ```ts
  // Before
  // Browsers only report a change when the selection changes; clear it so the same file can be picked again.
  input.value = '';

  // After
  this.#letSameFileBePickedAgain(input);
  ```

- **Pin behaviour with tests.** A comment describing behaviour no test pins becomes that test: write it, see it pass against the current code, then delete the comment. Name tests as `docs/agents/testing.md` says, so a module's test list reads as its specification.
- **Write TSDoc only on generic code used in many places**, e.g. `injectLiveData`, the Firebase providers and tokens, `renderApp`, the fakes' options and shared test helpers. Data-access services and components carry none. The one exception is an extracted function whose name alone would mislead. Mention an ADR only in the TSDoc of the generic piece it constrains.
- **Match name length to scope.** Give functions long names in a small scope (`#` methods, module-local functions) and short ones in a large scope (public API). Give variables the inverse: short when they live a few lines, descriptive when they span a module or class. Keep existing public names (`injectLiveData`, `track`, `ref`, the `AuthSession` commands, service signals), so interfaces and fakes stay put, and rename variables only in code you touch anyway. In this example, the public method and the module constant travel far, the private method is called once, and `m` lives for one expression:

  ```ts
  const maxAvatarBytes = 2 * 1024 * 1024;

  uploadAvatar(image: Blob): Promise<void>
  #storeAvatarWhereOnlyItsOwnerMayWrite(uid: string, image: Blob): Promise<string>

  import('./notes/notes.routes').then((m) => m.notesRoutes)
  ```

- **Drop filler words from names.** Leave out articles (`the`, `a`, `an`) and linking verbs (`is`, `are`, `be`) when the name reads the same without them: `previousUserNoLongerSignedIn`, not `thePreviousUserIsNoLongerSignedIn`. Keep the `is`/`has` prefix of a boolean (`isOffline`), because without it the name reads as a noun. Trim existing names only in code you touch anyway.

- **Keep as comments** only:
  - a one-line warning of a consequence no name or test can carry, above the declaration or rule it guards (e.g. `// No SVG: it can carry scripts.`);
  - the Feature begin/end markers in rules files;
  - tool directives such as `// @vitest-environment node` or lint suppressions.
- **In config, workflow and server-config files**, keep only comments that give a reason or a warning, and state intent in step `name:` fields where the format allows. In rules files, express each check as a named rule function. In HTML templates, replace a comment with a test wherever a test can pin it.

## Module-private files

Put a new file in its Sheriff module's `internal/` folder unless another module imports it; lint then keeps other modules out. Another module's specs and the test helpers count as importers too. Moving a file out of `internal/` widens the module's interface: make it a deliberate change. See ADR 0006. A module with pages exposes them only through its `<module>.routes.ts`, and `app.routes.ts` imports only routes files (ADR 0007).

## Signal forms

Every signal form has the same shape. This overrides the `angular-developer` skill's signal-forms guidance (`submit()` methods, `(submit)` handlers, public models).

```ts
readonly #noteModel = signal<NoteModel>({ text: '' });
protected readonly noteForm = form(
  this.#noteModel,
  (path) => {
    required(path.text, { message: 'Write a note.' });
  },
  {
    submission: {
      action: () => this.#createNote(),
    },
  },
);

async #createNote(): Promise<TreeValidationResult> {
  await this.notesData.create(this.#noteModel().text);
  this.noteForm().reset({ text: '' });
}
```

```html
<form [formRoot]="noteForm">…</form>
```

- **Split model and form.** Declare the model as its own signal; never create it inside `form()`. Name the model `#xModel` (type `XModel`, unless a domain type like `Credentials` exists) and the `FieldTree` `xForm`. Keep the model private: templates read through the form. Code in the class, `action` included, reads the model rather than `xForm().value()`, which is the same signal, and writes the model to set the value; use `xForm().reset(value)` when the interaction state must clear too.
- **Declare submission in `form()`'s options**, as `submission: { action }`, and bind the template's `<form>` with `[formRoot]`. Put the action's body in a private method named after what it does (`#authenticate`, `#createNote`) and call it from `action: () => this.#x()`, so `form()` stays short. Write no template-called submit methods, no `(submit)` handlers, no `novalidate` or `preventDefault()`.
- **Return expected failures from `action`** as validation errors: ones the user fixes by editing, e.g. a taken email. Show root errors from `xForm().errors()`. Put unexpected failures (offline, timeouts) in a separate signal that `action` clears first: a returned error makes the form invalid until the value changes, which would block resending the same values. `CredentialsForm` shows both.
- **A model holds only what the user edits.** Context such as which record is being edited lives in component state (e.g. `editingId`) and is read inside `action`.
