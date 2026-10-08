# UC-006 AI agent gathers design context before coding

A developer is vibe coding with an AI agent (such as Claude Code, Cursor or Copilot) in a repository that has a Weft
graph. When the agent is about to implement or modify a feature, it wants the project's actual specifications rather
than guessing from code alone.

## Preconditions

The repository has a Weft graph, and the agent has a Weft skill or tool for querying it.

## Primary flow

1. The agent queries the documentation graph for context relevant to the feature: design intent, API contracts,
   database schema constraints, related wireframes.
2. Weft returns structured results anchored to specific document sections.
3. The agent grounds its code generation in those specifications.

## Alternate flows

- 3a. As it works, the agent follows graph edges from a result to related constraints it would not have found by
  grepping source files, then continues at step 3.

## Postconditions

The agent's change is grounded in the project's specifications, including constraints that live only in the
documentation.
