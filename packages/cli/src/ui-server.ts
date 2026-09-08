import { existsSync } from "node:fs";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { WeftService } from "@lepid-labs/weft-core";
import { handleApiRequest, weftApiPlugin } from "./api-middleware.js";

/** Where the UI comes from: the adapter-node build, or Vite over the source tree. */
export type UiMode = "built" | "dev";

/** The connect-style handler `@sveltejs/adapter-node` exports from `build/handler.js`. */
export type UiHandler = (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

/** The adapter-node entry point, relative to the `@lepid-labs/weft-ui` package root. */
export const BUILT_HANDLER = join("build", "handler.js");

/**
 * Pick how to serve the UI. The build wins when it exists — it is what a
 * published package ships and what `npx` runs — and the source tree is the
 * fallback for a checkout of this repo that has not built it. `forceDev`
 * (`--dev`) is for working on the UI itself: hot reload, at Vite's startup cost.
 */
export function chooseUiMode(uiRoot: string, forceDev: boolean): UiMode {
	const hasBuild = existsSync(join(uiRoot, BUILT_HANDLER));
	const hasSource = existsSync(join(uiRoot, "svelte.config.js"));
	if (forceDev) {
		if (!hasSource) {
			throw new Error(
				`serve: --dev needs the @lepid-labs/weft-ui source tree, and ${uiRoot} has none`
			);
		}
		return "dev";
	}
	if (hasBuild) return "built";
	if (hasSource) return "dev";
	throw new Error(
		`serve: no UI found in ${uiRoot} — expected ${BUILT_HANDLER} (run \`pnpm --filter @lepid-labs/weft-ui build\`)`
	);
}

/**
 * Route one request: `/api…` to the data API with the mount point stripped —
 * exactly as Vite's `use("/api", …)` strips it, so both modes share one
 * handler — and everything else to the UI.
 */
export function routeRequest(service: WeftService, ui: UiHandler) {
	return (req: IncomingMessage, res: ServerResponse): void => {
		const url = req.url ?? "/";
		if (url === "/api" || url.startsWith("/api/") || url.startsWith("/api?")) {
			const rest = url.slice("/api".length);
			req.url = rest === "" || rest.startsWith("?") ? `/${rest}` : rest;
			handleApiRequest(service, req, res).catch((err: unknown) => {
				console.error("API error:", err);
				if (!res.headersSent) {
					res.statusCode = 500;
					res.setHeader("Content-Type", "application/json");
				}
				res.end(JSON.stringify({ error: "Internal server error" }));
			});
			return;
		}
		ui(req, res, () => {
			res.statusCode = 404;
			res.end("Not found");
		});
	};
}

export interface RunningServer {
	close(): void;
	/** Where the socket actually listens, e.g. `[::]:7777` or `127.0.0.1:7777`. */
	address: string;
}

/** Render `server.address()` for a log line. */
export function describeAddress(address: AddressInfo | string | null | undefined): string {
	if (!address) return "(not listening)";
	if (typeof address === "string") return address;
	const host = address.family === "IPv6" ? `[${address.address}]` : address.address;
	return `${host}:${address.port}`;
}

/**
 * The host to put in the url the browser is sent to. A wildcard bind (or
 * none, which binds every interface) is reached as `localhost`; an explicit
 * host is used as given, bracketed if it is an IPv6 literal.
 */
export function browserHost(host: string | undefined): string {
	if (host === undefined || host === "0.0.0.0" || host === "::") return "localhost";
	return host.includes(":") ? `[${host}]` : host;
}

export type SelfCheck = { ok: true } | { ok: false; reason: string };

/**
 * Request the UI and the API from inside the process, before the browser is
 * asked to. A pass proves the server answers at the url that was printed, so
 * a browser that still cannot reach it is being kept away by something on
 * its own side (a proxy that does not bypass localhost, a policy, a firewall);
 * a failure names the first path that broke and the socket-level reason.
 */
export async function selfCheck(url: string, timeoutMs = 5000): Promise<SelfCheck> {
	for (const path of ["/api/manifest", "/"]) {
		try {
			const res = await fetch(url + path, { signal: AbortSignal.timeout(timeoutMs) });
			if (!res.ok) return { ok: false, reason: `GET ${path} → HTTP ${res.status}` };
			await res.arrayBuffer(); // drain, so the connection is released
		} catch (err) {
			return { ok: false, reason: `GET ${path}: ${describeError(err)}` };
		}
	}
	return { ok: true };
}

function describeError(err: unknown): string {
	// undici reports the socket error as `fetch failed` with the real one as `cause`.
	const cause = (err as { cause?: unknown } | null)?.cause;
	const e = cause instanceof Error ? cause : err instanceof Error ? err : undefined;
	if (!e) return String(err);
	const code = (e as { code?: string }).code;
	return code ? `${code}: ${e.message}` : e.message;
}

/** Serve the adapter-node build over plain `node:http`, the API in front of it. */
export async function startBuiltServer(
	service: WeftService,
	uiRoot: string,
	port: number,
	host?: string
): Promise<RunningServer> {
	const entry = pathToFileURL(join(uiRoot, BUILT_HANDLER)).href;
	const { handler } = (await import(entry)) as { handler: UiHandler };
	const server = createServer(routeRequest(service, handler));
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, host, () => {
			server.off("error", reject);
			resolve();
		});
	});
	return { close: () => void server.close(), address: describeAddress(server.address()) };
}

/** Serve the UI source through Vite's dev server, with the API as a plugin. */
export async function startDevServer(
	service: WeftService,
	uiRoot: string,
	port: number,
	host?: string
): Promise<RunningServer> {
	let createViteServer: typeof import("vite")["createServer"];
	try {
		({ createServer: createViteServer } = await import("vite"));
	} catch {
		throw new Error(
			"serve: --dev needs vite, which the published package does not install — run from a checkout of the weft repo"
		);
	}
	// SvelteKit's Vite plugin overrides Vite's `root` option with process.cwd()
	// and looks up svelte.config.js and src/app.html there, so passing `root`
	// alone is not enough — the process has to run from the UI package.
	process.chdir(uiRoot);
	const server = await createViteServer({
		root: uiRoot,
		server: { port, host },
		plugins: [weftApiPlugin(service)],
	});
	await server.listen();
	return {
		close: () => void server.close(),
		address: describeAddress(server.httpServer?.address()),
	};
}
