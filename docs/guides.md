# Guides

How-to guides for using, configuring and extending weft, one topic per file. Each describes the current release;
installing the CLI and its prerequisites are in the [README](../README.md).

| Guide | Summary |
|-------|---------|
| [Run weft from the command line](guides/cli.md) | The `serve`, `index`, `analyze` and `check` commands and their flags. |
| [Configure weft](guides/configuration.md) | Every `weft.config.yaml` option, strict ordering, extra extensions, per-document frontmatter and where the manifest is written. |
| [Declare links in sidecar files](guides/sidecar-links.md) | Typed, anchor-level links in `.weft` sidecar files, their fields and the conventional edge types. |
| [Validate your docs](guides/validation.md) | What `weft check` reports, rule severities, pending references, assertions, and duplicate or diverged copies. |
| [Index several projects into one graph](guides/multiple-projects.md) | One graph from several docs roots, with namespaced node IDs, cross-project links and a shared document order. |
| [Combine docs from several repositories](guides/multiple-repositories.md) | Map other repositories to checkouts, link with GitHub blob URLs, and serve a graph without cloning it. |
| [Integrate a build tool or renderer](guides/external-tools.md) | Contribution files from a build, their pipeline order, build output, and links to a published or templated form. |
| [Compose a document from sections of others](guides/composed-documents.md) | Include edges that render sections of other documents inline, and the checks that keep them working. |
| [Track generated outputs](guides/generated-artifacts.md) | Register PDFs and other outputs as artifacts and report them when they fall behind their sources. |
| [Embed weft in your own page](guides/embedding.md) | Mount the whole app, the reader alone, one section, or a React component, and theme or install the embed. |
| [Read and navigate docs in weft](guides/reading.md) | Navigation, keyboard shortcuts, supported document types, rendering, sanitizing and contributed render passes. |
| [Choose and customize a theme](guides/theming.md) | Styles and scheme pairs, token resolution, diagram colours, page chrome, newer styles and webfonts. |
