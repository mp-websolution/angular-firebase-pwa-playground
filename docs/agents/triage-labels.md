# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                                                            |
| -------------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue                                            |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information                                           |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent                                            |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation                                                      |
| `wontfix`                  | `wontfix`            | Will not be actioned                                                               |
| _(none: repo-local)_       | `agent-done`         | An agent implemented it; a human reviews, decides how to proceed and when to merge |

`agent-done` is a repo-local status, not one of the skills' canonical roles. It is distinct from `ready-for-human`, which means a human must implement the issue.

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.
