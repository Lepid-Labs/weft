# Manifest freshness

A manifest carries its own provenance, so a consumer that reads `manifest.json` directly (SSR, the site's
`gen-manifest.mjs`) or calls `WeftService.freshness()` can tell whether it still reflects the docs tree. This design
covers the `build` block, what its inputs hash covers, and the tri-state check with its cache. It serves the
freshness requirements in [requirements](../requirements.md), and applies
[0019](../decisions/0019-content-hashes-not-timestamps.md): computed from content, never modification time.

## Approach

### The build block

`Manifest.build` holds `builtAt` and `inputsHash`. It lives on the manifest rather than in a file beside it, so every
direct reader gets one read and can never hold a graph with no idea how stale it is. It is optional and absent from a
manifest written by an older Weft; nothing reads its absence as an error.

`mergeGraphs` stays pure. Stamping provenance inside it looked obvious and is wrong: it is a pure function over
already-scanned graphs, while computing the inputs hash means globbing and reading. `buildManifest` and
`WeftService.rebuild` compute the build block and pass it in, the same precedent as `loadContributions`.

That made `manifest.ts` import `freshness.ts`, which needs the same indexed-extension list. Leaving the list in
`manifest.ts` would create an import cycle and copying it would drift, so `INDEXED_EXTENSIONS`,
`resolveIndexedExtensions` and `isIndexedPath` moved to `anchors/index.ts`, which already owned extension-to-doctype
mapping. `config.ts` exporting `CONFIG_FILES` is the same move for the same reason.

### What the inputs hash covers

The inputs hash is a baseline of everything the manifest's own nodes cannot already say changed:

- the sorted set of indexed file and artifact paths across every docs root, honouring the `extensions` config, so a
  project that opted extra extensions in has those files in the baseline too;
- the content of every input that is not itself a node: sidecar `.weft` files, contribution files, and the config
  files, including the `weft.config.local.yaml` overlay.

An edited document's content is deliberately left out: every node already carries a `contentHash`, and re-hashing it
here would duplicate what the node records. The hash therefore catches an add, a delete, or a change to a non-node
input; the node hashes catch an edit.

`.weft/` itself is excluded, mirroring the chokidar watcher's ignore, so writing the manifest never makes it look stale
to itself. The analogy does not fully transfer: chokidar traverses dot-directories by default, so its ignore is
load-bearing, while `glob` already excludes them from `**`, so this exclusion is currently redundant. It is kept as
the guard for the day a glob here adds `dot: true`.

### The freshness check

`WeftService.freshness()` compares the current tree against the recorded `build` block and returns one of three
statuses (under Interfaces). `unknown` is the honest answer for a manifest with no `build` block.

Comparing the baseline is cheap, but confirming that no document was edited means reopening and rehashing every file.
The result is therefore cached for 2 seconds: long enough that a burst of calls inside one agent turn lands inside it,
short enough that a human edit is visible on the next turn rather than the next minute.

- Concurrent cache misses coalesce onto one re-read.
- `rebuild()` invalidates the cache immediately rather than waiting it out, and computes a fresh `build` block.
- A generation counter keeps a check that a rebuild overtook from writing its pre-rebuild answer into the cache; the
  caller still receives it.
- `rebuild()` is the only way the manifest refreshes outside `weft serve`'s own file watcher.

## Alternatives

- **A sidecar provenance file.** Rejected: each direct reader would need two reads and could end up with a graph and
  no provenance.
- **Naming the field `sourceHash`.** Rejected: `WeftEdge.sourceHash` already means "the source's hash when an artifact
  was generated", and a second field meaning "hash of everything the indexer read" would collide on the most
  confusable axis available. The field is `inputsHash`.
- **Modification times.** Git preserves none, so a fresh clone or a CI checkout makes every file look simultaneously
  changed ([0019](../decisions/0019-content-hashes-not-timestamps.md)).
- **Folding `unknown` into another status.** Folding it into `fresh` claims confidence about provenance that was never
  recorded; folding it into `stale` makes every pre-upgrade manifest look broken.

## Interfaces

- **`build` block** ([types.ts](../../packages/core/src/types.ts), `ManifestBuild`): `builtAt` is an ISO 8601 UTC
  timestamp in `toISOString()` form; `inputsHash` is opaque, meaningful only when compared with a fresh computation
  ([freshness.ts](../../packages/core/src/freshness.ts)).
- **`WeftService.freshness(): Promise<Freshness>`**, with `builtAt` absent when the status is `unknown`:

  | Status | Meaning |
  |--------|---------|
  | `fresh` | The inputs hash matches, and every node's re-read content still matches its `contentHash` |
  | `stale` | A document was added, removed or edited, or a non-node input changed |
  | `unknown` | The manifest has no `build` block to compare against |

## Risks

- The `.weft/` exclusion is redundant today, so a change that adds `dot: true` to a glob is the moment it starts to
  matter; removing it as dead code would reintroduce self-staleness.
- A caller polling faster than the 2-second cache sees a result up to 2 seconds old.
