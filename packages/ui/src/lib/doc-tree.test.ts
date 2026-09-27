import type { WeftNode } from "@lepid-labs/weft-core";
import { describe, expect, it } from "vitest";
import { buildGroups, buildTree } from "./doc-tree.js";

function node(id: string, title: string, project?: string): WeftNode {
	return { id, type: "markdown", title, anchors: [], ...(project ? { project } : {}) };
}

describe("buildTree", () => {
	it("labels documents by title and folders by directory name", () => {
		const tree = buildTree([
			node("guides/setup.md", "Setting up"),
			node("guides/deploy.md", "Deploying"),
			node("README.md", "Overview"),
		]);
		expect(tree.map((n) => n.label)).toEqual(["guides", "Overview"]);
		expect(tree[0]?.nodeId).toBeUndefined();
		expect(tree[0]?.children.map((n) => [n.label, n.nodeId])).toEqual([
			["Setting up", "guides/setup.md"],
			["Deploying", "guides/deploy.md"],
		]);
	});

	it("falls back to the filename when a title is blank", () => {
		expect(buildTree([node("notes.md", "  ")])[0]?.label).toBe("notes.md");
	});

	it("keeps two documents with the same title apart", () => {
		const tree = buildTree([node("a.md", "Same"), node("b.md", "Same")]);
		expect(tree.map((n) => n.nodeId)).toEqual(["a.md", "b.md"]);
	});
});

describe("buildGroups", () => {
	it("groups by project in project order, drops the slug, skips empty projects", () => {
		const groups = buildGroups(
			[
				node("labs/assistant.md", "Digital Assistant", "labs"),
				node("intro/about.md", "About", "intro"),
			],
			[
				{ name: "Introduction", slug: "intro", docsDir: "content/intro" },
				{ name: "Labs", slug: "labs", docsDir: "content/labs" },
				{ name: "Hidden", slug: "hidden", docsDir: "content/hidden" },
			]
		);
		expect(groups.map((g) => [g.name, g.tree.map((n) => n.label)])).toEqual([
			["Introduction", ["About"]],
			["Labs", ["Digital Assistant"]],
		]);
	});
});
