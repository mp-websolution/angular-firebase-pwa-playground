# 01: Home's Features test follows the Feature route list

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** Adding or removing a Feature no longer means editing a Baseline test. Home's Features navigation test takes its expected links, their hrefs and their order from the Feature route list instead of naming the notes Feature. It assumes at least one Feature and fails when the list is empty. The features doc drops the step of adding a link to home's test, and the docs tell a Project to add its first Feature before deleting the notes Feature, or in the same PR. See the spec's "Home's Features test" decision.

**Blocked by:** None (can start immediately)

**Status:** agent-done

- [ ] Home's test names no Feature; it renders through `renderApp` and reads the Feature route list
- [ ] It checks each link's title, href and order, assuming at least one Feature
- [ ] The setup steps and the features doc say to add a Project's first Feature before deleting the notes Feature, or in the same PR
- [ ] The features doc no longer asks to edit home's test when adding or removing a Feature
- [ ] `npm run check` passes
