# Agents

## Agent skills

### Testing

Before writing or updating tests, read `docs/agents/testing.md`. It overrides the `angular-developer` skill's testing references.

### Issue tracker

Issues and specs are local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded on each issue's `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Code style

### Readability over DRY

Don't pull small duplicates into helpers. Bundling domain data into a named type is fine (e.g. `Credentials`), but never hide `inject()` calls behind a helper, unless it's an `inject*` function that asserts its injection context (e.g. `injectReturnUrl`, `injectLiveData`). //TODO human-review this rule & exceptions

Report duplication only, unless the copies are long, likely to drift apart, or in 3+ places.

### Comments and naming

Names and tests carry the documentation. A comment that explains code marks a missing name or test.

- **Write no comments inside function bodies**, in any TypeScript or script file, spec files included. Move each explanation to where it can't drift: a behaviour goes into a test name, a reason for a step into the name of a small extracted function. Delete an explanation that only restates the code.

  ```ts
  // Before
  // Browsers only report a change when the selection changes; clear it so the same file can be picked again.
  input.value = '';

  // After
  this.#letTheSameFileBePickedAgain(input);
  ```

- **Pin behaviour with tests.** A comment describing behaviour no test pins becomes that test: write it, see it pass against the current code, then delete the comment. Name tests as `docs/agents/testing.md` says, so a module's test list reads as its specification.
- **Write TSDoc only on generic code used in many places**, e.g. `injectLiveData`, the Firebase providers and tokens, `renderApp`, the fakes' options and shared test helpers. Feature data-access services and components carry none. The one exception is an extracted function whose name alone would mislead. Mention an ADR only in the TSDoc of the generic piece it constrains.
- **Match name length to scope.** Give functions long names in a small scope (`#` methods, module-local functions) and short ones in a large scope (public API). Give variables the inverse: short when they live a few lines, descriptive when they span a module or class. Keep existing public names (`injectLiveData`, `track`, `ref`, the `AuthSession` commands, service signals), so interfaces and fakes stay put, and rename variables only in code you touch anyway. In this example, the public method and the module constant travel far, the private method is called once, and `m` lives for one expression:

  ```ts
  const maxAvatarBytes = 2 * 1024 * 1024;

  uploadAvatar(image: Blob): Promise<void>
  #storeAvatarWhereOnlyItsOwnerMayWrite(uid: string, image: Blob): Promise<string>

  import('./notes/notes.routes').then((m) => m.notesRoutes)
  ```

- **Keep as comments** only:
  - a one-line warning of a consequence no name or test can carry, above the declaration or rule it guards (e.g. `// No SVG: it can carry scripts.`);
  - the Prototype begin/end markers in rules files;
  - tool directives such as `// @vitest-environment node` or lint suppressions.
- **In config, workflow and server-config files**, keep only comments that give a reason or a warning, and state intent in step `name:` fields where the format allows. In rules files, express each check as a named rule function. In HTML templates, replace a comment with a test wherever a test can pin it.

### Component templates

Templates longer than 10 lines go in a separate `<name>.html` file next to the component, referenced with `templateUrl`. Shorter templates stay inline in `template`. This overrides the `angular-developer` skill's "inline for small templates" guidance.

## Workflow

### Branches and pull requests

Implement each ticket on its own branch off `main`, named `<feature-slug>/<NN>-<short-slug>` after the ticket file (e.g. `baseline/03-sign-in` for `.scratch/baseline/issues/03-sign-in-email-and-google.md`). The work reaches `main` only through a pull request, even when a skill says to commit to the current branch. PR #2 is the model for the description.
