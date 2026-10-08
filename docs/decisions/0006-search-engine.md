# 0006 Search with MiniSearch, with semantic search opt-in

Status: accepted

## Context

Search is a primary entry point: users start from a search, not a graph overview ([0003](0003-no-graph-overview.md)).
It is used by the browser UI, the MCP server, the CLI and the VS Code extension, and has to cover document titles and
full text, anchor names (headings, operation IDs, schema names), and annotations and decision-log entries.

There are two fundamentally different search models:

- **Keyword / full-text search**: the user types exact or partial terms and the engine matches tokens. Good for "find
  the auth endpoint spec" when the user knows the terminology.
- **Vector similarity search**: content is embedded into vectors, and queries find semantically similar content. Good
  for "find docs related to how we handle user sessions", where the user describes intent rather than exact terms. It
  also enables "find docs similar to this code change", which is central to UC-007 (AI updates docs) and UC-009 (PR
  review flags stale docs).

## Options

### MiniSearch (full-text only)

A lightweight in-memory full-text search library (~7 KB) that builds an inverted index from document content, with
prefix matching, fuzzy matching and field boosting.

| Dimension | Assessment |
|---|---|
| Index size | In-memory; fine for hundreds of docs, may strain at thousands |
| Query speed | Sub-millisecond for typical corpus sizes |
| Dependencies | Single npm package, no native modules |
| Rebuild cost | Fast — full reindex on `weft index`, incremental on file watch |
| Semantic understanding | None — keyword matching only |
| Works offline | Yes — no external services |

### SQLite FTS5 (full-text only)

Full-text search through SQLite's FTS5 extension, with a persisted on-disk index, ranking, phrase queries and boolean
operators.

| Dimension | Assessment |
|---|---|
| Index size | On disk; handles large corpora well |
| Query speed | Fast, even for large datasets |
| Dependencies | better-sqlite3 (native module — adds build complexity, Bun compat risk) |
| Rebuild cost | Fast; supports incremental updates |
| Semantic understanding | None — keyword matching only |
| Works offline | Yes |

Against it: a native module complicates the optional Bun binary ([0001](0001-implementation-language.md)) and adds
platform-specific build steps.

### Embedded vectors (semantic search)

Embed document chunks into vectors at index time, store them in a local vector index, and query by embedding the search
string and finding nearest neighbours.

- Embedding: a **local model** (such as transformers.js with a small model) runs in-process with no API key, after a
  ~50–100 MB download; slow first load, fast after. An **API** (OpenAI, Anthropic, Cohere, Voyage) is fast and high
  quality but needs a key and the network, and document content leaves the machine.
- Storage: **in memory** (hnswlib-node, vectra) is simple and fast, rebuilt on index, with only the native HNSW module
  as a dependency. **SQLite + sqlite-vss** carries the same native-module concern as FTS5 but gets full-text and vector
  search from one dependency. **LanceDB** is an embedded, serverless vector database with JS support.

| Dimension | Assessment |
|---|---|
| Index size | Vectors add ~1-4KB per chunk (depends on model dimension) |
| Query speed | Sub-millisecond for nearest-neighbor on typical corpus |
| Dependencies | Embedding model or API + vector storage library |
| Rebuild cost | Slow if re-embedding entire corpus; incremental helps |
| Semantic understanding | Yes — "find docs about authentication" matches "login flow", "OAuth", "session management" |
| Works offline | Only with local embedding model |

For it, above all for AI use: when an agent asks the MCP server for "documentation related to this code change," vector
similarity surfaces relevant docs even with no keyword overlap. This directly supports UC-006 (AI context), UC-007,
UC-009 and UC-012 (impact scoping).

### Hybrid: MiniSearch + embedded vectors

Full-text search for exact and keyword queries, vector similarity for semantic ones, with results merged by a scoring
strategy such as reciprocal rank fusion. The search API accepts both modes or auto-detects.

