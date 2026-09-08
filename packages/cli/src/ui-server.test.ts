import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WeftService } from "@lepid-labs/weft-core";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
	BUILT_HANDLER,
	browserHost,
	chooseUiMode,
	describeAddress,
	isPortInUse,
	routeRequest,
	selfCheck,
	startBuiltServer,
	statusTag,
} from "./ui-server.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const FIXTURES_DIR = resolve(__dirname, "__fixtures__");

describe("chooseUiMode", () => {
	const dirs: string[] = [];
	function uiRoot(opts: { build?: boolean; source?: boolean }): string {
		const dir = mkdtempSync(join(tmpdir(), "weft-ui-"));
		dirs.push(dir);
		if (opts.build) {
			mkdirSync(join(dir, "build"));
			writeFileSync(join(dir, BUILT_HANDLER), "");
		}
		if (opts.source) writeFileSync(join(dir, "svelte.config.js"), "");
		return dir;
	}
	afterEach(() => {
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	it("prefers the build when both build and source exist", () => {
		expect(chooseUiMode(uiRoot({ build: true, source: true }), false)).toBe("built");
	});

	it("serves the build when only the build exists (a published package)", () => {
		expect(chooseUiMode(uiRoot({ build: true }), false)).toBe("built");
	});

	it("falls back to the source tree when nothing is built", () => {
		expect(chooseUiMode(uiRoot({ source: true }), false)).toBe("dev");
	});

	it("--dev forces the source tree over an existing build", () => {
		expect(chooseUiMode(uiRoot({ build: true, source: true }), true)).toBe("dev");
	});

	it("--dev without a source tree is an error, not a silent fallback", () => {
		expect(() => chooseUiMode(uiRoot({ build: true }), true)).toThrow(/--dev needs/);
	});

	it("names the missing build when there is no UI at all", () => {
		expect(() => chooseUiMode(uiRoot({}), false)).toThrow(/build\/handler\.js/);
	});
});

describe("routeRequest", () => {
	let server: Server;
	let base: string;
	const uiSeen: string[] = [];

	beforeAll(async () => {
		const service = new WeftService({
			rootDir: FIXTURES_DIR,
			docsDir: "docs",
			entryPoint: "docs/README.md",
			ignore: [],
		});
		await service.rebuild();

		// A stand-in for adapter-node's handler: records the url it was given and
		// echoes it, so the tests can see exactly what reached the UI.
		const ui = (req: IncomingMessage, res: ServerResponse) => {
			uiSeen.push(req.url ?? "");
			res.setHeader("Content-Type", "text/plain");
			res.end(`ui:${req.url}`);
		};
		server = createServer(routeRequest(service, ui));
		await new Promise<void>((done) => server.listen(0, done));
		const address = server.address();
		if (!address || typeof address === "string") throw new Error("no port");
		base = `http://127.0.0.1:${address.port}`;
	});
	afterAll(() => server.close());
	afterEach(() => uiSeen.splice(0));

	it("serves the API with the /api mount point stripped", async () => {
		const res = await fetch(`${base}/api/doc/architecture.md`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/json");
		const body = (await res.json()) as { content: string };
		expect(body.content).toContain("# Architecture");
		expect(uiSeen).toEqual([]);
	});

	it("passes the query string through to the API", async () => {
		const res = await fetch(`${base}/api/search?q=architecture`);
		expect(res.status).toBe(200);
		expect(await res.json()).not.toEqual([]);
	});

	it("treats a bare /api as the API root, as Vite's mount does", async () => {
		const res = await fetch(`${base}/api`);
		expect(res.status).toBe(404);
		expect(((await res.json()) as { error: string }).error).toMatch(/Unknown API route: \//);
		expect(uiSeen).toEqual([]);
	});

	it("hands every other path to the UI untouched", async () => {
		const res = await fetch(`${base}/docs/architecture?x=1`);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("ui:/docs/architecture?x=1");
		expect(uiSeen).toEqual(["/docs/architecture?x=1"]);
	});

	it("does not mistake a path that merely starts with 'api' for the API", async () => {
		const res = await fetch(`${base}/apiary`);
		expect(await res.text()).toBe("ui:/apiary");
	});

	it("passes the self-check when both the API and the UI answer", async () => {
		expect(await selfCheck(base)).toEqual({ ok: true });
	});
});

describe("selfCheck", () => {
	it("names the socket error when nothing is listening", async () => {
		// Bind to learn a free port, then release it so the check hits a closed one.
		const probe = createServer();
		await new Promise<void>((done) => probe.listen(0, "127.0.0.1", done));
		const { port } = probe.address() as { port: number };
		await new Promise<void>((done) => probe.close(() => done()));

		const result = await selfCheck(`http://127.0.0.1:${port}`);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toMatch(/^GET \/api\/manifest: ECONNREFUSED/);
	});

	it("reports the first path that does not answer 2xx", async () => {
		const server = createServer((req, res) => {
			res.statusCode = req.url === "/" ? 500 : 200;
			res.end("{}");
		});
		await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
		const { port } = server.address() as { port: number };
		try {
			expect(await selfCheck(`http://127.0.0.1:${port}`)).toEqual({
				ok: false,
				reason: "GET / → HTTP 500 (is something else answering on that port?)",
			});
		} finally {
			server.close();
		}
	});
});

describe("describeAddress", () => {
	it("renders IPv4 and IPv6 socket addresses", () => {
		expect(describeAddress({ address: "127.0.0.1", family: "IPv4", port: 7777 })).toBe(
			"127.0.0.1:7777"
		);
		expect(describeAddress({ address: "::", family: "IPv6", port: 7777 })).toBe("[::]:7777");
	});

	it("passes a pipe path through and names a server that is not listening", () => {
		expect(describeAddress("/tmp/weft.sock")).toBe("/tmp/weft.sock");
		expect(describeAddress(null)).toBe("(not listening)");
		expect(describeAddress(undefined)).toBe("(not listening)");
	});
});

describe("browserHost", () => {
	it("sends the browser to localhost for the default and wildcard binds", () => {
		expect(browserHost(undefined)).toBe("localhost");
		expect(browserHost("0.0.0.0")).toBe("localhost");
		expect(browserHost("::")).toBe("localhost");
	});

	it("uses an explicit host as given, bracketing IPv6 literals", () => {
		expect(browserHost("127.0.0.1")).toBe("127.0.0.1");
		expect(browserHost("::1")).toBe("[::1]");
		expect(browserHost("docs.local")).toBe("docs.local");
	});
});

describe("isPortInUse", () => {
	it("recognises Node's EADDRINUSE and Vite's strictPort rejection", () => {
		expect(isPortInUse(Object.assign(new Error("listen EADDRINUSE"), { code: "EADDRINUSE" }))).toBe(
			true
		);
		expect(isPortInUse(new Error("Port 7777 is already in use"))).toBe(true);
	});

	it("leaves every other failure alone", () => {
		expect(isPortInUse(new Error("ENOENT: no such file"))).toBe(false);
		expect(isPortInUse("EADDRINUSE")).toBe(false);
		expect(isPortInUse(undefined)).toBe(false);
	});
});

describe("startBuiltServer", () => {
	it("fails with a port-in-use error rather than sharing a taken port", async () => {
		// __fixtures__/ui-stub holds a stand-in for the adapter-node build.
		const uiRoot = join(FIXTURES_DIR, "ui-stub");
		const service = new WeftService({
			rootDir: FIXTURES_DIR,
			docsDir: "docs",
			entryPoint: "docs/README.md",
			ignore: [],
		});
		const occupant = createServer((_req, res) => res.end("not weft"));
		await new Promise<void>((done) => occupant.listen(0, "127.0.0.1", done));
		const { port } = occupant.address() as { port: number };
		try {
			await expect(startBuiltServer(service, uiRoot, port, "127.0.0.1")).rejects.toSatisfy(
				isPortInUse
			);
		} finally {
			occupant.close();
		}
	});
});

describe("statusTag", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("colours the label green or red on a terminal", () => {
		vi.stubEnv("NO_COLOR", undefined);
		expect(statusTag(true, { isTTY: true })).toBe("[\x1b[32mOK\x1b[0m]");
		expect(statusTag(false, { isTTY: true })).toBe("[\x1b[31mFAIL\x1b[0m]");
	});

	it("stays plain when piped or when NO_COLOR is set", () => {
		vi.stubEnv("NO_COLOR", undefined);
		expect(statusTag(true, { isTTY: false })).toBe("[OK]");
		vi.stubEnv("NO_COLOR", "1");
		expect(statusTag(true, { isTTY: true })).toBe("[OK]");
	});
});
