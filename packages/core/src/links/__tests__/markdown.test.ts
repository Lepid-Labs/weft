import { describe, expect, it } from "vitest";
import type { DocsRoot } from "../../config.js";
import { extractMarkdownLinks, scanMarkdownLinks } from "../markdown.js";

const SINGLE: DocsRoot[] = [{ slug: "", dir: "docs", absDir: "/project/docs", external: false }];

const MULTI: DocsRoot[] = [
	{
		name: "Alpha",
		slug: "alpha",
		dir: "products/alpha/docs",
		absDir: "/project/products/alpha/docs",
		external: false,
	},
	{
		name: "Beta",
		slug: "beta",
		dir: "products/beta/docs",
		absDir: "/project/products/beta/docs",
		external: false,
	},
];

// A renderer's source form leaves placeholders in link paths. Recording an edge
// to the literal text would invent a node that never exists, and the
// edge-resolution check would then report correct source as broken.
describe("extractMarkdownLinks (unresolved template syntax)", () => {
	const cases: [string, string][] = [
		["Handlebars/Liquid", "{{version}}/api.md"],
		["Liquid tag", "{% raw %}/api.md"],
		["JS template", "${version}/api.md"],
		["ERB/EJS", "<%= version %>/api.md"],
		["placeholder in the filename", "api-{{lang}}.md"],
	];

	for (const [name, url] of cases) {
		it(`emits no edge for a ${name} path`, () => {
			const edges = extractMarkdownLinks(`[Link](${url})`, "/project/docs/a.md", SINGLE);
			expect(edges).toEqual([]);
		});
	}

	it("still links a path with no template syntax", () => {
		const edges = extractMarkdownLinks("[Link](api.md)", "/project/docs/a.md", SINGLE);
		expect(edges).toHaveLength(1);
	});

	it("ignores template syntax in the anchor, which does not affect the target", () => {
		const edges = extractMarkdownLinks("[Link](api.md#{{section}})", "/project/docs/a.md", SINGLE);
		expect(edges).toHaveLength(1);
		expect(edges[0].to.node).toBe("api.md");
	});
});

describe("extractMarkdownLinks", () => {
	it("extracts relative links within docs", () => {
		const content = "See [Architecture](architecture.md#data-flow) for details.\n";
		const edges = extractMarkdownLinks(content, "/project/docs/README.md", SINGLE);

		expect(edges).toHaveLength(1);
		expect(edges[0]).toEqual({
			from: { node: "README.md" },
			to: { node: "architecture.md", anchor: "#data-flow" },
			type: "references",
			label: "Architecture",
		});
	});

	it("ignores external links", () => {
		const content = "[Google](https://google.com)\n";
		const edges = extractMarkdownLinks(content, "/project/docs/README.md", SINGLE);
		expect(edges).toHaveLength(0);
	});

	it("ignores anchor-only links", () => {
		const content = "[Jump](#section)\n";
		const edges = extractMarkdownLinks(content, "/project/docs/README.md", SINGLE);
		expect(edges).toHaveLength(0);
	});

	it("ignores links outside docs directory", () => {
		const content = "[Src](../../src/main.ts)\n";
		const edges = extractMarkdownLinks(content, "/project/docs/README.md", SINGLE);
		expect(edges).toHaveLength(0);
	});

	it("handles links without anchors", () => {
		const content = "[API](api.yaml)\n";
		const edges = extractMarkdownLinks(content, "/project/docs/README.md", SINGLE);

		expect(edges).toHaveLength(1);
		expect(edges[0].to).toEqual({ node: "api.yaml" });
	});

	it("handles subdirectory links", () => {
		const content = "[Schema](schemas/user.md)\n";
		const edges = extractMarkdownLinks(content, "/project/docs/README.md", SINGLE);

		expect(edges).toHaveLength(1);
		expect(edges[0].to.node).toBe("schemas/user.md");
	});

	it("emits POSIX-separated ids for nested sources and targets", () => {
		const content = "[Sibling](../schemas/order.md)\n";
		const edges = extractMarkdownLinks(content, "/project/docs/guides/setup.md", SINGLE);

		expect(edges[0].from.node).toBe("guides/setup.md");
		expect(edges[0].to.node).toBe("schemas/order.md");
		expect(edges[0].from.node).not.toMatch(/\\/);
		expect(edges[0].to.node).not.toMatch(/\\/);
	});

	it("namespaces ids by project slug", () => {
		const content = "[Features](features.md)\n";
		const edges = extractMarkdownLinks(content, "/project/products/alpha/docs/README.md", MULTI);

		expect(edges).toHaveLength(1);
		expect(edges[0].from.node).toBe("alpha/README.md");
		expect(edges[0].to.node).toBe("alpha/features.md");
	});

	it("resolves a link that crosses into another project", () => {
		const content = "[Beta API](../../beta/docs/api.yaml#listUsers)\n";
		const edges = extractMarkdownLinks(content, "/project/products/alpha/docs/features.md", MULTI);

		expect(edges).toHaveLength(1);
		expect(edges[0]).toEqual({
			from: { node: "alpha/features.md" },
			to: { node: "beta/api.yaml", anchor: "#listUsers" },
			type: "references",
			label: "Beta API",
		});
	});

	it("ignores links that land outside every project", () => {
		const content = "[Src](../../../src/main.ts)\n";
		const edges = extractMarkdownLinks(content, "/project/products/alpha/docs/README.md", MULTI);
		expect(edges).toHaveLength(0);
	});

	it("ignores files outside every configured root", () => {
		const content = "[Features](features.md)\n";
		const edges = extractMarkdownLinks(content, "/elsewhere/README.md", MULTI);
		expect(edges).toHaveLength(0);
	});
});

