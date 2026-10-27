# 06: Update script merges one Baseline release

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** A Project developer merges a Baseline release with one npm script, given the release tag. It refuses without an `upstream` remote (saying how to add one), with a dirty working tree, or with a tag not of the form `baseline-vX.Y.Z`. It fetches only that tag, creates a branch named after the release, merges the tag with a merge commit, and prints the upgrade notes between the newest reachable Baseline release and the new one. On conflicts it stops and lists the files. It never pushes; it ends by telling the developer to push the branch and the tag and open a PR. The upgrade notes doc says how to resolve npm manifest and lockfile conflicts and a release that changes the deleted notes Feature. See the spec's "Update script" decision.

**Blocked by:** 02 (Feature rules fragments; starts the script-test suite), 04 (Projects and Baseline releases defined)

**Status:** agent-done

- [ ] Script tests use throwaway git repos: a Template with Baseline release tags and `v*` deploy tags, and a Project cloned from it
- [ ] Merges the asked release on a new branch; fetches no `v*` tag and no other Baseline release tag
- [ ] Prints the upgrade notes between releases
- [ ] Refuses with no `upstream`, a dirty tree, or a non-release tag, each with a clear message
- [ ] Stops on a conflict and lists the conflicting files; never pushes
- [ ] The Baseline manual describes the sync routine; `npm run check` passes
