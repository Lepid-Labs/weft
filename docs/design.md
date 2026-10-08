# Design

How Weft is built, one design per component: the approach, the alternatives not taken, the interfaces and external
contracts it defines, and its risks. Designs are kept true to what was built and updated in the same change as the
code they describe; a design for something not yet built says so in its opening paragraph. Why a choice was made
lives in [decisions](decisions.md), what Weft must do in [requirements](requirements.md), and how to use it in
[guides](guides.md).

| Design | Summary |
|--------|---------|
| [Architecture](design/architecture.md) | Packages and their responsibilities, one `WeftService` per serve, the CLI-to-UI handoff, serve modes and behaviour, and workspace versus published package shapes. |
| [Graph and manifest](design/graph-manifest.md) | How the graph is built and merged, what nodes and edges record, the manifest format, the content-hash recipe and contribution files, and multi-project output. |
| [Manifest freshness](design/manifest-freshness.md) | The manifest's `build` block, what its inputs hash covers, and the cached `fresh`/`stale`/`unknown` check. |
| [Links and anchors](design/links-and-anchors.md) | How Markdown and sidecar links resolve to edges, the sidecar schema, and anchors that match the rendered page's ids. |
| [Validation](design/validation.md) | The validator registry, config-owned severity, one git history walk, and the rule families with their defaults. |
| [Rendering pipeline](design/rendering-pipeline.md) | The two-stage render chain and its sanitizer, contributed render passes, include expansion, Mermaid diagrams and the OpenAPI renderer. |
| [UI layout](design/ui-layout.md) | The three-panel reader, document tree, search and linked items; reviewing and presenting modes and link authoring are planned. |
| [Embedding](design/embedding.md) | The three embed mounts, CSS scoping, the token chain, scheme and theme roots, and loading newer themes. |
| [Repo fetching](design/repo-fetching.md) | Serving a GitHub repo without a checkout: blobless clones, the cache, authentication, read-only roots and sub-roots. |
| [VS Code extension](design/vscode-extension.md) | Planned: a side panel hosting the reader, and gutter decorations that navigate it from `@doc` comments. |
