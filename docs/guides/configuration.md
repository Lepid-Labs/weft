# Configure weft

For anyone setting up weft on a project. It covers `weft.config.yaml` and every option it takes, the frontmatter a
document can use to override its own metadata, and where the generated manifest is written. Options with more to them
than a table row link to the guide that owns them.

## The config file

Place a `weft.config.yaml` (or `.yml` / `.json`) in your project root. The config is plain data — no imports, no code,
no dependency on `@lepid-labs/weft-core` ([why](../decisions/0017-static-config.md)):

```yaml
docsDir: docs
entryPoint: docs/README.md
siteTitle: My Project
siteUrl: https://docs.example.com
defaultTheme: dark
layout: default
docOrder:
  - README.md
  - architecture.md
  - api.yaml
docOrderStrict: false
ignore:
  - "**/node_modules/**"
  - "**/dist/**"
```

The file is validated at load time: wrong types and bad enum values fail with the offending field named, and unknown
keys warn.

A gitignored `weft.config.local.yaml` beside it may override a few options for one machine; see
[Local overrides](multiple-repositories.md#local-overrides).

> **Migrating from `weft.config.ts`?** JS/TS config files are no longer supported — they required a runtime dependency
> on `@lepid-labs/weft-core` just to be loadable. The option names are identical; rewrite the exported object as YAML
> and delete the old file.

## All options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `docsDir` | `string` | `"docs"` | Directory to scan for documents, relative to project root. Ignored when `projects` is set |
| `projects` | `WeftProject[]` | — | Multiple docs roots, one per product — see [Index several projects](multiple-projects.md) |
| `repos` | `Record<string, string>` | — | Local checkouts of other repos, keyed by `org/repo` — see [Combine docs from several repositories](multiple-repositories.md) |
| `entryPoint` | `string` | — | The document the UI opens at `/`, as a path relative to the project root (`docs/overview.md`) or a node id (`overview.md`, `alpha/overview.md`). Unset, `/` is the docs root's README, else the first document in the nav. With it set, a top-level README moves to `/README`. A value that names no document is reported by [`entry-point-missing`](validation.md#rules) |
| `siteTitle` | `string` | — | Site name shown in the header, and used in `og:site_name` and the page title (`Doc — Site`). The header reads "Weft" when unset |
| `siteUrl` | `string` | — | Canonical base URL (e.g. `https://docs.example.com`). Required for absolute `og:image` URLs |
| `ogImage` | `string` | — | Default `og:image`. Relative to project root or an absolute URL. Overridden per-document via [frontmatter](#per-document-frontmatter) |
| `style` | `string \| {dark, light}` | `{dark: luminous-precision, light: summer-cloud}` | lepid-design theme(s) the UI renders in. A pair follows the light/dark toggle; a single name fixes the scheme and hides it — see [Pick a style](theming.md#pick-a-style) |
| `styleUrl` | `string` | — | Base URL serving lepid-design themes newer than the bundled set — see [Styles newer than the bundled set](theming.md#styles-newer-than-the-bundled-set) |
| `defaultTheme` | `"light" \| "dark"` | system preference | Scheme applied on first visit before the user sets a preference. Ignored when `style` is a single fixed-scheme name — see [Scheme resolution](theming.md#scheme-resolution) |
| `layout` | `"default" \| "reader"` | `"default"` | `"reader"` hides the linked-items sidebar for a cleaner reading experience |
| `docOrder` | `string[]` | — | Explicit order for docs in the left-hand navigation. Filenames relative to `docsDir`; with several projects, see [Document order](multiple-projects.md#document-order) |
| `docOrderStrict` | `boolean` | `false` | When `true`, only docs listed in `docOrder` appear in the LHN. Unlisted docs stay in the graph — see [Strict ordering](#strict-ordering) |
| `ignore` | `string[]` | see [Build output](external-tools.md#build-output) | Glob patterns to exclude from indexing |
| `contributions` | `string[]` | — | Contribution files written by an external build — see [Integrate a build tool](external-tools.md) |
| `artifacts` | `string[]` | — | Generated outputs to register as nodes, as globs relative to each docs root — see [Track generated outputs](generated-artifacts.md) |
| `rules` | `Record<string, severity>` | — | Per-rule severity for the validation stage — see [Severities](validation.md#severities) |
| `includes` | `{ headingShift?, contributes? }` | see [Heading levels and search attribution](composed-documents.md#heading-levels-and-search-attribution) | Global defaults for include edges, overridable per edge |
| `extensions` | `Record<string, "markdown" \| "openapi">` | — | Extra file extensions to index — see [Extensions](#extensions) |

## Strict ordering

`docOrderStrict` narrows the left-hand nav, not the graph. A document left out of `docOrder` is marked `hiddenFromNav`
in the manifest and skipped by the tree, but it remains a full node: still indexed for search, still reachable by link
or URL, and still a valid endpoint for edges pointing at it.

The two are not interchangeable. Removing those documents from the manifest would leave every edge touching one of
them pointing at nothing, so a link from a listed document to an unlisted one would read as broken — including to the
[validation rules](validation.md#rules) that check whether edges resolve.

## Extensions

Weft indexes `.md`, `.markdown`, `.yaml` and `.yml` by default. `extensions` maps additional file extensions to one of
Weft's two doc types, so a project can index more without changing what ships by default:

```yaml
extensions:
  .qmd: markdown
```

A `.qmd` file is now scanned, parsed and linked exactly like a `.md` file — same anchor extraction, same frontmatter
handling.

Weft already knows how to parse `.json` as OpenAPI; it simply isn't scanned for by default. A project keeping a JSON
OpenAPI spec in its docs opts in the same way:

```yaml
extensions:
  .json: openapi
```

Additive only: `extensions` can add a new extension, or opt in one Weft already knows how to parse (like `.json`
above), but it cannot remap an extension Weft already indexes by default. `extensions: { .yaml: markdown }` would
silently change how every existing `.yaml` in the project parses — its anchors, and every link that resolves against
them — so it is rejected at load time, naming the extension and its built-in mapping.

## Per-document frontmatter

Markdown files can include YAML frontmatter to override metadata for that document:

```markdown
---
title: Architecture Overview
description: How the major components fit together.
theme: light
ogImage: assets/og-architecture.png
---

# Architecture Overview
...
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Overrides the document title (defaults to first `#` heading) |
| `description` | `string` | Used in `<meta name="description">` and `og:description` |
| `theme` | `"light" \| "dark"` | Force a specific scheme for this document only — see [Force a scheme on one document](theming.md#force-a-scheme-on-one-document) |
| `ogImage` | `string` | Per-document `og:image`, overrides the global `ogImage` config |
| `version` | `string` | The document's own version, so other documents can [assert](validation.md#assertions) it |

`version` is read exactly as written, so quoting is optional but harmless — `2.10` stays `2.10` rather than becoming
the number 2.1. A document with no version is entirely normal, and nothing treats its absence as a problem.

## The manifest

Running `weft index` (or `weft serve`) writes `docs/.weft/manifest.json`. This file is **auto-generated** — never
hand-edit it. Add `.weft/` to `.gitignore` or commit it as a build artifact, depending on your workflow; an embed that
reads the docs straight from a repository needs it committed (see [Embed weft](embedding.md#prerequisites)).

The manifest contains all discovered nodes (documents) and edges (typed relationships), and is what the UI reads at
runtime. Its format is described in [Graph manifest](../design/graph-manifest.md). A docs root outside the project
root gets its manifest elsewhere; see [Manifest placement](multiple-repositories.md#manifest-placement).

### Multi-project output

With [`projects`](multiple-projects.md) configured, indexing writes three kinds of artifact:

| Path | Contents |
|------|----------|
| `<project docsDir>/.weft/manifest.json` | One per project: that project's nodes, and the edges originating in it |
| `.weft/projects.json` | Index of every project manifest, plus the path of the merged manifest |
| `.weft/manifest.json` | The merged graph — every node and edge, with a `projects` array |

An edge belongs to the project of its source node, so a cross-project edge is stored with the product that declares
it. Each project manifest can be published or versioned independently; consumers that want the whole graph in one
request (such as `@lepid-labs/weft-embed`) read the merged manifest instead.
