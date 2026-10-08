# 0023 Publish the embed bundle to npm, with its bundled imports as devDependencies

Status: accepted

## Context

Hosts that embed Weft were building a checkout and vendoring `weft.iife.js` and `weft.css` by hand, with no version to
pin.

## Options

- **A GitHub release asset**: would need a second upload step and `contents: write`.
- **npm**: the Release workflow already publishes every public package with provenance, and npm gives a CDN URL.
- **Bundled imports as `dependencies`**: Vite's library build inlines every import, so the bundle has no runtime
  dependencies, and listing them would make every install pull unified, remark and the workspace packages for nothing.
- **Bundled imports as `devDependencies`**: the build still sees them; installs do not.

## Decision

**`@lepid-labs/weft-embed` publishes `dist/` to npm at the same version as the other packages, with everything it
bundles as `devDependencies`.** `scripts/set-version.mjs` bumps it with the rest, and the package's `unpkg` and
`jsdelivr` fields point at the IIFE.

## Consequences

- A host pins one version and gets a matching jsDelivr URL for free.
- The full ES entry ships no `.d.ts` yet. The section entry ships a hand-written `section.d.ts`, checked against the
  implementation at typecheck ([0015](0015-section-embed-and-react.md)).
- Installing is covered in the [embedding guide](../guides/embedding.md).

## History

- Until 2026-09-29: the embed was `private`, held back until the bundle had a consumer
  ([0022](0022-npm-scope-and-lockstep-releases.md)).
