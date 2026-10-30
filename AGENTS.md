# Agents

This file is Baseline. A Project's own agent instructions, if it has any, are in `docs/project/AGENTS.md`: read that file too. It adds to this one and wins where they disagree.

## Agent skills

### Testing

Before writing or updating tests, read `docs/agents/testing.md`. It overrides the `angular-developer` skill's testing references.

### Issue tracker

Issues and specs are local markdown files under `.scratch/<spec-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), plus the repo-local `agent-done` status, recorded on each issue's `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` points at the Baseline glossary (`CONTEXT.md`) and the Project glossary (`docs/project/CONTEXT.md`). ADRs are in `docs/adr/` (Baseline) and `docs/project/adr/` (Project, numbered on their own). See `docs/agents/domain.md`.

## Code style

Code style lives in `CODING_STANDARDS.md`, which overrides the `angular-developer` skill where they disagree (signal forms). Lint caps inline templates at angular-eslint's default of 3 lines; a longer one goes in a `templateUrl` file.

## Workflow

### Branches and pull requests

Implement each ticket on its own branch off `main`, named `<spec-slug>/<NN>-<short-slug>` after the ticket file (e.g. `profile/03-display-name` for `.scratch/profile/issues/03-edit-display-name.md`). The work reaches `main` only through a pull request, even when a skill says to commit to the current branch. Write the description with the `/mattpocock-skills:pr` skill.
