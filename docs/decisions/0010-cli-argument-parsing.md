# 0010 Parse CLI arguments with cleye

Status: accepted

## Context

Weft has eight CLI commands planned (`serve`, `import`, `index`, `check`, `analyze`, `build`, `new`, `log`), all top
level with no nested sub-commands. Arguments are simple: a path, a flag or two, a template name. The CLI package
(`@lepid-labs/weft`) needs a parser that handles this cleanly with good TypeScript ergonomics.

## Options

- **commander**: a chained builder API. Mature (more than ten years) with a massive ecosystem and auto-generated
  `--help`. ~50 KB. TypeScript support through generics, but types are not inferred from the definitions.
- **yargs**: similar maturity and ecosystem to commander, at ~130 KB. Its TypeScript types are notoriously awkward: the
  generics don't compose well and often need manual casting.
- **citty**: a declarative object API from the UnJS ecosystem, ~3 KB, with native TypeScript inference (args are typed
  from the definition object) and sub-commands through nested objects. Help output is barebones, with no auto-styled
  `--help` formatting.
- **cleye**: a declarative, TypeScript-native object API with args inferred from the definition, ~7 KB. Generates
  styled `--help` output automatically. No built-in sub-command routing; commands are flat. Built by the author of
  `tsx`.

## Decision

**cleye.**

- **The flat command model fits Weft.** Every command is top level with simple args, so cleye's flat routing is a
  natural match; citty's sub-commands and commander's `.command()` chaining would be unused complexity.
- **TypeScript inference.** Parsed args are typed from the definition, with no manual generics or casting, matching
  TypeScript throughout ([0001](0001-implementation-language.md)).
- **Auto-styled `--help`.** citty was the other lightweight contender but needs DIY help formatting. cleye generates
  clean help output automatically: one less thing to build and maintain.
- **Small.** ~7 KB. CLI parsing is not where Weft's complexity lives, and the dependency should reflect that.

## Consequences

cleye has no `--no-<flag>` negation, so a flag that defaulted on could never be turned off. That is why
`weft serve --open` is opt-in.
