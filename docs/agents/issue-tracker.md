# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One spec per directory: `.scratch/<spec-slug>/`
- The spec is `.scratch/<spec-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<spec-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- State is recorded as a `**Status:** <value>` line on its own near the top of every spec and ticket. The value is one of the five triage roles in `triage-labels.md`, or `resolved`
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<spec-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Resolve a spec ticket

The pull request that implements a ticket also closes it, so the ticket reads `resolved` on `main` exactly when its work is there.

- **Ticket:** on the integration branch (the branch the PR merges from), change the ticket's line to `**Status:** resolved` in a commit made before the PR is marked ready.
- **Spec:** when every ticket of the spec is `resolved` or `wontfix`, change the spec's line to `**Status:** resolved` in the same commit.
- **Pull request:** the PR carries the spec and ticket commits, as #43, #44 and #48 did. Record verification results (the commands run and their outcome) in the PR body; don't commit them.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
