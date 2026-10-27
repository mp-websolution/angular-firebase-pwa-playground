# Baseline upgrade notes

What a Project must do when it merges a Baseline release (ADR 0008). This file is Baseline: only the Template changes it, and a Project reads it, never edits it.

## File groups

Every file belongs to one of four groups. `scripts/file-groups.json` lists the patterns of the first three; every file that matches none of them is a Baseline file. The Baseline drift check reads the same list.

| Group | Files | Who changes them |
|---|---|---|
| Feature files | Every Feature's folder (including its rules fragments), the Feature seeders, the Feature route list. | The Project. A Baseline release changes them only in the notes reference Feature. |
| Project-owned files | The app identity, the production environment config, the web app manifest, the page head, the icon sources and rendered icons, the README, the Project glossary, the Project ADR folder and the Project agents file. | The Project. The Template ships a starting version and changes it only with an entry here. |
| Shared files | The npm manifest and lockfile. | Both. An entry here says how to resolve conflicts. |
| Baseline files | Everything else. | Only the Template. A Project that changes one has Baseline drift. |

## Versions

Baseline releases are tags `baseline-vX.Y.Z` on the Template's `main`, numbered with [semantic versioning](https://semver.org):

- **Major** (`X`): a Project must act by hand, e.g. a Project-owned or shared file changed shape, or a Feature must change to keep working.
- **Minor** (`Y`): new Baseline behaviour that needs nothing from a Project.
- **Patch** (`Z`): fixes that need nothing from a Project.

The rule holds from the first release on: a `0.x` release that needs action still bumps the major number.

A Baseline release contains the Baseline and the notes reference Feature only. Playground experiments stay on their own branches and never reach the Template's `main`.

## Cutting a release

1. In the PR that finishes the release, add its entry under [Releases](#releases), newest first.
2. Once it is merged, tag `main` as `baseline-vX.Y.Z` and push the tag. Only repo admins can (see the tag ruleset in the README's setup steps).

## Entry format

Each release gets one entry under [Releases](#releases), newest first. The update script reads the entries from that section only, so keep to this shape:

- The entry starts with a level-3 heading that is the tag alone, e.g. `### baseline-v1.2.0`, and runs to the next heading. It has no headings of its own.
- A first paragraph says what changed in one or two sentences.
- **Project action:** a list of the steps a Project must take, one per changed Project-owned or shared file or notes Feature change, or `None.` when there is nothing to do. A major release always has at least one step.

```md
### baseline-v1.0.0

The web app manifest gets an `id`, so browsers keep an installed app when its start URL changes.

**Project action:**

- In `public/manifest.webmanifest`, add `"id": "/"`.
```

## Releases

None yet.
