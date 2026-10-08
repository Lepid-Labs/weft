import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeftSection } from "./index.js";

/**
 * The browser behaviour is the embed's and is exercised there. What this
 * package owns that can break on its own is server rendering: a framework
 * renders the component where there is no DOM, and the renderer must not load.
 */
describe("WeftSection on the server", () => {
	it("renders only its empty container", () => {
		const html = renderToStaticMarkup(
			<WeftSection repo="acme/tool" path="docs/cli.md" anchor="#flags" className="help" />
		);

		expect(html).toBe('<div class="help"><div></div></div>');
	});

	it("does not render the fallback before anything has failed", () => {
		const html = renderToStaticMarkup(
			<WeftSection repo="acme/tool" path="docs/cli.md" fallback={<p>See the docs</p>} />
		);

		expect(html).not.toContain("See the docs");
	});
});
