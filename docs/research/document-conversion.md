# Document conversion

Status: concluded
Date: 2026-03-20

## Question

How can artifacts that are not Markdown or OpenAPI (slide decks, PDFs, design files, diagrams) become navigable,
anchor-rich nodes in the graph? The answer serves the import pipeline, whose scope is still an
[open question](../open-questions.md), and the rendering requirements for slides and diagrams
([RQ-062, RQ-072](../requirements/rendering.md)).

## Method

A desk review of the conversion libraries, command-line tools and APIs available for each format, judged on fidelity,
whether the output keeps text and element identity for anchors and search, and what each needs to run. Library
versions were not recorded.

## Findings

### PPTX to HTML

- **LibreOffice headless:** `soffice --headless --convert-to html` — most reliable, handles complex layouts, produces
  per-slide HTML with inline styles.
- **pptx2html (npm):** Lighter weight, JS-native, less complete layout support.

### Google Slides to a navigable, anchor-rich format

- **Slides API JSON:** Fetch the presentation structure through the Google Slides API, cache the JSON under `docs/`,
  and render it with custom components, so slides reflow, text is selectable and searchable, and element-level anchors
  match the API's element IDs.
- **Export as HTML:** `…/presentation/d/{id}/export/html` — a simpler pipeline, but a poor fit for element-level anchors
  and responsive layout.

### PDF to a navigable format

- **pdf.js:** Renders PDF pages to canvas in-browser. Good for display; limited for anchor extraction.
- **pdfminer, pdftotext:** Extract text for search indexing and anchor identification.

### Figma to images

- **Figma REST API:** `/v1/images/{fileKey}` returns rendered PNG/SVG per frame. Frames become addressable nodes.
  Requires a personal access token.

### Mermaid and PlantUML

- **Mermaid:** `@mermaid-js/mermaid-cli` renders to SVG. Source kept for editability and re-rendering.
- **PlantUML:** Java-based renderer; can run headless. SVG output.

## Recommendation

- **PPTX:** LibreOffice for fidelity, wrapped as a CLI subprocess from Node. PPTX support itself is an
  [open question](../open-questions.md).
- **Google Slides:** Slides API JSON rendered with custom components, keeping HTML export only as prior research.
  [Decision 0013](../decisions/0013-google-slides-rendering.md) took this up.
- **PDF:** Render with pdf.js and extract text separately for the anchor registry and search. No decision has taken
  this up; see the [open questions](../open-questions.md).
- **Figma:** Render frames through the REST API as addressable nodes; an [open question](../open-questions.md).
- **Mermaid and PlantUML:** Render to SVG and keep the source for editing.
  [Decision 0014](../decisions/0014-mermaid-rendering.md) took up Mermaid and chose to draw diagrams in the browser,
  after sanitizing, rather than render SVG ahead of time.
