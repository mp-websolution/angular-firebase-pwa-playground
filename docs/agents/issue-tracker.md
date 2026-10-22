# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One spec per directory: `.scratch/<spec-slug>/`
- The spec is `.scratch/<spec-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<spec-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a status line near the top of each file (see `triage-labels.md` for the role strings): `**Status:** <role>` in a ticket, matching its other bold fields, and `Status: <role>` in a spec
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<spec-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## When a skill says to close work

`/implement` and `/implement-spec` hand finished work to a human; they never merge it.

1. Set each implemented ticket to `ready-for-human`, and the spec too once all its tickets are. Commit that on the implementation branch.
2. Open the PR with the spec and ticket commits on the branch, so they reach `main` with the code.
3. Put verification results (check output, manual checks) in the PR body; commit none of them.

The human then decides how to proceed and when to merge.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
