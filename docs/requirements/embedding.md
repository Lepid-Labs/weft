# Embedding requirements

How a host page or application embeds Weft: the three mounts, the React component, how an embed stays inside its
container, the theming contract, and how the bundle is delivered.

## RQ-073 Mount the whole product

Status: agreed

A host page can mount the whole of Weft (header, document tree, search and theme handling), reading documents from a
GitHub repository or a base URL.

Set by [decision 0024](../decisions/0024-embed-mount-boundaries.md).

## RQ-074 Mount the reader alone

Status: agreed

A host can mount the reader, with linked items if it opts in, and nothing else: no header, tree, search palette or
window-level key handler.

Acceptance criteria:

- The host supplies the manifest, and fetches documents and runs search through its own two-operation client.
- Following a link reports the target to the host and moves nothing; the host re-points the mount if it chooses.
- Re-pointing takes the whole state, document and anchor together, never a patch.

Set by [decision 0024](../decisions/0024-embed-mount-boundaries.md).

## RQ-075 Mount one section

Status: agreed

A host can render one section of one file, with no manifest: from a heading to the next heading as deep or shallower,
or the whole file when no anchor is given.

Acceptance criteria:

- The source is a public GitHub repository at a branch, tag or commit (`main` by default), a base URL, or the host's
  own fetch client. A private repository is read through the host's client, never with a token given to the mount.
- The section's heading can be set to a given level, or hidden.
- The mount never navigates the host page: a fragment link scrolls within the section or opens that heading in the
  file, and links into the docs go to the host's handler or open in a new tab, as external links do.
- A failure says whether loading, the anchor or rendering failed. When the host handles failures, the mount renders
  nothing and leaves the fallback to the host.
- Include links render as plain links.

Set by [decision 0015](../decisions/0015-section-embed-and-react.md).

## RQ-076 React component

Status: agreed

A React component, for React 18 or later, wraps the section mount. It shows a host-supplied fallback when the section
cannot be shown, re-points in place when the path or anchor changes, loads the renderer on first mount, and renders
only an empty container on the server.

Set by [decision 0015](../decisions/0015-section-embed-and-react.md).

## RQ-077 Embeds stay inside their container

Status: agreed

Everything an embed renders is scoped to its container: its box model, fonts and colours reach only its own subtree,
and it ships no page-level CSS. It never writes a scheme onto the host document's root, and anchor scrolling stays
within the mount.

Set by [decision 0025](../decisions/0025-lepid-design-styling.md).

## RQ-078 Theming contract

Status: agreed

A host restyles an embed by setting the documented `--weft-*` custom properties on the container or any ancestor.
Each resolves as: the host's value, then the active style's token, then a built-in literal; Weft never declares a
`--weft-*` property itself. `data-theme` on the container or an ancestor picks the scheme, a mount's own beating a
host's, and an unthemed host gets the light half of the style pair.

Set by [decision 0025](../decisions/0025-lepid-design-styling.md).

## RQ-079 Diagrams in embeds

Status: agreed

Embed bundles do not include Mermaid. By default, a page with a diagram loads Mermaid from a CDN, pinned to the
version the embed was built against. A host can supply its own loader, or turn diagrams off, in which case fences stay
code blocks and nothing is fetched. A build fails if a bundle inlines Mermaid or loses the pin.

Set by [decision 0014](../decisions/0014-mermaid-rendering.md).

## RQ-080 Published embed bundle

Status: agreed

The embed is published to npm at the same version as Weft's other packages. It is self-contained, with no runtime
dependencies, and can be loaded from a CDN pinned to a version or self-hosted.

Set by [decision 0023](../decisions/0023-publish-the-embed-bundle.md) and
[decision 0022](../decisions/0022-npm-scope-and-lockstep-releases.md).

## RQ-081 Embed type declarations

Status: draft

The full embed entry ships TypeScript declarations, as the section entry already does.
