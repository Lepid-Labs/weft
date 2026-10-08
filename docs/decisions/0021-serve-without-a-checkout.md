# 0021 Serve without a checkout: fetch as a fallback, never an override

Status: accepted

## Context

A reader should be able to browse a repo's docs without cloning it first:
`npx @lepid-labs/weft serve --gh org/repo --open` (#77). The repo's config may reference other repos
([0020](0020-multi-repo-roots-by-identity.md)), some of which the reader may already have checked out.

## Options

- **Tarballs**: no history. They would silently reintroduce the date-less failure mode Weft exists to catch
  ([0019](0019-content-hashes-not-timestamps.md)).
- **A blobless partial clone (`--filter=blob:none`)**: trees and commits survive, so `git log` still answers, and
  `modified` dates and the history rules behave exactly as over a checkout.

## Decision

**`weft serve --repo org/repo [--ref …]` fetches as a fallback and never overrides a real local checkout.**

- It fetches the repo, loads its config from the cache, fetches whatever that config references that no real local
  checkout covers, and serves the merged graph. A `repos` entry that resolves to an existing path always wins.
- Transport is a blobless partial clone.
- Clones are cached per resolved sha, with a 15-minute TTL on branch ref resolutions and `--refresh` to force one. An
  interrupted clone lacks its completion marker and is redone.
- Auth comes from `GH_TOKEN` or `GITHUB_TOKEN`, else `gh auth token`, and is handed to git through `GIT_CONFIG_*`
  environment variables so the token never reaches `.git/config` or a process listing.
- Fetched roots are read-only by construction: manifests land under the cache-resident root's own `.weft/`, and
  `WeftService.watch` skips any root inside the cache.
- `--dir <path>` re-roots at a subdirectory of the fetched repo (or of a local root), so one repo can carry several
  sites, each with its own config. The path must be relative and stay inside the root, because outside a cache entry
  is another repo's clone.
- Plain `weft serve <dir>` never fetches.
- GitHub only, in one binary: there is no `weft-standalone` package.

## Consequences

- `weft check` over fetched roots (reporting them separately, or a `--local-only` mode) is deliberately deferred.
- With `--repo`, a local config would live in the fetch cache, so the `--style` and `--style-url` flags are the only
  per-run override.
- The cache layout, TTL and auth are described in [repo fetching](../design/repo-fetching.md), and usage in the
  [multiple repositories guide](../guides/multiple-repositories.md).
