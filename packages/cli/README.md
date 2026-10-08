# @lepid-labs/weft

The weft command line: serve, index, analyze and check a documentation graph, from a checkout or straight from
GitHub. It is the product's entry point and serves the browser UI from `@lepid-labs/weft-ui`; see the
[weft README](../../README.md) for how the packages fit together.

```sh
npx @lepid-labs/weft serve --gh org/repo --open
```

Every command and option is in the [CLI guide](../../docs/guides/cli.md), and `weft.config.yaml` is in the
[configuration guide](../../docs/guides/configuration.md).

## Prerequisites

- Node.js 24 or later, and git.
- `vite` only for `weft serve --dev`, which serves the UI from source. It is an optional peer dependency, so a
  published install never pulls it.

## Tasks

From the repository root, `pnpm --filter @lepid-labs/weft <task>`; inside `packages/cli`, `pnpm <task>`.

| Task | What it does |
|------|--------------|
| `build` | Compile to `dist/` |
| `typecheck` | Type-check without emitting |
| `test` | Build `@lepid-labs/weft-core`, then run the tests |

The CLI runs against `@lepid-labs/weft-core`'s built output, so rebuild core after changing it.
