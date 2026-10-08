# Editor integration requirements

How Weft reaches developers inside their editor, starting with a VS Code extension.

## RQ-098 Documentation references in the gutter

Status: draft

In VS Code, a line or comment holding a documentation reference shows a gutter decoration, and activating it opens
the Weft side panel at the referenced anchor.

Supports UC-002.

## RQ-099 Navigable side panel

Status: draft

The side panel is fully navigable, not a static preview: a developer can follow links within it without leaving the
editor. It stays open across file navigation and keeps track of the reader's position in the graph.

Supports UC-002.
