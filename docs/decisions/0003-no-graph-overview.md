# 0003 No graph overview visualization

Status: accepted

## Context

Early designs assumed a visual graph overview: a zoomable canvas showing every document node and its edges, like a
dependency diagram. That assumption drove the React Flow dependency and influenced the framework choice
([0002](0002-ui-framework.md)).

## Decision

**No graph overview. The graph is the engine, not the interface.**

Users don't start from "show me the graph." They start from:

- **A specific document**: open the README, an API spec, a design doc.
- **A search**: "where's the auth endpoint spec?"
- **A traversal**: "what's linked to this section?", rendered as a list, not a diagram.

The graph structure powers search ranking, traversal, impact analysis (`weft analyze`), coverage detection and
staleness checks. But the user interacts with documents and links, not nodes and edges.

The primary UI is a **split pane** with:

- document content in each pane;
- a linked-items sidebar listing the documents and anchors related to the current view;
- search (full text and anchor names);
- navigation history (back and forward per pane).

## Consequences

No graph visualization library (React Flow, Cytoscape.js, D3) is needed, and the UI is significantly simpler. Search
becomes a primary entry point ([0006](0006-search-engine.md)). If a visual overview proves useful later, it can be added
as a secondary view without affecting the core interaction model.