| Dimension | Assessment |
|---|---|
| Complexity | Two indexes to build and maintain |
| Coverage | Best of both — exact term matches AND semantic similarity |
| Configuration | Users who don't want vector search can disable it (no API key, no model download) |
| Default experience | Full-text works out of the box, vector search is opt-in |

## Decision

**Hybrid: MiniSearch (always on) plus a local embedding model (opt-in), behind one search API.**

Full-text search is table stakes and must work out of the box with zero configuration; MiniSearch does that with no
native dependencies. Vector similarity is where the differentiation is, especially for MCP and AI use, but it costs a
model download or an API key. The hybrid works immediately and offers vectors as the upgrade path for AI-assisted work.

- **MiniSearch** for full-text and keyword search: zero config, no native dependencies, always available.
- **Semantic search** through transformers.js with a local ONNX model (such as `all-MiniLM-L6-v2`), opt-in through
  config. It runs on CPU with no GPU; the ~25–80 MB model is downloaded once and cached. Embedding takes ~10–50 ms per
  chunk, and queries ~10 ms.
- **The embedding provider is configurable**: the local model by default when enabled, overridable to an API provider
  (OpenAI, Voyage and others) for teams that prefer higher-quality embeddings and accept the privacy and network
  trade-off.

### Index persistence and staleness

Both indexes are persisted to `.weft/` and updated incrementally, so CLI commands load the cached index instead of
rebuilding on every invocation.

- The full-text index is serialized with `MiniSearch.exportJSON()` to `.weft/search-index.json`, with an mtime map
  alongside it. The vector index is stored at `.weft/vectors.bin` with its own mtime map.
- On CLI startup, stat every doc file and compare mtimes against the stored values. Changed files are re-indexed
  incrementally (MiniSearch `remove()` + `add()`, re-embedding changed chunks); unchanged files are not touched.
- Full rebuild on `weft index`, on corrupt or missing index files, or when the index format version changes.
- During `weft serve`, the file watcher triggers incremental updates and re-serializes to disk: the in-memory index
  stays warm and the disk cache stays current for the next CLI invocation.

| Scenario (500 docs, 1 changed) | Cost |
|---|---|
| Full rebuild every time | ~500ms-1s |
| Load cached index, no changes detected | ~10-15ms |
| Load cached index, incremental update (1 doc) | ~15-25ms |

### Unified search API

A single `search()` method on `WeftService`; consumers never merge results themselves.

```typescript
search(query: string, options?: SearchOptions): SearchResult[]

interface SearchOptions {
  mode?: 'all' | 'fulltext' | 'semantic';  // default: 'all'
  limit?: number;
}

interface SearchResult {
  nodeId: string;
  anchor?: string;
  title: string;
  snippet: string;
  score: number;           // unified score (reciprocal rank fusion when both modes active)
  matchedBy: ('fulltext' | 'semantic')[];
}
```

- `mode: 'all'` (the default) runs both engines when semantic search is enabled, merges by reciprocal rank fusion, and
  returns one ranked list; it falls back to full-text only when semantic search is disabled.
- `matchedBy` tells consumers how each result was found, for UI indicators and debugging.
- An explicit `mode: 'fulltext'` or `'semantic'` serves consumers that need one, such as an agent looking up an exact
  function name rather than conceptually related docs.

### Configuration

```yaml
# weft.config.yaml
search:
  semantic:
    enabled: false            # opt-in
    provider: local           # local | openai | voyage | custom
    model: all-MiniLM-L6-v2   # default local model
```

## Consequences

Full-text search over document content and anchors, through MiniSearch, is what is built; semantic search remains the
future opt-in. The persistence plan above predates [0019](0019-content-hashes-not-timestamps.md) and still detects
changes by mtime, which 0019 rules out elsewhere because git preserves no mtimes; the two must be reconciled before the
persisted index is built.

## History

- 2026-03-20 to 2026-07-25: semantic search was to be configured in `weft.config.ts` through `defineConfig`; config
  became static data in [0017](0017-static-config.md).
