# weft

![Type: native app](https://img.shields.io/badge/type-native_app-blueviolet) ![Status: alpha](https://img.shields.io/badge/status-alpha-yellow) ![Version](https://img.shields.io/npm/v/@lepid-labs/weft?label=version) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A documentation graph browser that lives in the repository alongside the code. It turns a project's design docs,
specs, diagrams and decision records into a navigable graph, with typed, anchor-level links between them.

![CI](https://github.com/Lepid-Labs/weft/actions/workflows/ci.yml/badge.svg) [![Docs: project-documentation 1.2.0](https://img.shields.io/badge/docs-project--documentation_1.2.0-blueviolet)](https://lepid-labs.github.io/spec/project-documentation/v1.2.0/) [![Docs: project-details 1.1.0](https://img.shields.io/badge/docs-project--details_1.1.0-blueviolet)](https://lepid-labs.github.io/spec/project-details/v1.1.0/)

Why it exists and who it is for: [docs/PURPOSE.md](docs/PURPOSE.md).

## Prerequisites

- Node.js 24 or later
- git, to serve a repository straight from GitHub and to date documents from their history
- To work on weft itself: [pnpm](https://pnpm.io/) 9 or later and [just](https://github.com/casey/just)

| Environment variable | Meaning |
|----------------------|---------|
| `GH_TOKEN`, `GITHUB_TOKEN` | GitHub token used to fetch a private repository for `weft serve --repo`. Checked in that order; without either, weft asks `gh auth token`. Public repositories need neither |
| `WEFT_CACHE_DIR` | Where fetched repositories are cached. Defaults to `$XDG_CACHE_HOME/weft` |
| `XDG_CACHE_HOME` | Base cache directory when `WEFT_CACHE_DIR` is unset. Defaults to `~/.cache` |
| `NO_COLOR` | When set, `weft serve` prints its `[OK]`/`[FAIL]` status without color |

## Try it

Serve any GitHub repository's docs graph without cloning it:

```sh
npx @lepid-labs/weft serve --gh org/repo --open
```

To serve a local project, run `weft serve` from its root, where `weft.config.yaml` lives. To keep the CLI around:
`npm install -g @lepid-labs/weft`. Every command and option is in [docs/guides/cli.md](docs/guides/cli.md).

## Develop

From a checkout of this repository:

```sh
just install
just dev
```

`just dev` builds the core packages and serves this repository's own docs graph, with the UI served from source for
hot reload. `just check` runs lint, type-check and tests. See [CONTRIBUTING.md](CONTRIBUTING.md) for the rest.

## Packages

| Package | Purpose |
|---------|---------|
| [`@lepid-labs/weft`](packages/cli/README.md) | The CLI: serve, index, analyze and check a documentation graph |
| [`@lepid-labs/weft-core`](packages/core/README.md) | The document graph: indexing, links, validation and search over a docs tree |
| [`@lepid-labs/weft-ui`](packages/ui/README.md) | The browser UI, prebuilt for the CLI to serve |
| [`@lepid-labs/weft-embed`](packages/embed/README.md) | The reader as a drop-in browser bundle for any page |
| [`@lepid-labs/weft-react`](packages/react/README.md) | A React component that renders one section of a docs file |

All packages are released together at one version; see [CHANGELOG.md](CHANGELOG.md).

## Documentation

- [Guides](docs/guides.md): using, configuring, embedding and theming weft
- [Requirements](docs/requirements.md) and [use cases](docs/use-cases.md): what weft must do, and for whom
- [Design](docs/design.md) and [decisions](docs/decisions.md): how it is built, and why
- [Research](docs/research.md): the survey and investigations behind the decisions
- [Runbooks](docs/runbooks.md): releasing and deploying

## License

MIT. See [LICENSE](LICENSE).
