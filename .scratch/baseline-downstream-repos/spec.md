# Spec: Projects that keep merging Baseline releases

Status: ready-for-agent

## Problem Statement

The Baseline is ready for real products, but a product built on it today is cut off from it. A new project is created with GitHub's "Use this template", which starts a fresh, unrelated history, and the glossary says changes don't flow back. Every Baseline fix or update after that day has to be copied into each project by hand.

Merging the Template into a project instead would conflict all the time, because building a Feature means editing Baseline files:

- **Home's test lists every Feature by name.** Adding or removing a Feature means editing a Baseline test.
- **The security rules are one shared file per service.** Each Feature adds a delimited section inside the Baseline's rules, so every rules change upstream conflicts with every Feature downstream.
- **The app's identity is spread out.** Its name and colours sit in the manifest, the page head, home's title and heading, and the docs.
- **The README is the Playground's.** A project wants its own README, glossary terms and ADRs, and those collide with the Template's (two ADRs both numbered 0008).
- **Tags collide.** Release tags `vX.Y.Z` are the deploy tags in every repo. Fetching the Template's tags into a project would mix the Template's deploys with the project's own.
- **Nothing catches drift.** If a project changes a Baseline file, the next merge conflicts, and nothing tells anyone until then.

## Solution

A **Project** is created by cloning the Template with its history and keeping it as an `upstream` remote. From then on, changes flow one way, from the Template to the Project, by merging **Baseline releases**: tags named `baseline-vX.Y.Z`, cut on the Template's `main`. Baseline fixes are made in the Template and merged down, never fixed only in a Project.

To keep those merges clean, every file falls into one of four groups:

- **Baseline files.** Only the Template changes them.
- **Feature files.** A Feature's folder, its rules fragments, its seeder, and the Feature route list.
- **Project-owned files.** The app identity, the production web config, the icons, the manifest, the page head, the README, and the Project's glossary and ADRs. The Template ships a starting version and never changes them without an upgrade note.
- **Shared files.** The npm manifest and lockfile. Both sides change them, and the upgrade notes say how to resolve them.

The Baseline stops needing edits per Feature:

- Home's Features test reads the Feature route list instead of naming Features.
- Each Feature keeps its rules in a fragment file inside its own folder. The deployed rules for each service are assembled from the Baseline's rules plus every Feature's fragment.

Two scripts support the routine:

- **An update script** merges a given Baseline release into a new branch, fetching only that tag.
- **A Baseline drift check** fails when a Project has changed a Baseline file since the Baseline release it last merged. Projects run it in CI.

## User Stories

