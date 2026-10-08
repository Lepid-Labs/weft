# Embed weft in your own page

For developers putting weft's reader into a page or app of their own. After it you can mount the whole app, the reader
alone, or one section of one file; theme the mount to match your page; and control how diagrams load.

## Prerequisites

`mountWeft` needs a manifest built by [`weft index`](cli.md#weft-index) and published with the docs; in GitHub mode it
is read from `docs/.weft/manifest.json` unless `manifestPath` says otherwise. `mountDoc` needs a manifest your page
loads itself. `@lepid-labs/weft-react` needs `react` 18 or later, a peer dependency.

## Choose a mount

`@lepid-labs/weft-embed` offers three mounts, and which one you want depends on how much of the page is yours. The
third, `mountSection`, renders one section of one file inline; see [One section](#one-section). What each mount does
and refuses to do is recorded in [0024](../decisions/0024-embed-mount-boundaries.md).

`mountWeft` gives you the whole product — header, document tree, search, theme handling — and fetches documents from a
GitHub repo or a base URL:

```js
const unmount = Weft.mountWeft('#root', { repo: 'acme/docs', branch: 'main' });
```

`mountDoc` gives you the reader and the graph around it, and nothing else. No header, no tree, no search palette, no
window-level key handler — for a host that already has all of those and wants the part it does not:

```js
const doc = Weft.mountDoc('#host', {
  client,                  // your own fetchDoc + search
  manifest,                // you load it; Weft does not decide where it lives
  nodeId: 'guide.md',
  linkedItems: true,       // opt into the sidebar without the rest
  onNavigate: (id, anchor) => router.go(id, anchor),
});

doc.update({ nodeId: 'api.md' });                    // re-point it, no anchor
doc.update({ nodeId: 'api.md', anchor: '#errors' }); // …or to a section
doc.destroy();                                       // remove it
```

## How mountDoc behaves

**The client is yours.** `WeftClient` is two methods — `fetchDoc(id)` and `search(query)`. Serve documents from your
own endpoints and search with your own backend; Weft does not pick a URL shape or ship a second search index.

**Navigation is an output, not an action.** Following a link inside a document calls `onNavigate` and changes nothing.
The host owns its URL and its history, and calls `update` if it decides to show the new document. `update` takes the
whole state rather than a patch: an omitted `anchor` means no anchor, never the previous one.

**Weft stays inside its own container.** Everything it renders sits within `.weft-scope`, so its box model, fonts and
colours reach only its own subtree — your reset and your typography are untouched outside it. It never writes
`data-theme` on `documentElement`: set it on the container to pick a scheme, or leave it and Weft inherits what you
already decided. Anchor scrolling is scoped to the mount too, so a link to `#overview` inside a document will not
scroll an `#overview` of yours elsewhere on the page.

## One section

`mountSection` renders one section of one file inline in your layout: help text in a tool, kept in the docs rather
than copied into the tool. It needs no manifest, just a source, a path and, optionally, a heading anchor. The section
runs from that heading to the next one as deep or shallower; with no anchor it is the whole file.

```js
import { mountSection } from '@lepid-labs/weft-embed/section';
import '@lepid-labs/weft-embed/section.css';

const section = mountSection('#help', {
  repo: 'acme/tool', ref: 'v2.1.0',      // a branch to follow, or a tag to pin
  path: 'docs/cli.md', anchor: '#flags',
  headingLevel: 3,                        // the section's heading renders as an h3
  onError: (error) => showFallback(error.kind), // 'load' | 'anchor' | 'render'
});
section.update({ path: 'docs/cli.md', anchor: '#exit-codes' });
```

| Option | Meaning |
|--------|---------|
| `repo`, `ref` | GitHub `owner/repo`, and the branch, tag or commit to read (default `main`). Fetched unauthenticated, so public repos only. |
| `baseUrl` | Instead of `repo`: a URL serving files at their paths. |
| `client` | `{ fetchDoc(path) }`, to fetch through your own backend, which holds the credentials for a private repo. Takes precedence over `repo` and `baseUrl` for fetching; those still shape the default URLs below. |
| `headingLevel`, `hideHeading` | Fold the section into your outline, or leave out its heading when you title it yourself. |
| `resolveUrl` | Where relative links and images point. By default a link opens the file on GitHub (or under `baseUrl`), and an image loads from the raw file, which a private repo needs this to override. |
| `onLinkClick` | Follow links into the docs yourself; it receives `{ path, anchor, url }`. Without it, the link opens in a new tab. |
| `onError` | Called when the section cannot be shown. The mount then renders nothing and leaves the fallback to you; without it, the mount shows the message. |

`style`, `styleUrl`, `mermaid` and the [render-pass options](reading.md#contributing-render-passes) work as on
`mountDoc`. The mount never navigates your page: a `#fragment` link scrolls within the section, or opens that heading
in the file, rather than changing your location hash, and external links open in a new tab. Include links render as
links; expanding them needs the manifest, which is `mountDoc`'s job. A renamed heading shows up as an `anchor` error:
pin `ref` to take doc changes only with your releases, or follow a branch and check your anchors in your own CI.

## React

`@lepid-labs/weft-react` wraps `mountSection` as a component.

```jsx
import { WeftSection } from '@lepid-labs/weft-react';
import '@lepid-labs/weft-react/style.css';

<WeftSection
  client={docsClient}                // fetches through your backend
  repo="acme/tool" ref="main"        // so links open on GitHub
  path="docs/cli.md" anchor="#flags"
  hideHeading
  fallback={<a href={CLI_DOCS_URL}>See the CLI docs</a>}
/>
```

Its props are `mountSection`'s options, with `theme` in place of `style` (so it does not read as inline CSS), plus
`className`, and `fallback`, which is shown when the section cannot be. `path` and `anchor` re-point the section in
place. Functions are read when they are called, so an inline arrow or an inline `client` does not refetch. Any other
prop change mounts afresh, so keep `remarkPlugins` and `rehypePlugins` arrays stable. The renderer loads as its own
chunk on first mount, and server rendering emits only the empty container; the module is marked `"use client"`.

## Theming contract

Pick a style with the `style` option — one theme name, or a `{dark, light}` pair the reader switches between; the
default pair is `dark: luminous-precision, light: summer-cloud` (see [Choose and customize a theme](theming.md)):

```js
Weft.mountDoc('#host', { client, manifest, nodeId: 'guide.md',
  style: { dark: 'luminous-precision', light: 'summer-cloud' } });
```

For a pair, the mount follows the nearest ancestor's `data-theme` to pick a half; a single name is fixed. All bundled
theme CSS ships inside `weft.css`, guarded by `data-ld-style` so it is inert in your page. A theme newer than the
bundled set loads via [`styleUrl`](theming.md#styles-newer-than-the-bundled-set); its cost is a stylesheet `<link>`
injected into your `<head>`. Webfonts for bundled themes are your page's responsibility; see
[Webfonts](theming.md#webfonts).

On top of the style, these `--weft-*` custom properties are the fine-grained integration surface — set any of them on
the mount container, or any ancestor of it, and your value beats the active theme's:

| Group | Properties |
|-------|------------|
| Surfaces | `--weft-color-bg`, `--weft-color-bg-secondary`, `--weft-color-bg-elevated` |
| Lines | `--weft-color-border`, `--weft-color-border-subtle` |
| Text | `--weft-color-text`, `--weft-color-text-secondary` |
| Emphasis | `--weft-color-link`, `--weft-color-link-hover`, `--weft-color-accent`, `--weft-color-accent-subtle` |
| Type | `--weft-font-sans`, `--weft-font-heading`, `--weft-font-mono` |
| Code | `--weft-code-keyword`, `--weft-code-string`, `--weft-code-number`, `--weft-code-comment`, `--weft-code-function`, `--weft-code-variable`, `--weft-code-type`, `--weft-code-meta` |
| Layout | `--weft-lhn-width`, `--weft-rhs-width`, `--weft-header-height` |

**Weft never declares these — it only reads them**, so a value you set on an ancestor is never shadowed by one Weft
set on its own root. How each resolves against the style is in [Token resolution](theming.md#token-resolution).

Set `data-theme="dark"` or `"light"` on the container, or anywhere above it, to pick which half of the style pair
renders. A mount's own `data-theme` always wins over a host's, so an embed can be dark inside a light page. An
unthemed host gets the pair's light half.

> The `--w-*` properties you'll see in the stylesheet are internal — the resolved values, not the inputs. Setting one
> does nothing useful; set the `--weft-*` name instead. The `--ld-*` names belong to lepid-design; overriding a
> specific one on the container works too, but `--weft-*` is the stable surface.

## Diagrams

The embed does not bundle mermaid, which would add several MB to every host whether its documents have diagrams or
not. By default, a page with a ` ```mermaid ` fence imports mermaid's ESM build from jsDelivr, pinned to the exact
version the embed was built against. That is a request to a third party your page did not make before. The `mermaid`
option, on both `mountWeft` and `mountDoc`, changes it:

```js
// Bundle mermaid yourself — your bundler code-splits it into a lazy chunk:
Weft.mountDoc('#host', { client, manifest, nodeId, mermaid: () => import('mermaid').then((m) => m.default) });

// Self-host it (copy mermaid's whole dist/ — the entry loads chunks beside it),
// e.g. under a Content-Security-Policy that blocks jsDelivr:
Weft.mountDoc('#host', { client, manifest, nodeId,
  mermaid: () => import('/vendor/mermaid/mermaid.esm.min.mjs').then((m) => m.default) });

// No diagrams: fences stay code blocks, and nothing is fetched.
Weft.mountDoc('#host', { client, manifest, nodeId, mermaid: false });
```

A loader is called once per page that has diagrams and must resolve to mermaid's default export. While it draws,
mermaid briefly appends a measuring element to your `<body>` and removes it.

## Installing

`@lepid-labs/weft-embed` is published to npm in step with the CLI. The bundle is self-contained, so installing it
pulls in nothing else; the one thing it fetches at runtime is mermaid, and only for a page with a diagram
([Diagrams](#diagrams)). A bundler imports the ES build and its stylesheet:

```js
import { mountDoc } from '@lepid-labs/weft-embed';
import '@lepid-labs/weft-embed/style.css';
```

A plain page loads the IIFE build, which defines the `Weft` global, from a CDN, pinned to a published version:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@lepid-labs/weft-embed@<version>/dist/weft.css">
<script src="https://cdn.jsdelivr.net/npm/@lepid-labs/weft-embed@<version>/dist/weft.iife.js"></script>
```

To self-host, copy `dist/weft.iife.js` and `dist/weft.css` out of the installed package.

The section mount is a separate entry with its own stylesheet, `@lepid-labs/weft-embed/section` and
`@lepid-labs/weft-embed/section.css`; its IIFE build, `dist/section.iife.js`, defines the `WeftSection` global. It
ships TypeScript declarations; the full entry does not yet.
