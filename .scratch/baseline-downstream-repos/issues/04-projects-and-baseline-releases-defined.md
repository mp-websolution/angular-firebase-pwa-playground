# 04: Projects and Baseline releases defined

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** The routine has words, a recorded decision and one list the docs and scripts share. The glossary gains **Project**, **Baseline release**, **Project-owned file** and **Baseline drift**, and **Template** is redefined (changes flow Template to Project through Baseline releases, never back). A new ADR records cloning with history, the one-way flow, the `baseline-` tag prefix and the rejected alternatives. A machine-readable list of path patterns defines the Feature, Project-owned and shared file groups (everything else is Baseline), next to the Template's repository name. A Baseline-owned upgrade notes doc starts with its entry format and no releases. The tag ruleset setup step adds `baseline-v*` with the same restrictions as `v*`. See the spec's "Glossary and ADR", "The four file groups" and "Baseline releases" decisions.

**Blocked by:** 03 (App identity in one place)

**Status:** agent-done

- [ ] `CONTEXT.md` defines the four new terms and the new Template meaning; "Fork" stays avoided
- [ ] A new ADR covers the decision and the rejected alternatives (npm library, submodules, runtime federation, one-time copy)
- [ ] The file-group list names Feature folders, Feature seeders, the Feature route list, the app identity, the production environment config, manifest, page head, icons, README, Project glossary, Project ADR folder, Project agents file, and the npm manifest and lockfile
- [ ] The upgrade notes doc explains semantic versions (major = a Project must act) and the entry format
- [ ] The README's ruleset step adds `baseline-v*`
- [ ] `npm run check` passes
