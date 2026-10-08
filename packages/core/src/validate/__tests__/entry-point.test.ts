import { describe, expect, it } from "vitest";
import type { Manifest, WeftConfig } from "../../types.js";
import { ValidatorRegistry } from "../registry.js";
import { entryPointValidator } from "../rules/entry-point.js";
import { validateManifest } from "../run.js";

const CONFIG: WeftConfig = { rootDir: "/project", docsDir: "docs", ignore: [] };

const MANIFEST: Manifest = {
	version: 2,
	nodes: [{ id: "overview.md", type: "markdown", title: "Overview", anchors: [] }],
	edges: [],
};

async function check(config: Partial<WeftConfig>, manifest: Manifest = MANIFEST) {
	const registry = new ValidatorRegistry().register(entryPointValidator);
	return (await validateManifest(manifest, { ...CONFIG, ...config }, registry)).diagnostics;
}

describe("entry-point-missing", () => {
	it("says nothing when no entryPoint is configured", async () => {
		expect(await check({})).toEqual([]);
	});

	it("says nothing when the entryPoint resolved", async () => {
		const resolved = { ...MANIFEST, site: { entryPoint: "overview.md" } };
		expect(await check({ entryPoint: "docs/overview.md" }, resolved)).toEqual([]);
	});

	it("warns when the entryPoint names no document", async () => {
		const diagnostics = await check({ entryPoint: "docs/missing.md" });

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			rule: "entry-point-missing",
			severity: "warn",
			target: { kind: "graph" },
			data: { entryPoint: "docs/missing.md" },
		});
	});
});
