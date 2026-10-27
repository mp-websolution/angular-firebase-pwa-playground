# Baseline upgrade notes

What a Project must do when it merges a Baseline release (ADR 0008). This file is Baseline: only the Template changes it, and a Project reads it, never edits it. How to merge a release is in [Syncing Baseline releases](syncing-baseline-releases.md); `npm run baseline:update` prints the entries a merge needs.

## File groups

Every file belongs to one of four groups. `scripts/baseline-config.json` lists the patterns of the first three; every file that matches none of them is a Baseline file. The Baseline drift check reads the same list.

| Group | Files | Who changes them |
|---|---|---|
| Feature files | Every Feature's folder (including its rules fragments), the Feature seeders, the Feature route list. | The Project. A Baseline release changes them only in the notes reference Feature. |
| Project-owned files | The app identity and sign-in methods, the production environment config, the web app manifest, the page head, the icon sources and rendered icons, the README, the Project glossary, the Project ADR folder, the Project agents file and the Dependabot config. | The Project. The Template ships a starting version and changes it only with an entry here. |
| Shared files | The npm manifest and lockfile. | Both. An entry here says how to resolve conflicts. |
| Baseline files | Everything else. | Only the Template. A Project that changes one has Baseline drift. |

The list also names files in no group: the specs and tickets under `.scratch/`. They are scratch work, cleared now and then (e.g. before a Project's first Feature), so the drift check skips them.

## Versions

Baseline releases are tags `baseline-vX.Y.Z` on the Template's `main`, numbered with [semantic versioning](https://semver.org):

- **Major** (`X`): a Project must act by hand, e.g. a Project-owned or shared file changed shape, or a Feature must change to keep working.
- **Minor** (`Y`): new Baseline behaviour that needs nothing from a Project.
- **Patch** (`Z`): fixes that need nothing from a Project.

The rule holds from the first release on: a `0.x` release that needs action still bumps the major number.

A Baseline release contains the Baseline and the notes reference Feature only. Playground experiments stay on their own branches and never reach the Template's `main`.

## Cutting a release

1. In the PR that finishes the release, add its entry under [Releases](#releases), newest first.
2. Once it is merged, tag `main` as `baseline-vX.Y.Z` and push the tag. Only repo admins can (see the tag ruleset in the [Baseline manual's setup steps](baseline-manual.md#8-rulesets)).

## Entry format

Each release gets one entry under [Releases](#releases), newest first. The update script (`npm run baseline:update`) reads the entries from that section only, so keep to this shape:

- The entry starts with a level-3 heading that is the tag alone, e.g. `### baseline-v1.2.0`, and runs to the next heading. It has no headings of its own.
- A first paragraph says what changed in one or two sentences.
- **Project action:** a list of the steps a Project must take, one per changed Project-owned or shared file or notes Feature change, or `None.` when there is nothing to do. A major release always has at least one step.

```md
### baseline-v1.0.0

The web app manifest gets an `id`, so browsers keep an installed app when its start URL changes.

**Project action:**

- In `public/manifest.webmanifest`, add `"id": "/"`.
```

## Resolving conflicts that every release can bring

These apply to any release, so the entries don't repeat them.

### The npm manifest and lockfile

Both sides change `package.json` and `package-lock.json`: the Baseline bumps its dependencies, and the Project adds its Features' dependencies and merges Dependabot's updates. Keep both:

1. **Resolve `package.json` by hand.** Keep every dependency and script of both sides. Where both sides changed the same dependency, take the Baseline's version, unless the Project's is newer (a Dependabot update, or a version a Feature needs): then keep the newer one. Take the Baseline's version of the `engines` and `packageManager` fields.
2. **Let npm resolve `package-lock.json`.** Don't edit its conflict markers. Once `package.json` has no markers left, run `npm install`: npm resolves the conflicts in the lockfile itself. If it can't, start from the release's lockfile with `git checkout --theirs package-lock.json` and run `npm install` again, which adds the Project's own dependencies back.
3. `git add package.json package-lock.json`, then run `npm ci` and `npm run check` before committing the merge.

### GitHub Actions updates

Action bumps arrive with Baseline releases. The workflows in `.github/workflows/` are Baseline files, so only the Template's Dependabot bumps their actions; a Project's `.github/dependabot.yml` updates npm only (its `github-actions` entry is deleted in the [setup steps](baseline-manual.md#1-repository)). A Project gets the bumps when it merges the next release, and never edits the workflows to bump an action itself, which would be Baseline drift.

If a release changes `.github/dependabot.yml`, keep the Project's version, without the `github-actions` entry, and carry over what the release changed in the `npm` entry.

### A release that changes the notes Feature you deleted

A Project deletes the notes reference Feature once (`docs/features.md`, "What a Feature owns"). A release that changes it then conflicts with that deletion, or brings part of it back. Keep it deleted:

1. **Modify/delete conflicts** (`deleted by us`) on files in `src/app/features/notes/` or on `scripts/seed/feature-notes.mjs`: delete them again with `git rm <file>`.
2. **A conflict in the Feature route list** (`src/app/features/features.routes.ts`): keep the Project's list, with its own `startPage` and without a notes entry.
3. **Files that came back without a conflict:** a release that adds a file to the notes Feature brings it into the merge cleanly. Before committing (or in a commit after the merge), check that `src/app/features/notes/` and `scripts/seed/feature-notes.mjs` don't exist, and `git rm -r` what does.
4. **Read the entry.** If the release changed the notes Feature to show a new way of building Features, its entry says what your own Features should change to match.

## Releases

### baseline-v2.0.0

A Feature is now the start page at `/`, set by the required `startPage` in the Feature route list, and the Baseline's home page is gone: sign-out moves to the profile page, and signing in, signing up and signing out all end at `/` (ADR 0009). A Project picks its sign-in methods; `/sign-up` exists only with passwords. Live data covers shared and public data and queries that follow signals, and gains a `loading` signal. Notes is now a public, shared board.

**Project action:**

- In `src/app/features/features.routes.ts`, export `startPage`, `{ title, loadChildren }` without a `path`, pointing at the Feature that should own `/`, and take that Feature's entry out of `featureRoutes`. Give its children paths that no Baseline page or other Feature uses.
- Home is gone, and with it the Features navigation and the only page that showed the app's name: link `/profile` from a Feature where people need it, and other Features as literals. A Feature that shows the app's name reads it from `src/app-identity/app-identity.ts`.
- Sign-out is on the profile page.
- New Project-owned `src/app-identity/sign-in-methods.ts`: keep `['password', 'google']` or set your own, and match the console's providers (see the [Baseline manual's Authentication step](baseline-manual.md#3-authentication)).
- Rename `refFor` to `userRefFor` in every `injectLiveData()` call.
- Projects that kept the notes Feature: its data moved from `users/{uid}/notes` to `notes`, and there's no migration.

### baseline-v1.0.0

The first Baseline release: sign-in (email/password and Google), the user profile with avatar, Firebase wiring, Live data, PWA behaviour (offline shell, update prompt), tests, CI and the deploy pipeline, with the notes reference Feature. Projects start from it as described in the [Baseline manual's setup steps](baseline-manual.md#1-repository).

**Project action:**

None.
