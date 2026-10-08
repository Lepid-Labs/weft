# Release a version

Run this to publish every `@lepid-labs/weft*` package to npm at a new version. All packages share one version, and
the Release workflow publishes them from a tag. Where each piece lands is in
[Deploy the docs site](deploy-the-docs-site.md#topology).

## Prerequisites

- Permission to push tags to the GitHub repository.
- Every package already exists on npm with this repository's Release workflow as its trusted publisher. A package
  that has never been published needs [Publish a new package](publish-a-new-package.md) first.
- CI is green on `main`, and `CHANGELOG.md` has entries under `Unreleased`.

## Steps

1. Prepare the release:

   ```sh
   just release <version>
   ```

   It refuses to start with uncommitted changes, or when `release/v<version>` already exists. Otherwise it updates
   `main`, moves the changelog's `Unreleased` entries under `## [<version>] - <today>` with updated compare links, sets
   the version in every published package (one `@lepid-labs/<package>@<version>` line each), and commits all of it as
   `chore: release v<version>` on a new `release/v<version>` branch. With nothing under `Unreleased`, it stops with
   `nothing under Unreleased to release` before changing anything.
2. Check the commit with `git show`, then push the branch and open a pull request with the same title. Its body lists
   the changes since the last release, which are the new changelog section. Merge it once CI passes.
3. Tag the merged release and push the tag:

   ```sh
   just release-tag <version>
   ```

   It updates `main`, finds the squash commit titled `chore: release v<version>`, checks that its packages are at
   `<version>`, and tags that commit, even if other pull requests have merged since. It ends with
   `Tagged <sha> chore: release v<version> (#<n>)`. The tag must be on `main`: pull requests are squash-merged, so the
   commit on the release branch never reaches it.
4. Watch the Release workflow: `gh run watch`. It checks that the tag matches `packages/cli/package.json`, builds
   every package, and publishes each one whose version is not yet on npm, with provenance.

## Verify

Each package reports the new version:

```sh
for p in weft weft-core weft-ui weft-embed weft-react; do npm view @lepid-labs/$p version; done
```

The README's version badge reads npm, so it updates on its own.

## Recovery

- **The workflow failed partway.** Fix the cause, then re-run the workflow (`gh run rerun <run-id>`). Re-running is
  safe: it builds every package first, and pnpm skips versions already on npm.
- **`just release` failed partway.** Nothing has left your machine. Discard what it changed
  (`git restore CHANGELOG.md 'packages/*/package.json'`), delete `release/v<version>` if it was created
  (`git switch main && git branch -D release/v<version>`), fix the cause, and start again.
- **`just release-tag` found no release commit, or the wrong version.** The release pull request is not merged, or
  its title was changed. Merge it with the title `chore: release v<version>`.
- **"tag does not match package version".** The tag is on the wrong commit. Delete it
  (`git push --delete origin v<version>` and `git tag -d v<version>`), then repeat step 3.
- **A broken version reached npm.** npm never reuses a version number. Deprecate it
  (`npm deprecate @lepid-labs/<package>@<version> "<reason>"`) and release a patch.