describe("extractMarkdownLinks (GitHub blob URLs)", () => {
	const REPOS = new Map([["acme/alpha", "/checkouts/alpha"]]);
	const ROOTS: DocsRoot[] = [
		{ slug: "", dir: "docs", absDir: "/project/docs", external: false },
		{
			name: "Alpha",
			slug: "alpha",
			dir: "docs",
			absDir: "/checkouts/alpha/docs",
			repo: "acme/alpha",
			external: true,
		},
	];

	it("resolves a blob URL into a mapped repo's docs root, recording the URL", () => {
		const edges = extractMarkdownLinks(
			"[API](https://github.com/acme/alpha/blob/main/docs/api.md#endpoints)",
			"/project/docs/README.md",
			ROOTS,
			REPOS
		);

		expect(edges).toEqual([
			{
				from: { node: "README.md" },
				to: { node: "alpha/api.md", anchor: "#endpoints" },
				type: "references",
				label: "API",
				resolvedFrom: "https://github.com/acme/alpha/blob/main/docs/api.md#endpoints",
			},
		]);
	});

	it("accepts any ref segment", () => {
		const edges = extractMarkdownLinks(
			"[API](https://github.com/acme/alpha/blob/v2.1/docs/api.md)",
			"/project/docs/README.md",
			ROOTS,
			REPOS
		);
		expect(edges[0]?.to.node).toBe("alpha/api.md");
	});

	it("leaves a blob URL into an unmapped repo as an external link", () => {
		const edges = extractMarkdownLinks(
			"[Other](https://github.com/acme/other/blob/main/docs/api.md)",
			"/project/docs/README.md",
			ROOTS,
			REPOS
		);
		expect(edges).toEqual([]);
	});

	it("leaves a blob URL whose path lands outside every docs root as external", () => {
		const edges = extractMarkdownLinks(
			"[Source](https://github.com/acme/alpha/blob/main/src/main.ts)",
			"/project/docs/README.md",
			ROOTS,
			REPOS
		);
		expect(edges).toEqual([]);
	});

	it("ignores non-blob GitHub URLs and other hosts", () => {
		const content = [
			"[Tree](https://github.com/acme/alpha/tree/main/docs)",
			"[Issue](https://github.com/acme/alpha/issues/12)",
			"[GitLab](https://gitlab.com/acme/alpha/blob/main/docs/api.md)",
		].join("\n");
		expect(extractMarkdownLinks(content, "/project/docs/README.md", ROOTS, REPOS)).toEqual([]);
	});

	it("decodes the fragment the way a relative link's is decoded", () => {
		const edges = extractMarkdownLinks(
			"[CV](https://github.com/acme/alpha/blob/main/docs/cv.md#r%C3%A9sum%C3%A9)",
			"/project/docs/README.md",
			ROOTS,
			REPOS
		);
		expect(edges[0]?.to).toEqual({ node: "alpha/cv.md", anchor: "#résumé" });
	});

	it("ignores every http link when no repo map is passed", () => {
		const edges = extractMarkdownLinks(
			"[API](https://github.com/acme/alpha/blob/main/docs/api.md)",
			"/project/docs/README.md",
			ROOTS
		);
		expect(edges).toEqual([]);
	});
});

