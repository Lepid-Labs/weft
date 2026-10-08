# 0013 Render Google Slides from the API's JSON

Status: accepted

## Context

Google Slides is a primary documentation format in many teams: architecture overviews, design reviews, status decks.
Weft needs to import and render slide decks in its viewer with element-level anchors, so users can link to specific
shapes, text boxes and diagrams, not just whole slides.

The Google Slides API returns a full structural JSON representation: slides, then page elements (text boxes, shapes,
images, tables, charts) with positions, sizes, formatted text content, and unique element IDs.

## Options

- **Export as images**: fetch a PNG per slide through the Slides API thumbnail endpoint. Simple, with perfect fidelity,
  but slides become opaque pictures: no text selection, no search, no element-level anchors, and fixed-size images that
  cannot adapt to the viewport.
- **Parse the JSON and render with custom Svelte components**: render each slide as positioned DOM elements in a
  Svelte component. Elements respond to viewport size, each gets an anchor ID, and text is extractable for search.
- **Hybrid (image base + interactive overlays)**: the slide thumbnail as the base layer, with clickable overlay regions
  from the JSON element positions. Good visual fidelity, but images are fixed-size and cannot reflow for different
  viewports, and mapping Slides API coordinates onto image pixels adds fragility.

## Decision

**Parse the JSON and render with custom Svelte components, adding element types incrementally.**

- **Viewport-responsive.** Slides rendered as positioned DOM elements scale to the pane width, so users can resize the
  pane for viewing during calls or on smaller screens. Image-based approaches produce fixed-size output.
- **Element-level anchors.** Each page element has a unique ID from the API, and the renderer generates anchor IDs from
  it directly, so a sidecar link can target a specific shape or text box, not just a slide. This is the key
  differentiator for Weft's graph model.
- **Searchable text.** Text content is extracted from the JSON and indexed, so users can search within slides and the
  MCP server can find relevant slides for AI workflows.
- **Incremental build-up.** The Slides JSON schema is large, but element types are independent. Each tier is
  self-contained and testable by feeding a slide JSON fixture and asserting on the rendered DOM and extracted anchors:
  1. Text boxes and basic shapes (about 80% of typical slides).
  2. Images (referenced by URL, fetched and cached on import).
  3. Tables (a structured grid with cell text).
  4. Groups (nested element containers).
  5. Charts (an image fallback at first, parsed later).
- **Testable.** The Slides API JSON is a well-documented schema. Fixtures are small JSON files representing specific
  element configurations, and tests need no external service; only the import step needs API access.

## Consequences

Only `weft import` needs network access and credentials; after it, rendering is fully offline and tests need no
external service.

## Auth and caching

- Import requires OAuth2 with the read-only Slides scope, through a one-time auth flow during `weft import`.
- Presentation JSON and referenced image URLs are cached locally in the docs directory.
- Re-import fetches the latest JSON, diffs it against the cached version, updates sidecar links by element ID, and
  flags removed elements as broken.
