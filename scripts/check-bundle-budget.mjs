import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const routeChunkDirectory = join(process.cwd(), ".next", "static", "chunks", "app", "books", "add");
const maximumRouteBytes = 40 * 1024;

let files;
try {
  files = (await readdir(routeChunkDirectory)).filter((file) => file.endsWith(".js"));
} catch {
  throw new Error("No production build was found. Run `next build` before checking bundle budgets.");
}

const sizes = await Promise.all(files.map(async (file) => (await stat(join(routeChunkDirectory, file))).size));
const routeBytes = sizes.reduce((total, size) => total + size, 0);
if (!files.length || routeBytes > maximumRouteBytes) {
  throw new Error(`/books/add eager route JavaScript is ${routeBytes} bytes; budget is ${maximumRouteBytes} bytes.`);
}

console.log(`/books/add eager route JavaScript: ${routeBytes} / ${maximumRouteBytes} bytes`);
