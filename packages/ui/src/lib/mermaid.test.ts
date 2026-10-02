import type { WeftEdge } from "@lepid-labs/weft-core/browser";
import { describe, expect, it, vi } from "vitest";
import { renderMarkdown } from "./markdown.js";
import {
	type DiagramBlock,
	type MermaidApi,
	type Palette,
	luminance,
	renderDiagrams,
	themeVariables,
} from "./mermaid.js";

const DIAGRAM = "```mermaid\ngraph TD\n  A --> B\n```\n";

describe("mermaid placeholder", () => {
	it("leaves a mermaid fence as the plain code block the client pass looks for", async () => {
		const html = await renderMarkdown(DIAGRAM);

		expect(html).toContain('data-lang="mermaid"');
		expect(html).toContain('class="language-mermaid"');
		// Highlighting would split the source into token spans; the pass reads
		// textContent either way, but a highlighted diagram is a wasted pass and a
		// "not registered" warning per fence.
		expect(html).not.toContain("hljs");
		expect(html).toContain("A --> B");
	});

	it("keeps markup in a diagram's source as escaped text", async () => {
		const html = await renderMarkdown(
			'```mermaid\ngraph TD\n  A["<script>alert(1)</script>"] --> B["<img src=x onerror=alert(2)>"]\n```\n'
		);

		expect(html).not.toContain("<script");
		expect(html).not.toContain("<img");
		expect(html).toContain("alert(1)");
	});

	it("carries a diagram in an included section into the composed page", async () => {
		const edge: WeftEdge = {
			from: { node: "guide.md" },
			to: { node: "flow.md", anchor: "#token-flow" },
			type: "includes",
			headingShift: "auto",
			contributes: "source",
		};
		const flow = `# Flow\n\n## Token flow\n\n${DIAGRAM}\n## Other\n\nUnrelated.\n`;

		const html = await renderMarkdown("# Guide\n\n[Token flow](flow.md#token-flow)\n", {
			includes: {
				nodeId: "guide.md",
				edges: [edge],
				fetchDoc: async () => flow,
			},
		});

		const frame = html.slice(html.indexOf('class="weft-include"'));
		expect(frame).toContain('data-lang="mermaid"');
		expect(frame).toContain("A --> B");
		expect(html).not.toContain("Unrelated.");
	});
});

/** Resolved roughly as the page resolves them: neon-butterfly, a fixed dark style. */
const NEON: Palette = {
	colors: {
		"--w-bg": "#0b1326",
		"--w-bg-secondary": "#1a1f2e",
		"--w-bg-elevated": "#171f33",
		"--w-text": "#dae2fd",
		"--w-text-secondary": "#958da1",
		"--w-accent": "#d2bbff",
		"--w-accent-subtle": "#8278a8",
	},
	font: '"Inter", sans-serif',
};

const SUMMER: Palette = {
	colors: {
		"--w-bg": "#f6fafe",
		"--w-bg-elevated": "#ffffff",
		"--w-text": "#171c1f",
		"--w-accent": "#4500d9",
	},
};

