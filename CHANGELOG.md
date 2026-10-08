# Changelog

Notable changes to the published `@lepid-labs/weft*` packages, which are released together at one version. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). Numbers in parentheses are pull requests.

## [Unreleased]

### Added

- Embed one section of a file: `mountSection` in `@lepid-labs/weft-embed/section`, and the new
  `@lepid-labs/weft-react` package with a `<WeftSection>` component (#114).
- `weft check` reports include edges that no block link expands (`include-link-missing`) (#113).

### Fixed

- Includes written as GitHub blob URLs into a mapped repository now expand (#113).

## [0.3.0] - 2026-10-02

### Added

- Mermaid diagrams in fenced code blocks render as diagrams, in the UI and the embed (#107).
- `@lepid-labs/weft-embed` is published to npm (#101).

### Fixed

- Percent-escaped link destinations resolve to the file they name (#105).

## [0.2.0] - 2026-09-26

### Changed

- **Breaking:** the UI uses lepid-design 1.0 styles and its app-shell chrome (#99).

## [0.1.4] - 2026-09-26

### Changed

- Navigation items are labelled by document title, and the header shows `siteTitle` (#97).

## [0.1.3] - 2026-09-26

### Added

- `weft serve --dir` re-roots at a subdirectory of the repository (#95).

## [0.1.2] - 2026-09-08

### Added

- `weft serve --style` and `--style-url`, failing fast on an unknown style (#92).

### Changed

- `weft serve` binds to `127.0.0.1` by default and reports a port that is already taken (#90).

### Security

- Dependency updates for Dependabot alerts in brace-expansion and cookie (#91).

## [0.1.1] - 2026-09-08

First release to npm, as `@lepid-labs/weft`, `@lepid-labs/weft-core` and `@lepid-labs/weft-ui` (#88).

### Added

- `weft serve`, `weft index`, `weft analyze` and `weft check`, with `--open`, `--host`, and a self-check before the
  browser opens (#87, #89).
- Serve a repository straight from GitHub with `weft serve --repo` or `--gh` (#82).
- Multi-project and multi-repo graphs (#8, #73), include edges that compose one document from sections of others
  (#74), and project-defined file extensions (#63).
- A validation stage (#29) that checks edge targets and anchors (#40), the claims links make about their targets
  (#45), stale generated outputs (#46), and copies that have drifted (#47).
- Manifest contributions from external build tools (#42), published-form link resolution (#44), and build
  provenance that tells an agent when a manifest is stale (#60).
- An embeddable, sanitized document viewer (#58), and the lepid-design styles (#83).

[Unreleased]: https://github.com/Lepid-Labs/weft/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Lepid-Labs/weft/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Lepid-Labs/weft/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/Lepid-Labs/weft/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Lepid-Labs/weft/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Lepid-Labs/weft/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Lepid-Labs/weft/releases/tag/v0.1.1
