# Theming

Weft's look comes from the [lepid-design](https://github.com/Lepid-Labs/lepid-design)
design system (`@lepid-labs/styles`). A **style** is one of its themes; Weft
bundles every theme the installed package ships and the manifest that
describes them, so styles are picked by name.

## Picking a style

```yaml
# weft.config.yaml
style: luminous-precision        # one theme — scheme fixed, toggle hidden
# or a pair the light/dark toggle switches between:
style:
  dark: luminous-precision
  light: summer-cloud
```

The default is the pair above. `weft.config.local.yaml` may also set `style`
(and `styleUrl`) — one developer previewing the corpus in a different theme
without touching the committed config; the local value wins.

`weft serve` takes the same choice as a flag, which outranks both files:

```sh
weft serve --style summer-cloud                          # one theme
weft serve --style luminous-precision/summer-cloud       # a dark/light pair
npx @lepid-labs/weft serve --gh org/repo --style neon-butterfly
```

That last form is the only per-run override for a fetched repo, whose local
config file would have to live inside the fetch cache. A name the bundled set
lacks is rejected before the server starts unless `--style-url` (or
`styleUrl` in config) says where to load it from.

## Scheme resolution

With a pair configured, which half renders is the *scheme* choice:

1. User's saved preference (persisted in `localStorage` as `light`/`dark`)
2. `defaultTheme` from `weft.config.yaml`
3. OS/browser system preference

The header toggle switches schemes and persists the choice. With a single
style there is no second scheme, so the toggle hides and `defaultTheme` is
ignored.

To force a scheme on one document regardless of preference, use frontmatter:

```markdown
---
theme: light
---
```

The override element re-declares the theme's tokens locally, so prose and
code colors flip per document. (Structural component rules from two themes
resolve by stylesheet order rather than nesting depth — an upstream CSS
limitation — so the override is token-dominant.)

## Token resolution

Every visual property resolves through three layers, first match wins:

1. **`--weft-*`** — the host's input (see the theming contract in
   [usage.md](usage.md)). Weft only ever reads these.
2. **`--ld-*`** — the active style's design tokens, declared by
   `@lepid-labs/styles` under `[data-ld-style="<theme>"]` guards. Weft sets that
   attribute on its scope root (and per-doc override elements) and never
   declares an `--ld-*` value itself.
3. A built-in literal, so a mount with no style attribute and no host input
   still renders.

The `--w-*` names in the stylesheet are the resolved internals — set the
`--weft-*` name instead.

## Diagrams

Mermaid diagrams are drawn from the same resolved tokens — surfaces, text,
accent and the sans font — read where the diagram sits, so an embed's
diagrams follow its own mount's style and any `--weft-*` override. Whether
a diagram is drawn dark is judged from the resolved background, not from
`data-theme`, so a fixed dark style such as `neon-butterfly` gets dark
diagrams whatever the toggle says. Mermaid bakes colours into each SVG, so
a change of scheme or style redraws them.

## Page chrome

The page itself is lepid-design's app shell, so each style brings its own chrome rather than recolouring Weft's: `ld-shell` (the style's page background, a sticky header, a sticky nav), `ld-shell__brand` showing `siteTitle`, `ld-sidenav` for the document tree (one section per project, its name as the heading, the current document marked `aria-current="page"`), `ld-btn` and `ld-icon-btn` for search and the theme toggle, and `ld-aside-layout` for the document with its linked items beside it. Below the design system's 48rem breakpoint the nav becomes a drawer behind the header's menu button.

Hosts that embed the whole app get the same markup inside their container, which becomes the scroller; neon-butterfly's background artwork is left out of `weft.css` to keep the bundle small.

## Styles newer than the bundled set

`styleUrl` names a base URL serving the lepid-design styles layout
(`<base>/manifest.json`, `<base>/<name>/index.css`) — for example a pinned
jsDelivr path:

```yaml
style: some-future-theme
styleUrl: https://cdn.jsdelivr.net/gh/lepid-labs/lepid-design@v1.0.2/styles
```

Names the bundled manifest knows come from the bundle regardless; only
unknown names load remotely (stylesheet and webfonts both, from the remote
manifest). If the fetch fails, Weft warns and renders the literal fallback
palette rather than refusing to start.

## Webfonts

Themes do not bundle fonts. The standalone app emits the Google Fonts links
for the configured pair straight from the styles manifest. Embed hosts add
the links themselves (URLs in `@lepid-labs/styles/manifest`) — except
`styleUrl` themes, whose fonts are injected from the remote manifest.
