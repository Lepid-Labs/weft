# CLI requirements

How Weft is started and run from the command line (serving, indexing, and running from a published install), with
the commands of [validation](validation.md), [publishing](publishing.md) and [authoring](authoring.md) in those areas.

## RQ-082 Serve

Status: agreed

One command serves the UI and the data behind it from one process on one port, 7777 by default, bound to the
loopback interface (`127.0.0.1`) unless told to listen on every interface. It watches the docs and rebuilds the
manifest whenever they change.

Set by [decision 0005](../decisions/0005-local-server-and-service.md). Supports UC-001, UC-004, UC-005, UC-015.

## RQ-083 Open the browser on request

Status: agreed

Serve opens the reader's browser once the server is up, only when asked to.

## RQ-084 Startup self-check

Status: agreed

Before announcing its URL or opening a browser, serve requests the UI and the data API from inside its own process,
and marks the announcement as passed or failed, naming the socket error on failure. A port already in use is reported
as such.

## RQ-085 Per-run style override

Status: agreed

Serve can override the configured style and style URL for one run, which is the only way to restyle a fetched
repository. The result is checked against the known styles before the server starts, so a bad name fails on the
command line rather than in the browser.

Set by [decision 0025](../decisions/0025-lepid-design-styling.md).

## RQ-086 Runs from a published install

Status: agreed

The CLI runs from its published npm package, including through `npx`, without a build toolchain: one command can
fetch a GitHub repository, serve it, and open the browser. A development mode serves the UI from source with hot
reload.

Set by [decision 0005](../decisions/0005-local-server-and-service.md) and
[decision 0022](../decisions/0022-npm-scope-and-lockstep-releases.md).

## RQ-087 Index without serving

Status: agreed

A command rebuilds the manifest without starting the UI, optionally without output, for CI and for checking the
graph's state without a browser.
