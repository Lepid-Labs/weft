# Contributing

Bug reports, fixes, and improvements to the docs are welcome, as are features that fit the requirements in
[docs/requirements.md](docs/requirements.md). For a larger change, or one that reopens a recorded decision, open an
issue first so the approach can be agreed before you build it. Changes that add a runtime dependency, or that move
weft away from plain repository files (see [docs/PURPOSE.md](docs/PURPOSE.md)), are unlikely to be accepted.

## Development setup

Install the prerequisites and run the commands in the [README](README.md#develop). Beyond those:

- `@lepid-labs/weft-core` resolves to its built output for plain Node, so the CLI runs against `packages/core/dist`.
  After editing core, rebuild it (`pnpm --filter @lepid-labs/weft-core build`, or `tsc --watch` in
  `packages/core`) before running `weft`. The UI's Vite dev server and type-checking read core's source directly, so
  `just dev` needs no rebuild for UI work.
- `just build-embed` builds the embeddable bundle and checks that it ships no rule that can reach a host page.
- `just pages` builds the GitHub Pages site into `_site/`.

## Checks

| Command | What it runs |
|---------|--------------|
| `just lint` | Biome lint and formatting (`just fix` applies the fixes) |
| `just typecheck` | Type-check every package |
| `just test` | Every package's tests |
| `just check` | All three |

CI runs `just lint`, `just typecheck`, `just build-embed` and `just test` on every pull request. All of them must
pass before a change is merged.

## Making a change

1. Branch from `main`. Changes reach `main` only through a pull request.
2. Title the pull request as a [Conventional Commit](https://www.conventionalcommits.org/), such as
   `feat(core): …` or `fix(ui): …`. CI checks the title; the types allowed are build, chore, ci, docs, feat, fix,
   perf, refactor, revert, style and test. Pull requests are squash-merged, so the title becomes the commit message
   and the changelog entry.
3. Include tests for any change in behaviour.
4. Update the documents the change affects in the same pull request: the guide that describes the behaviour, the
   design that describes the component, a requirement's status, and a decision record when the change makes or
   revises a choice a future reader would question. Add or update the entry in the directory's summary document
   (such as [docs/decisions.md](docs/decisions.md)) alongside. The layout follows
   [Project Documentation 1.2.0](https://lepid-labs.github.io/spec/project-documentation/v1.2.0/).
5. Add a line under `Unreleased` in [CHANGELOG.md](CHANGELOG.md) for anything a user of the packages would notice.

## Reporting issues

Report bugs and request features in [GitHub issues](https://github.com/Lepid-Labs/weft/issues). Report a security
issue privately through the repository's
[security advisories](https://github.com/Lepid-Labs/weft/security/advisories/new), not in a public issue.

## License

Contributions are accepted under the [MIT license](LICENSE) that covers the project. No contributor agreement or
sign-off is needed.