// A destination is read the way GitHub and every URL-following renderer read
// it: `My%20Report.md` opens `My Report.md`. Taken as written it names a node
// no document has, and the linked-items sidebar and the edge-resolution check
// both treat a correct link as dead.
describe("extractMarkdownLinks (percent-escapes)", () => {
	const from = (content: string) => extractMarkdownLinks(content, "/project/docs/a.md", SINGLE);
	const edge = (node: string, anchor?: string) => ({
		from: { node: "a.md" },
		to: anchor ? { node, anchor } : { node },
		type: "references",
		label: "x",
	});

	it("decodes an escaped space in the path", () => {
		expect(from("[x](./My%20Report.md)")).toEqual([edge("My Report.md")]);
	});

	it("decodes an escaped directory segment and an escaped space in the fragment", () => {
		expect(from("[x](sub/My%20Dir/x.md#Sec%20One)")).toEqual([edge("sub/My Dir/x.md", "#Sec One")]);
	});

	it("decodes a multi-byte UTF-8 fragment", () => {
		expect(from("[x](c.md#r%C3%A9sum%C3%A9)")).toEqual([edge("c.md", "#résumé")]);
	});

	it("decodes an escaped percent sign", () => {
		expect(from("[x](100%25.md)")).toEqual([edge("100%.md")]);
	});

	it("leaves a malformed escape as written instead of throwing", () => {
		expect(from("[x](100%.md)")).toEqual([edge("100%.md")]);
		// A lone high byte is not valid UTF-8 either: `decodeURIComponent` throws.
		expect(from("[x](caf%E9.md#caf%E9)")).toEqual([edge("caf%E9.md", "#caf%E9")]);
	});

	// Decoding is all-or-nothing per part: the valid `%20` beside the malformed
	// `%` is left as written too, and the edge is dead exactly as before.
	it("leaves the whole part as written when a valid escape sits beside a malformed one", () => {
		expect(from("[x](My%20Report%.md)")).toEqual([edge("My%20Report%.md")]);
	});

	it("still reads the angle-bracket form, which needs no escape", () => {
		expect(from("[x](<My Report.md>)")).toEqual([edge("My Report.md")]);
	});

	// The template check runs on the raw destination, so an encoded `{{` is not a
	// placeholder an author wrote: this yields an edge to the decoded literal,
	// the file name the URL spells.
	it("checks template syntax on the raw text, then decodes", () => {
		expect(from("[x](%7B%7Bversion%7D%7D/api.md)")).toEqual([edge("{{version}}/api.md")]);
	});

	// `decodeURI` would leave these reserved characters escaped, and decoding the
	// whole destination before splitting it would read an escaped `#` as the
	// start of the fragment.
	it("decodes an escaped reserved character in the path and in the fragment", () => {
		expect(from("[x](a%23b.md)")).toEqual([edge("a#b.md")]);
		expect(from("[x](a%2Bb.md)")).toEqual([edge("a+b.md")]);
		expect(from("[x](c.md#a%23b)")).toEqual([edge("c.md", "#a#b")]);
	});

	it("leaves a literal plus sign alone: only `%2B` spells it, and neither is a space", () => {
		expect(from("[x](a+b.md#c+d)")).toEqual([edge("a+b.md", "#c+d")]);
	});

	// A destination is decoded once: `%2520` is the escaped text `%20`.
	it("decodes once, not twice", () => {
		expect(from("[x](100%2520.md#a%2520b)")).toEqual([edge("100%20.md", "#a%20b")]);
	});

	// Only the destination is decoded. The source file's own directory is a real
	// path, so a directory literally named `100%25` is not read as `100%`.
	it("does not decode the source file's own directory", () => {
		const edges = extractMarkdownLinks("[x](b.md)", "/project/docs/100%25/a.md", SINGLE);
		expect(edges).toEqual([
			{
				from: { node: "100%25/a.md" },
				to: { node: "100%25/b.md" },
				type: "references",
				label: "x",
			},
		]);
	});
});

// Only a link standing alone as a block can expand an include, and
// `include-link-missing` needs to know which those are. The test is the
// renderer's, made on the rendered tree, so this has to follow how lists render.
describe("scanMarkdownLinks (block links)", () => {
	const blockLinks = (content: string) =>
		scanMarkdownLinks(content, "/project/docs/a.md", SINGLE).blockLinks;

	it("records a link that is a paragraph's sole content, as written", () => {
		expect(blockLinks("Intro.\n\n[x](My%20Report.md#deploys)\n")).toEqual([
			"My%20Report.md#deploys",
		]);
	});

	it("records links of any destination, external ones included", () => {
		const url = "https://github.com/acme/alpha/blob/main/docs/api.md#endpoints";
		expect(blockLinks(`[API](${url})\n\n[Site](https://example.com)\n`)).toEqual([
			url,
			"https://example.com",
		]);
	});

	it("skips a link woven into a sentence, or sharing its paragraph", () => {
		expect(blockLinks("See [x](b.md) for more.\n")).toEqual([]);
		expect(blockLinks("[x](b.md)\n[y](c.md)\n")).toEqual([]);
	});

	it("skips an anchor-only link", () => {
		expect(blockLinks("[Jump](#section)\n")).toEqual([]);
	});

	it("records a link alone in a tight or a loose list item", () => {
		expect(blockLinks("- [x](b.md)\n- plain\n")).toEqual(["b.md"]);
		expect(blockLinks("- [x](b.md)\n\n- plain\n")).toEqual(["b.md"]);
	});

	// A tight item's paragraph is unwrapped when rendered, so the link shares the
	// `li` with the nested list. A loose item keeps its `p`, and the link is alone
	// in that.
	it("follows list looseness for a link sharing its item with a nested list", () => {
		expect(blockLinks("- [x](b.md)\n  - nested\n")).toEqual([]);
		expect(blockLinks("- [x](b.md)\n\n  - nested\n")).toEqual(["b.md"]);
	});

	it("records a link alone in a paragraph inside a blockquote", () => {
		expect(blockLinks("> [x](b.md)\n")).toEqual(["b.md"]);
	});

	it("returns the same edges extractMarkdownLinks does", () => {
		const content = "[x](b.md#c)\n\nSee [y](d.md).\n";
		expect(scanMarkdownLinks(content, "/project/docs/a.md", SINGLE).edges).toEqual(
			extractMarkdownLinks(content, "/project/docs/a.md", SINGLE)
		);
	});
});
