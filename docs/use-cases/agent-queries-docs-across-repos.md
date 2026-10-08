# UC-013 AI agent queries documentation across repositories

An AI agent working in one of an organization's repositories needs answers that span the organization's other
projects.

Deferred: this waits on an MCP server that serves a project's graph to agents ([open questions](../open-questions.md)).

## Preconditions

The organization runs Weft MCP servers in multiple project repositories.

## Primary flow

1. The agent queries the Weft servers across the repositories: for cross-repo dependencies, for which projects
   consume a shared API, or for how other teams solved a similar problem.
2. Each server answers from its project's documentation graph.
3. The agent synthesizes the results across the organization.

## Postconditions

The agent has its answer without cloning or navigating each repository: it queried each project's documentation
graph as a service.
