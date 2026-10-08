# Documentation tools survey

Status: concluded
Date: 2026-03-20

## Question

Does any existing tool treat every kind of project artifact as a first-class node in one navigable graph that lives
alongside the code, and if not, which combination of capabilities is missing? The answer serves Weft's
[purpose](../PURPOSE.md) and the [requirements](../requirements.md) that follow from it.

### Problem statement

Technical projects accumulate heterogeneous documentation artifacts: high-level design docs, architecture diagrams,
database schemas, API specs, wireframes, functional specs, and source code. These artifacts are authored in different
tools, stored in different places, and have no structured awareness of each other. Navigating between them during
development, review, or a presentation requires tab-switching, manual searching, and significant context loss.

## Method

A desk survey of five tools and tool families, read from their public product descriptions and documentation, each
assessed for what it does, its strengths, and its gaps against the problem statement. The tools were then compared on
seven capabilities, and the concepts that Weft builds on were noted as prior art. Tool versions were not recorded.

## Findings

No existing tool treats all artifact types as first-class citizens in a unified, navigable graph that lives alongside
the code.

### Swimm

- **What it does:** Code-coupled documentation platform. Docs are Markdown files stored in the repo. Links reference
  live code tokens, functions, and snippets. IDE plugin (VS Code, JetBrains) shows gutter annotations when code is
  referenced by a doc.
- **Strengths:** Code↔doc traceability, auto-sync when code changes, IDE-native workflow.
- **Gaps:** Docs only — no architecture diagrams, wireframes, API specs, or slide decks as first-class nodes. No
  inter-document graph. No import pipeline for external artifact formats.
- **Source:** <https://swimm.io>

### Structurizr

- **What it does:** C4-model architecture diagram tool. Define a single model in DSL; generate multiple diagram views
  (context, container, component). Supports supplementary Markdown/AsciiDoc docs and Architecture Decision Records
  (ADRs).
- **Strengths:** Excellent for hierarchical architecture visualization. Diagrams-as-code. Strong C4 model support.
- **Gaps:** Architecture diagrams only. No API specs, wireframes, or code traceability. No cross-document link graph.
- **Source:** <https://structurizr.com>

### Mintlify, Redocly, GitBook

- **What they do:** Documentation portals, primarily for public-facing API and developer docs. Rich navigation,
  OpenAPI rendering, search.
- **Strengths:** Polished UI, good OpenAPI support, CI/CD integration.
- **Gaps:** Text and API specs only. No diagrams, wireframes, or code traceability. No cross-document semantic graph.
  Not designed to live in a repo alongside code.

### Confluence, Notion

- **What they do:** General wiki/knowledge base platforms with hyperlink-based cross-referencing.
- **Strengths:** Flexible, team-familiar, easy to link pages.
- **Gaps:** Hyperlinks only — no typed relationships, no anchor-level linking, no code awareness, no
  local-first/repo-native model, no import pipeline.

### arc42 and docToolchain

- **What it does:** arc42 is a structured template for software architecture documentation. docToolchain is a build
  pipeline (AsciiDoc + Asciidoctor) that exports to HTML, PDF, Confluence, GitHub Pages.
- **Strengths:** Docs-as-code philosophy, structured sections, CI/CD friendly.
- **Gaps:** Documentation format/process only — no graph model, no cross-format navigation, no IDE integration.

### Gap analysis

The combination of capabilities that no single tool offers. The Weft column records what Weft set out to provide,
not what it had built when the survey was made.

| Capability | Swimm | Structurizr | Portals | Weft |
|---|---|---|---|---|
| Lives in repo, versions with code | ✅ | ✅ | ❌ | ✅ |
| Multiple artifact types as first-class nodes | ❌ | ❌ | ❌ | ✅ |
| Typed cross-document links with anchors | ❌ | ❌ | ❌ | ✅ |
| Import pipeline (PPTX, PDF, Figma, etc.) | ❌ | ❌ | ❌ | ✅ |
| IDE side panel integration | ✅ | ❌ | ❌ | ✅ |
| Annotation/review layer | ❌ | ❌ | ❌ | ✅ |
| Split-pane graph browser UI | ❌ | ❌ | ❌ | ✅ |

### Prior art

- **Docs-as-code:** Treat documentation with the same discipline as source code — version control, review process,
  CI/CD. Weft extends this to all artifact types.
- **Living documentation:** Documentation that stays synchronized with the system it describes, rather than drifting
  over time. Weft enforces this via embedded links and import-time conversion.
- **Bidirectional traceability:** Requirements engineering concept — ability to trace from a requirement to its
  implementation and back. Weft generalizes this across all artifact types.
- **Knowledge graphs:** Structured representation of entities and relationships. Weft applies this model to a
  project's documentation artifacts.

## Recommendation

Build a documentation graph browser that lives in the repository: every artifact type a node, typed anchor-level links
between them written in formats that already render where the documents live, and a split-pane reader rather than
another portal. [Decision 0016](../decisions/0016-standard-markdown-links.md) took up the link format, keeping links
plain Markdown that renders on GitHub, and [decision 0003](../decisions/0003-no-graph-overview.md) took up the
interface, making documents and their linked items the UI rather than a picture of the graph.
