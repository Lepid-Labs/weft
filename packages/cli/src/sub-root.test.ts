import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSubRoot } from "./sub-root.js";

function tree(): string {
	const root = mkdtempSync(join(tmpdir(), "weft-sub-root-"));
	mkdirSync(join(root, "sites", "help"), { recursive: true });
	writeFileSync(join(root, "README.md"), "# root\n");
	return root;
}

describe("resolveSubRoot", () => {
	it("returns the root when no dir is given", () => {
		const root = tree();
		expect(resolveSubRoot(root, undefined)).toBe(root);
		expect(resolveSubRoot(root, "")).toBe(root);
		expect(resolveSubRoot(root, ".")).toBe(root);
	});

	it("resolves a nested directory", () => {
		const root = tree();
		expect(resolveSubRoot(root, "sites/help")).toBe(join(root, "sites", "help"));
		expect(resolveSubRoot(root, "sites/../sites/help/")).toBe(join(root, "sites", "help"));
	});

	it("refuses absolute paths and paths that leave the root", () => {
		const root = tree();
		expect(() => resolveSubRoot(root, "/etc")).toThrow(/must be relative/);
		expect(() => resolveSubRoot(root, "..")).toThrow(/leaves the served root/);
		expect(() => resolveSubRoot(root, "sites/../../x")).toThrow(/leaves the served root/);
	});

	it("refuses a missing directory or a file", () => {
		const root = tree();
		expect(() => resolveSubRoot(root, "sites/news")).toThrow(/is not a directory/);
		expect(() => resolveSubRoot(root, "README.md")).toThrow(/is not a directory/);
	});
});
