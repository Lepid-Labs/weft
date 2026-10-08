# Open questions

Questions not yet worth a decision record, one line each; a question leaves this list when it gets one.

- **MCP server.** Whether to ship an MCP server exposing the graph to agents over stdio; UC-013 waits on it.
- **Doc authoring agent skill.** Whether to ship an agent skill teaching link syntax, anchor conventions and when to
  add cross-references.
- **Import pipeline scope.** Which formats beyond Google Slides it covers: PlantUML, or PDF via pdf.js (today a PDF is
  a tracked artifact, never rendered); UC-003 waits on it.
- **Figma.** Whether to import Figma files through its REST API, with frame-level anchors and overlay links, as for
  Google Slides.
- **PPTX.** Whether to support PPTX, which needs LibreOffice or a JS renderer; deferred until demand is clearer.
- **Checking fetched repositories.** Whether `weft check` over fetched roots reports them separately or offers
  `--local-only`.
