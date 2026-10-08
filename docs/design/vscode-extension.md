# VS Code extension

A planned VS Code extension that brings the Weft reader into the editor and connects code to the documents it
references. Nothing here is built yet; it is Phase 3 of the plan. It would host the Weft UI in a side panel and mark
`@doc` references in source files with gutter decorations that navigate the panel. It serves the editor-integration
requirements in [requirements](../requirements.md), and depends on code-comment links, which are also planned
([links and anchors](links-and-anchors.md#where-links-come-from)).

## Approach

### Side panel

- A VS Code webview panel hosting the Weft UI: the same Svelte app with a different entry point.
- Launched with the command `Weft: Open`.
- It talks to a running local Weft server, or spawns its own if none is running.

### Gutter decorations

- On file open and change, scan for `@doc` comment patterns with a regular expression.
- Register `DecorationOptions` with a hover message and a click command.
- The click command posts a message to the webview panel to navigate to the referenced anchor.

### Communication

- Extension to webview: the VS Code message-passing API.
- Webview to Weft server: plain HTTP (and WebSocket) to localhost, the same `/api` the browser UI uses
  ([architecture](architecture.md#interfaces)).

## Alternatives

None recorded yet.

## Interfaces

- **Command:** `Weft: Open`.
- **Messages to the panel:** navigate to a node and anchor; the message shape is not designed yet.
- **Server:** the existing `/api` endpoints.

## Risks

- The `@doc` code-comment link format and code-file anchors are not built, so the gutter decorations have nothing to
  find until they are.
- The server has no WebSocket endpoint today; live updates in the panel would need one.
