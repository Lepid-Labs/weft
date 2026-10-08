# @lepid-labs/weft-ui

Weft's browser UI, a SvelteKit app published as its prebuilt adapter-node handler for `weft serve` to mount. It is
not used on its own: the CLI starts it and supplies the data API; see the [weft README](../../README.md) for how the
packages fit together, and the [UI layout design](../../docs/design/ui-layout.md) for what it shows.

## Prerequisites

None beyond the repository's. At runtime it reads the manifest from the path in `WEFT_MANIFEST_PATH`, which
`weft serve` sets; started any other way, it fails with a message saying so.

## Tasks

From the repository root, `pnpm --filter @lepid-labs/weft-ui <task>`; inside `packages/ui`, `pnpm <task>`.

| Task | What it does |
|------|--------------|
| `build` | Build the adapter-node handler into `build/`, which is what gets published |
| `typecheck` | Sync SvelteKit and run `svelte-check` |
| `test` | Run the tests |

For UI work, run `just dev` at the repository root: it serves this repository's docs with the UI from source and
hot reload.
