# Graph and manifest

The graph is Weft's engine: nodes for documents and generated outputs, edges for the links between them, and anchors
for linkable positions inside a document. It is derived from source on every build and serialized as a manifest that
every consumer reads. This design covers how the graph is built, what each node and edge records, the manifest
format, and how several projects share one graph. It serves the indexing, multi-project and external-tool
requirements in [requirements](../requirements.md).

## Approach

### Building the graph

Source files are the truth and the manifest is derived from them, never the other way round. `weft index` and
`weft serve`'s watcher write it, by default to `docs/.weft/manifest.json`, and it is never hand-edited.

Core builds it in three steps. `buildRootGraph` scans each docs root, `mergeGraphs` combines the roots, and
`splitManifest` partitions the result back per project. Inside `mergeGraphs` the order is part of the contract
([0018](../decisions/0018-one-contribution-format.md)):

1. Source, indexed from every docs root. Indexing rendered output instead would lose sidecars and source structure.
2. Contributions, in sorted file order, so a build-declared node is in the graph before anything below runs.
3. Published-form resolution ([links and anchors](links-and-anchors.md#published-form-resolution)), which can
   therefore target a contributed node.
4. Include defaults stamped onto `includes` edges ([rendering pipeline](rendering-pipeline.md#include-expansion)).
5. Ordering and nav filtering (`docOrder`, `docOrderStrict`) over the combined set, so a contributed node honours
   `docOrder` exactly like an indexed one.

`mergeGraphs` is a pure function over graphs already scanned; the `build` block it needs is computed outside it
([manifest freshness](manifest-freshness.md)).

### Which files are indexed

`INDEXED_EXTENSIONS` and `EXTENSION_MAP` are two lists on purpose (#24). `EXTENSION_MAP` answers "how do I parse this
if handed it"; `INDEXED_EXTENSIONS` answers "which files do I go looking for". A file can be parseable without being
something to scan for. The `extensions` config extends the indexed set at runtime. It may add an extension, and may
opt in one that `EXTENSION_MAP` already parses but does not index by default (`.json`), but it may never remap an
extension Weft already indexes, since that would silently change how already-indexed files of that type parse.
`INDEXED_EXTENSIONS` is shared by the indexing glob and by the unresolved-link check, so the two cannot drift
([validation](validation.md#unresolved-edges)).

### Computed node properties

`contentHash` and `lineCount` are captured in `buildRootGraph` while each file is already in hand, so nothing re-reads
the docs tree to get them. Both are optional: a node declared by an external build, or a binary artifact, may
legitimately have neither. `contentHash` covers frontmatter as well as body (recipe under Interfaces). `lineCount`
counts the way `wc -l` and editors agree: a trailing newline ends the last line rather than starting an empty one.

`version` is declared, `modified` is computed, and neither is read naively:

- **`version`** comes from frontmatter, read from the YAML scalar's source text (`scalar-source.ts`), because parsing
  an unquoted `2.10` yields 2.1 and would report a mismatch that exists only in the parse. A sidecar's `sourceHash`
  shares the reader: sixteen hex characters that happen to be all digits would otherwise parse as an integer and lose
  their leading zeros. A missing version is normal; an append-only registry has none.
- **`modified`** is the last commit's author date, from the single `git log --raw` walk per docs root
  ([validation](validation.md#git-history)). Not modification time
  ([0019](../decisions/0019-content-hashes-not-timestamps.md)), and not committer date, which a rebase rewrites,
  reporting the whole branch as changed today. Git failing for any reason yields no dates rather than an error,
  because a docs set unpacked from a tarball still has to index.

Deliberately absent: modification time, and file size, which no check needs and which would be ambiguous next to a
hash that normalizes line endings.

### Navigation filtering

`docOrderStrict` is a nav filter, not a graph filter. It marks unlisted nodes `hiddenFromNav` and the doc tree skips
them; they stay reachable by link, search and traversal. It used to drop them from the node list, which left every
edge touching one of them dangling; this repo's own manifest shipped three such edges. The graph stays complete so
every edge endpoint resolves. Artifacts are always `hiddenFromNav`.

### Several projects in one graph

A `projects` config namespaces node ids by project slug (`alpha/api.md`) and writes a manifest per project, in that
project's docs root under `.weft/`, plus a merged one under the project root's `.weft/`. A single-`docsDir` config
keeps bare ids and a single manifest, so the change is opt-in. `WeftService` merges the per-project graphs in memory,
so every consumer still sees one `Manifest`.

Projects may live in other repositories, named by identity rather than by path
([0020](../decisions/0020-multi-repo-roots-by-identity.md)). Everything derived from a repo-backed root
(`WeftProjectRef.docsDir`, `DocsRoot.dir`) stays checkout-relative with the identity alongside, so a manifest never
embeds one machine's paths. For the same reason `docOrder`'s path-prefix matching skips repo-backed roots; order them
by node id. `weft index` never writes into a checkout it does not own, since that would dirty its git status on every
index: an external root's manifest lands under the meta repo's `.weft/projects/<slug>/`, `manifestInRepo: true` is the
per-project opt-in to writing it in the repo, and `.weft/projects.json` records where each manifest actually is.

Several things multi-repo needed were already true by accident through plain `resolve()`: out-of-tree roots indexing
into one namespaced graph, cross-repo relative links resolving to edges, per-root git history (each node dated from
its own repo), and reads and watch over external roots. `multi-repo.test.ts` pins each one with two real git
repositories, so none can regress silently.

## Alternatives

- **Deriving `INDEXED_EXTENSIONS` from `EXTENSION_MAP`.** An earlier draft did, which reads as removing duplication
  but collapses two questions. It would have swept `.json` into the defaults and changed `isIndexedPath`, which gates
  whether an unresolved link is reportable: a link to a missing `./schema.json`, correctly skipped today, would become
  an `edge-target-missing` error, and an existing project would fail `weft check` on upgrade having changed nothing.
- **Dropping hidden nodes from the graph.** Rejected under navigation filtering.
- **Per-tool adapters for external builds.** Rejected in [0018](../decisions/0018-one-contribution-format.md).

## Interfaces

- **Manifest** ([types.ts](../../packages/core/src/types.ts), `Manifest`, `WeftNode`, `WeftEdge`, `Anchor`). JSON,
  currently `version: 2`; version 2 made anchors objects. Top level: `nodes`, `edges`, and the optional `projects`
  (multi-project only), `site` (presentation config for the UI) and `build`
  ([manifest freshness](manifest-freshness.md)).
  A per-project manifest (`ProjectManifest`) holds that project's nodes and the edges originating in it; targets may
  point into other projects. `projects.json` (`ProjectsIndex`) lists each project's manifest path and the merged one's.
- **Node ids** are the file's path relative to its docs root, with `/` separators, prefixed by the project slug in
  multi-project mode. Node `type` is `markdown`, `openapi` or `artifact`.
- **Edges** join two `{ node, anchor? }` references with a `type` and optional `label`. Any string is a valid type;
  links default to `references`, and `includes` and `derives-from` carry defined semantics
  ([rendering pipeline](rendering-pipeline.md#include-expansion), [validation](validation.md#artifacts-and-staleness)).
  `resolvedFrom` records the link as written when it differed from the node it resolved to.
- **Content hash recipe** ([content.ts](../../packages/core/src/content.ts)): strip a leading BOM, convert CRLF to LF,
  SHA-256, keep the first 16 hex characters. Git preserves neither line endings nor BOM across platforms, so a
  raw-byte hash would call every document changed the moment CI checked it out differently from the tree that
  produced it. The recipe is published so an external build can declare a hash instead of having Weft recompute it.
  An artifact's hash is over raw bytes instead ([validation](validation.md#artifacts-and-staleness)).
- **Contribution files** ([contributions.ts](../../packages/core/src/contributions.ts)), found by the `contributions`
  config globs: YAML or JSON with `version: 1`, an optional `tool` name echoed in messages, and optional `nodes`,
  `edges`, and `metadata` patches keyed by node id. A patch may set presentational and declared fields (title,
  description, theme, ogImage, hiddenFromNav, contentHash, lineCount, version, modified) but never `id`, `type`,
  `anchors` or `project`: those are extraction facts and topology, and a build contributes what Weft cannot see. A
  contributed node colliding with an indexed one warns rather than fails; it usually means build output is landing
  inside `docsDir`.

## Risks

- The merge order is a contract. Reordering `mergeGraphs`' steps silently changes which nodes published-form
  resolution and `docOrder` can see.
- History-derived fields are empty outside a git repository, and every check reading them treats empty as "nothing
  to say", so a tarball-unpacked docs set passes checks it would fail in a clone.
