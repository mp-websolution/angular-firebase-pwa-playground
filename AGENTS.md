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

- **Keep function bodies to code**, in every TypeScript and script file. Turn each explanation into a small function whose name says why the step exists; delete it if it only restates the code.

  ```ts
  // Before
  // Browsers only report a change when the selection changes; clear it so the same file can be picked again.
  input.value = '';

  // After
  this.#letTheSameFileBePickedAgain(input);
  ```

- **Let tests document behaviour.** Name each test after the behaviour it pins (see `docs/agents/testing.md`), so a module's test list reads as its specification. A comment describing behaviour no test pins becomes that test: write it, see it pass, delete the comment. Spec files carry no comments.
- **Write TSDoc on generic code used in many places** (Live data, the Firebase providers and tokens, `renderApp`, the fakes' options, shared test helpers), and on an extracted function whose name alone would mislead. ADR references go in the TSDoc of the generic piece they constrain.
- **Match name length to scope.** Functions get long names in a small scope (`#` methods, module-local functions) and short ones in a large scope (public API). Variables get the inverse: short in a few lines, descriptive across a module or class. Rename variables only in code you touch anyway.

  ```ts
  const maxAvatarBytes = 2 * 1024 * 1024; // module scope: descriptive

  uploadAvatar(image: File) {} // public, called across the app: short
  #avatarPathOnlyTheOwnerMayWrite(uid: string) {} // private: says why
  avatarTypes.some((t) => t === image.type); // one-expression scope: short
  ```

- **Keep as comments** only a one-line warning of a consequence no name or test can carry (e.g. `// No SVG: it can carry scripts.`) and the Prototype begin/end markers in rules files.
- **In config, workflow and server-config files**, keep only comments that give a reason or a warning. In rules files, turn explanations into named rule functions. In workflows, state intent in step `name:` fields. In HTML templates, replace a comment with a test where a test can pin it.

### Component templates

Templates longer than 10 lines go in a separate `<name>.html` file next to the component, referenced with `templateUrl`. Shorter templates stay inline in `template`. This overrides the `angular-developer` skill's "inline for small templates" guidance.

## Workflow

### Branches and pull requests

Implement each ticket on its own branch off `main`, named `<feature-slug>/<NN>-<short-slug>` after the ticket file (e.g. `baseline/03-sign-in` for `.scratch/baseline/issues/03-sign-in-email-and-google.md`). The work reaches `main` only through a pull request, even when a skill says to commit to the current branch. PR #2 is the model for the description.
