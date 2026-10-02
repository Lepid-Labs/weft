import { describe, expect, it } from "vitest";
import {
	INCLUDES,
	applyIncludeDefaults,
	extractSection,
	includeMatcher,
	resolveHref,
} from "./includes.js";
import type { WeftEdge } from "./types.js";

const DOC = `# Guide

Intro paragraph.

## Deploys

How to deploy.

### Rollbacks

How to roll back.

## Monitoring

What to watch.
`;

describe("extractSection", () => {
	it("extracts from a heading to the next of the same level", () => {
		const section = extractSection(DOC, "#deploys");

		expect(section?.baseLevel).toBe(2);
		expect(section?.text).toContain("## Deploys");
		expect(section?.text).toContain("### Rollbacks");
		expect(section?.text).not.toContain("## Monitoring");
	});

	it("stops at a shallower heading", () => {
		const doc = "# A\n\n### Deep\n\ndeep text\n\n# B\n\nb text\n";
		const section = extractSection(doc, "#deep");

		expect(section?.text).toBe("### Deep\n\ndeep text\n");
		expect(section?.baseLevel).toBe(3);
	});

	it("runs to the end of the document for the last section", () => {
		const section = extractSection(DOC, "#monitoring");

		expect(section?.text).toBe("## Monitoring\n\nWhat to watch.\n");
	});

	it("accepts the anchor with or without its leading #", () => {
		expect(extractSection(DOC, "deploys")?.text).toBe(extractSection(DOC, "#deploys")?.text);
	});

	it("returns the whole document when no anchor is given", () => {
		const section = extractSection(DOC);

		expect(section?.text).toBe(DOC);
		expect(section?.baseLevel).toBe(1);
	});

	it("reports the shallowest heading as the whole-document base level", () => {
		const section = extractSection("### Only\n\ntext\n\n#### Deeper\n");
		expect(section?.baseLevel).toBe(3);
	});

	it("omits baseLevel for a document with no headings", () => {
		const section = extractSection("just prose\n");

		expect(section?.text).toBe("just prose\n");
		expect(section?.baseLevel).toBeUndefined();
	});

	it("returns undefined for an anchor naming no heading", () => {
		expect(extractSection(DOC, "#nope")).toBeUndefined();
	});

	it("slugs like the graph does, so an edge anchor selects the section", () => {
		const doc = "## See [docs](x.md)\n\nlinked heading\n\n## Next\n";
		// The slug comes from the rendered text, not the source line.
		expect(extractSection(doc, "#see-docs")?.text).toBe("## See [docs](x.md)\n\nlinked heading\n");
	});

	it("ignores a pseudo-heading inside a fenced code block", () => {
		const doc = "## Real\n\n```\n## Not a heading\n```\n\nafter\n\n## Next\n";
		const section = extractSection(doc, "#real");

		expect(section?.text).toContain("## Not a heading");
		expect(section?.text).toContain("after");
		expect(section?.text).not.toContain("## Next");
	});

	it("tolerates CRLF line endings", () => {
		const doc = "# A\r\n\r\n## Target\r\n\r\ntext\r\n\r\n## Next\r\n";
		const section = extractSection(doc, "#target");

		expect(section?.text).toBe("## Target\n\ntext\n");
	});
});

describe("applyIncludeDefaults", () => {
	const include = (extra: Partial<WeftEdge> = {}): WeftEdge => ({
		from: { node: "faq.md" },
		to: { node: "runbook.md" },
		type: INCLUDES,
		...extra,
	});

	it("stamps the built-in defaults onto an includes edge", () => {
		const [edge] = applyIncludeDefaults([include()]);

		expect(edge.headingShift).toBe("auto");
		expect(edge.contributes).toBe("source");
	});

	it("prefers configured defaults over built-in ones", () => {
		const [edge] = applyIncludeDefaults([include()], { headingShift: "none" });

		expect(edge.headingShift).toBe("none");
		expect(edge.contributes).toBe("source");
	});

	it("keeps a per-edge value over every default", () => {
		const [edge] = applyIncludeDefaults([include({ contributes: "inline" })], {
			contributes: "source",
		});

		expect(edge.contributes).toBe("inline");
	});

	it("leaves other edge types untouched", () => {
		const [edge] = applyIncludeDefaults([
			{ from: { node: "a.md" }, to: { node: "b.md" }, type: "references" },
		]);

		expect("headingShift" in edge).toBe(false);
		expect("contributes" in edge).toBe(false);
	});
});

