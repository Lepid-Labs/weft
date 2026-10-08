# Repo fetching

`weft serve --repo org/repo` (or `--gh org/repo`) serves a GitHub repository's docs without a local checkout: Weft
fetches the repo, loads its config from the fetched copy, fetches whatever that config references that no local
checkout covers, and serves the merged graph (#77). Fetching is a fallback, never an override
([0021](../decisions/0021-serve-without-a-checkout.md)). This design covers the transport, the cache, authentication,
why fetched roots are read-only, and `--dir`. It serves the multi-repository and serving requirements in
[requirements](../requirements.md).

## Approach

### Fetch as fallback

A `repos` entry that resolves to an existing local path always wins over a fetch, so a developer's real checkout is
what gets served. Plain `weft serve <dir>` never fetches. GitHub is the only host, and it is all one binary: there is
no separate `weft-standalone` package.

### Transport

The transport is a blobless partial clone (`--filter=blob:none`). It was chosen over tarballs because trees and
commits survive it: `git log` still answers, so `modified` dates and the history-based rules behave exactly as they do
over a checkout ([validation](validation.md#git-history)). A tarball would silently reintroduce the date-less failure
mode Weft exists to catch.

### Cache

Clones live under `<cache>/github.com/<org>/<repo>/<sha>`. The cache root is `WEFT_CACHE_DIR`, else
`$XDG_CACHE_HOME/weft`, else `~/.cache/weft` ([cache.ts](../../packages/core/src/fetch/cache.ts)).

- **Keyed by resolved commit sha**, so a moved branch invalidates cleanly and repeated serves of an unmoved ref cost
  one `ls-remote` at most and no clone.
- **Ref resolutions are remembered** in `refs.json` beside the clones. A branch resolution is trusted for 15 minutes;
  a sha or tag resolution never expires, since the clone it names cannot change. `--refresh` forces re-resolution.
- **An interrupted clone is redone.** A completed clone carries a completion marker; one without it is cloned again
  rather than served half-written.
- `--ref` picks a branch, tag or full sha; the default is the remote's HEAD.

### Authentication

The token is `GH_TOKEN`, then `GITHUB_TOKEN`, then `gh auth token` when the GitHub CLI is on the path. Weft keeps no
credential store of its own, because anyone with a private repo to fetch already has one of these. The token reaches
git through `GIT_CONFIG_*` environment variables rather than `-c` arguments or a rewritten remote URL, so it never
lands in a process listing or in the cached clone's `.git/config` ([auth.ts](../../packages/core/src/fetch/auth.ts)).

### Read-only roots

Fetched roots are read-only by construction. Manifests for a fetched root land under the cache-resident root's own
`.weft/`, never in a working tree, and `WeftService.watch` skips any root inside the cache, since nothing edits a
checkout pinned to a commit. Because a fetched repo's local config would live in the cache, `--style` and `--style-url`
are the only per-run overrides that work with `--repo` ([architecture](architecture.md#serve-behaviour)).

### Sub-roots

`--dir <path>` re-roots at a subdirectory of the fetched repo, or of a local root, so one repo can carry several sites,
each with its own config. The path must be relative and stay inside the root, because with `--repo` the root is a
cache entry and anything outside it is another repo's clone ([sub-root.ts](../../packages/cli/src/sub-root.ts)).

## Alternatives

- **Tarballs.** Rejected under transport: no history, so no dates and no history-based rules.
- **Fetching over a local checkout.** Rejected: fetch is a fallback, so a local `repos` entry always wins.
- **A separate standalone package.** Rejected in favour of one binary.

## Interfaces

- **Command line:** `weft serve --repo <org/repo>` (alias `--gh`), with `--ref`, `--refresh` and `--dir`. Usage is in
  the [multiple repositories guide](../guides/multiple-repositories.md).
- **Environment:** `WEFT_CACHE_DIR` and `XDG_CACHE_HOME` place the cache; `GH_TOKEN` and `GITHUB_TOKEN` authenticate.
- **Cache layout:** `<cache>/github.com/<org>/<repo>/<sha>/` per clone and `<cache>/github.com/<org>/<repo>/refs.json`
  per repo.

## Risks

- `weft check` over fetched roots is deliberately deferred, including the choice between reporting fetched roots
  separately and a `--local-only` mode.
- A branch served within 15 minutes of a push may show the previous commit unless `--refresh` is passed.
- GitHub only: a repo hosted elsewhere cannot be served without a checkout.
