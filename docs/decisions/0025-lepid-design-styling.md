# 0025 Style Weft with lepid-design, consumed as-is

Status: accepted

## Context

Weft needs a visual design with selectable themes, in two settings: as a standalone app that owns the whole page, and
embedded in a host page that it does not own and must not restyle. Users and developers want to pick a theme, and
upstream keeps adding new ones.

## Options

- **Scheme and theme attributes on the document element**: theme tokens there would push a real `color-scheme` onto a
  page Weft does not own.
- **Scheme and theme attributes on Weft's own scope root**: the standalone app's `<html>`, or an embed's container.
- **Remembering the chosen theme in `localStorage`**: a stale stored theme name could pin a style that config has
  since changed.
- **Remembering only the scheme**: config decides styles.

## Decision

**Weft's styling is the lepid-design design system (`@lepid-labs/styles` 1.0.2 or later), consumed as-is.** Every
upstream rule is guarded by `:where([data-ld-style="<theme>"])`, an upstream change made for exactly this.

- `style` config picks one theme or a `{dark, light}` pair (default `luminous-precision`/`summer-cloud`). It is allowed
  in `weft.config.local.yaml`, so one developer can preview in another theme.
- Token resolution is a three-layer chain: host `--weft-*`, then the active theme's `--ld-*`, then a literal fallback.
  Weft declares `--w-*` only in `app.css`, and never declares a `--weft-*` or `--ld-*` anywhere.
- Scheme (`data-theme`) and theme (`data-ld-style`) are two attributes on the scope root: the standalone app's
  `<html>`, or an embed's own container, never a host's document element. `theme.init()` takes `{pair, root}` for
  exactly this.
- The theme roster, schemes and font URLs come from `@lepid-labs/styles/manifest`. `styleUrl` (config and embed option)
  loads a theme newer than the installed dependency from a manifest-serving base URL, such as a pinned jsDelivr URL,
  injecting the stylesheet and fonts client-side, with a warning and fallback on failure.
- `localStorage` stores only the scheme.

## Consequences

- A new upstream theme works by name with only a dependency bump.
- `styles.test.ts` pins the token chain. `check-scoping.mjs` accepts selectors guarded by `[data-ld-style` as
  host-safe and requires namespaced keyframes.
- All three themes fold into `dist/weft.css` (~9.5 KB gzipped). Lib-mode Vite inlines every CSS asset, so
  neon-butterfly's 1.2 MB `.ld-bg` artwork is aliased to a transparent pixel.
- Weft paints no background of its own over the theme's shell, because a class selector would outrank the theme's
  zero-specificity `:where()` rules.
- `weft serve --style` and `--style-url` are checked against the styles manifest before the server starts, failing on
  the command line rather than in the browser.
- Known limit: a per-document frontmatter override re-declares tokens locally (correct by proximity), but two themes'
  structural component rules tie at zero specificity and resolve by source order. In practice the tokens dominate;
  the [theming guide](../guides/theming.md) documents it.
- The token chain, theme roots and `styleUrl` are described in [embedding](../design/embedding.md).