describe("includeMatcher", () => {
	const include = (from: string, to: string, anchor?: string, extra: Partial<WeftEdge> = {}) =>
		({
			from: { node: from },
			to: { node: to, ...(anchor ? { anchor } : {}) },
			type: INCLUDES,
			...extra,
		}) as WeftEdge;

	const BLOB = "https://github.com/acme/alpha/blob/main/docs/api.md#endpoints";
	const blobReference: WeftEdge = {
		from: { node: "faq.md" },
		to: { node: "alpha/api.md", anchor: "#endpoints" },
		type: "references",
		resolvedFrom: BLOB,
	};

	it("is undefined for a document that includes nothing", () => {
		expect(includeMatcher("faq.md", [include("other.md", "runbook.md")])).toBeUndefined();
		const pending = include("faq.md", "x.md", undefined, { pending: true });
		expect(includeMatcher("faq.md", [pending])).toBeUndefined();
	});

	it("matches a relative link by node and anchor", () => {
		const edge = include("guides/faq.md", "runbook.md", "#deploys");
		const match = includeMatcher("guides/faq.md", [edge]);

		expect(match?.("../runbook.md#deploys")).toBe(edge);
		expect(match?.("../runbook.md")).toBeUndefined();
		expect(match?.("../runbook.md#monitoring")).toBeUndefined();
	});

	it("matches a GitHub blob URL through the edge extraction made from it", () => {
		const edge = include("faq.md", "alpha/api.md", "#endpoints");
		const match = includeMatcher("faq.md", [edge, blobReference]);

		expect(match?.(BLOB)).toBe(edge);
	});

	it("does not match a blob URL extraction never resolved", () => {
		const edge = include("faq.md", "alpha/api.md", "#endpoints");
		const match = includeMatcher("faq.md", [edge]);

		expect(match?.(BLOB)).toBeUndefined();
	});

	it("only consults edges made from links in this document", () => {
		const edge = include("faq.md", "alpha/api.md", "#endpoints");
		const elsewhere = { ...blobReference, from: { node: "other.md" } };

		expect(includeMatcher("faq.md", [edge, elsewhere])?.(BLOB)).toBeUndefined();
	});

	// The renderer re-encodes what it does not consider URL-safe, and link
	// extraction decodes escapes: both spellings name the same target.
	it("matches a link however its escapes are spelled", () => {
		const spaced = include("faq.md", "My Report.md", "#résumé");
		const blobbed = include("faq.md", "alpha/café.md");
		const reference: WeftEdge = {
			from: { node: "faq.md" },
			to: { node: "alpha/café.md" },
			type: "references",
			resolvedFrom: "https://github.com/acme/alpha/blob/main/docs/café.md",
		};
		const match = includeMatcher("faq.md", [spaced, blobbed, reference]);

		expect(match?.("My%20Report.md#r%C3%A9sum%C3%A9")).toBe(spaced);
		expect(match?.("https://github.com/acme/alpha/blob/main/docs/caf%C3%A9.md")).toBe(blobbed);
	});

	it("matches a published-form link to the include it resolved from, in a subdirectory", () => {
		const edge = include("sub/faq.md", "sub/guide.md", undefined, {
			resolvedFrom: "sub/guide.html",
		});

		expect(includeMatcher("sub/faq.md", [edge])?.("guide.html")).toBe(edge);
	});

	it("ignores pending includes and anchor-only links", () => {
		const pending = include("faq.md", "runbook.md", undefined, { pending: true });
		const live = include("faq.md", "pricing.md");
		const match = includeMatcher("faq.md", [pending, live]);

		expect(match?.("runbook.md")).toBeUndefined();
		expect(match?.("#pricing")).toBeUndefined();
		expect(match?.("pricing.md")).toBe(live);
	});
});

describe("resolveHref", () => {
	it("resolves a sibling", () => {
		expect(resolveHref("guides/faq.md", "setup.md")).toBe("guides/setup.md");
	});
	it("resolves ./ and ../", () => {
		expect(resolveHref("guides/faq.md", "./setup.md")).toBe("guides/setup.md");
		expect(resolveHref("guides/faq.md", "../intro.md")).toBe("intro.md");
	});
	it("returns undefined for a path escaping the root", () => {
		expect(resolveHref("faq.md", "../outside.md")).toBeUndefined();
	});
	it("returns undefined for an absolute URL", () => {
		expect(resolveHref("faq.md", "https://example.com/x.md")).toBeUndefined();
	});
});
