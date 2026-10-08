# 0027 Let hosts contribute render passes rather than fork the renderer

Status: accepted

## Context

A corpus can need rendering Weft does not provide, in its own vocabulary. Without a seam, a host's only route to that is
forking the renderer.

## Options

- **Forking the renderer**: every host carries its own copy.
- **A config key**: `weft.config.yaml` is static data ([0017](0017-static-config.md)), and the renderer runs
  browser-side, so config cannot carry code.
- **A code seam**: plugin lists passed in by the host.

## Decision

**A host contributes render passes through a code seam.** `remarkPlugins`, `rehypePlugins` and `extendSchema` thread
from `renderMarkdown` through `DocView` and `WeftApp` to the embed config. Contributed plugins run after raw HTML is
parsed into the tree and before the renderer's own passes, and the sanitizer runs last over everything, so plugin
output is checked like the document's own.

## Consequences

- The same shape as `ValidatorRegistry` and the manifest contribution interface
  ([0018](0018-one-contribution-format.md)): other tools contribute, and Weft never learns one corpus's vocabulary.
- A plugin that adds markup the allowlist does not admit has to widen it through `extendSchema`.
- Included fragments pass through contributed plugins too ([0026](0026-composed-documents-via-includes.md)), and a
  throwing plugin in an embedded section is reported to the host as a `render` error
  ([0015](0015-section-embed-and-react.md)).
- Why the chain's order is a contract is described in [rendering pipeline](../design/rendering-pipeline.md), and
  contributing passes in the [reading guide](../guides/reading.md).
