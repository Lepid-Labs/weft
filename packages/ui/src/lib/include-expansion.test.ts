import type { WeftEdge } from "@lepid-labs/weft-core/browser";
import { describe, expect, it } from "vitest";
import type { IncludeOptions } from "./include-expansion.js";
import { MAX_INCLUDE_DEPTH } from "./include-expansion.js";
import { renderMarkdown } from "./markdown.js";

const RUNBOOK = `# Runbook

Intro.

## Deploys

Ship it with \`deploy.sh\`.

### Rollbacks

Roll back fast.

## Monitoring

Watch the graphs.
`;

function includeEdge(
	from: string,
	to: string,
	anchor?: string,
	extra: Partial<WeftEdge> = {}
): WeftEdge {
	return {
		from: { node: from },
		to: { node: to, ...(anchor ? { anchor } : {}) },
		type: "includes",
		headingShift: "auto",
		contributes: "source",
		...extra,
	};
}

function options(
	docs: Record<string, string>,
	edges: WeftEdge[],
	nodeId = "faq.md"
): IncludeOptions {
	return {
		nodeId,
		edges,
		fetchDoc: async (id) => {
			const doc = docs[id];
			if (doc === undefined) throw new Error(`no doc ${id}`);
			return doc;
		},
	};
}

describe("include expansion", () => {
	it("expands an anchor-range include inline inside an attributed frame", async () => {
		const html = await renderMarkdown(
			"# FAQ\n\n## How do I deploy?\n\n[Deploys](runbook.md#deploys)\n",
			{
				includes: options({ "runbook.md": RUNBOOK }, [
					includeEdge("faq.md", "runbook.md", "#deploys"),
				]),
			}
		);

		expect(html).toContain('class="weft-include"');
		expect(html).toContain("Ship it with");
		expect(html).not.toContain("Watch the graphs");
		// The attribution marker links back to the source as the author wrote it.
		expect(html).toMatch(/<a[^>]*href="runbook\.md#deploys"[^>]*class="weft-include-origin"/);
	});

	it("includes the whole document when the edge has no anchor", async () => {
		const html = await renderMarkdown("[All of it](runbook.md)\n", {
			includes: options({ "runbook.md": RUNBOOK }, [includeEdge("faq.md", "runbook.md")]),
		});

		expect(html).toContain("Intro.");
		expect(html).toContain("Watch the graphs");
	});

	it("demotes included headings beneath the inclusion point by default", async () => {
		const html = await renderMarkdown("# FAQ\n\n## Deploy question\n\n[d](runbook.md#deploys)\n", {
			includes: options({ "runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "runbook.md", "#deploys"),
			]),
		});

		// The included h2 lands under an h2, so it becomes h3; its h3 becomes h4.
		expect(html).toMatch(/<h3[^>]*>Deploys</);
		expect(html).toMatch(/<h4[^>]*>Rollbacks</);
	});

	it("preserves source heading levels when the edge says none", async () => {
		const html = await renderMarkdown("# FAQ\n\n[d](runbook.md#deploys)\n", {
			includes: options({ "runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "runbook.md", "#deploys", { headingShift: "none" }),
			]),
		});

		expect(html).toMatch(/<h2[^>]*>Deploys</);
	});

	it("expands a link standing alone in a list item", async () => {
		const html = await renderMarkdown("- [d](runbook.md#deploys)\n- plain item\n", {
			includes: options({ "runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "runbook.md", "#deploys"),
			]),
		});

		expect(html).toContain('class="weft-include"');
		expect(html).toContain("Ship it with");
	});

	it("never expands a link woven into a sentence", async () => {
		const html = await renderMarkdown("See [the runbook](runbook.md#deploys) for details.\n", {
			includes: options({ "runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "runbook.md", "#deploys"),
			]),
		});

		expect(html).not.toContain("weft-include");
		expect(html).toContain("Ship it with".length ? "the runbook" : "");
	});

	it("expands nested includes through intermediate documents", async () => {
		const html = await renderMarkdown("[a](a.md)\n", {
			includes: options({ "a.md": "## A\n\na text\n\n[b](b.md)\n", "b.md": "## B\n\nb text\n" }, [
				includeEdge("faq.md", "a.md"),
				includeEdge("a.md", "b.md"),
			]),
		});

		expect(html).toContain("a text");
		expect(html).toContain("b text");
	});

	it("degrades a cycle to a link with a notice instead of hanging", async () => {
		const html = await renderMarkdown("[a](a.md)\n", {
			includes: options({ "a.md": "[faq](faq.md)\n", "faq.md": "[a](a.md)\n" }, [
				includeEdge("faq.md", "a.md"),
				includeEdge("a.md", "faq.md"),
			]),
		});

		expect(html).toContain('class="weft-include-notice"');
		expect(html).toContain("include cycle");
	});

	it("caps nesting depth", async () => {
		// A chain one longer than the cap: doc0 includes doc1 includes … doc6.
		const docs: Record<string, string> = {};
		const edges: WeftEdge[] = [];
		for (let i = 0; i <= MAX_INCLUDE_DEPTH + 1; i++) {
			docs[`d${i}.md`] = `content ${i}\n\n[next](d${i + 1}.md)\n`;
			edges.push(includeEdge(`d${i}.md`, `d${i + 1}.md`));
		}
		const html = await renderMarkdown("[start](d1.md)\n", {
			includes: { ...options(docs, edges), nodeId: "d0.md" },
		});

		expect(html).toContain("nested too deeply");
	});

	it("degrades to a link when the target cannot be fetched", async () => {
		const html = await renderMarkdown("[gone](gone.md)\n", {
			includes: options({}, [includeEdge("faq.md", "gone.md")]),
		});

		expect(html).toContain("could not be loaded");
		expect(html).toMatch(/<a[^>]*href="gone\.md"/);
	});

	it("degrades to a link when the anchor names no heading", async () => {
		const html = await renderMarkdown("[x](runbook.md#nope)\n", {
			includes: options({ "runbook.md": RUNBOOK }, [includeEdge("faq.md", "runbook.md", "#nope")]),
		});

		expect(html).toContain("include anchor not found");
	});

	it("sanitizes included content like the document's own", async () => {
		const html = await renderMarkdown("[x](evil.md)\n", {
			includes: options(
				{ "evil.md": '## Evil\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n' },
				[includeEdge("faq.md", "evil.md")]
			),
		});

		expect(html).not.toContain("<script");
		expect(html).not.toContain("onerror");
	});

	it("resolves the include link relative to the including document", async () => {
		const html = await renderMarkdown("[up](../shared/note.md)\n", {
			includes: options(
				{ "shared/note.md": "note text\n" },
				[includeEdge("guides/faq.md", "shared/note.md")],
				"guides/faq.md"
			),
		});

		expect(html).toContain("note text");
	});

	it("re-slugs included headings into the composed page's id space", async () => {
		const html = await renderMarkdown("## Deploys\n\nours\n\n[d](runbook.md#deploys)\n", {
			includes: options({ "runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "runbook.md", "#deploys"),
			]),
		});

		// The including doc owns #deploys; the included copy gets the suffix.
		expect(html).toContain('id="deploys"');
		expect(html).toContain('id="deploys-1"');
	});

	it("skips a pending include edge", async () => {
		const html = await renderMarkdown("[x](future.md)\n", {
			includes: options({}, [includeEdge("faq.md", "future.md", undefined, { pending: true })]),
		});

		expect(html).not.toContain("weft-include");
	});
});

