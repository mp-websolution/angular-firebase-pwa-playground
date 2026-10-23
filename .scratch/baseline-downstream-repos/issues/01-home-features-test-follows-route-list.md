# 01: Home's Features test follows the Feature route list

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** Adding or removing a Feature no longer means editing a Baseline test. Home's Features navigation test takes its expected links, their hrefs and their order from the Feature route list instead of naming the notes Feature. When the list is empty, it expects no Features navigation. The features doc drops the step of adding a link to home's test. See the spec's "Home's Features test" decision.

**Blocked by:** None (can start immediately)

**Status:** agent-done

- [ ] Home's test names no Feature; it renders through `renderApp` and reads the Feature route list
- [ ] It checks each link's title, href and order, and that no Features navigation shows when the list is empty
- [ ] The features doc no longer asks to edit home's test when adding or removing a Feature
- [ ] `npm run check` passes
