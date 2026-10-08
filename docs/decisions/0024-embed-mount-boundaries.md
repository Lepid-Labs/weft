# 0024 Define the smaller embed mount by what it refuses to do

Status: accepted

## Context

Hosts embed Weft inside their own pages, and those pages usually already have a header, navigation, search, keyboard
handling, their own endpoints and their own routing. `mountWeft` is the whole product; dropped into such a page, it
would bring a second set of each, fighting the host's own.

## Options

- **`repo`/`baseUrl` options**, with Weft fetching files itself: a host with its own endpoints and search should not
  have to re-serve its files at a shape Weft picked.
- **The host's `WeftClient`**: two methods, implemented however the host likes.

## Decision

**Two embed mounts. `mountWeft` is the whole product; `mountDoc` is the reader, plus optional linked items, and
nothing else.**

- `mountDoc` has no header, tree, search palette or window key handler, since a host that has those would get a second
  set fighting its own.
- It takes the host's `WeftClient` rather than a `repo` or `baseUrl`.
- It treats navigation as an *output*: `onNavigate` fires and nothing moves. The host calls `update()` if it decides
  to navigate.
- It never calls `theme.init()`, which writes `data-theme` onto the document element: right for an app that is the
  whole page, wrong for one panel inside someone else's.

## Consequences

- A third mount, `mountSection`, renders one section of one file with no manifest at all, in its own bundle, and
  `@lepid-labs/weft-react` wraps it as `<WeftSection>` ([0015](0015-section-embed-and-react.md)).
- The same restraint applies to styles. The embed bundle ships no page-level CSS, and an embed's scheme and theme
  attributes go on its own container, never the host's document element ([0025](0025-lepid-design-styling.md)).
- The mounts, CSS scoping and theme roots are described in [embedding](../design/embedding.md), and usage in the
  [embedding guide](../guides/embedding.md).
