# Authoring requirements

How people and agents add to the graph from within Weft: authoring links, annotating documents, keeping a decision
log, and starting documents from templates.

## RQ-088 Link authoring from a selection

Status: draft

A user can select any text or element in any renderer, find a target document or anchor by searching or browsing,
and have Weft write the link: into the source for text formats, into the sidecar for binary or converted formats.
Nobody has to write link syntax by hand.

Acceptance criteria:

- Link authoring is off by default, switched on explicitly, and off again in the next session.
- It is available in every layout mode.
- The document re-renders with the new link.

Supports UC-001, UC-004, UC-007, UC-008, UC-010.

## RQ-089 Annotations

Status: draft

A reviewer can attach a comment to an anchor in a document, and the comment can link to other nodes in the graph.
Annotations are stored in the target's sidecar, so they travel with the document, and each records its author and
when it was made.

Set by [decision 0007](../decisions/0007-sidecar-file-format.md). Supports UC-004, UC-008.

## RQ-090 Decision log entries

Status: draft

A developer or agent can append a decision entry to a document, from the UI or the command line, recording what
changed, why, the alternatives considered, and who approved it. Each entry links to the nodes it affects.

Supports UC-008.

## RQ-091 Navigable decision history

Status: draft

From any document or code file, a reader can trace to the decision entries that shaped it.

Supports UC-008.

## RQ-092 Document templates

Status: draft

A user can create a document from a template (decision record, design doc, API changelog, decision log entry),
already linked to the relevant graph nodes. A project can customize the templates in its config.

Supports UC-005, UC-008.
