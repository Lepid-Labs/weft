# UI layout

The reader is a three-panel layout: a document tree, the main view, and a linked-items sidebar, with search as a
command palette over it. The graph is the engine, not the interface, so there is no graph overview
([0003](../decisions/0003-no-graph-overview.md)). The default layout, the `reader` layout, search and linked items are
built. Planned and not built: peek-style cross-reference navigation, breadcrumbs, a collapsible tree, the reviewing
and presenting modes, and the link authoring UI. It serves the reading and navigation requirements in
[requirements](../requirements.md).

## Approach

### Three panels

```text
┌──────┬───────────────────────────┬────────────┐
│ LHN  │       Main view           │  Linked    │
│ tree │   (document renderer)     │  items     │
│      │                           │  (edges)   │
└──────┴───────────────────────────┴────────────┘
```

Since 0.2.0 the layout is built from lepid-design's own chrome. `WeftApp` is an `ld-shell`: the theme's page
background, a sticky header and nav, and below 48rem a drawer with a scrim, driven by `data-ld-nav-open`. The document
and linked items sit in `ld-aside-layout`. Weft paints no background of its own over the shell, because a class
selector would outrank the theme's zero-specificity `:where()` rules. The wide-screen rail (`data-ld-nav-collapsed`)
is not used: Weft's nav has no icons to leave behind, so the toggle is hidden at that width. The header carries the
wordmark (`siteTitle`, else "Weft"), a search button and a light/dark toggle. `layout: reader` in the manifest's
`site` block hides the linked items.

### Document tree

`DocTree` is an `ld-sidenav` of real `<a>` links: a plain click navigates in-app and a modified click opens a tab. The
tree is built in [doc-tree.ts](../../packages/ui/src/lib/doc-tree.ts), pure and tested, as one section per project
in project order. A document is labelled by its title (first `#` heading or frontmatter `title`), falling back to its
filename, and a folder by its name; entries are keyed on path segment, so equal titles stay distinct. Nodes marked
`hiddenFromNav` are skipped ([graph and manifest](graph-manifest.md#navigation-filtering)).

Planned: collapsible folders that remember their expand and collapse state for the session.

### Search

Search is a command-palette overlay (`SearchPalette`), not inline in the tree. `Cmd+K` or `Ctrl+K`, or the header's
search button, opens it; `Escape` closes it. It searches document titles, anchors and full-text content through the
MiniSearch index in core ([0006](../decisions/0006-search-engine.md)), and selecting a result navigates the main view.
Semantic search is a future opt-in under the same decision.

### Main view

The main view renders one document through the [rendering pipeline](rendering-pipeline.md). `WeftApp` navigates by
calling the `navigate(path)` its host supplies, where a node id maps to a path and an anchor is the fragment. In the
standalone app that is a SvelteKit route, so browser back and forward work; `mountWeft` switches documents inside its
container without touching the page's URL, and `mountDoc` hands navigation to the host ([embedding](embedding.md)).

A node id maps to a path by dropping its extension, and a README is addressed by its directory (`alpha/README.md` is
`/alpha`). `/` is the root document: the manifest's `site.entryPoint` when one is configured, else the top-level
README. With an entry point set, a top-level README is `/README` instead, so it stays reachable. A path that names no
document lands on the root document, then the first project's README, then the first document the nav lists.
[paths.ts](../../packages/ui/src/lib/utils/paths.ts) holds the mapping for the app and the embed alike; the embed
opens the entry point first too.

Planned: a navigation stack with breadcrumb display (push on navigate, pop on Back). A store for it exists in
[navigation.ts](../../packages/ui/src/lib/stores/navigation.ts), but no component renders it yet.

### Linked items

The sidebar lists the current document's outgoing and incoming edges, labelled by the target's title. It must not
present an edge it cannot follow as navigable. It used to fall back to the raw id, so a dead edge looked ordinary and
clicking it landed on "No documents found". Unresolvable targets now render struck through and non-navigable rather
than being dropped: the manifest legitimately holds edges the UI cannot follow (pending references, targets a renderer
resolves), so this is a permanent condition to present, not a bug to fix upstream. An artifact target is a real node
and is not struck through, but it has nothing to open, so it is not offered as navigation either. An edge whose link
was written differently from its target shows the written form (`resolvedFrom`) as a tooltip. The partition lives in
[linked-items.ts](../../packages/ui/src/lib/linked-items.ts) so it is testable without a component harness.

### Cross-reference navigation (planned)

Configurable behaviour when following a linked item or an inline link, under the config key `ui.crossRefBehavior`.
Today a click navigates the main view.

| Option | Hover | Click | Modifier+click |
|--------|-------|-------|----------------|
| `peek-first` (default) | Peek in a slide-in modal | Navigate the main view | — |
| `click-direct` | — | Navigate the main view | Peek in a slide-in modal |

### Reviewing mode (planned)

The sidebar splits vertically: linked items on top, comment history below.

```text
┌──────┬───────────────────────────┬────────────┐
│ LHN  │       Main view           │  Linked    │
│      │                           ├────────────┤
│      │                           │  Comment   │
│      │                           │  history   │
└──────┴───────────────────────────┴────────────┘
```

- Comment history is a chronological, scrollable list of every annotation on the active document, not filtered by
  scroll position.
- Clicking a comment jumps to its anchor in the main view.
- Each comment has inline edit and delete for corrections.

Comments are the sidecar `annotations` ([links and anchors](links-and-anchors.md#interfaces)), which are not read yet.

### Presenting mode (planned)

The tree and sidebar are hidden and the main view fills the viewport. Context opens in a slide-in modal.

- Toggled explicitly by toolbar button or keyboard shortcut, never engaged automatically.
- The modal slides in from the side opposite the action that opened it, so the selection stays visible and content
  does not shift.
- The modal has its own navigation stack (push, pop, breadcrumbs), and navigating in it does not move the main view.

### Link authoring (planned)

- A session-only toggle, off by default, enabled explicitly, and reset to off when the app closes (not persisted).
- When enabled, selecting text in any renderer shows a floating toolbar with "Add link".
- That opens a command-palette-style picker over documents and anchors.
- Confirming sends a write request to the server, which updates the source file or its sidecar; the renderer then
  re-fetches and re-renders.
- Available in the default, reviewing and presenting modes.

This needs the planned `write` and `authorLink` service operations ([architecture](architecture.md#risks)).

## Alternatives

- **A graph overview visualization.** Rejected in [0003](../decisions/0003-no-graph-overview.md).
- **Dropping dead edges from the sidebar, or showing them as ordinary rows.** The first hides edges the manifest
  legitimately holds; the second invites a click that lands nowhere.

## Interfaces

- The reader takes a `Manifest` (including its `site` block) and a `WeftClient` with two methods, `fetchDoc(id)` and
  `search(query)` ([client.ts](../../packages/ui/src/lib/client.ts)). The standalone app's client calls `/api`
  ([architecture](architecture.md#interfaces)); an embed supplies its own.
- Planned config key: `ui.crossRefBehavior`, `peek-first` or `click-direct`.

## Risks

- The navigation-stack store has no consumer; it should be wired to breadcrumbs or removed.
- The reviewing mode depends on annotations, which the sidecar reader does not parse yet.