1. As a Project developer, I want to create a Project by cloning the Template with its history, so that later Baseline releases merge without unrelated-history conflicts.
2. As a Project developer, I want the Template kept as an `upstream` remote, so that I can fetch Baseline releases from it.
3. As a Project developer, I want written setup steps for creating a Project, so that I don't use "Use this template" by mistake.
4. As a Project developer, I want to merge a Baseline release with one command, so that I don't have to remember how to fetch a single tag.
5. As a Project developer, I want the update script to fetch only the Baseline release I asked for, so that the Template's deploy tags never enter my repo.
6. As a Project developer, I want the update script to merge on a new branch named after the release, so that the merge reaches `main` through a PR like any change.
7. As a Project developer, I want the update script to refuse when my working tree has uncommitted changes, so that a merge never mixes with unfinished work.
8. As a Project developer, I want the update script to refuse when there is no `upstream` remote, and say how to add one, so that a misconfigured clone fails clearly.
9. As a Project developer, I want the update script to refuse a tag that isn't a Baseline release, so that I can't merge an arbitrary Template commit or a deploy tag.
10. As a Project developer, I want the update script to show the upgrade notes of every release between the one I have and the one I'm merging, so that I know what to do by hand.
11. As a Project developer, I want the update script to stop at a conflicted merge and list the conflicting files, so that I resolve them and commit myself.
12. As a Project developer, I want the update script never to push, so that nothing leaves my machine until I review the merge.
13. As a Project developer, I want Baseline release tags named `baseline-vX.Y.Z`, so that they never collide with my Project's `vX.Y.Z` deploy tags or its tag ruleset.
14. As a Project developer, I want to push the merged Baseline release tag to my Project's origin, so that CI can find the release I last merged.
15. As a Project developer, I want a Baseline drift check in CI, so that a change to a Baseline file fails the PR before it turns into a merge conflict.
16. As a Project developer, I want the drift check to name each Baseline file that changed, so that I know what to move upstream or revert.
17. As a Project developer, I want the drift check to ignore Feature, Project-owned and shared files, so that normal product work never fails it.
18. As a Project developer, I want the drift check to compare against the newest Baseline release reachable from my commit, so that it follows the releases I actually merged.
19. As a Project developer, I want the drift check to fail clearly when no Baseline release is reachable, so that a Project created without history, or without pushed tags, is caught.
20. As the Template maintainer, I want the drift check skipped in the Template itself, so that the Template's own Baseline work never fails it.
21. As a Project developer, I want to add a Feature without editing any Baseline file, so that adding Features never conflicts with Baseline releases.
22. As a Project developer, I want home's Features test to follow the Feature route list, so that adding or removing a Feature needs no test edit in the Baseline.
23. As a Project developer, I want home's test to check that the Features navigation is absent when there are no Features, so that a Project with no Features is covered too.
24. As a Feature author, I want my Firestore rules in a fragment file in my Feature's folder, so that deleting the folder also deletes the rules.
25. As a Feature author, I want an optional Storage rules fragment in the same folder, so that a Feature that stores files follows the same pattern.
26. As a Feature author, I want my fragment to use the Baseline's rules helpers, such as the owner check and the trimmed-text check, so that I don't copy them.
27. As a Feature author, I want Feature fragments assembled in a stable order, so that the assembled rules don't change between runs.
28. As a developer, I want the rules assembled automatically before the emulators start, in `npm start` and the integration tests, so that I never run against stale rules.
29. As the maintainer, I want the deploy to assemble the rules before deploying them, so that production gets exactly what the integration tests ran against.
30. As a developer, I want the assembled rules ignored by git, so that adding a Feature never edits a committed, shared rules file.
31. As a developer, I want the assembled rules to be valid with no Features at all, so that removing every Feature leaves a working Baseline.
32. As a developer, I want the assembly to fail clearly on a fragment with no Feature folder or a Feature name that breaks the naming rule, so that a typo doesn't ship silently.
33. As a Project developer, I want the app's name and colours in one Project-owned place, plus the manifest and page head, so that branding the Project touches only Project-owned files.
34. As a Project developer, I want home's title and heading to read the app identity, so that I don't edit Baseline components to rename the app.
35. As a Project developer, I want the production web config to stay Project-owned, so that pasting my project's config never conflicts with a Baseline release.
36. As a Project developer, I want the emulator demo project and the npm and Angular project names left as the Baseline's, so that there are fewer files to change.
37. As a Project developer, I want my own README, with the Baseline manual kept elsewhere in the docs, so that my repo's front page describes my product.
38. As a Project developer, I want a Project glossary separate from the Baseline glossary, so that my domain terms never collide with new Baseline terms.
39. As a Project developer, I want a separate ADR folder with its own numbering, so that my decisions never collide with new Baseline ADRs.
40. As an agent working in a Project, I want the domain docs to point at both glossaries and both ADR folders, so that I use the Project's terms and respect both sets of decisions.
41. As an agent working in a Project, I want a Project-owned agents file linked from the Baseline's agent instructions, so that Project-specific instructions don't edit a Baseline file.
42. As a Project developer, I want package changes from Features, Dependabot and Baseline releases all allowed, so that dependency work doesn't fail the drift check.
43. As a Project developer, I want upgrade notes on resolving npm manifest and lockfile conflicts, so that I keep my Feature dependencies and still take the Baseline's versions.
44. As a Project developer, I want to delete the notes reference Feature from my Project, so that it doesn't ship in my product.
45. As a Project developer, I want upgrade notes on resolving a release that changes the notes Feature I deleted, so that I keep it deleted.
46. As a Project developer, I want Baseline releases to contain only the Baseline and the notes reference Feature, so that Playground experiments never land in my Project.
47. As the Template maintainer, I want to cut a Baseline release by tagging `main` as `baseline-vX.Y.Z`, so that releasing stays one step.
48. As the Template maintainer, I want only repo admins able to create, update or delete Baseline release tags, so that a release can't be moved or forged.
49. As the Template maintainer, I want semantic versions for Baseline releases, with a major bump whenever a Project must act by hand, so that Projects see from the number whether a merge needs work.
50. As the Template maintainer, I want an upgrade notes document with one entry per Baseline release, so that every change to a Project-owned or shared file comes with instructions.
51. As the Template maintainer, I want the four file groups written down in one place, which the drift check also reads, so that the docs and the check can't disagree.
52. As the Template maintainer, I want the glossary to define Project, Baseline release, Project-owned file and Baseline drift, so that docs, specs and agents use the same words.
53. As the Template maintainer, I want an ADR recording that Projects keep merging Baseline releases, so that the reversal of "changes don't flow back" is explained.
54. As the Template maintainer, I want the features doc updated to the 3 things a Feature owns, so that the steps for adding a Feature match the code.
55. As a developer, I want the update script and the drift check tested against real git repos, so that the tag and diff handling is proven, not assumed.
56. As a developer, I want those script tests to run in `npm run check`, so that CI covers them on every PR.
57. As the human maintainer, I want the README's setup steps for a new project to use the clone-with-history flow, so that the manual matches the routine.

