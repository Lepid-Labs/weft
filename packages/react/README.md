# @lepid-labs/weft-react

A React component, `<WeftSection>`, that renders one section of a docs file inline, live from its source. It wraps
the section mount of `@lepid-labs/weft-embed`; see the [weft README](../../README.md) for how the packages fit
together.

Usage is in the [embedding guide](../../docs/guides/embedding.md), and why it exists in
[decision 0015](../../docs/decisions/0015-section-embed-and-react.md).

## Prerequisites

React 18 or later, as a peer dependency.

## Tasks

From the repository root, `pnpm --filter @lepid-labs/weft-react <task>`; inside `packages/react`, `pnpm <task>`.

| Task | What it does |
|------|--------------|
| `build` | Compile to `dist/` and copy the section stylesheet |
| `typecheck` | Type-check without emitting |
| `test` | Run the tests |
