import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";
import {
	SectionError,
	type SectionRenderOptions,
	type SectionTarget,
	defaultSectionUrl,
	loadSection,
	rehypeSection,
	resolveSectionUrl,
} from "./section.js";

const CLI = `# CLI

Intro.

## Flags

Pass \`--port\`.

### Advanced

See [config](../config.md#ports) and ![diagram](img/flow.png).

## Exit codes

Zero is fine.
`;

describe("loadSection", () => {
	const fetchDoc = async (path: string) => {
		if (path === "docs/cli.md") return CLI;
		throw new Error("404");
	};

	it("slices the section the anchor names", async () => {
		const section = await loadSection(fetchDoc, { path: "docs/cli.md", anchor: "#flags" });

		expect(section.baseLevel).toBe(2);
		expect(section.text).toContain("Pass `--port`.");
		expect(section.text).toContain("### Advanced");
		expect(section.text).not.toContain("Exit codes");
	});

	it("takes the whole file without an anchor", async () => {
		const section = await loadSection(fetchDoc, { path: "docs/cli.md" });

		expect(section.text).toBe(CLI);
		expect(section.baseLevel).toBe(1);
	});

	it("reports a heading that is gone as an anchor error, not a load error", async () => {
		const error = await loadSection(fetchDoc, { path: "docs/cli.md", anchor: "#flagz" }).catch(
			(e) => e
		);

		expect(error).toBeInstanceOf(SectionError);
		expect(error).toMatchObject({ kind: "anchor", path: "docs/cli.md", anchor: "#flagz" });
	});

	it("reports a failed fetch as a load error carrying the cause", async () => {
		const error = await loadSection(fetchDoc, { path: "docs/missing.md" }).catch((e) => e);

		expect(error).toMatchObject({ kind: "load", path: "docs/missing.md" });
		expect(error.message).toContain("404");
		expect(error.cause).toBeInstanceOf(Error);
	});
});

describe("resolveSectionUrl", () => {
	it("resolves relative to the file's directory", () => {
		expect(resolveSectionUrl("docs/cli.md", "../config.md#ports")).toEqual({
			path: "config.md",
			anchor: "#ports",
		});
		expect(resolveSectionUrl("docs/cli.md", "./img/flow.png")).toEqual({
			path: "docs/img/flow.png",
		});
	});

	it("resolves a root-relative path from the source root, as GitHub does", () => {
		expect(resolveSectionUrl("docs/guide/cli.md", "/README.md")).toEqual({ path: "README.md" });
	});

	it("decodes what the renderer percent-encoded", () => {
		expect(resolveSectionUrl("docs/cli.md", "caf%C3%A9.md")).toEqual({ path: "docs/café.md" });
	});

	it("leaves external URLs, fragments and escapes alone", () => {
		for (const url of [
			"https://example.com/x.md",
			"//cdn.example.com/x.png",
			"mailto:a@b.c",
			"#flags",
			"../../outside.md",
			"",
		]) {
			expect(resolveSectionUrl("docs/cli.md", url)).toBeUndefined();
		}
	});
});

describe("defaultSectionUrl", () => {
	const target = { path: "docs/my guide.md", anchor: "#setup" };

	it("links a repo's files on GitHub at the ref, and loads images raw", () => {
		const source = { repo: "acme/tool", ref: "v1.2.0" };

		expect(defaultSectionUrl(source, { kind: "link", ...target })).toBe(
			"https://github.com/acme/tool/blob/v1.2.0/docs/my%20guide.md#setup"
		);
		expect(defaultSectionUrl(source, { kind: "image", path: "docs/a.png" })).toBe(
			"https://raw.githubusercontent.com/acme/tool/v1.2.0/docs/a.png"
		);
	});

	it("defaults the ref to main", () => {
		expect(defaultSectionUrl({ repo: "acme/tool" }, { kind: "link", path: "x.md" })).toBe(
			"https://github.com/acme/tool/blob/main/x.md"
		);
	});

	it("prefers baseUrl when both are set", () => {
		const source = { repo: "acme/tool", baseUrl: "https://docs.example.com/" };

		expect(defaultSectionUrl(source, { kind: "link", ...target })).toBe(
			"https://docs.example.com/docs/my%20guide.md#setup"
		);
	});

	it("has nothing to offer a client-only source", () => {
		expect(defaultSectionUrl({}, { kind: "link", ...target })).toBeUndefined();
	});
});

describe("rehypeSection", () => {
	async function render(options: Partial<SectionRenderOptions>, markdown = CLI) {
		const links: [string, SectionTarget][] = [];
		const html = await renderMarkdown(markdown, {
			rehypePlugins: [
				[
					rehypeSection,
					{
						path: "docs/cli.md",
						resolveUrl: () => undefined,
						onLink: (href: string, target: SectionTarget) => links.push([href, target]),
						...options,
					},
				],
			],
		});
		return { html, links };
	}

	it("shifts every heading so the section's own lands at headingLevel", async () => {
		const { html } = await render({ baseLevel: 2, headingLevel: 4 }, "## Flags\n\n### Advanced\n");

		expect(html).toMatch(/<h4[^>]*>Flags/);
		expect(html).toMatch(/<h5[^>]*>Advanced/);
	});

	it("clamps at h6 and h1", async () => {
		const deep = await render({ baseLevel: 1, headingLevel: 6 }, "# A\n\n## B\n");
		const shallow = await render({ baseLevel: 3, headingLevel: 1 }, "### A\n\n## B\n");

		expect(deep.html).toMatch(/<h6[^>]*>A[\s\S]*<h6[^>]*>B/);
		expect(shallow.html).toMatch(/<h1[^>]*>A[\s\S]*<h1[^>]*>B/);
	});

	it("drops only the leading heading when asked", async () => {
		const { html } = await render({ hideHeading: true }, "## Flags\n\nBody.\n\n### Advanced\n");

		expect(html).not.toContain("Flags");
		expect(html).toContain("Body.");
		expect(html).toMatch(/<h3[^>]*>Advanced/);
	});

	it("does not drop a heading that is not first", async () => {
		const { html } = await render({ hideHeading: true }, "Lead.\n\n## Flags\n");

		expect(html).toMatch(/<h2[^>]*>Flags/);
	});

	it("rewrites relative links and images, and reports each link", async () => {
		const { html, links } = await render({
			resolveUrl: ({ kind, path, anchor }) => `https://host.test/${kind}/${path}${anchor ?? ""}`,
		});

		expect(html).toContain('href="https://host.test/link/config.md#ports"');
		expect(html).toContain('src="https://host.test/image/docs/img/flow.png"');
		expect(links).toEqual([
			["https://host.test/link/config.md#ports", { path: "config.md", anchor: "#ports" }],
		]);
	});

	it("leaves a URL as written when the resolver has none, but still reports the link", async () => {
		const { html, links } = await render({});

		expect(html).toContain('href="../config.md#ports"');
		expect(links).toEqual([["../config.md#ports", { path: "config.md", anchor: "#ports" }]]);
	});

	it("does not touch external links or fragments", async () => {
		const { html, links } = await render(
			{ resolveUrl: () => "https://rewritten.test/" },
			"[ext](https://example.com) [frag](#flags)\n"
		);

		expect(html).toContain('href="https://example.com"');
		expect(html).toContain('href="#flags"');
		expect(links).toEqual([]);
	});

	it("still sanitizes what the resolver returns", async () => {
		const { html } = await render({ resolveUrl: () => "javascript:alert(1)" });

		expect(html).not.toContain("javascript:");
	});
});
