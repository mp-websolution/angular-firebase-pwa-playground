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

## Workflow

### Branches and pull requests

Implement each ticket on its own branch off `main`, named `<feature-slug>/<NN>-<short-slug>` after the ticket file (e.g. `baseline/03-sign-in` for `.scratch/baseline/issues/03-sign-in-email-and-google.md`). The work reaches `main` only through a pull request, even when a skill says to commit to the current branch. PR #2 is the model for the description.
