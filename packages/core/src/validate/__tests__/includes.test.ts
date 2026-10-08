import { describe, expect, it } from "vitest";
import type { Manifest, WeftEdge, WeftNode } from "../../types.js";
import { ValidatorRegistry } from "../registry.js";
import { includeValidator } from "../rules/includes.js";
import { validateManifest } from "../run.js";

const CONFIG = {
	rootDir: "/project",
	docsDir: "docs",
	ignore: [],
};

function doc(id: string): WeftNode {
	return { id, type: "markdown", title: id, anchors: [] };
}

function includes(from: string, to: string, extra: Partial<WeftEdge> = {}): WeftEdge {
	return { from: { node: from }, to: { node: to }, type: "includes", ...extra };
}

function graph(edges: WeftEdge[]): Manifest {
	const ids = new Set(edges.flatMap((e) => [e.from.node, e.to.node]));
	return { version: 2, nodes: [...ids].map(doc), edges };
}

/** Run only this validator, and only the one rule, so the assertions are about it alone. */
async function check(manifest: Manifest, rule = "include-cycle") {
	const registry = new ValidatorRegistry().register(includeValidator);
	const rules = Object.fromEntries(
		includeValidator.rules.map((r) => [r.id, r.id === rule ? r.defaultSeverity : "off"] as const)
	);
	return validateManifest(manifest, { ...CONFIG, rules }, registry);
}

describe("include-cycle", () => {
	it("reports nothing for an acyclic include chain", async () => {
		const manifest = graph([
			includes("faq.md", "runbook.md"),
			includes("faq.md", "pricing.md"),
			includes("overview.md", "faq.md"),
		]);

		expect((await check(manifest)).diagnostics).toEqual([]);
	});

	it("reports a two-document cycle once", async () => {
		const manifest = graph([includes("a.md", "b.md"), includes("b.md", "a.md")]);
		const { diagnostics } = await check(manifest);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].rule).toBe("include-cycle");
		expect(diagnostics[0].severity).toBe("error");
		expect(diagnostics[0].data?.nodes).toEqual(["a.md", "b.md"]);
	});

	it("reports a document that includes itself", async () => {
		const { diagnostics } = await check(graph([includes("a.md", "a.md")]));

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].data?.nodes).toEqual(["a.md"]);
	});

	it("cycles at document granularity even when the edges select anchors", async () => {
		// The two ranges may not actually overlap, but proving that would mean a
		// second range-extraction implementation kept in agreement forever.
		const manifest = graph([
			includes("a.md", "b.md", { to: { node: "b.md", anchor: "#one" } }),
			includes("b.md", "a.md", { to: { node: "a.md", anchor: "#two" } }),
		]);

		expect((await check(manifest)).diagnostics).toHaveLength(1);
	});

	it("reports each disjoint cycle separately", async () => {
		const manifest = graph([
			includes("a.md", "b.md"),
			includes("b.md", "a.md"),
			includes("x.md", "y.md"),
			includes("y.md", "z.md"),
			includes("z.md", "x.md"),
		]);
		const { diagnostics } = await check(manifest);

		expect(diagnostics).toHaveLength(2);
		const groups = diagnostics.map((d) => d.data?.nodes);
		expect(groups).toContainEqual(["a.md", "b.md"]);
		expect(groups).toContainEqual(["x.md", "y.md", "z.md"]);
	});

	it("ignores pending include edges", async () => {
		const manifest = graph([includes("a.md", "b.md"), includes("b.md", "a.md", { pending: true })]);

		expect((await check(manifest)).diagnostics).toEqual([]);
	});

	it("ignores cycles in other edge types", async () => {
		const manifest = graph([
			{ from: { node: "a.md" }, to: { node: "b.md" }, type: "references" },
			{ from: { node: "b.md" }, to: { node: "a.md" }, type: "references" },
		]);

		expect((await check(manifest)).diagnostics).toEqual([]);
	});

	it("finds a cycle reachable only through an acyclic prefix", async () => {
		const manifest = graph([
			includes("entry.md", "a.md"),
			includes("a.md", "b.md"),
			includes("b.md", "a.md"),
		]);
		const { diagnostics } = await check(manifest);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].data?.nodes).toEqual(["a.md", "b.md"]);
	});
});

describe("include-link-missing", () => {
	const BLOB = "https://github.com/acme/alpha/blob/main/docs/api.md#endpoints";

	/** A manifest whose `faq.md` records these block links. */
	function faq(blockLinks: string[], edges: WeftEdge[]): Manifest {
		const manifest = graph(edges);
		manifest.nodes = manifest.nodes.map((node) =>
			node.id === "faq.md" ? { ...node, blockLinks } : node
		);
		return manifest;
	}

	const missing = async (manifest: Manifest) =>
		(await check(manifest, "include-link-missing")).diagnostics;

	it("is quiet when a block link matches the include", async () => {
		const manifest = faq(
			["runbook.md#deploys"],
			[includes("faq.md", "runbook.md", { to: { node: "runbook.md", anchor: "#deploys" } })]
		);

		expect(await missing(manifest)).toEqual([]);
	});

	it("reports an include no block link matches, as a warning on the edge", async () => {
		const edge = includes("faq.md", "runbook.md", {
			to: { node: "runbook.md", anchor: "#deploys" },
		});
		const diagnostics = await missing(faq(["pricing.md"], [edge]));

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			rule: "include-link-missing",
			severity: "warn",
			target: { kind: "edge", edge },
		});
		expect(diagnostics[0].message).toContain("runbook.md#deploys");
	});

	it("reports an include whose link names a different anchor", async () => {
		const manifest = faq(
			["runbook.md#monitoring"],
			[includes("faq.md", "runbook.md", { to: { node: "runbook.md", anchor: "#deploys" } })]
		);

		expect(await missing(manifest)).toHaveLength(1);
	});

	it("reports an include from a document with no block links at all", async () => {
		expect(await missing(graph([includes("faq.md", "runbook.md")]))).toHaveLength(1);
	});

	it("matches a blob URL through the edge indexing resolved it to", async () => {
		const to = { node: "alpha/api.md", anchor: "#endpoints" };
		const manifest = faq(
			[BLOB],
			[
				includes("faq.md", "alpha/api.md", { to }),
				{ from: { node: "faq.md" }, to, type: "references", resolvedFrom: BLOB },
			]
		);

		expect(await missing(manifest)).toEqual([]);
	});

	// The issue's workaround: an id-relative href that names no real path, so
	// indexing made no edge from it — but the renderer expands it, so the rule
	// must not report it.
	it("matches a cross-project href the way the renderer resolves it", async () => {
		const manifest = graph([includes("invoice/cross.md", "gotax/fees.md")]);
		manifest.nodes = manifest.nodes.map((node) =>
			node.id === "invoice/cross.md" ? { ...node, blockLinks: ["../gotax/fees.md"] } : node
		);

		expect(await missing(manifest)).toEqual([]);
	});

	it("skips a pending include", async () => {
		expect(await missing(graph([includes("faq.md", "future.md", { pending: true })]))).toEqual([]);
	});
});
