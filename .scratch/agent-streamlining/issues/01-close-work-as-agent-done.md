# 01: Implement skills close work as agent-done

**Spec:** `.scratch/agent-streamlining/spec.md`

**What to build:** An agent finishing `/implement` or `/implement-spec` knows how to close work without guessing from old tickets: the issue tracker doc gets a "When a skill says to close work" section (set each implemented ticket's status to `agent-done`, the spec's too once every ticket is; commit that on the implementation branch, open the PR, stop; the human decides how to proceed and when to merge). The triage labels table gets an `agent-done` row below the five canonical roles, marked repo-local; `ready-for-human` keeps its meaning. See the spec's Implementation Decisions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The issue tracker doc has the close-work section, naming `agent-done`, the spec rule, and "never merge"
- [ ] The triage labels table lists `agent-done` as repo-local; the `ready-for-human` row is unchanged
- [ ] Tickets 02–05 of this spec are closed the new way