describe("themeVariables", () => {
	it("draws a dark style's diagrams dark, from its own tokens", () => {
		const vars = themeVariables(NEON);

		expect(vars.darkMode).toBe(true);
		expect(vars.background).toBe("#0b1326");
		expect(vars.primaryColor).toBe("#171f33");
		expect(vars.primaryTextColor).toBe("#dae2fd");
		expect(vars.nodeBorder).toBe("#d2bbff");
		expect(vars.lineColor).toBe("#958da1");
		expect(vars.fontFamily).toBe('"Inter", sans-serif');
	});

	it("draws a light style's diagrams light", () => {
		const vars = themeVariables(SUMMER);

		expect(vars.darkMode).toBe(false);
		expect(vars.primaryTextColor).toBe("#171c1f");
	});

	it("omits anything mermaid's colour parser would reject", () => {
		const vars = themeVariables({
			colors: {
				"--w-bg": "oklch(0.2 0.05 260)",
				"--w-text": "rgba(0, 0, 0, 0.5)",
				"--w-accent": "#4500d9",
			},
		});

		expect(vars.background).toBeUndefined();
		expect(vars.textColor).toBeUndefined();
		// No background to judge by, so mermaid keeps its own default.
		expect(vars.darkMode).toBeUndefined();
		expect(vars.nodeBorder).toBe("#4500d9");
		expect(
			Object.values(vars).every((v) => typeof v !== "string" || /^#[0-9a-f]{6}$/i.test(v))
		).toBe(true);
	});

	it("measures luminance on the WCAG scale", () => {
		expect(luminance("#000000")).toBe(0);
		expect(luminance("#ffffff")).toBeCloseTo(1);
	});
});

type Outcome = { svg: string } | { error: string };

function blocks(sources: string[], outcomes: Outcome[] = []): DiagramBlock[] {
	return sources.map((source, i) => ({
		source,
		render: (svg) => {
			outcomes[i] = { svg };
		},
		fail: (error) => {
			outcomes[i] = { error };
		},
	}));
}

function fakeMermaid(log: string[] = []): MermaidApi & { ids: string[] } {
	const ids: string[] = [];
	return {
		ids,
		initialize: vi.fn((config) => {
			log.push(`init:${config.themeVariables.tag}`);
		}),
		render: vi.fn(async (id: string, text: string) => {
			ids.push(id);
			log.push(`render:${text}`);
			// Yield, so a second pass has every chance to interleave.
			await new Promise((resolve) => setTimeout(resolve, 1));
			if (text.includes("bad")) throw new Error("Parse error on line 1");
			return { svg: `<svg id="${id}"></svg>` };
		}),
	};
}

describe("renderDiagrams", () => {
	it("initializes mermaid strict, silent and on the base theme", async () => {
		const mermaid = fakeMermaid();
		await renderDiagrams(blocks(["graph TD"]), async () => mermaid, { primaryColor: "#ffffff" });

		expect(mermaid.initialize).toHaveBeenCalledWith({
			startOnLoad: false,
			securityLevel: "strict",
			suppressErrorRendering: true,
			theme: "base",
			themeVariables: { primaryColor: "#ffffff" },
		});
	});

	it("marks only the diagram that fails, and draws the rest", async () => {
		const outcomes: Outcome[] = [];
		await renderDiagrams(
			blocks(["good 1", "bad", "good 2"], outcomes),
			async () => fakeMermaid(),
			{}
		);

		expect(outcomes[0]).toHaveProperty("svg");
		expect(outcomes[1]).toEqual({ error: "Parse error on line 1" });
		expect(outcomes[2]).toHaveProperty("svg");
	});

	it("marks every diagram when mermaid cannot be loaded, without rejecting", async () => {
		const outcomes: Outcome[] = [];
		const load = () => Promise.reject(new Error("network down"));

		await expect(renderDiagrams(blocks(["a", "b"], outcomes), load, {})).resolves.toBeUndefined();
		expect(outcomes).toEqual([
			{ error: "Mermaid could not be loaded: network down" },
			{ error: "Mermaid could not be loaded: network down" },
		]);
	});

	it("does not load mermaid for a page with no diagrams", async () => {
		const load = vi.fn(async () => fakeMermaid());
		await renderDiagrams([], load, {});

		expect(load).not.toHaveBeenCalled();
	});

	it("gives every diagram on the page its own id, across passes", async () => {
		const mermaid = fakeMermaid();
		await renderDiagrams(blocks(["a", "b"]), async () => mermaid, {});
		await renderDiagrams(blocks(["c"]), async () => mermaid, {});

		expect(new Set(mermaid.ids).size).toBe(3);
		for (const id of mermaid.ids) expect(id).toMatch(/^weft-mermaid-\d+$/);
	});

	it("runs passes one at a time, so one mount's theme never draws another's diagrams", async () => {
		const log: string[] = [];
		const mermaid = fakeMermaid(log);

		await Promise.all([
			renderDiagrams(blocks(["a1", "a2"]), async () => mermaid, { tag: "A" }),
			renderDiagrams(blocks(["b1"]), async () => mermaid, { tag: "B" }),
		]);

		expect(log).toEqual(["init:A", "render:a1", "render:a2", "init:B", "render:b1"]);
	});

	it("keeps drawing later passes after one whose callback throws", async () => {
		const throwing: DiagramBlock = {
			source: "bad",
			render: () => {},
			fail: () => {
				throw new Error("host bug");
			},
		};
		const outcomes: Outcome[] = [];

		await expect(renderDiagrams([throwing], async () => fakeMermaid(), {})).rejects.toThrow(
			"host bug"
		);
		await renderDiagrams(blocks(["good"], outcomes), async () => fakeMermaid(), {});

		expect(outcomes[0]).toHaveProperty("svg");
	});
});
