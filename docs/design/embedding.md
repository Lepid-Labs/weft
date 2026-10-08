# Embedding

`@lepid-labs/weft-embed` lets another page host Weft's reader, and `@lepid-labs/weft-react` wraps its smallest mount
for React apps. This design covers the three mounts, how the bundle stays out of the host page's styling, the token
chain, where the scheme and theme attributes live, and loading a newer theme through `styleUrl`. The choices behind it
are [0015](../decisions/0015-section-embed-and-react.md) (one section and React),
[0023](../decisions/0023-publish-the-embed-bundle.md) (publishing the bundle),
[0024](../decisions/0024-embed-mount-boundaries.md) (what each mount refuses to do) and
[0025](../decisions/0025-lepid-design-styling.md) (lepid-design styling). It serves the embedding requirements in
[requirements](../requirements.md).

## Approach

### Three mounts

- **`mountWeft`** is the whole product: header, document tree, search palette, theme handling and a window key
  handler. It reads files and the manifest from a GitHub `repo` (with `branch`, `manifestPath` and an optional
  `token`) or from any `baseUrl`. It makes its container the scroller and containing block
  (`overflow: auto; contain: layout`), so the shell's sticky and fixed parts stay inside it.
- **`mountDoc`** is the reader plus optional linked items, and nothing else. It takes the host's `WeftClient` and a
  manifest the host loaded, treats navigation as an output (`onNavigate` fires and nothing moves; the host calls
  `update()` if it decides to), and never sets a theme on the page.
- **`mountSection`** (`@lepid-labs/weft-embed/section`, its own bundle) renders one section of one file with no
  manifest at all, from a `repo` and `ref`, a `baseUrl`, or a host `client`. Include links stay links. The React
  component `<WeftSection>` imports this bundle on first mount, so a host's own bundle pays nothing until a section is
  shown.

Every mount takes the render options (`remarkPlugins`, `rehypePlugins`, `extendSchema`, `mermaid`;
[rendering pipeline](rendering-pipeline.md)) and the styling options (`style`, `styleUrl`).

### No page-level CSS

The embed bundle ships no page-level CSS. `app.css` is tokens plus base styles scoped to `.weft-scope`; the global
reset and the `html` and `body` rules live in `app-page.css`, which only the standalone app loads.
[styles.test.ts](../../packages/ui/src/lib/styles.test.ts) guards the split, because one rule added to the wrong file
undoes it. [check-scoping.mjs](../../packages/embed/scripts/check-scoping.mjs) checks the built CSS: it accepts
selectors guarded by `[data-ld-style` as host-safe and requires namespaced keyframes.

This was verified in a hostile host page: a `content-box` host element stayed `content-box`, the host's background and
font survived, and the document element kept no `data-theme`.

### Token chain

lepid-design is consumed as-is: `@lepid-labs/styles` 1.0.2 or later, whose every rule is guarded by
`:where([data-ld-style="<theme>"])`, an upstream change made for exactly this. Token resolution is a three-layer chain,
pinned by `styles.test.ts`: the host's `--weft-*`, then the active theme's `--ld-*`, then a literal fallback. Weft
declares its own `--w-*` properties only in `app.css` and never declares a `--weft-*` or `--ld-*` anywhere, so a host
value always wins.

The `style` config or option picks one theme or a `{dark, light}` pair (default `luminous-precision` and
`summer-cloud`). It may be set in `weft.config.local.yaml`, so one developer can preview in another theme. The theme
roster, schemes and font URLs come from `@lepid-labs/styles/manifest`, so a new upstream theme works by name after a
dependency bump. All bundled themes fold into `dist/weft.css` (about 9.5 KB gzipped); neon-butterfly's 1.2 MB `.ld-bg`
artwork is aliased to a transparent pixel, because Vite's library mode inlines every CSS asset and no embed renders
that page treatment.

`localStorage` stores only the scheme. Config decides styles, so a stale stored theme name can never pin one. A
document's frontmatter `theme` override re-declares tokens locally, which is correct by proximity.

### Scheme and theme roots

Scheme (`data-theme`) and theme (`data-ld-style`) are two attributes on the scope root: the standalone app's `<html>`,
or an embed's own container, never a host's document element. Theme tokens on the host's root would push a real
`color-scheme` onto a page Weft does not own. `theme.init()` takes `{ pair, root }` for exactly this. A `mountDoc` or
`mountSection` given a pair follows the host's nearest-ancestor `data-theme` and mirrors it onto its own root; given a
single name it is fixed. A host can also set `data-theme` on the container to pick a scheme.

### Loading a newer theme

`styleUrl` (config and mount option) loads a theme newer than the installed dependency from a base URL that serves the
styles manifest, such as a pinned jsDelivr path. The stylesheet and fonts are injected client-side, and a failure
warns and falls back. It costs a stylesheet `<link>` in the host's `<head>`: theme CSS cannot be scoped to the mount,
only guarded by the attribute. Before mounting, a style name the bundle does not carry is accepted only when a
`styleUrl` can supply it, the same check `weft serve --style` makes ([architecture](architecture.md#serve-behaviour)).

## Alternatives

- **Page-level CSS in the bundle.** It would reset the host's box model, background and fonts.
- **Calling `theme.init()` on the document element from an embed.** Right for an app that is the whole page, wrong for
  one panel inside someone else's ([0024](../decisions/0024-embed-mount-boundaries.md)).
- **Declaring `--weft-*` defaults.** A declaration would compete with the host's own values instead of deferring to
  them.
- **A `section` mode on `mountDoc`, or a custom element.** Rejected in
  [0015](../decisions/0015-section-embed-and-react.md).

## Interfaces

- **Package entry points** ([package.json](../../packages/embed/package.json)): `.` (ES, `dist/weft.js`), `./iife`
  (`dist/weft.iife.js`), `./style.css`, `./section` (ES, typed by the hand-written
  [section.d.ts](../../packages/embed/section.d.ts)), `./section/iife` and `./section.css`. The `unpkg` and `jsdelivr`
  fields point at the IIFE. The bundle has no runtime dependencies, since Vite's library build inlines every import,
  and is published at the same version as the other packages
  ([0023](../decisions/0023-publish-the-embed-bundle.md)). `section.d.ts` is checked against the implementation at
  typecheck; the full ES entry ships no `.d.ts` yet.
- **Mount options**: `EmbedConfig`, `DocMountOptions` and `DocMount` in
  [index.ts](../../packages/embed/src/index.ts); `SectionMountOptions` in `section.d.ts`. `mountWeft` defaults
  `branch` to `main` and `manifestPath` to `docs/.weft/manifest.json`. `DocMount.update()` takes the whole state, so an
  omitted anchor clears rather than carrying over.
- **Theming contract**: the `--weft-*` custom properties a host may set, listed in the
  [theming guide](../guides/theming.md).

## Risks

- Two themes' structural component rules tie at zero specificity and resolve by source order. Token-dominant in
  practice, but a per-document theme override can show the other theme's structure.
- `styleUrl` reaches outside the bundle at runtime, into the host's `<head>`, and depends on the base URL staying up.
- Scoping is enforced by tests and a build check; a rule that slips past both lands on the host page.
