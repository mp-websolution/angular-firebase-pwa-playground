# 03: App identity in one place

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** Renaming the app in a Project touches no Baseline component. One Project-owned constant holds the app's display name; home's route title and heading read it. The manifest and page head stay static, Project-owned files. See the spec's "App identity" decision.

**Blocked by:** None (can start immediately)

**Status:** agent-done

- [ ] Home's title and heading come from the app identity; no other Baseline file names the app
- [ ] Home's component test checks the heading shows the app identity's name
- [ ] `npm run check` passes
