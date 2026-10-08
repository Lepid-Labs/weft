# Use cases

What people and agents set out to do with Weft, one actor and goal per file, numbered `UC-nnn` in the order they were
written. Each names its actor, trigger, flow and outcome; two are deferred until a capability they need exists.
[Requirements](requirements.md) cite the use cases they support.

| Use case | Summary |
|----------|---------|
| [UC-001 Developer navigates the repository's documentation](use-cases/developer-navigates-repo-docs.md) | A developer traces a feature from design doc to API spec to schema to code, with history to go back. |
| [UC-002 Developer opens a referenced document from the editor](use-cases/developer-opens-doc-from-editor.md) | A `@doc` reference in a code comment opens a navigable Weft side panel in VS Code. |
| [UC-003 Presenter answers a question during a call](use-cases/presenter-answers-question-during-call.md) | Mid-presentation, a slide's link opens the endpoint's spec in a slide-in panel; deferred until slide decks can be imported. |
| [UC-004 Reviewer annotates documentation](use-cases/reviewer-annotates-documentation.md) | A reviewer comments on a zipped docs set and the author sees the comments in context. |
| [UC-005 New developer explores the project on day one](use-cases/new-developer-explores-project.md) | Starting from the entry point, a new developer explores the whole graph without a guided tour. |
| [UC-006 AI agent gathers design context before coding](use-cases/agent-gathers-context-before-coding.md) | An agent grounds its code in anchored results from the documentation graph. |
| [UC-007 AI agent updates documentation alongside code](use-cases/agent-updates-docs-with-code.md) | An agent finds the docs linked to the code it changed and updates them in the same change. |
| [UC-008 Developer records the decision behind a significant change](use-cases/developer-records-decision.md) | A decision entry linked to the affected nodes makes the project's evolution traceable. |
| [UC-009 CI agent flags missing documentation updates on a pull request](use-cases/ci-agent-flags-stale-docs-on-pr.md) | A CI agent comments on a pull request with the doc sections its code change made stale. |
| [UC-010 Team discovers who depends on a shared API](use-cases/team-discovers-api-consumers.md) | Before changing a shared API, a team finds consumers across every artifact type. |
| [UC-011 Tech lead audits documentation coverage](use-cases/tech-lead-audits-doc-coverage.md) | A coverage report shows undocumented code, orphaned docs and thin regions of the graph. |
| [UC-012 Team scopes a migration before it begins](use-cases/team-scopes-migration-impact.md) | A team maps everything connected to the component it is replacing before writing code. |
| [UC-013 AI agent queries documentation across repositories](use-cases/agent-queries-docs-across-repos.md) | An agent queries several projects' graphs as services; deferred until an MCP server exists. |
| [UC-014 Developer reads the documentation as it was at a release](use-cases/developer-reads-docs-at-release.md) | A developer browses the docs graph of a past release without checking it out. |
| [UC-015 Stakeholder reviews design documents without code access](use-cases/stakeholder-reviews-docs-without-code.md) | A non-technical stakeholder reads the docs on a hosted static site or a local Weft. |
| [UC-016 Team composes an FAQ from the documents that own the answers](use-cases/team-composes-faq-from-sources.md) | An FAQ includes each answer from its owning document, so no answer is copied or drifts. |
