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

   The tag tells CI which release the Project merged last. Only repo admins can push it (the tag ruleset covers `baseline-v*`).

6. **Merge the PR with a merge commit**, never squash or rebase. Either would drop the release from `main`'s history, so the next merge would conflict on every file the release changed.

## What the update script refuses

It stops before changing anything when:

- the argument isn't a Baseline release tag of the form `baseline-vX.Y.Z`, e.g. a `vX.Y.Z` deploy tag;
- there is no `upstream` remote. It prints the `git remote add upstream …` command for the Template;
- the working tree has uncommitted changes. It lists them;
- `upstream` has no such release;
- the branch `merge-baseline-vX.Y.Z` exists already, e.g. from an earlier attempt. Finish the merge there, or delete the branch and run the script again.
