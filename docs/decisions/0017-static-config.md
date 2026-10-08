# 0017 Keep config as static data

Status: accepted

## Context

Weft's config is read by the CLI under plain Node and by the UI's tooling under Vite. A config written as TypeScript
(`weft.config.ts` exporting `defineConfig(...)`) is a runtime import of `@lepid-labs/weft-core`: every user project
needs a dependency on it, and loading it raises type-stripping and dual-loading concerns. In this repository it also
needed a root `@lepid-labs/weft-core` devDependency as a workaround, and a hardcoded `WEFT_CONFIG` bypass in
gen-manifest.

## Options

- **A TypeScript or JavaScript module with `defineConfig`**: typed in the editor, at the cost of the runtime import
  above.
- **Plain data (YAML or JSON), validated at load time**: no import, and identical loading everywhere; typing comes
  from validation instead.

## Decision

**`weft.config.yaml` is plain data.** It may also be `.yml` or `.json`. It is validated at load time, which is where
its typing comes from; `defineConfig` is gone. A legacy `weft.config.ts` or `.js` fails with a migration error.

## Consequences

- User projects need no dependency on `@lepid-labs/weft-core`, and config loads identically under plain Node and Vite.
- The root devDependency workaround and gen-manifest's `WEFT_CONFIG` bypass are gone.
- Anything that has to be code cannot be config. Render passes are a code seam for that reason
  ([0027](0027-host-contributed-render-passes.md)).
- The UI never reads config: what it needs is stamped into the manifest at build time, such as presentation settings
  ([0005](0005-local-server-and-service.md)) and include defaults ([0026](0026-composed-documents-via-includes.md)).
- The options are described in the [configuration guide](../guides/configuration.md).

## History

- 2026-03-20 to 2026-07-25: config was `weft.config.ts`, exporting `defineConfig(...)` imported from Weft's core
  package.
