# 0004 No desktop app harness: browser only

Status: accepted

## Context

The UI could be served to a browser (`weft serve`), wrapped in a desktop shell (Electron, Tauri), or both. The question
is whether native OS integration (a dock icon, window management, file associations) justifies an app harness.

## Options

- **Browser only**: `weft serve` opens a tab. Zero additional dependencies.
- **Tauri**: a Rust shell over the system webview. Light (~5 MB), with a native window and file associations, but it
  adds Rust to the toolchain and platform-specific packaging.
- **Electron**: bundles Chromium and Node, at 150 MB or more. Completely at odds with Weft's lightweight goals.

## Decision

**No harness. Browser only.**

- Weft is a developer tool launched from a terminal in a project directory. A browser tab is the natural target;
  developers already have a browser open.
- The VS Code extension covers the "integrated in my editor" use case without a separate app.
- `weft build` (static export) covers the stakeholder review use case (UC-015) with no local process at all, just a
  hosted site.

## Consequences

There is no native packaging to build or sign per platform. Tauri could be revisited later for a polished standalone
experience, but it is not needed for v1 and would add Rust to the build toolchain, contradicting
[0001](0001-implementation-language.md).
