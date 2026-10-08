# Browser UI requirements

What a reader sees and does in Weft's browser UI: layout, navigation, linked items, search, styling, and the planned
presenting and reviewing modes.

## RQ-048 Three-panel layout

Status: agreed

The UI shows a document tree, the main document view, and a linked-items sidebar for the active document. A reader
layout, chosen in config, hides the sidebar.

Supports UC-001, UC-005, UC-015.

## RQ-049 Document tree

Status: agreed

The tree lists every indexed document not hidden from navigation, labelled by title or else filename, grouped by
project when there are several, in the configured order. Strict ordering hides unlisted documents from the tree only:
they stay in the graph, searchable and reachable by link. A plain click navigates within the app; a modified click
opens a new tab.

## RQ-050 Entry point

Status: agreed

When no document is named, the UI and the full embed open the configured entry document. Without one, they open the
docs root's README, else the first document the nav lists. Every document, the README included, stays reachable at a
URL of its own.

Supports UC-005.

## RQ-051 Navigation history

Status: agreed

The main view keeps its own navigation stack. Back and forward work through the browser's history, and links between
documents navigate within the app.

Supports UC-001.

## RQ-052 Breadcrumbs

Status: draft

The main view shows the reader's navigation stack as breadcrumbs.

Supports UC-001.

## RQ-053 Linked items

Status: agreed

The sidebar lists the edges to and from the active document or anchor. A reference whose target is not in the graph
is listed struck through and marked not found, and cannot be followed. An edge resolved from a published form shows
the path as written on hover.

Supports UC-001, UC-010, UC-012.

## RQ-054 Search

Status: agreed

A command palette, opened, browsed and closed from the keyboard, searches document titles, anchors and full text.
Choosing a result navigates the main view to it.

Supports UC-001, UC-005. Set by [decision 0006](../decisions/0006-search-engine.md).

## RQ-055 Semantic search

Status: draft

A project can opt in to semantic search alongside full-text search. It uses a local embedding model by default, needing
no GPU, and the provider is configurable. Results come back as one ranked list saying how each was found.

Set by [decision 0006](../decisions/0006-search-engine.md).

## RQ-056 Styles and schemes

Status: agreed

The UI renders in a lepid-design style: one theme, or a dark and light pair the reader toggles between
(`luminous-precision` and `summer-cloud` by default). Configuration decides the style; the browser remembers only the
reader's scheme. A style newer than the bundled set loads from a configured base URL, and falls back with a warning
when it cannot.

Set by [decision 0025](../decisions/0025-lepid-design-styling.md).

## RQ-057 Page titles and link previews

Status: agreed

Each page is titled with its document and the site title. The header shows the site title, or "Weft" when none is
set. Each document carries link-preview metadata (title, description, image), with a site-wide default image.

## RQ-058 Cross-reference behaviour

Status: draft

A project chooses how linked items and inline links respond: by default hovering peeks at the target in a slide-in
panel and clicking navigates; alternatively clicking navigates and a modified click peeks.

## RQ-059 Presenting mode

Status: draft

A reader can switch to presenting mode, which is never engaged automatically. It hides the tree and sidebar so the
main view fills the screen. Linked context opens in a slide-in panel from the side opposite the action, with its own
navigation stack; navigating there leaves the main view where it was.

Supports UC-003.

## RQ-060 Reviewing mode

Status: draft

In reviewing mode the sidebar splits: linked items above, the active document's annotation history below. The history
lists every annotation on the document in date order, not filtered by scroll position. Choosing one jumps to its
anchor, and each can be corrected or deleted in place.

Supports UC-004.
