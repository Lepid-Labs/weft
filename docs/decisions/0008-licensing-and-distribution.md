# 0008 Open source under the MIT license

Status: accepted

## Context

Weft is a developer tool that reads and writes files in a project repository. Choosing between open source and
proprietary, and which license, affects adoption, community contributions, corporate usability, and future commercial
options.

## Options

- **MIT**: maximally permissive, the universal default. No restrictions on use, modification or redistribution, and no
  protection against a competitor hosting the software as a service.
- **Apache 2.0**: like MIT with an explicit patent grant and slightly more formal contributor protections; otherwise
  equally permissive.
- **AGPL**: copyleft. Anyone serving the software over a network must open-source their modifications. Protects
  against cloud strip-mining, but many companies have blanket AGPL bans.
- **ELv2 (Elastic License v2)**: source-available, not OSI-approved. Permits everything except offering the software
  as a managed service. Used by Elastic and others.
- **BSL / FSL**: source-available, converting to open source after two to four years. Not OSI-approved. Used by
  HashiCorp and Sentry.

## Decision

**Open source under the MIT license.**

- **Adoption first.** Developer tools live or die on adoption. MIT has zero friction: no corporate legal review, no
  license compatibility concerns, no "is this really open source?" confusion.
- **Trust.** Weft reads and writes files in your repo, and open source lets people audit what it does.
  Source-available licenses (ELv2, BSL) technically allow that too, but carry perception baggage.
- **Ecosystem fit.** MCP is open, and so is the tooling around it. A non-OSI Weft would be the odd one out.
- **Community contributions.** Document renderers, import pipelines and templates are natural extension points, and
  MIT maximizes contributors' willingness.
- **The commercial path is unaffected.** A future proprietary product would be a separate codebase that imports Weft
  as a dependency and adds commercial features on top (hosted multi-tenant, team management, enterprise auth). MIT on
  the core does not constrain that layer; it is a different product with different value.
- **SaaS risk is near zero.** Weft is a local tool that runs in your repo against your docs. The "someone hosts it as
  a competing service" scenario that AGPL and ELv2 protect against is not a realistic threat for this category of tool.
- **A patent grant (Apache 2.0) is unnecessary.** A JS documentation tool has no patent-relevant innovation, and the
  added formality is not worth the marginal complexity.

## Consequences

Anyone may use, modify, redistribute or host Weft without restriction. Commercial features, if they come, live in a
separate codebase built on top of Weft rather than in this one.
