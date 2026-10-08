# @lepid-labs/weft-core

Weft's document graph: indexing, links, anchors, validation and search over a docs tree. Every other package is an
adapter over it; see the [weft README](../../README.md) for how the packages fit together, and the
[architecture design](../../docs/design/architecture.md) for the service it exposes.

Two entry points: `@lepid-labs/weft-core` for Node (the indexer, `WeftService`, validation, fetching repositories),
and `@lepid-labs/weft-core/browser` for code that runs in a browser (types, section extraction, include matching,
OpenAPI parsing). The manifest it writes is described in the
[graph manifest design](../../docs/design/graph-manifest.md).

## Prerequisites

Node.js 24 or later, and git for document dates and the history-based checks.

## Tasks

From the repository root, `pnpm --filter @lepid-labs/weft-core <task>`; inside `packages/core`, `pnpm <task>`.

| Task | What it does |
|------|--------------|
| `build` | Compile to `dist/`, which plain-Node consumers such as the CLI load |
| `typecheck` | Type-check without emitting |
| `test` | Run the tests |

In the workspace, types and the UI's Vite build read `src/` directly; the published package points at `dist/`.
