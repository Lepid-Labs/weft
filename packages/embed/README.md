# @lepid-labs/weft-embed

Weft's reader as a drop-in browser bundle: mount a whole document graph, one document, or one section of a file in
any page, reading docs from GitHub or any base URL. See the [weft README](../../README.md) for how the packages fit
together.

How to load and mount it, theme it, and pin a version from a CDN is in the
[embedding guide](../../docs/guides/embedding.md). What it promises a host page, and what it refuses to touch, is in
the [embedding design](../../docs/design/embedding.md).

## Prerequisites

None at runtime: the bundle inlines its dependencies, and fetches Mermaid from a pinned CDN URL only when a page
holds a diagram. Building it needs `@lepid-labs/weft-core` built first, and SvelteKit synced in `packages/ui`.

## Tasks

From the repository root, `just build-embed` builds core, syncs the UI and builds this package. Inside
`packages/embed`, `pnpm <task>`:

| Task | What it does |
|------|--------------|
| `build` | Build the full and section bundles, then check that no rule can reach a host page and that Mermaid stays out of the bundle |
| `dev` | Rebuild on change |
| `typecheck` | Type-check, including `section.d.ts` against the implementation |