## Implementation Decisions

**Glossary and ADR**

- New terms in `CONTEXT.md`:
  - **Project**: a repository created from the Template, which keeps merging Baseline releases.
  - **Baseline release**: a `baseline-vX.Y.Z` tag on the Template's `main`.
  - **Project-owned file**: a file the Template ships a starting version of, and the Project then owns.
  - **Baseline drift**: a Baseline file that differs in a Project from the Baseline release it last merged.
- **Template** is redefined: changes flow from the Template to Projects through Baseline releases, never back automatically. "Fork" stays in its _Avoid_ list.
- A new ADR records this decision. It covers cloning with history instead of "Use this template", the one-way flow, the `baseline-` tag prefix, and the alternatives that were rejected (Baseline as an npm library, submodules, runtime federation, a one-time copy).

**The four file groups**

- A single machine-readable list of path patterns defines the Feature, Project-owned and shared groups. Everything else is Baseline.
- The drift check reads this list, and the upgrade docs describe the same groups.
- **Feature files:** every Feature's folder, Feature seeders, and the Feature route list.
- **Project-owned files:** the app identity, the production environment config, the web app manifest, the page head (`index.html`), icon sources and rendered icons, the README, the Project glossary, the Project ADR folder, and the Project agents file.
- **Shared files:** the npm manifest and lockfile.
- The emulator demo project ID, the npm package name and the Angular project name stay Baseline. Projects don't rename them.

**App identity**

- One Project-owned TypeScript constant holds the app's display name.
- Home's route title and its heading read the app identity. Nothing else in the Baseline names the app.
- The manifest and page head stay static files, as Angular needs them, so they are Project-owned rather than generated. The existing comment that the theme colour must match the manifest stays.

**Rules assembly**

- The Baseline's Firestore and Storage rules become source files containing one insertion marker inside the documents match block (Firestore) or the bucket match block (Storage).
- A Feature's fragments live in its own folder, named after the Feature and the service. A Storage fragment is optional.
- The notes Feature's current rules section becomes its Firestore fragment.
- A Node script, in the style of the seed script, assembles each service's rules: the Baseline source with every Feature fragment inserted at the marker, in Feature-name order. Each fragment is wrapped in comments naming its Feature.
- It fails if a fragment's Feature folder has no routes file, or if a Feature name breaks the lowercase-and-hyphens rule.
- The assembled files go to a gitignored output folder. The Firebase config points there.
- `npm start`, the integration tests and the deploy each run the assembly before the emulators start or the deploy runs. The rules-testing setup, which relies on the emulator having loaded the deployed file, keeps working unchanged.

**Home's Features test**

- The expected links and their hrefs come from the Feature route list, in its order.
- When the list is empty, the test expects no Features navigation.

**Docs split**

- The current README content, the Baseline manual, moves into the docs. The Template's README becomes a short, Project-owned intro that links to the manual. Its Setup section describes creating a Project by clone and `upstream` remote, and drops "Use this template".
- Projects keep their own terms in a Project glossary and their decisions in a Project ADR folder with its own numbering.
- The domain docs guidance turns the repo into multi-context: a context map points at the Baseline glossary and the Project glossary. ADRs are read from both folders.
- The Baseline's agent instructions link to an optional Project agents file.
- The features doc lists 3 things a Feature owns (route entry, folder including rules fragments, seeder), drops the step of editing home's test, and describes fragments in place of delimited rules sections.

**Baseline releases**

