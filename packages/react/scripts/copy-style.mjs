/**
 * Ship the section renderer's stylesheet as this package's own `style.css`.
 *
 * A host imports it from here because it cannot import it from
 * `@lepid-labs/weft-embed`: that is this package's dependency, not the host's,
 * and a strict installer (pnpm) does not let the host resolve it.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const source = createRequire(import.meta.url).resolve("@lepid-labs/weft-embed/section.css");
const target = fileURLToPath(new URL("../dist/style.css", import.meta.url));

mkdirSync(fileURLToPath(new URL("../dist/", import.meta.url)), { recursive: true });
copyFileSync(source, target);
console.log("weft-react: dist/style.css copied from @lepid-labs/weft-embed/section.css");
