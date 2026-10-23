# Projects keep merging Baseline releases

A Project is created by cloning the Template with its history, not with GitHub's "Use this template", and keeps the Template as an `upstream` remote. From then on, changes flow one way: the Project merges Baseline releases, tags named `baseline-vX.Y.Z` on the Template's `main`. A Baseline fix is made in the Template and merged down, never made only in a Project. This replaces the earlier rule that a project goes its own way once created and changes don't flow back: with that rule every Baseline fix had to be copied into each project by hand.

"Use this template" starts an unrelated history, so every later merge would conflict on every file. Cloning keeps the shared history, so a merge only conflicts where both sides changed a file.

Baseline releases use the `baseline-` prefix because `vX.Y.Z` tags are the deploy tags in every repo, the Template's and each Project's. Fetching the Template's `v*` tags into a Project would mix the Template's deploys with the Project's own, so a Project fetches only the one Baseline release it merges. The prefix also lets a Project push the release it merged to its own origin, where its CI finds the newest one reachable.

To keep merges clean, every file belongs to one of four groups, listed in `scripts/baseline-config.json`: Feature files and Project-owned files belong to the Project, the npm manifest and lockfile are shared, and everything else is Baseline. The same file lists the specs and tickets under `.scratch/`, which are in no group: they are scratch work, cleared now and then, so the drift check skips them. A Project that changes a Baseline file has Baseline drift, which its CI reports before the next merge turns it into a conflict.

## Considered options

- **The Baseline as an npm library.** Projects would install it and update by version. Rejected: the Baseline is mostly app shell, routes, rules, CI workflows, deploy and docs, not importable code. Packaging it would need a library build, a registry and an extension API for every place a Feature plugs in, and the Playground could no longer try a Baseline change in place.
- **Git submodules.** The Baseline would sit in a subfolder pinned to a Template commit. Rejected: Angular, Firebase and GitHub Actions expect their config at the repo root, so the root files would still be copied by hand, and submodules add a second checkout step to every clone and CI job.
- **Runtime federation.** Baseline and Features as separately built and deployed apps. Rejected: it needs a host app, version negotiation and a deploy per part, far more than a static PWA on FTP webspace (ADR 0002) can justify, and the rules and CI would still be copied.
- **A one-time copy** ("Use this template", the earlier rule). Rejected: it cuts each Project off from every later Baseline fix and update.

## Consequences

- Building a Feature must not edit a Baseline file. Home reads the Feature route list instead of naming Features, and each Feature keeps its rules in fragments in its own folder.
- The Template changes a Project-owned or shared file only with an entry in `docs/upgrade-notes.md` saying what a Project must do, and bumps the major version when a Project must act by hand.
- A Baseline release contains the Baseline and the notes reference Feature only. Playground experiments stay on their own branches and never reach the Template's `main`. A Project deletes the notes Feature once.
- The tag ruleset protects `baseline-v*` like `v*`: only admins create, move or delete a Baseline release.
- Projects created with "Use this template" before this decision can't merge Baseline releases cleanly.
