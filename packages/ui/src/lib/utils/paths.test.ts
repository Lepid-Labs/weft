import type { Manifest, WeftNode } from "@lepid-labs/weft-core";
import { describe, expect, it } from "vitest";
import { nodeIdToPath, pathToNode, rootNodeId } from "./paths.js";

function node(id: string, project?: string): WeftNode {
	return { id, type: "markdown", title: id, anchors: [], ...(project ? { project } : {}) };
}

const SINGLE = [node("README.md"), node("features.md"), node("guides/setup.md")];

const MULTI = [
	node("alpha/README.md", "alpha"),
	node("alpha/features.md", "alpha"),
	node("beta/README.md", "beta"),
	node("beta/api.yaml", "beta"),
];

describe("nodeIdToPath", () => {
	it("maps the root README to /", () => {
		expect(nodeIdToPath("README.md")).toBe("/");
	});

	it("strips the extension", () => {
		expect(nodeIdToPath("features.md")).toBe("/features");
		expect(nodeIdToPath("api.yaml")).toBe("/api");
	});

	it("keeps nested paths", () => {
		expect(nodeIdToPath("guides/setup.md")).toBe("/guides/setup");
	});

	it("maps a project README to the project path", () => {
		expect(nodeIdToPath("alpha/README.md")).toBe("/alpha");
	});

	it("keeps the project prefix on other docs", () => {
		expect(nodeIdToPath("alpha/features.md")).toBe("/alpha/features");
		expect(nodeIdToPath("beta/guides/setup.md")).toBe("/beta/guides/setup");
	});

	it("does not mistake a README suffix for a README file", () => {
		expect(nodeIdToPath("alpha/NOT-README.md")).toBe("/alpha/NOT-README");
	});
});

describe("pathToNode", () => {
	it("resolves / to the root README", () => {
		expect(pathToNode("/", SINGLE)?.id).toBe("README.md");
		expect(pathToNode("", SINGLE)?.id).toBe("README.md");
	});

	it("resolves a plain path", () => {
		expect(pathToNode("/features", SINGLE)?.id).toBe("features.md");
		expect(pathToNode("/guides/setup", SINGLE)?.id).toBe("guides/setup.md");
	});

	it("resolves a project path to that project's README", () => {
		expect(pathToNode("/alpha", MULTI)?.id).toBe("alpha/README.md");
		expect(pathToNode("/beta", MULTI)?.id).toBe("beta/README.md");
	});

	it("resolves a document inside a project", () => {
		expect(pathToNode("/alpha/features", MULTI)?.id).toBe("alpha/features.md");
		expect(pathToNode("/beta/api", MULTI)?.id).toBe("beta/api.yaml");
	});

	it("tolerates a trailing slash", () => {
		expect(pathToNode("/alpha/", MULTI)?.id).toBe("alpha/README.md");
	});

	it("returns undefined for an unknown path", () => {
		expect(pathToNode("/gamma", MULTI)).toBeUndefined();
	});

	it("round-trips every node id", () => {
		for (const n of [...SINGLE, ...MULTI]) {
			const nodes = SINGLE.includes(n) ? SINGLE : MULTI;
			expect(pathToNode(nodeIdToPath(n.id), nodes)?.id).toBe(n.id);
		}
	});
});

describe("with a configured entry point", () => {
	const ROOT = "features.md";

	it("addresses the entry point as / and the README by name", () => {
		expect(nodeIdToPath(ROOT, ROOT)).toBe("/");
		expect(nodeIdToPath("README.md", ROOT)).toBe("/README");
		expect(nodeIdToPath("guides/setup.md", ROOT)).toBe("/guides/setup");
	});

	it("resolves / to the entry point, and /README to the README", () => {
		expect(pathToNode("/", SINGLE, ROOT)?.id).toBe(ROOT);
		expect(pathToNode("/README", SINGLE, ROOT)?.id).toBe("README.md");
	});

	it("round-trips every node id", () => {
		for (const n of SINGLE) {
			expect(pathToNode(nodeIdToPath(n.id, ROOT), SINGLE, ROOT)?.id).toBe(n.id);
		}
	});

	it("keeps a project README at its project path", () => {
		expect(nodeIdToPath("alpha/README.md", "alpha/features.md")).toBe("/alpha");
		expect(nodeIdToPath("alpha/features.md", "alpha/features.md")).toBe("/");
	});
});

describe("rootNodeId", () => {
	const manifest = (site?: Manifest["site"]): Manifest => ({
		version: 2,
		nodes: SINGLE,
		edges: [],
		site,
	});

	it("is the configured entry point", () => {
		expect(rootNodeId(manifest({ entryPoint: "features.md" }))).toBe("features.md");
	});

	it("falls back to the top-level README", () => {
		expect(rootNodeId(manifest())).toBe("README.md");
		expect(rootNodeId(manifest({ siteTitle: "Docs" }))).toBe("README.md");
	});
});
