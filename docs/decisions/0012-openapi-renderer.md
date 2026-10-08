# 0012 Render OpenAPI specs with Weft's own Svelte components

Status: accepted

## Context

Weft needs to render OpenAPI specs in its document viewer. The renderer has to integrate with Weft's anchor system
(operation IDs, schema names) and emit link-click callbacks that the pane handles. The spec is already parsed at index
time for anchor extraction, and Shiki was expected to be in the stack for syntax highlighting.

## Options

- **Redoc**: Redocly's open-source renderer. A web component, ~500 KB, with a three-panel portal layout and its own
  sidebar navigation. Read-only, with React bundled internally.
- **Stoplight Elements**: a web component, ~800 KB or more, with a similar portal layout plus a "Try It" panel for live
  API requests. React bundled internally; maintenance trajectory uncertain after the SmartBear acquisition.
- **Scalar**: a newer entrant. A web component, ~150–200 KB, with a cleaner design than Redoc but still a portal-style
  renderer with its own navigation.
- **Custom Svelte components**: parse the spec with a YAML parser (already needed for sidecar files) and
  `@apidevtools/swagger-parser` for `$ref` dereferencing, render operations and schemas as Svelte components, and
  highlight example code blocks with the stack's highlighter.

## Decision

**Custom Svelte components. No third-party OpenAPI renderer.**

- **Portal renderers fight the pane model.** Redoc, Stoplight and Scalar are standalone documentation portals with
  their own sidebar navigation, scroll behaviour and layout. Embedding one in Weft's pane means fighting its navigation
  to intercept clicks, mapping Weft anchors onto its DOM, and overriding its design system. The integration cost exceeds
  the build cost.
- **Anchors are native.** Weft already parses the spec at index time to extract anchors, so a custom renderer generates
  anchor IDs directly, with no mapping layer between Weft's graph and a third-party renderer's DOM.
- **No new dependencies.** The highlighter and a YAML parser are already in the stack. `@apidevtools/swagger-parser`
  adds `$ref` dereferencing: the only new dependency, and a small one.
- **Bounded scope.** The OpenAPI structure is well defined: paths, operations, parameters, and request and response
  schemas. A Svelte component that walks this tree with collapsible sections and highlighted code blocks is not a
  large surface. Build what Weft needs and skip the portal features it doesn't.

## Consequences

`parseOpenApiSpec` is exported from `@lepid-labs/weft-core/browser`: the client fetches the raw spec through
`/api/doc/*` and parses it browser-side. `$ref` dereferencing is deferred, so `@apidevtools/swagger-parser` has not been
added. Operation and schema ids come from `openApiOperationAnchor` and `openApiSchemaAnchor`, which the extractor and
the renderer both call, so indexed anchors and rendered ids cannot disagree. Shiki did not join the stack; code is
highlighted by `rehype-highlight`. The renderer's place in the pipeline is described in
[rendering pipeline](../design/rendering-pipeline.md).