// Links in any form link extraction resolves expand, not only relative ones.
// The matcher itself is core's; these run it against real rendered hrefs.
describe("include expansion (link forms)", () => {
	const BLOB = "https://github.com/acme/alpha/blob/main/docs/runbook.md#deploys";

	/** The edge link extraction makes from a blob URL into a mapped repo. */
	const blobReference: WeftEdge = {
		from: { node: "faq.md" },
		to: { node: "alpha/runbook.md", anchor: "#deploys" },
		type: "references",
		resolvedFrom: BLOB,
	};

	it("expands a GitHub blob URL through the edge extraction made from it", async () => {
		const html = await renderMarkdown(`[Deploys](${BLOB})\n`, {
			includes: options({ "alpha/runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "alpha/runbook.md", "#deploys"),
				blobReference,
			]),
		});

		expect(html).toContain('class="weft-include"');
		expect(html).toContain("Ship it with");
		expect(html).not.toContain("Watch the graphs");
	});

	it("leaves a blob URL that extraction never resolved as a plain link", async () => {
		const html = await renderMarkdown(`[Deploys](${BLOB})\n`, {
			includes: options({ "alpha/runbook.md": RUNBOOK }, [
				includeEdge("faq.md", "alpha/runbook.md", "#deploys"),
			]),
		});

		expect(html).not.toContain("weft-include");
	});

	// The renderer percent-encodes the space and the accented letters; link
	// extraction decoded them when it made the edge.
	it("expands a link whose destination the renderer re-encodes", async () => {
		const html = await renderMarkdown("[r](<My Report.md#résumé>)\n", {
			includes: options({ "My Report.md": "# Résumé\n\nqualified\n" }, [
				includeEdge("faq.md", "My Report.md", "#résumé"),
			]),
		});

		expect(html).toContain("qualified");
	});

	it("expands a published-form link from a subdirectory", async () => {
		const html = await renderMarkdown("[Guide](guide.html)\n", {
			includes: options(
				{ "sub/guide.md": "guide text\n" },
				[includeEdge("sub/faq.md", "sub/guide.md", undefined, { resolvedFrom: "sub/guide.html" })],
				"sub/faq.md"
			),
		});

		expect(html).toContain("guide text");
	});
});
