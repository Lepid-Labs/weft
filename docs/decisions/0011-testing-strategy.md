# 0011 Test against real files, with Vitest

Status: accepted

## Context

Weft is a TypeScript monorepo of several packages. The ports-and-adapters architecture
([0005](0005-local-server-and-service.md)) concentrates business logic in `@lepid-labs/weft-core`, with thin adapter
layers (`ui`, `mcp`, `cli`) and a VS Code extension. Core operates on real files: the graph is derived from the
filesystem. The test strategy has to reflect that.

## Options

- **Vitest**: the UI already builds with Vite ([0002](0002-ui-framework.md)), and Vitest shares its transform pipeline,
  so TypeScript, Svelte components and path aliases work without duplicate configuration. Native ESM and a fast watch
  mode through Vite's module graph.
- **Jest**: needs separate transform configuration for TypeScript and Svelte.
- **`node:test`**: lacks workspace support and Svelte transforms.

## Decision

**Vitest, with filesystem-based integration tests as the backbone. No mocking the filesystem.**

The graph is derived from files, so mocking the filesystem means testing a fiction. Core tests operate against real
files in temporary directories.

Fixtures are checked-in example doc structures, each a minimal docs directory for one scenario (broken links, circular
references, mixed formats, sidecar files and so on). A test copies a fixture to a temporary directory, runs
`WeftService` operations against it, and asserts on results and side effects.

## Per-package testing

- **`@lepid-labs/weft-core`** holds the bulk of the tests. Unit tests cover the graph model, link parsing, anchor
  extraction, the manifest builder and the search index: pure functions, no I/O. Integration tests run `WeftService`
  methods (`search()`, `traverse()`, `read()`, `write()`, `authorLink()`) against fixture-based temporary directories,
  validating the full pipeline without HTTP or MCP.
- **`@lepid-labs/weft`** invokes commands programmatically, not by shelling out, and asserts on `WeftService` side
  effects in temporary directories, using the same fixture-copy strategy through the CLI entry point.
- **`@lepid-labs/weft-mcp`** is a thin adapter. Mock `WeftService` to verify that tool definitions map arguments
  correctly; real behaviour is tested in core.
- **`@lepid-labs/weft-ui`** has two concerns. Its API routes are thin adapters over `WeftService`, with light tests
  like MCP's. Svelte components are tested with Vitest and `@testing-library/svelte` for wiring (link click callbacks,
  pane navigation, content loading), not third-party renderer DOM output.
- **`@lepid-labs/weft-vscode`** gets minimal automated tests: command registration and message-passing contracts.
  Extension tests need `@vscode/test-electron`, which launches a real VS Code instance and is slow, flaky and
  CI-unfriendly, so webview integration is tested manually.

## Consequences

The same principle extends to git: multi-repo behaviour is pinned with two real git repositories
([0020](0020-multi-repo-roots-by-identity.md)). The UI has no component harness yet; logic worth testing is moved into
pure `$lib` modules (the doc tree, the linked-items partition) so it can be tested without one.
