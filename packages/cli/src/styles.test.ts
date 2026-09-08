import { createRequire } from "node:module";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { assertServableStyle, loadStyleRoster, parseStyleFlag } from "./styles.js";

const ROSTER = {
	"luminous-precision": { scheme: "dark" },
	"summer-cloud": { scheme: "light" },
} as const;

describe("parseStyleFlag", () => {
	it("takes a single name", () => {
		expect(parseStyleFlag("summer-cloud")).toBe("summer-cloud");
	});

	it("takes a dark/light pair", () => {
		expect(parseStyleFlag("luminous-precision/summer-cloud")).toEqual({
			dark: "luminous-precision",
			light: "summer-cloud",
		});
	});

	it.each(["", "/", "a/", "/b", "a/b/c"])("rejects %j", (value) => {
		expect(() => parseStyleFlag(value)).toThrow(/--style/);
	});
});

describe("assertServableStyle", () => {
	it("accepts bundled names, single or paired", () => {
		expect(() => assertServableStyle("summer-cloud", undefined, ROSTER)).not.toThrow();
		expect(() =>
			assertServableStyle({ dark: "luminous-precision", light: "summer-cloud" }, undefined, ROSTER)
		).not.toThrow();
	});

	it("accepts no style at all", () => {
		expect(() => assertServableStyle(undefined, undefined, ROSTER)).not.toThrow();
	});

	it("names the unknown style and the roster", () => {
		expect(() => assertServableStyle("neon-typo", undefined, ROSTER)).toThrow(
			/unknown style "neon-typo" — bundled styles are luminous-precision, summer-cloud/
		);
		expect(() =>
			assertServableStyle({ dark: "nope", light: "summer-cloud" }, undefined, ROSTER)
		).toThrow(/unknown style "nope"/);
	});

	it("defers to styleUrl for names the roster lacks", () => {
		expect(() =>
			assertServableStyle("some-future-theme", "https://cdn.example/styles", ROSTER)
		).not.toThrow();
	});
});

describe("loadStyleRoster", () => {
	it("reads the manifest the UI package depends on", () => {
		const require = createRequire(import.meta.url);
		const uiRoot = dirname(require.resolve("@lepid-labs/weft-ui/package.json"));
		const roster = loadStyleRoster(uiRoot);
		expect(roster["luminous-precision"]?.scheme).toBe("dark");
		expect(roster["summer-cloud"]?.scheme).toBe("light");
	});
});