- Tags are `baseline-vX.Y.Z`, on the Template's `main`, using semantic versioning. A major bump means a Project must act by hand.
- An upgrade notes document (Baseline-owned) has one entry per release. Any release that changes a Project-owned or shared file, or the notes Feature, says what a Project must do.
- A Baseline release contains the Baseline and the notes reference Feature only. Playground experiments stay on their own branches and never reach the Template's `main`.
- The tag ruleset's setup step adds the pattern `baseline-v*`, with the same restrictions as `v*` (admins only).
- `v*` deploy tags keep their current meaning in every repo.

**Update script**

- An npm script takes a Baseline release tag. It refuses:
  - when there is no `upstream` remote, and says how to add one;
  - when the working tree isn't clean;
  - when the argument isn't of the form `baseline-vX.Y.Z`.
- It fetches only that tag from `upstream`, with no other tags.
- It creates a branch named after the release, off the current branch, and merges the tag with a merge commit.
- It prints the upgrade notes entries between the newest Baseline release already reachable and the new one.
- On conflicts, it stops and lists the conflicting files.
- It never pushes. Its closing output tells the developer to push the branch and the tag, then open a PR.

**Baseline drift check**

- An npm script finds the newest `baseline-v*` tag reachable from HEAD. It lists files added, changed or deleted between that tag and HEAD, drops those matching the Feature, Project-owned and shared patterns, and fails listing the rest.
- It fails clearly when no Baseline release is reachable.
- CI runs it as a step in the checks workflow, with full history and tags fetched, only when the repository is not the Template. The Template's repository name is held next to the file-group list.
- It is not part of `npm run check`, because the Template never passes it meaningfully.

## Testing Decisions

- Good tests check external behaviour through the highest existing seam: what a user sees, what the rules allow, and what a script does to a git repo. They never check how the code does it. Follow `docs/agents/testing.md`.
- **Home component test** (existing seam, rendered through `renderApp`): the Features navigation shows a link for each entry of the Feature route list, by title and with its href, in list order. With no entries, the navigation is absent. Prior art: home's current Features test.
- **Security rules integration tests** (existing seam): the notes, profile and avatar rules specs run unchanged against the assembled rules. That they stay green proves that the assembly inserts the notes fragment and that the Baseline helpers are in scope. Prior art: the existing rules integration specs.
- **Script tests** (one new seam): a new Vitest suite beside the Sheriff tests creates throwaway git repos as fixtures. One plays the Template, with Baseline release tags and `v*` deploy tags; one plays a Project cloned from it. The suite runs the npm scripts as a developer would. It covers:
  - **Update script:** merges the asked release onto a new branch; fetches no `v*` tag and no other Baseline release tag; prints the upgrade notes between releases; refuses with a dirty tree, with no `upstream` remote, or with a non-release tag; stops and lists files on a conflict; never pushes.
  - **Drift check:** passes when only Feature, Project-owned or shared files changed; fails and names a changed, added or deleted Baseline file; compares against the newest reachable release after a second merge; fails clearly with no reachable release.
  - **Rules assembly:** a Feature-less fixture assembles to valid rules; a fragment without a Feature routes file, or with a Feature name that breaks the naming rule, fails with a clear message. Prior art: the Sheriff tests' fixture handling, including clearing leftover fixtures by glob.
- The script test suite runs inside `npm run check`, next to the Sheriff tests, so CI covers it.

## Out of Scope

- Extracting the Baseline into an npm library, git submodules, or runtime federation (rejected in the new ADR).
- Changes flowing from a Project back to the Template. Baseline fixes are made in the Template by hand.
- Creating any actual Project, its Firebase project, webspace or GitHub settings. The README describes those steps; this spec only updates them.
- Generating the manifest or page head from the app identity.
- Renaming the emulator demo project, the npm package or the Angular project per Project.
- Moving Feature seeders into Feature folders. They are already one file per Feature.
- Automating Baseline releases (changelog generation, release workflows). Cutting one stays a manual tag by an admin.
- A drift check for Projects created with "Use this template" before this change.

## Further Notes

- This contradicts the current Template definition in `CONTEXT.md` and the README line "Changes don't flow back". The new ADR supersedes both.
- Cut the first Baseline release, `baseline-v0.1.0`, only after this spec is implemented, so that every Project starts from a release where Features need no Baseline edits.
- Keeping Playground experiments off the Template's `main` changes how the Playground is used. If that proves too strict, the alternative is to let experimental Features into releases and have Projects delete them. The drift check doesn't care about Feature folders, so it allows either.
- Firestore rules have no include mechanism, which is why the rules are assembled by a script rather than split natively.
