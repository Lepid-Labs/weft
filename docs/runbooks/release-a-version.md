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

1. Start a release branch from an up-to-date `main`:

   ```sh
   git switch main && git pull && git switch -c release/v<version>
   ```

2. Set the version in every published package:

   ```sh
   node scripts/set-version.mjs <version>
   ```

   It prints one `@lepid-labs/<package>@<version>` line per package. It rewrites only the `"version"` line, so
   `just lint` stays clean.
3. In `CHANGELOG.md`, rename `## [Unreleased]` to `## [<version>] - <YYYY-MM-DD>`, add a new empty
   `## [Unreleased]` above it, and update the compare links at the bottom.
4. Commit as `chore: release v<version>`, push the branch, and open a pull request with the same title. Its body
   lists the changes since the last release. Merge it once CI passes.
5. Tag the merge commit and push the tag:

   ```sh
   git switch main && git pull && git tag v<version> && git push origin v<version>
   ```

   The tag must be on `main`. Pull requests are squash-merged, so a tag made on the release branch would point at a
   commit `main` never contains.
6. Watch the Release workflow: `gh run watch`. It checks that the tag matches `packages/cli/package.json`, builds
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
- **"tag does not match package version".** The tag is on the wrong commit. Delete it
  (`git push --delete origin v<version>` and `git tag -d v<version>`), then repeat step 5 on the right commit.
- **A broken version reached npm.** npm never reuses a version number. Deprecate it
  (`npm deprecate @lepid-labs/<package>@<version> "<reason>"`) and release a patch.
