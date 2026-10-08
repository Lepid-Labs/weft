# Requirements

What Weft must do and guarantee, one area per file, under a single `RQ-nnn` sequence numbered in the order the areas
are listed here. A requirement is `agreed` when it is built and holds today, and `draft` when it is planned but not
built. Draft work is planned in this order: link authoring (RQ-088), the VS Code extension (RQ-098, RQ-099),
annotations, reviewing mode and the decision log (RQ-060, RQ-089 to RQ-091), then staleness against code, coverage
analysis and static export (RQ-044 to RQ-046, RQ-095 to RQ-097); the rest is unscheduled. Requirements cite the
[use cases](use-cases.md) they support.

| Area | Summary | Requirements | Status |
|------|---------|--------------|--------|
| [Constraints](requirements/constraints.md) | Repository-native, standard links, a derived graph, static config, no timestamps, and what the first release leaves out. | RQ-001 to RQ-009 | 9 agreed |
| [Graph](requirements/graph.md) | What one docs root indexes, how links and anchors become typed edges, and what the manifest records. | RQ-010 to RQ-023 | 14 agreed |
| [Graph sources](requirements/graph-sources.md) | Several projects and repositories, serving without a checkout, external builds, generated artifacts, and code. | RQ-024 to RQ-032 | 8 agreed, 1 draft |
| [Validation](requirements/validation.md) | Reporting and gating on broken links, assertions, stale artifacts, copies and includes; planned staleness and coverage. | RQ-033 to RQ-047 | 11 agreed, 4 draft |
| [Browser UI](requirements/browser-ui.md) | Layout, navigation, linked items, search and styling; planned presenting and reviewing modes. | RQ-048 to RQ-060 | 8 agreed, 5 draft |
| [Rendering](requirements/rendering.md) | Markdown, Mermaid, OpenAPI, sanitizing, contributed passes and composed documents; planned code and slide views. | RQ-061 to RQ-072 | 7 agreed, 5 draft |
| [Embedding](requirements/embedding.md) | The three mounts, the React component, container scoping, the theming contract and the published bundle. | RQ-073 to RQ-081 | 8 agreed, 1 draft |
| [CLI](requirements/cli.md) | Serving, the startup self-check, indexing, and running from a published install. | RQ-082 to RQ-087 | 6 agreed |
| [Authoring](requirements/authoring.md) | Link authoring, annotations, the decision log and document templates. | RQ-088 to RQ-092 | 5 draft |
| [Publishing](requirements/publishing.md) | Reading the docs at a past release, a version selector, and static export. | RQ-093 to RQ-097 | 1 agreed, 4 draft |
| [Editor integration](requirements/editor-integration.md) | Documentation references and a navigable Weft panel inside VS Code. | RQ-098 to RQ-099 | 2 draft |
