# Syncing Baseline releases

How a Project merges a Baseline release from the Template (ADR 0008). The Project needs the Template as its `upstream` remote and its history from the clone, as the Baseline manual's [setup steps](baseline-manual.md#1-repository) create them. What each release asks of a Project is in the [upgrade notes](upgrade-notes.md).

## The routine

1. **Pick a release.** List the Template's releases without fetching them:

   ```sh
   git ls-remote --tags --refs upstream 'baseline-v*'
   ```

   Merge the newest one. Releases in between needn't be merged one by one: the update script prints the upgrade notes of every release since the one you merged last.

2. **Merge it** from an up-to-date `main` with a clean working tree:

   ```sh
   git switch main
   git pull
   npm run baseline:update -- baseline-vX.Y.Z
   ```

   The script fetches only that tag from `upstream` (no deploy tags, no other releases), creates the branch `merge-baseline-vX.Y.Z`, merges the tag there with a merge commit, and prints the upgrade notes entries from the newest Baseline release on your branch up to the new one. It never pushes.

3. **Resolve conflicts**, if the script stopped on some. It lists the conflicting files and leaves the merge in progress. Resolve each, `git add` it, then `git commit`. The upgrade notes say how to resolve the npm manifest and lockfile and a release that changes the notes Feature you deleted. A conflict in any other Baseline file means the Project changed it: take the release's version (`git checkout --theirs <file>`), and if the Project needs that change, propose it to the Template.

4. **Do what the upgrade notes say**, in commits on the same branch. Then run `npm ci` and `npm run check`.

5. **Push the branch and the release tag, and open a PR**, as the script's last lines say:

   ```sh
   git push -u origin merge-baseline-vX.Y.Z
   git push origin baseline-vX.Y.Z
   ```

   The tag tells CI which release the Project merged last, for the [Baseline drift check](#the-baseline-drift-check). **Only a repo admin can push it:** the Project's tag ruleset ([Baseline manual, Rulesets](baseline-manual.md#8-rulesets)) covers `baseline-v*`. If you aren't an admin, push the branch, open the PR and ask an admin to push the tag. The PR's drift check fails until the tag is on `origin`, so the admin pushes it before the PR can merge and re-runs the PR's checks if they ran without it.

6. **Merge the PR with a merge commit**, never squash or rebase. Either would drop the release from `main`'s history, so the next merge would conflict on every file the release changed.

## What the update script refuses

It stops before changing anything when:

- the argument isn't a Baseline release tag of the form `baseline-vX.Y.Z`, e.g. a `vX.Y.Z` deploy tag;
- there is no `upstream` remote. It prints the `git remote add upstream …` command for the Template;
- the working tree has uncommitted changes. It lists them;
- `upstream` has no such release;
- the branch `merge-baseline-vX.Y.Z` exists already, e.g. from an earlier attempt. Finish the merge there, or delete the branch and run the script again.

## The Baseline drift check

A Project changes only Feature, Project-owned and shared files (see the [upgrade notes](upgrade-notes.md)). A change to a Baseline file is Baseline drift: the next merge of a release that touches the same file conflicts. The drift check catches it on the PR instead:

```sh
npm run baseline:check-drift
```

It finds the newest Baseline release reachable from `HEAD`, lists every file added, changed or deleted since that release, drops those matching the Feature, Project-owned, shared and ignored (`.scratch/`) patterns in `scripts/file-groups.json`, and fails naming the rest. It fails too when no Baseline release is reachable, e.g. in a Project created without the Template's history. Before the tag of the merged release is on `origin` (step 5 above), it compares against the release merged before and fails naming every Baseline file the new release changed.

The checks workflow (`.github/workflows/checks.yml`) runs it on every PR and deploy of a Project, with full history and tags, and skips it in the Template, whose repository name `scripts/file-groups.json` holds as `templateRepository`. It isn't part of `npm run check`, because the Template, which changes Baseline files all the time, would always fail it.

When it fails, revert the listed changes. If the Project needs one, make it in the Template, cut a Baseline release and merge that.
