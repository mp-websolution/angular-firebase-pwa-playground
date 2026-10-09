# 01: Comment and naming rules in AGENTS.md

**Spec:** `.scratch/clean-code/spec.md`

**What to build:** A "Comments and naming" section under Code style in AGENTS.md that an agent can follow without this conversation. It covers:
- no comments in function bodies; extract a named function instead
- TSDoc only on generic code used in many places, or on an extracted function whose name alone would mislead
- function names long in small scope, short in large scope; variables the inverse
- tests and test names are the documentation; a comment describing untested behaviour becomes a test
- kept as comments: warnings of consequences that no name or test can carry, and the Prototype markers in rules files
- config and workflow files keep reason/warning comments only, with intent in step names where possible

Leave the existing `TODO human-review` note alone.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Section added to AGENTS.md, short and imperative, with one example each of the naming rule and of extracting a comment into a name
- [x] `docs/agents/testing.md` points to it where it says how to name tests
- [ ] Merged before any other ticket of this spec
