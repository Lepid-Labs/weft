# 0015 Embed one section through its own mount, wrapped for React

Status: accepted

## Context

Tools want their help text to come from the docs that are written, reviewed and checked, rather than copied into the
tool where it drifts. `mountDoc` renders a whole document and needs the host to load the manifest and implement
`WeftClient` first, which is too much setup for "show the Flags section of `cli.md` here". The host that asked for this
builds in React, and its docs live in a private repo.

## Options

- **A `section` mode on `mountDoc`**: reuses the mount, but keeps the manifest and the two-method client as
  prerequisites for a job that needs neither.
- **A third mount in its own bundle, plus a React wrapper**: `mountSection(target, { repo | baseUrl | client, path,
  anchor })`, with no manifest, no tree and no search. A separate `@lepid-labs/weft-react` package wraps it as
  `<WeftSection>`.
- **A custom element (`<weft-section>`)**: framework-neutral, but React 18 passes custom-element props as string
  attributes, so `client`, plugins and callbacks would not reach it.

## Decision

**A third mount in its own bundle (`@lepid-labs/weft-embed/section`), wrapped by `@lepid-labs/weft-react`.**

- **Its own bundle, for what it leaves out.** The section build drops the app, tree, search and OpenAPI renderer. It is
  not small: ~190 KB gzipped against ~230 KB for the full IIFE, because the render pipeline itself (highlight.js, parse5
  for sanitized raw HTML, micromark) is most of both. The React component imports it on first mount, so a host's own
  bundle pays nothing until a section is shown.
- **Private repos go through `client`, never a token.** `client.fetchDoc(path)` lets the host's backend hold the
  credential. Links still default to GitHub, which works for a signed-in reader of a private repo; images do not, so
  `resolveUrl` lets the host point them at its backend.
- **`ref` follows a branch or pins a tag, and the host chooses.** A host that wants doc edits to ship only with its
  releases pins a tag; one that wants them live follows a branch and gates breaking changes in its own CI.
- **The mount never navigates the host's page.** A `#fragment` would rewrite the host's location hash, which a
  hash-routed app reads as a route, so fragments scroll inside the mount or become links into the file. Links into the
  docs go to `onLinkClick` or open in a new tab, and so do external links.
- **A failure is the host's to present.** `onError` receives a `SectionError` whose `kind` separates a failed fetch
  from a renamed heading (`anchor`) and a throwing plugin (`render`); with it set the mount renders nothing, and the
  React component shows its `fallback`.
- **Hand-written types.** The implementation's types reach into Weft's UI sources and unified, which no host installs,
  so `section.d.ts` is written to stand alone, and a compile-time check fails the typecheck if its option names drift.
  The React package's types build on it.
- **Include links stay links.** Expanding them needs the manifest's edges; a host that wants that uses `mountDoc`.

## Consequences

There are now three mounts, and `mountSection` joins the boundaries set out in
[0024](0024-embed-mount-boundaries.md). The section entry ships `section.d.ts` while the full ES entry still ships no
`.d.ts` ([0023](0023-publish-the-embed-bundle.md)). `@lepid-labs/weft-react` is a new package, so its first version is
published by hand ([0022](0022-npm-scope-and-lockstep-releases.md)). Composed documents do not compose in a section
([0026](0026-composed-documents-via-includes.md)). Usage is covered in the [embedding guide](../guides/embedding.md).
